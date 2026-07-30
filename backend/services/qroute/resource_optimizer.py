"""Offline scoring of one circuit against one device.

Nothing here touches the network. qiskit.transpile() accepts a bare
basis_gates + coupling_map, so every estimate is computed locally from the
capability table — which is what keeps /recommend inside the request budget
that the live device listing already struggles with.
"""

from dataclasses import dataclass
from typing import Optional

import qiskit.qasm2
from qiskit import transpile

from .device_capabilities import (
    DeviceCapability, calibration_age_days, confidence, device_key, get_capability,
)

# Fixed so the same circuit always produces the same estimate — a
# recommendation that changes between two identical clicks is not explainable
# to a student, and SABRE routing is stochastic by default.
_SEED = 7

# Highest preset level: the estimate should reflect the best the transpiler can
# do for this device, since that's what the provider's own pipeline will apply.
_OPTIMIZATION_LEVEL = 3


@dataclass
class ExecutionEstimate:
    device_key: str
    provider: str
    device_id: str
    device_name: str
    fits: bool
    circuit_qubits: int
    transpiled_depth: int
    one_qubit_gates: int
    two_qubit_gates: int
    routing_overhead_2q: int
    # An UPPER BOUND, not a prediction of what the hardware will deliver — see
    # estimate_execution's docstring. Every UI surface must label it as such.
    expected_fidelity: float
    estimated_cost: float
    cost_unit: str               # "USD" | "credits" | "free"
    cost_basis: str
    pending_jobs: Optional[int]
    calibration_age_days: Optional[int]
    confidence: str              # "high" | "medium" | "low"
    notes: str


def _coupling_map(cap: DeviceCapability, num_qubits: int) -> Optional[list[list[int]]]:
    """None means all-to-all (no routing needed).

    ponytail: limited connectivity is modelled as a linear chain, which is
    PESSIMISTIC — IBM's heavy-hex has degree ~3 against a chain's 2, so this
    over-estimates SWAP insertion. A conservative fidelity estimate is the
    right way to be wrong in a teaching tool. Upgrade path: store the real
    coupling map per device (IbmAdapter can read backend.coupling_map) and
    return it verbatim here."""
    if cap["connectivity"] == "all-to-all":
        return None
    return [[i, i + 1] for i in range(num_qubits - 1)]


def _count_gates(circuit) -> tuple[int, int]:
    """Returns (one_qubit_gate_count, two_qubit_gate_count), ignoring
    measurements, barriers and resets — those are scored separately (readout)
    or carry no gate error."""
    one_q = two_q = 0
    for instruction in circuit.data:
        name = instruction.operation.name
        if name in ("measure", "barrier", "reset", "delay"):
            continue
        arity = len(instruction.qubits)
        if arity == 1:
            one_q += 1
        elif arity >= 2:
            two_q += 1
    return one_q, two_q


def estimate_execution(
    qasm: str,
    shots: int,
    cap: DeviceCapability,
    provider: str,
    device_id: str,
    device_name: str,
) -> ExecutionEstimate:
    """Transpiles `qasm` for one device and scores the result.

    Fidelity is the standard independent-error product:
        F = (1-e1q)^n1q * (1-e2q)^n2q * (1-eRO)^n_measured
    It assumes errors are independent and ignores T1/T2 decoherence, circuit
    duration, crosstalk, idle-qubit decay, SPAM beyond a flat readout term, and
    per-gate duration differences. It is therefore an UPPER BOUND on what the
    hardware will deliver, not a prediction — every UI surface must say so.

    Adding a duration-based T1/T2 term is the most likely next improvement, and
    is deliberately deferred: Task 6's calibration loop measures how optimistic
    this model actually is, per device, against qCompare's observed TVD. Adding
    terms before that evidence exists is guessing at which one matters."""
    qc = qiskit.qasm2.loads(qasm)   # raises on invalid QASM — callers turn that into a 400

    common = dict(
        device_key=device_key(provider, device_id),
        provider=provider, device_id=device_id, device_name=device_name,
        cost_unit=cap["cost_unit"], cost_basis=cap["cost_basis"],
        pending_jobs=cap["pending_jobs"],
        calibration_age_days=calibration_age_days(cap),
        confidence=confidence(cap),
    )

    if qc.num_qubits > cap["num_qubits"]:
        return ExecutionEstimate(
            **common,
            fits=False,
            circuit_qubits=qc.num_qubits,
            transpiled_depth=0, one_qubit_gates=0, two_qubit_gates=0,
            routing_overhead_2q=0,
            expected_fidelity=0.0, estimated_cost=0.0,
            notes=f"Needs {qc.num_qubits} qubits; this device has {cap['num_qubits']}.",
        )

    # Transpiled twice on purpose: once unrouted, once against the device's
    # real connectivity. The difference is exactly the SWAP cost limited
    # connectivity imposes — the single most useful number for teaching why
    # topology matters, and invisible if you only transpile once.
    ideal = transpile(
        qc, basis_gates=cap["basis_gates"], coupling_map=None,
        optimization_level=_OPTIMIZATION_LEVEL, seed_transpiler=_SEED,
    )
    routed = transpile(
        qc, basis_gates=cap["basis_gates"],
        coupling_map=_coupling_map(cap, qc.num_qubits),
        optimization_level=_OPTIMIZATION_LEVEL, seed_transpiler=_SEED,
    )

    _, ideal_2q = _count_gates(ideal)
    one_q, two_q = _count_gates(routed)
    overhead = max(0, two_q - ideal_2q)

    measured = sum(1 for i in routed.data if i.operation.name == "measure")

    fidelity = (
        (1.0 - cap["err_1q"]) ** one_q
        * (1.0 - cap["err_2q"]) ** two_q
        * (1.0 - cap["err_readout"]) ** measured
    )

    if overhead:
        notes = (
            f"{overhead} extra entangling gate(s) inserted to route around this "
            f"device's limited connectivity."
        )
    elif cap["connectivity"] == "all-to-all":
        notes = "All-to-all connectivity — no routing gates needed."
    else:
        notes = "Circuit maps onto this device's connectivity without extra routing."

    return ExecutionEstimate(
        **common,
        fits=True,
        circuit_qubits=qc.num_qubits,
        transpiled_depth=routed.depth(),
        one_qubit_gates=one_q,
        two_qubit_gates=two_q,
        routing_overhead_2q=overhead,
        expected_fidelity=round(fidelity, 6),
        estimated_cost=round(shots * cap["cost_amount"], 4),
        notes=notes,
    )


# Fidelity dominates because a low-fidelity result teaches the student nothing;
# queue matters next (a demo that never returns is worthless); cost last,
# because most devices in the roster are free.
DEFAULT_WEIGHTS = {"fidelity": 0.6, "queue": 0.25, "cost": 0.15}

# Queue score halves at this depth: 0 jobs -> 1.0, 40 jobs -> 0.5, 200 -> 0.17.
_QUEUE_HALF_LIFE_JOBS = 40.0
# Cost score halves here: free -> 1.0, $1.00 -> 0.5.
_COST_HALF_LIFE_USD = 1.0


@dataclass
class Recommendation:
    estimate: ExecutionEstimate
    score: float
    rationale: str                 # one-line prose summary
    factors: list[dict]            # [{"sign": "+"|"-"|"~", "text": str}]


def _queue_score(pending: Optional[int]) -> float:
    if pending is None:
        return 0.75   # unknown queue: neither rewarded nor heavily punished
    return _QUEUE_HALF_LIFE_JOBS / (_QUEUE_HALF_LIFE_JOBS + max(0, pending))


def _cost_score(amount: float, unit: str) -> float:
    """ponytail: scores the raw amount regardless of unit. Safe only while at
    most ONE non-free unit is in play (today: IonQ in USD, everything else
    free). Add a second paid unit — qBraid credits — and this needs a
    per-unit normaliser before the comparison means anything."""
    if unit == "free" or amount <= 0:
        return 1.0
    return _COST_HALF_LIFE_USD / (_COST_HALF_LIFE_USD + amount)


def _factors(est: ExecutionEstimate) -> list[dict]:
    """Signed, one-line tradeoffs a student can scan.

    Prose hides the comparison; a +/- list makes "all-to-all connectivity but
    paid and queued" legible at a glance, which is the whole pedagogical point
    of the panel."""
    if not est.fits:
        return [{"sign": "-", "text": est.notes}]

    out = [{
        "sign": "~",
        "text": f"{est.two_qubit_gates} entangling + {est.one_qubit_gates} "
                f"single-qubit gates, depth {est.transpiled_depth}",
    }]

    if est.routing_overhead_2q > 0:
        out.append({"sign": "-", "text": f"{est.routing_overhead_2q} extra gate(s) inserted for routing"})
    else:
        out.append({"sign": "+", "text": "no routing gates needed"})

    if est.pending_jobs is not None:
        sign = "+" if est.pending_jobs <= 10 else "-"
        out.append({"sign": sign, "text": f"{est.pending_jobs} job(s) queued"})

    if est.estimated_cost <= 0:
        out.append({"sign": "+", "text": "free to run"})
    else:
        amount = (f"${est.estimated_cost:.2f}" if est.cost_unit == "USD"
                  else f"{est.estimated_cost:g} {est.cost_unit}")
        out.append({"sign": "-", "text": f"costs {amount}"})

    if est.confidence != "high":
        out.append({
            "sign": "-",
            "text": f"calibration data is {est.calibration_age_days} days old "
                    f"({est.confidence} confidence)",
        })

    return out


def _rationale(est: ExecutionEstimate) -> str:
    if not est.fits:
        return est.notes
    return (
        f"Est. fidelity {est.expected_fidelity:.1%} (upper bound) — {est.notes}"
    )


def rank_devices(
    qasm: str,
    shots: int,
    devices: list[dict],
    weights: Optional[dict] = None,
) -> tuple[list[Recommendation], list[dict]]:
    """Scores every device we have cited capability data for, best first.

    Returns (ranked, unrated). `unrated` holds the DeviceInfo dicts we have no
    calibration data for — surfaced to the user as "no data" rather than
    scored off invented numbers or silently dropped from the roster."""
    w = weights or DEFAULT_WEIGHTS
    total_w = sum(w.values()) or 1.0

    ranked: list[Recommendation] = []
    unrated: list[dict] = []

    for device in devices:
        provider = device["provider"]
        device_id = device["id"]
        # A live pending_jobs on the DeviceInfo (IBM populates it in Task 1)
        # overrides the static table's None.
        cap = get_capability(provider, device_id, live=device)
        if cap is None:
            unrated.append(device)
            continue

        est = estimate_execution(
            qasm, shots, cap, provider, device_id, device.get("name", device_id)
        )
        score = (
            w.get("fidelity", 0.0) * est.expected_fidelity
            + w.get("queue", 0.0) * _queue_score(est.pending_jobs)
            + w.get("cost", 0.0) * _cost_score(est.estimated_cost, est.cost_unit)
        ) / total_w
        # A device the circuit doesn't fit on stays in the list (so the student
        # sees WHY it's unusable) but can never outrank a device that works.
        if not est.fits:
            score = -1.0
        ranked.append(Recommendation(
            estimate=est, score=round(score, 6),
            rationale=_rationale(est), factors=_factors(est),
        ))

    ranked.sort(key=lambda r: r.score, reverse=True)
    return ranked, unrated
