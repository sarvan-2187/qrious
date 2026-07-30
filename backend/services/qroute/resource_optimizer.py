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
    DeviceCapability, calibration_age_days, confidence, device_key,
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
