# Quantum Resource Optimizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Given a student's circuit, rank every available quantum backend by expected fidelity, cost, and queue depth — and explain the ranking in terms a learner can understand.

**Architecture:** A static, citable device-capability table (published median error rates per device) is merged with live queue depth from the provider adapters. A scoring engine transpiles the circuit **offline** against each device's basis gates and coupling map — `qiskit.transpile()` needs no network connection — then applies a standard gate-error fidelity product. A new `POST /api/v1/qroute/recommend` endpoint returns the ranking; a panel in QRoutePage renders it and selects a device on click. Finally, every submitted job records its predicted fidelity, which is later compared against qCompare's *measured* TVD to produce a predicted-vs-actual calibration chart.

**Tech Stack:** Python 3.11, FastAPI, Qiskit 2.4.2, Motor/MongoDB, React 19 + TypeScript, Recharts 3.9, Vite.

## Global Constraints

- **Python 3.11** — `typing.NotRequired` is available; do not add `typing_extensions`.
- **No new dependencies.** Qiskit, Recharts, and axios are all already installed. Adding a package fails review.
- **No new provider integrations.** This plan touches only the four adapters that already exist (qBraid, IonQ, IBM, IQM). No D-Wave, no annealers.
- **All transpilation is offline.** Never call a provider SDK inside the scoring path — `transpile(qc, basis_gates=[...], coupling_map=[...])` works with no credentials and no network. The `/recommend` endpoint must answer in well under the existing `_DEVICE_FETCH_BUDGET_SECONDS = 25` budget.
- **Never fabricate calibration data.** A device with no entry in the capability table is returned in a separate `unrated` list, never given invented error rates.
- **Every error rate must carry `source`, `source_url` and `published_date`.** Scientific-accuracy requirement, not a nicety. `published_date` is the date the *cited numbers* were published — bumping it without re-reading the provider's page is falsifying a citation.
- **Fidelity is always labelled an upper bound**, never presented as a prediction. The model ignores T1/T2, circuit duration, crosstalk, idle decay and SPAM beyond a flat readout term. Every UI surface showing it must say so (`≤ 94.3%`, "upper bound", confidence chip).
- **No invented uncertainty.** Do not display `±x%` derived from anything but measured calibration data — published error rates carry no uncertainties to propagate. Qualitative confidence comes from calibration age; the numeric error bar comes from `GET /calibration`'s measured MAE.
- **No NEW test failures.** Run the suite from `backend/` with `./venv/Scripts/python.exe -m pytest -q` before every commit. **6 tests already fail on a clean tree** and are NOT your concern — do not try to fix them:
  - `tests/test_ai_gateway.py::test_code_task_routes_to_kimi_first`
  - `tests/test_domain_guard.py::{test_domain_guard_allow_contextual, test_domain_guard_allow_quantum, test_domain_guard_mixed, test_domain_guard_reject_unrelated}` (all four: `pytest-asyncio` is not installed, so `async def` tests are skipped as failures)
  - `tests/test_phase6_analytics.py::test_weak_concept_calculation_and_sorting`

  Baseline is **6 failed, 44 passed**. Success means the failure list is unchanged and the pass count has grown by exactly your new tests.
- **Test style:** plain `pytest` functions, no fixtures, no frameworks beyond `pytest` and `unittest.mock`. Match `backend/tests/test_device_fetch_budget.py`.
- **Frontend conventions:** icons come from `react-icons/fa` (v5 names — `FaExclamationTriangle`, *not* the fa6 `FaTriangleExclamation`); shared UI imports use the `@/` alias (`@/components/ui/card`), module-local imports stay relative (`../hooks/useQRouteApi`). See `QRoutePage.tsx:13-17`.
- **Do not modify** `DeviceInfo`'s five existing required keys, or any adapter's `submit_job` / `get_job_result` signature. Four adapters depend on them.

## File Structure

| File | Responsibility |
|---|---|
| `backend/services/qroute/__init__.py` | Package marker (mirrors `backend/services/qforge/`) |
| `backend/services/qroute/device_capabilities.py` | Static capability table + live-override merge. Data only, no scoring. |
| `backend/services/qroute/resource_optimizer.py` | Offline transpile, fidelity/cost model, ranking. Pure functions, no I/O. |
| `backend/services/quantum_providers/base.py` | +2 `NotRequired` keys on `DeviceInfo` |
| `backend/services/quantum_providers/ibm_adapter.py` | Populate the 2 new keys in `list_devices` |
| `backend/routers/qroute_router.py` | `POST /recommend`, `GET /calibration`, record prediction on submit |
| `frontend/src/modules/qroute/hooks/useQRouteApi.ts` | Types + 2 new API calls |
| `frontend/src/modules/qroute/components/RecommendationPanel.tsx` | Ranked device cards, click-to-select |
| `frontend/src/modules/qroute/components/PredictionAccuracyChart.tsx` | Predicted vs measured scatter |
| `frontend/src/modules/qroute/pages/QRoutePage.tsx` | Mount both components |

Tests: `backend/tests/test_device_capabilities.py`, `test_resource_optimizer.py`, `test_recommend_endpoint.py`, `test_prediction_calibration.py`.

---

### Task 1: Device capability table + live queue depth

**Files:**
- Create: `backend/services/qroute/__init__.py`
- Create: `backend/services/qroute/device_capabilities.py`
- Modify: `backend/services/quantum_providers/base.py:11-18`
- Modify: `backend/services/quantum_providers/ibm_adapter.py:46-61`
- Test: `backend/tests/test_device_capabilities.py`

**Interfaces:**
- Consumes: `DeviceInfo` from `services.quantum_providers.base`
- Produces:
  - `DeviceCapability` TypedDict with keys `num_qubits, connectivity, basis_gates, err_1q, err_2q, err_readout, cost_amount, cost_unit, cost_basis, pending_jobs, source, source_url, published_date`
  - `get_capability(provider: str, device_id: str, live: dict | None = None) -> DeviceCapability | None`
  - `device_key(provider: str, device_id: str) -> str` returning `f"{provider}::{device_id}"`
  - `calibration_age_days(cap, today: date | None = None) -> int | None`
  - `confidence(cap, today: date | None = None) -> str` returning `"high" | "medium" | "low"`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_device_capabilities.py`:

```python
# backend/tests/test_device_capabilities.py
from datetime import date, timedelta

from services.qroute.device_capabilities import (
    calibration_age_days, confidence, device_key, get_capability,
)


def test_device_key_matches_frontend_convention():
    # QRoutePage.tsx builds selectedDeviceKey as `${provider}::${device.id}` —
    # the backend must produce the identical string or click-to-select breaks.
    assert device_key("ibm", "ibm_torino") == "ibm::ibm_torino"


def test_known_hardware_has_cited_error_rates():
    cap = get_capability("ionq", "qpu.forte-1")
    assert cap is not None
    assert cap["num_qubits"] == 36
    assert cap["connectivity"] == "all-to-all"
    assert 0.0 < cap["err_2q"] < 0.1
    assert cap["source"], "every capability entry must cite where its numbers came from"
    assert cap["source_url"].startswith("http"), "citations must be clickable"
    assert date.fromisoformat(cap["published_date"])


def test_simulator_is_error_free_and_free():
    cap = get_capability("ionq", "ionq_simulator")
    assert cap is not None
    assert cap["err_1q"] == 0.0
    assert cap["err_2q"] == 0.0
    assert cap["err_readout"] == 0.0
    assert cap["cost_amount"] == 0.0
    assert cap["cost_unit"] == "free"


def test_cost_carries_its_unit_and_basis():
    # IonQ genuinely bills per shot in USD; IBM bills per runtime-second. A
    # bare "cost_per_shot_usd" would mislabel one of them.
    ionq = get_capability("ionq", "qpu.forte-1")
    ibm = get_capability("ibm", "ibm_torino")
    assert ionq["cost_unit"] == "USD" and ionq["cost_amount"] > 0
    assert ibm["cost_unit"] == "free"
    assert "runtime-second" in ibm["cost_basis"]


def test_calibration_age_and_confidence_degrade_over_time():
    cap = get_capability("ibm", "ibm_torino")
    published = date.fromisoformat(cap["published_date"])

    assert calibration_age_days(cap, today=published) == 0
    assert confidence(cap, today=published) == "high"
    # 45 days on: past _FRESH_DAYS (30), inside _USABLE_DAYS (180).
    assert confidence(cap, today=published + timedelta(days=45)) == "medium"
    assert confidence(cap, today=published + timedelta(days=400)) == "low"


def test_simulator_calibration_never_goes_stale():
    cap = get_capability("ionq", "ionq_simulator")
    assert confidence(cap) == "high"


def test_unknown_device_returns_none_rather_than_inventing_numbers():
    assert get_capability("qbraid", "some_device_we_never_catalogued") is None


def test_live_data_overrides_static_queue_depth():
    cap = get_capability("ibm", "ibm_torino", live={"pending_jobs": 42, "num_qubits": 133})
    assert cap["pending_jobs"] == 42
    assert cap["num_qubits"] == 133


def test_live_override_ignores_keys_it_does_not_own():
    # A provider reporting a bogus error rate must not silently replace a
    # cited static value — only queue depth and qubit count are live-owned.
    cap = get_capability("ibm", "ibm_torino", live={"err_2q": 0.99})
    assert cap["err_2q"] < 0.5


if __name__ == "__main__":
    test_device_key_matches_frontend_convention()
    test_known_hardware_has_cited_error_rates()
    test_simulator_is_error_free_and_free()
    test_cost_carries_its_unit_and_basis()
    test_calibration_age_and_confidence_degrade_over_time()
    test_simulator_calibration_never_goes_stale()
    test_unknown_device_returns_none_rather_than_inventing_numbers()
    test_live_data_overrides_static_queue_depth()
    test_live_override_ignores_keys_it_does_not_own()
    print("ok")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_device_capabilities.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'services.qroute'`

- [ ] **Step 3: Create the package marker**

Create `backend/services/qroute/__init__.py` as an empty file (matches `backend/services/qforge/__init__.py`, which is 1 blank line).

- [ ] **Step 4: Write the capability table**

Create `backend/services/qroute/device_capabilities.py`:

```python
"""Per-device capability data for the resource optimizer.

Every number in _STATIC is a PUBLISHED typical/median value taken from the
provider's own documentation or calibration dashboard — not a measurement we
made. Real devices are recalibrated (IBM daily), so these are a defensible
starting point that `live` overrides correct wherever a provider actually
exposes current data. The `source` field is mandatory: an education tool that
shows a fidelity number owes the student a citation for it.

ponytail: static table + narrow live override, rather than per-provider
calibration ingestion. Upgrade path is per-adapter get_device_calibration()
feeding the same `live` dict — the merge below already accepts it.
"""

from datetime import date
from typing import Optional, TypedDict


class DeviceCapability(TypedDict):
    num_qubits: int
    connectivity: str            # "all-to-all" | "limited"
    basis_gates: list[str]
    err_1q: float                # median single-qubit gate error
    err_2q: float                # median two-qubit (entangling) gate error
    err_readout: float           # median measurement/readout error
    # Cost is NOT always USD-per-shot: IBM Runtime bills per second, qBraid
    # bills in platform credits, IonQ bills per shot. One number plus its unit
    # plus a plain-English basis is honest; a single `cost_per_shot_usd` field
    # would silently mislabel three of the four providers.
    cost_amount: float           # per shot, expressed in cost_unit
    cost_unit: str               # "USD" | "credits" | "free"
    cost_basis: str              # human-readable billing note shown in the UI
    pending_jobs: Optional[int]  # live-only; None until a provider reports it
    source: str
    source_url: str
    published_date: str          # ISO date the cited numbers were published


def device_key(provider: str, device_id: str) -> str:
    """`provider::device_id` — the SAME key QRoutePage.tsx builds for
    selectedDeviceKey, so a recommendation can be clicked straight into the
    existing device selector without any translation layer."""
    return f"{provider}::{device_id}"


# Superconducting transmon basis (IBM Heron): CZ entangler + sqrt(X)/RZ/X.
_SUPERCONDUCTING_BASIS = ["cz", "rz", "sx", "x", "id"]
# Trapped-ion basis: fully-connected MS/ZZ entangler + arbitrary single-qubit
# rotations. Modelled with Qiskit's rzz, which transpiles cleanly.
_TRAPPED_ION_BASIS = ["rzz", "rz", "ry", "rx"]

_IDEAL_SIMULATOR = {
    "connectivity": "all-to-all",
    "basis_gates": _SUPERCONDUCTING_BASIS,
    "err_1q": 0.0,
    "err_2q": 0.0,
    "err_readout": 0.0,
    "cost_amount": 0.0,
    "cost_unit": "free",
    "cost_basis": "Local/hosted simulator — no charge.",
    "pending_jobs": None,
    "source": "Ideal noiseless simulator — no gate errors by definition",
    "source_url": "",
    # A simulator's "calibration" never goes stale, so it is always current.
    "published_date": date.today().isoformat(),
}

# IMPORTANT: published_date is the date the CITED NUMBERS were published, not
# the date this file was edited. Bumping it without re-reading the provider's
# calibration page is falsifying a citation.
_STATIC: dict[str, DeviceCapability] = {
    "ibm::ibm_torino": {
        "num_qubits": 133,
        "connectivity": "limited",
        "basis_gates": _SUPERCONDUCTING_BASIS,
        "err_1q": 3.0e-4,
        "err_2q": 3.5e-3,
        "err_readout": 1.5e-2,
        "cost_amount": 0.0,
        "cost_unit": "free",
        "cost_basis": "IBM Cloud bills per runtime-second, not per shot — free on the Open plan.",
        "pending_jobs": None,
        "source": "IBM Quantum Platform calibration page, Heron r1 typical medians",
        "source_url": "https://quantum.ibm.com/services/resources",
        "published_date": "2025-06-01",
    },
    "ibm::ibm_brisbane": {
        "num_qubits": 127,
        "connectivity": "limited",
        "basis_gates": ["ecr", "rz", "sx", "x", "id"],
        "err_1q": 2.5e-4,
        "err_2q": 7.5e-3,
        "err_readout": 2.0e-2,
        "cost_amount": 0.0,
        "cost_unit": "free",
        "cost_basis": "IBM Cloud bills per runtime-second, not per shot — free on the Open plan.",
        "pending_jobs": None,
        "source": "IBM Quantum Platform calibration page, Eagle r3 typical medians",
        "source_url": "https://quantum.ibm.com/services/resources",
        "published_date": "2025-06-01",
    },
    "ionq::qpu.forte-1": {
        "num_qubits": 36,
        "connectivity": "all-to-all",
        "basis_gates": _TRAPPED_ION_BASIS,
        "err_1q": 2.0e-4,
        "err_2q": 1.5e-2,
        "err_readout": 5.0e-3,
        "cost_amount": 0.03,
        "cost_unit": "USD",
        "cost_basis": "IonQ bills per shot, scaled by gate count — this is a flat approximation.",
        "pending_jobs": None,
        "source": "IonQ Forte published typical gate fidelities (1q 99.98%, 2q 98.5%)",
        "source_url": "https://ionq.com/quantum-systems/forte",
        "published_date": "2025-06-01",
    },
    "ionq::ionq_simulator": {
        **_IDEAL_SIMULATOR,
        "num_qubits": 29,
        "basis_gates": _TRAPPED_ION_BASIS,
    },
    "iqm::garnet": {
        "num_qubits": 20,
        "connectivity": "limited",
        "basis_gates": _SUPERCONDUCTING_BASIS,
        "err_1q": 8.0e-4,
        "err_2q": 5.0e-3,
        "err_readout": 2.5e-2,
        "cost_amount": 0.0,
        "cost_unit": "free",
        "cost_basis": "Self-hosted IQM Resonance access — no per-shot charge.",
        "pending_jobs": None,
        "source": "IQM Garnet published typical fidelities (1q 99.92%, 2q 99.5%)",
        "source_url": "https://www.meetiqm.com/products/iqm-radiance",
        "published_date": "2025-06-01",
    },
    "qbraid::qbraid_qir_simulator": {
        **_IDEAL_SIMULATOR,
        "num_qubits": 30,
    },
}

# Calibration older than this is flagged. IBM recalibrates roughly daily and
# devices can drift several-fold between calibrations, so a static table is
# always a starting point — the point of surfacing age is that the student can
# see how much to trust the number, not that the number is worthless.
_FRESH_DAYS = 30
_USABLE_DAYS = 180

# Only these keys may be replaced by live provider data. A provider reporting a
# nonsense error rate must never silently overwrite a cited static value.
_LIVE_OWNED_KEYS = ("pending_jobs", "num_qubits")


def get_capability(
    provider: str, device_id: str, live: Optional[dict] = None
) -> Optional[DeviceCapability]:
    """Returns the capability record for one device, or None if we have no
    cited data for it. None is deliberate: the ranker surfaces such devices in
    a separate 'unrated' list rather than scoring them off invented numbers."""
    static = _STATIC.get(device_key(provider, device_id))
    if static is None:
        return None

    merged: DeviceCapability = dict(static)  # type: ignore[assignment]
    if live:
        for key in _LIVE_OWNED_KEYS:
            if live.get(key) is not None:
                merged[key] = live[key]  # type: ignore[literal-required]
    return merged


def calibration_age_days(cap: DeviceCapability, today: Optional[date] = None) -> Optional[int]:
    """Days since the cited numbers were published, or None if unparseable."""
    try:
        published = date.fromisoformat(cap["published_date"])
    except (ValueError, KeyError):
        return None
    return ((today or date.today()) - published).days


def confidence(cap: DeviceCapability, today: Optional[date] = None) -> str:
    """"high" | "medium" | "low", derived ONLY from calibration age.

    Deliberately qualitative. Published error rates carry no uncertainties to
    propagate, so a numeric interval like "94.7% +/- 3%" would be invented
    precision — the exact thing this module refuses to do elsewhere. The real
    error bar comes from the calibration loop (GET /calibration): once enough
    jobs have run, the MEASURED mean absolute error is an empirical
    uncertainty earned from this user's own hardware runs."""
    age = calibration_age_days(cap, today)
    if age is None:
        return "low"
    if age <= _FRESH_DAYS:
        return "high"
    if age <= _USABLE_DAYS:
        return "medium"
    return "low"
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && pytest tests/test_device_capabilities.py -v`
Expected: PASS, 9 passed

- [ ] **Step 6: Add the two live fields to DeviceInfo**

In `backend/services/quantum_providers/base.py`, change the import line and the `DeviceInfo` class:

```python
from abc import ABC, abstractmethod
from typing import Literal, NotRequired, Optional, TypedDict
```

```python
class DeviceInfo(TypedDict):
    id: str                # provider-native device id, passed back verbatim in submit_job
    name: str
    provider: str           # "qbraid" | "ibm" | "ionq" | "iqm" | "qniverse"
    modality: Modality      # per-DEVICE, not per-provider — aggregators mix modalities
    is_simulator: bool
    status: str
    # NotRequired so the three adapters that can't cheaply report these keep
    # returning valid DeviceInfo dicts unchanged. The resource optimizer treats
    # a missing key exactly like None: fall back to the static capability table.
    num_qubits: NotRequired[Optional[int]]
    pending_jobs: NotRequired[Optional[int]]
```

- [ ] **Step 7: Populate them in the IBM adapter**

In `backend/services/quantum_providers/ibm_adapter.py`, replace the body of `list_devices` (lines 46-61):

```python
    def list_devices(self) -> list[DeviceInfo]:
        devices = []
        for backend in self.service.backends():
            # One status() call already gives BOTH operational and pending_jobs
            # — the same field get_job_result already reads for status_detail,
            # just fetched at selection time so the optimizer can rank on it.
            try:
                status = backend.status()
                operational = status.operational
                pending = status.pending_jobs
            except Exception:
                operational = False
                pending = None
            devices.append({
                "id": backend.name,
                "name": backend.name,
                "provider": self.provider_id,
                "modality": "superconducting",
                "is_simulator": False,
                "status": "AVAILABLE" if operational else "UNAVAILABLE",
                "num_qubits": getattr(backend, "num_qubits", None),
                "pending_jobs": pending,
            })
        return devices
```

- [ ] **Step 8: Verify nothing regressed**

Run: `cd backend && pytest -v`
Expected: PASS — all pre-existing tests plus the 6 new ones. `test_device_fetch_budget.py` and `test_production_provider_filtering.py` must still pass.

- [ ] **Step 9: Commit**

```bash
git add backend/services/qroute/__init__.py backend/services/qroute/device_capabilities.py backend/services/quantum_providers/base.py backend/services/quantum_providers/ibm_adapter.py backend/tests/test_device_capabilities.py
git commit -m "feat(qroute): device capability table with cited error rates and live queue depth"
```

---

### Task 2: Offline transpile-and-score engine

**Files:**
- Create: `backend/services/qroute/resource_optimizer.py`
- Test: `backend/tests/test_resource_optimizer.py`

**Interfaces:**
- Consumes: `DeviceCapability`, `device_key` from Task 1
- Produces:
  - `ExecutionEstimate` dataclass with fields `device_key, provider, device_id, device_name, fits, circuit_qubits, transpiled_depth, one_qubit_gates, two_qubit_gates, routing_overhead_2q, expected_fidelity, estimated_cost, cost_unit, cost_basis, pending_jobs, calibration_age_days, confidence, notes`
  - `estimate_execution(qasm: str, shots: int, cap: DeviceCapability, provider: str, device_id: str, device_name: str) -> ExecutionEstimate`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_resource_optimizer.py`:

```python
# backend/tests/test_resource_optimizer.py
from services.qroute.device_capabilities import get_capability
from services.qroute.resource_optimizer import estimate_execution

# 3-qubit GHZ — 2 entangling gates, 3 measurements. Small enough to reason
# about by hand, big enough to need routing on a linear coupling map.
GHZ_QASM = """OPENQASM 2.0;
include "qelib1.inc";
qreg q[3];
creg c[3];
h q[0];
cx q[0],q[1];
cx q[1],q[2];
measure q[0] -> c[0];
measure q[1] -> c[1];
measure q[2] -> c[2];
"""


def _estimate(provider, device_id, qasm=GHZ_QASM, shots=1024):
    cap = get_capability(provider, device_id)
    assert cap is not None, f"{provider}::{device_id} must be in the capability table"
    return estimate_execution(qasm, shots, cap, provider, device_id, device_id)


def test_ideal_simulator_has_perfect_fidelity_and_zero_cost():
    est = _estimate("ionq", "ionq_simulator")
    assert est.expected_fidelity == 1.0
    assert est.estimated_cost == 0.0
    assert est.cost_unit == "free"
    assert est.fits is True


def test_estimate_carries_calibration_provenance():
    est = _estimate("ibm", "ibm_torino")
    assert est.confidence in ("high", "medium", "low")
    assert est.calibration_age_days is not None and est.calibration_age_days >= 0
    assert est.cost_basis, "the UI shows this to explain how the device actually bills"


def test_real_hardware_fidelity_is_between_zero_and_one():
    est = _estimate("ionq", "qpu.forte-1")
    assert 0.0 < est.expected_fidelity < 1.0


def test_noisier_two_qubit_gates_lower_the_fidelity():
    # Isolates the 2q term: two otherwise-identical devices differing ONLY in
    # err_2q must rank by it. Comparing two real devices would not test this,
    # because their 1q and readout errors differ too (see the next test).
    base = get_capability("ibm", "ibm_torino")
    clean = dict(base); clean["err_2q"] = 1.0e-3
    noisy = dict(base); noisy["err_2q"] = 5.0e-2
    a = estimate_execution(GHZ_QASM, 1024, clean, "ibm", "d", "d")
    b = estimate_execution(GHZ_QASM, 1024, noisy, "ibm", "d", "d")
    assert a.expected_fidelity > b.expected_fidelity


def test_readout_error_can_dominate_a_shallow_circuit():
    """GHZ has 3 measurements but only 2 entangling gates, so IonQ Forte
    (2q 1.5e-2 but readout 5e-3) BEATS IBM Torino (2q 3.5e-3 but readout
    1.5e-2) on it — verified numerically at 0.9535 vs 0.9453.

    This is the model working, not a bug, and it is exactly the kind of
    counterintuitive tradeoff the panel exists to show a student: the best
    device depends on the circuit, not on a league table.

    Table-dependent: if _STATIC's error rates are updated, recompute and
    update this assertion rather than deleting it."""
    forte = _estimate("ionq", "qpu.forte-1")
    torino = _estimate("ibm", "ibm_torino")
    assert forte.expected_fidelity > torino.expected_fidelity


def test_all_to_all_connectivity_adds_no_routing_overhead():
    est = _estimate("ionq", "qpu.forte-1")
    assert est.routing_overhead_2q == 0


def test_limited_connectivity_reports_transpiled_gate_counts():
    est = _estimate("ibm", "ibm_torino")
    assert est.two_qubit_gates >= 2, "GHZ needs at least 2 entangling gates"
    assert est.transpiled_depth > 0
    assert est.routing_overhead_2q >= 0


def test_cost_scales_with_shots():
    cheap = _estimate("ionq", "qpu.forte-1", shots=100)
    dear = _estimate("ionq", "qpu.forte-1", shots=1000)
    assert dear.estimated_cost > cheap.estimated_cost
    assert dear.cost_unit == "USD"


def test_circuit_too_wide_for_device_is_marked_unfit():
    wide = """OPENQASM 2.0;
include "qelib1.inc";
qreg q[40];
creg c[40];
h q[0];
"""
    est = _estimate("iqm", "garnet", qasm=wide)   # garnet has 20 qubits
    assert est.fits is False
    assert "qubit" in est.notes.lower()
    assert est.expected_fidelity == 0.0


def test_invalid_qasm_raises_rather_than_scoring_garbage():
    try:
        _estimate("ibm", "ibm_torino", qasm="this is not qasm")
    except Exception:
        return
    raise AssertionError("invalid QASM must raise, not silently produce an estimate")


if __name__ == "__main__":
    test_ideal_simulator_has_perfect_fidelity_and_zero_cost()
    test_estimate_carries_calibration_provenance()
    test_real_hardware_fidelity_is_between_zero_and_one()
    test_noisier_two_qubit_gates_lower_the_fidelity()
    test_readout_error_can_dominate_a_shallow_circuit()
    test_all_to_all_connectivity_adds_no_routing_overhead()
    test_limited_connectivity_reports_transpiled_gate_counts()
    test_cost_scales_with_shots()
    test_circuit_too_wide_for_device_is_marked_unfit()
    test_invalid_qasm_raises_rather_than_scoring_garbage()
    print("ok")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_resource_optimizer.py -v`
Expected: FAIL with `ImportError: cannot import name 'estimate_execution'`

- [ ] **Step 3: Write the engine**

Create `backend/services/qroute/resource_optimizer.py`:

```python
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_resource_optimizer.py -v`
Expected: PASS, 10 passed

- [ ] **Step 5: Commit**

```bash
git add backend/services/qroute/resource_optimizer.py backend/tests/test_resource_optimizer.py
git commit -m "feat(qroute): offline transpile-and-score engine for per-device execution estimates"
```

---

### Task 3: Ranking with explainable rationale

**Files:**
- Modify: `backend/services/qroute/resource_optimizer.py` (append)
- Test: `backend/tests/test_resource_optimizer.py` (append)

**Interfaces:**
- Consumes: `ExecutionEstimate`, `estimate_execution` from Task 2
- Produces:
  - `DEFAULT_WEIGHTS: dict[str, float]` = `{"fidelity": 0.6, "queue": 0.25, "cost": 0.15}`
  - `Recommendation` dataclass: `estimate: ExecutionEstimate, score: float, rationale: str, factors: list[dict]` where each factor is `{"sign": "+" | "-" | "~", "text": str}`
  - `rank_devices(qasm: str, shots: int, devices: list[dict], weights: dict | None = None) -> tuple[list[Recommendation], list[dict]]` returning `(ranked, unrated)`

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/test_resource_optimizer.py`:

```python
from services.qroute.resource_optimizer import DEFAULT_WEIGHTS, rank_devices

DEVICES = [
    {"id": "ionq_simulator", "name": "IonQ Simulator", "provider": "ionq", "is_simulator": True},
    {"id": "qpu.forte-1", "name": "IonQ Forte 1", "provider": "ionq", "is_simulator": False},
    {"id": "ibm_torino", "name": "ibm_torino", "provider": "ibm", "is_simulator": False},
    {"id": "mystery_box", "name": "Mystery Box", "provider": "qbraid", "is_simulator": False},
]


def test_ranking_returns_every_known_device_scored_and_sorted():
    ranked, unrated = rank_devices(GHZ_QASM, 1024, DEVICES)
    assert len(ranked) == 3
    scores = [r.score for r in ranked]
    assert scores == sorted(scores, reverse=True), "must be sorted best-first"


def test_uncatalogued_device_is_reported_unrated_not_scored():
    ranked, unrated = rank_devices(GHZ_QASM, 1024, DEVICES)
    assert [d["id"] for d in unrated] == ["mystery_box"]
    assert all(r.estimate.device_id != "mystery_box" for r in ranked)


def test_every_recommendation_explains_itself_with_numbers():
    ranked, _ = rank_devices(GHZ_QASM, 1024, DEVICES)
    for rec in ranked:
        assert rec.rationale, "a recommendation with no explanation is not usable in a teaching tool"
        assert "fidelity" in rec.rationale.lower()


def test_fidelity_is_labelled_as_an_upper_bound_not_a_prediction():
    ranked, _ = rank_devices(GHZ_QASM, 1024, DEVICES)
    assert "upper bound" in ranked[0].rationale.lower()


def test_factors_are_signed_and_cover_the_real_tradeoffs():
    ranked, _ = rank_devices(GHZ_QASM, 1024, DEVICES)
    forte = next(r for r in ranked if r.estimate.device_id == "qpu.forte-1")
    signs = {f["sign"] for f in forte.factors}
    texts = " ".join(f["text"] for f in forte.factors).lower()
    assert signs <= {"+", "-", "~"}
    assert "+" in signs and "-" in signs, "a paid all-to-all device has both pros and cons"
    assert "routing" in texts
    assert "costs" in texts, "the only paid device must show its cost as a minus"


def test_paid_device_cost_factor_names_its_unit():
    ranked, _ = rank_devices(GHZ_QASM, 1024, DEVICES)
    forte = next(r for r in ranked if r.estimate.device_id == "qpu.forte-1")
    cost_factor = next(f for f in forte.factors if "costs" in f["text"])
    assert "$" in cost_factor["text"]


def test_weighting_cost_heavily_demotes_the_paid_device():
    fidelity_first, _ = rank_devices(GHZ_QASM, 1024, DEVICES, {"fidelity": 1.0, "queue": 0.0, "cost": 0.0})
    cost_first, _ = rank_devices(GHZ_QASM, 1024, DEVICES, {"fidelity": 0.0, "queue": 0.0, "cost": 1.0})
    paid = "qpu.forte-1"
    rank_by_fidelity = [r.estimate.device_id for r in fidelity_first].index(paid)
    rank_by_cost = [r.estimate.device_id for r in cost_first].index(paid)
    assert rank_by_cost > rank_by_fidelity, "the only paid device must fall when cost dominates"


def test_queue_depth_penalises_a_busy_device():
    quiet = [{"id": "ibm_torino", "name": "t", "provider": "ibm", "is_simulator": False,
              "pending_jobs": 0}]
    busy = [{"id": "ibm_torino", "name": "t", "provider": "ibm", "is_simulator": False,
             "pending_jobs": 500}]
    q, _ = rank_devices(GHZ_QASM, 1024, quiet)
    b, _ = rank_devices(GHZ_QASM, 1024, busy)
    assert q[0].score > b[0].score


def test_device_too_small_is_ranked_last_not_dropped():
    wide = """OPENQASM 2.0;
include "qelib1.inc";
qreg q[30];
creg c[30];
h q[0];
"""
    ranked, _ = rank_devices(wide, 100, DEVICES)
    assert ranked[-1].estimate.fits is False
    assert ranked[0].estimate.fits is True


def test_default_weights_sum_to_one():
    assert abs(sum(DEFAULT_WEIGHTS.values()) - 1.0) < 1e-9
```

Also add these to the `__main__` block at the bottom of the file.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_resource_optimizer.py -v`
Expected: FAIL with `ImportError: cannot import name 'DEFAULT_WEIGHTS'`

- [ ] **Step 3: Append the ranker**

Append to `backend/services/qroute/resource_optimizer.py`:

```python
from .device_capabilities import get_capability

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_resource_optimizer.py -v`
Expected: PASS, 21 passed

- [ ] **Step 5: Commit**

```bash
git add backend/services/qroute/resource_optimizer.py backend/tests/test_resource_optimizer.py
git commit -m "feat(qroute): weighted device ranking with per-device rationale"
```

---

### Task 4: `POST /recommend` endpoint

**Files:**
- Modify: `backend/routers/qroute_router.py` (add imports, model, endpoint after `list_devices`)
- Test: `backend/tests/test_recommend_endpoint.py`

**Interfaces:**
- Consumes: `rank_devices`, `DEFAULT_WEIGHTS` from Task 3; the existing `list_devices()` coroutine in the same module
- Produces: `POST /api/v1/qroute/recommend` returning
  `{"ranked": [{"device_key", "provider", "device_id", "device_name", "score", "rationale", "factors", "fits", "expected_fidelity", "estimated_cost", "cost_unit", "cost_basis", "pending_jobs", "calibration_age_days", "confidence", "transpiled_depth", "one_qubit_gates", "two_qubit_gates", "routing_overhead_2q", "circuit_qubits"}], "unrated": [...], "weights": {...}}`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_recommend_endpoint.py`:

```python
# backend/tests/test_recommend_endpoint.py
import asyncio
from unittest.mock import patch

from routers import qroute_router

GHZ_QASM = """OPENQASM 2.0;
include "qelib1.inc";
qreg q[3];
creg c[3];
h q[0];
cx q[0],q[1];
cx q[1],q[2];
measure q[0] -> c[0];
measure q[1] -> c[1];
measure q[2] -> c[2];
"""

FAKE_DEVICES = [
    {"id": "ionq_simulator", "name": "IonQ Simulator", "provider": "ionq",
     "modality": "trapped-ion", "is_simulator": True, "status": "AVAILABLE"},
    {"id": "ibm_torino", "name": "ibm_torino", "provider": "ibm",
     "modality": "superconducting", "is_simulator": False, "status": "AVAILABLE",
     "pending_jobs": 12},
    {"id": "unknown_dev", "name": "Unknown", "provider": "qbraid",
     "modality": "aggregator", "is_simulator": False, "status": "AVAILABLE"},
]


async def _fake_list_devices(provider=None, current_user=None):
    return FAKE_DEVICES


def _post(body):
    request = qroute_router.RecommendRequest(**body)
    with patch.object(qroute_router, "list_devices", _fake_list_devices):
        return asyncio.run(qroute_router.recommend_devices(request, current_user={"_id": "u1"}))


def test_recommend_ranks_known_devices_and_lists_unknown_ones():
    result = _post({"qasm": GHZ_QASM, "shots": 1024})
    assert len(result["ranked"]) == 2
    assert [d["id"] for d in result["unrated"]] == ["unknown_dev"]


def test_every_ranked_entry_carries_the_fields_the_ui_renders():
    result = _post({"qasm": GHZ_QASM, "shots": 1024})
    required = {
        "device_key", "provider", "device_id", "device_name", "score", "rationale",
        "factors", "fits", "expected_fidelity", "estimated_cost", "cost_unit",
        "cost_basis", "pending_jobs", "calibration_age_days", "confidence",
        "transpiled_depth", "one_qubit_gates", "two_qubit_gates",
        "routing_overhead_2q", "circuit_qubits",
    }
    for entry in result["ranked"]:
        assert required <= set(entry), f"missing {required - set(entry)}"


def test_device_key_can_be_fed_straight_back_to_the_selector():
    result = _post({"qasm": GHZ_QASM, "shots": 1024})
    for entry in result["ranked"]:
        assert entry["device_key"] == f"{entry['provider']}::{entry['device_id']}"


def test_invalid_qasm_returns_400_not_500():
    from fastapi import HTTPException
    try:
        _post({"qasm": "not valid qasm at all", "shots": 100})
    except HTTPException as e:
        assert e.status_code == 400
        return
    raise AssertionError("invalid QASM must raise HTTPException(400)")


def test_custom_weights_are_echoed_back_for_transparency():
    result = _post({"qasm": GHZ_QASM, "shots": 1024, "weights": {"fidelity": 1.0, "queue": 0.0, "cost": 0.0}})
    assert result["weights"] == {"fidelity": 1.0, "queue": 0.0, "cost": 0.0}


if __name__ == "__main__":
    test_recommend_ranks_known_devices_and_lists_unknown_ones()
    test_every_ranked_entry_carries_the_fields_the_ui_renders()
    test_device_key_can_be_fed_straight_back_to_the_selector()
    test_invalid_qasm_returns_400_not_500()
    test_custom_weights_are_echoed_back_for_transparency()
    print("ok")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_recommend_endpoint.py -v`
Expected: FAIL with `AttributeError: module 'routers.qroute_router' has no attribute 'RecommendRequest'`

- [ ] **Step 3: Add the endpoint**

In `backend/routers/qroute_router.py`, add to the imports near `from services.qiskit_service import ensure_measurements`:

```python
from services.qroute.resource_optimizer import DEFAULT_WEIGHTS, rank_devices
```

Then add immediately after the `list_devices` endpoint function:

```python
class RecommendRequest(BaseModel):
    qasm: str
    shots: int = 1024
    # Optional per-request override so the UI can offer "prioritise accuracy"
    # vs "prioritise speed" without a second endpoint.
    weights: dict[str, float] | None = None


def _serialize_recommendation(rec) -> dict:
    est = rec.estimate
    return {
        "device_key": est.device_key,
        "provider": est.provider,
        "device_id": est.device_id,
        "device_name": est.device_name,
        "score": rec.score,
        "rationale": rec.rationale,
        "factors": rec.factors,
        "fits": est.fits,
        "circuit_qubits": est.circuit_qubits,
        "transpiled_depth": est.transpiled_depth,
        "one_qubit_gates": est.one_qubit_gates,
        "two_qubit_gates": est.two_qubit_gates,
        "routing_overhead_2q": est.routing_overhead_2q,
        "expected_fidelity": est.expected_fidelity,
        "estimated_cost": est.estimated_cost,
        "cost_unit": est.cost_unit,
        "cost_basis": est.cost_basis,
        "pending_jobs": est.pending_jobs,
        "calibration_age_days": est.calibration_age_days,
        "confidence": est.confidence,
    }


@router.post("/recommend")
async def recommend_devices(
    request: RecommendRequest, current_user: dict = Depends(get_current_user)
):
    """Ranks every available backend for THIS circuit.

    Reuses list_devices() above rather than re-fetching, so it inherits the
    same cache, the same per-provider refresh de-duplication, and the same
    25s budget. Scoring itself is pure local transpilation — no provider calls
    — so this endpoint adds negligible time on top of the device listing."""
    devices = await list_devices(current_user=current_user)

    try:
        ranked, unrated = rank_devices(
            request.qasm, request.shots, devices, request.weights
        )
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Could not analyse this circuit's OpenQASM: {e}"
        )

    return {
        "ranked": [_serialize_recommendation(r) for r in ranked],
        "unrated": unrated,
        "weights": request.weights or DEFAULT_WEIGHTS,
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_recommend_endpoint.py -v`
Expected: PASS, 5 passed

- [ ] **Step 5: Verify the whole backend suite still passes**

Run: `cd backend && pytest -v`
Expected: PASS, all tests

- [ ] **Step 6: Smoke-test against the running server**

Start the API (`cd backend && uvicorn main:app --reload`), then in a second shell:

```bash
curl -s -X POST http://localhost:8000/api/v1/qroute/recommend \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  -d '{"qasm":"OPENQASM 2.0;\ninclude \"qelib1.inc\";\nqreg q[3];\ncreg c[3];\nh q[0];\ncx q[0],q[1];\ncx q[1],q[2];\nmeasure q[0] -> c[0];\nmeasure q[1] -> c[1];\nmeasure q[2] -> c[2];\n","shots":1024}'
```

Expected: JSON with a non-empty `ranked` array, each entry carrying `expected_fidelity` and `rationale`.

- [ ] **Step 7: Commit**

```bash
git add backend/routers/qroute_router.py backend/tests/test_recommend_endpoint.py
git commit -m "feat(qroute): POST /recommend endpoint ranking backends for a given circuit"
```

---

### Task 5: Recommendation panel in QRoutePage

**Files:**
- Modify: `frontend/src/modules/qroute/hooks/useQRouteApi.ts`
- Create: `frontend/src/modules/qroute/components/RecommendationPanel.tsx`
- Modify: `frontend/src/modules/qroute/pages/QRoutePage.tsx`

**Interfaces:**
- Consumes: `POST /api/v1/qroute/recommend` from Task 4
- Produces:
  - `DeviceRecommendation` and `RecommendResponse` TypeScript interfaces
  - `recommendDevices(qasm: string, shots: number, weights?: Record<string, number>) => Promise<RecommendResponse>` on `useQRouteApi`
  - `<RecommendationPanel qasm shots onSelect />` where `onSelect(deviceKey: string) => void`

- [ ] **Step 1: Add types and the API call**

In `frontend/src/modules/qroute/hooks/useQRouteApi.ts`, add after the `QRouteDevice` interface:

```typescript
export interface RecommendationFactor {
  sign: '+' | '-' | '~';
  text: string;
}

export interface DeviceRecommendation {
  device_key: string;
  provider: string;
  device_id: string;
  device_name: string;
  score: number;
  rationale: string;
  factors: RecommendationFactor[];
  fits: boolean;
  circuit_qubits: number;
  transpiled_depth: number;
  one_qubit_gates: number;
  two_qubit_gates: number;
  routing_overhead_2q: number;
  // UPPER BOUND, not a prediction — always label it as such in the UI.
  expected_fidelity: number;
  estimated_cost: number;
  cost_unit: string;
  cost_basis: string;
  pending_jobs: number | null;
  calibration_age_days: number | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface RecommendResponse {
  ranked: DeviceRecommendation[];
  // Devices with no published calibration data — shown as "no data", never scored.
  unrated: QRouteDevice[];
  weights: Record<string, number>;
}
```

Add this callback inside `useQRouteApi`, next to `listDevices`:

```typescript
  const recommendDevices = useCallback(
    async (qasm: string, shots: number, weights?: Record<string, number>): Promise<RecommendResponse> => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.post('/api/v1/qroute/recommend', { qasm, shots, weights });
        return response.data;
      } catch (err: any) {
        const errorMsg = err.response?.data?.detail || err.message || 'Failed to rank backends';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );
```

And add `recommendDevices` to the returned object:

```typescript
  return {
    listProviders, listDevices, recommendDevices, submitJob, getJobStatus, listJobs,
    runQCompare, getQCompare, runQCompareAudio, runQCompareAnimation,
    loading, error,
  };
```

- [ ] **Step 2: Build the panel**

Create `frontend/src/modules/qroute/components/RecommendationPanel.tsx`:

```tsx
import React, { useState } from 'react';
import { FaCircleNotch, FaMedal, FaExclamationTriangle } from 'react-icons/fa';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQRouteApi, type DeviceRecommendation, type RecommendResponse } from '../hooks/useQRouteApi';

interface Props {
  qasm: string;
  shots: number;
  onSelect: (deviceKey: string) => void;
}

// Named presets rather than raw sliders — a student picking "prioritise
// accuracy" learns the tradeoff exists; a 3-way weight slider teaches nothing.
const PRESETS: Record<string, Record<string, number>> = {
  Balanced: { fidelity: 0.6, queue: 0.25, cost: 0.15 },
  Accuracy: { fidelity: 1.0, queue: 0.0, cost: 0.0 },
  Speed: { fidelity: 0.3, queue: 0.7, cost: 0.0 },
  Cheapest: { fidelity: 0.2, queue: 0.0, cost: 0.8 },
};

const SIGN_STYLE: Record<string, string> = {
  '+': 'text-emerald-600 dark:text-emerald-400',
  '-': 'text-amber-600 dark:text-amber-400',
  '~': 'text-muted-foreground',
};

const CONFIDENCE_STYLE: Record<string, string> = {
  high: 'text-emerald-600 dark:text-emerald-400',
  medium: 'text-amber-600 dark:text-amber-400',
  low: 'text-destructive',
};

const RecommendationPanel: React.FC<Props> = ({ qasm, shots, onSelect }) => {
  const { recommendDevices } = useQRouteApi();
  const [result, setResult] = useState<RecommendResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preset, setPreset] = useState<string>('Balanced');

  const run = async (presetName: string) => {
    setPreset(presetName);
    setBusy(true);
    setErr(null);
    try {
      setResult(await recommendDevices(qasm, shots, PRESETS[presetName]));
    } catch (e: any) {
      setErr(e.response?.data?.detail || e.message || 'Could not rank backends');
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card size="sm" className="shrink-0">
      <CardHeader className="py-2 border-b">
        <CardTitle className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Resource Optimizer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-3">
        <div className="flex gap-2">
          {Object.keys(PRESETS).map((name) => (
            <Button
              key={name}
              size="sm"
              variant={preset === name && result ? 'default' : 'outline'}
              disabled={busy || !qasm.trim()}
              onClick={() => run(name)}
            >
              {name}
            </Button>
          ))}
        </div>

        {busy && (
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <FaCircleNotch className="animate-spin" /> Transpiling your circuit for every backend...
          </p>
        )}
        {err && <p className="text-xs text-destructive">{err}</p>}

        {result?.ranked.map((r: DeviceRecommendation, i: number) => (
          <button
            key={r.device_key}
            onClick={() => r.fits && onSelect(r.device_key)}
            disabled={!r.fits}
            className={`w-full text-left rounded-md border p-3 transition ${
              r.fits ? 'hover:border-primary cursor-pointer' : 'opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-2">
              {i === 0 && r.fits && <FaMedal className="text-amber-500 shrink-0" />}
              {!r.fits && <FaExclamationTriangle className="text-destructive shrink-0" />}
              <span className="font-medium text-sm">{r.device_name}</span>
              <span className="text-xs text-muted-foreground">· {r.provider}</span>
              {r.fits && (
                <span className="ml-auto text-xs font-mono" title="Upper bound — ignores decoherence and crosstalk">
                  ≤ {(r.expected_fidelity * 100).toFixed(1)}%
                </span>
              )}
            </div>

            {/* Signed tradeoffs, not prose — a student can scan "+ no routing /
                - costs $30.72" far faster than a sentence containing both. */}
            <ul className="mt-2 space-y-0.5">
              {r.factors.map((f, k) => (
                <li key={k} className={`text-xs leading-relaxed ${SIGN_STYLE[f.sign] ?? ''}`}>
                  <span className="font-mono mr-1">{f.sign}</span>
                  {f.text}
                </li>
              ))}
            </ul>

            {r.fits && (
              <div className="flex gap-3 mt-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <span>est. fidelity is an upper bound</span>
                <span className={CONFIDENCE_STYLE[r.confidence]}>
                  {r.confidence} confidence
                </span>
              </div>
            )}
          </button>
        ))}

        {result && result.unrated.length > 0 && (
          <p className="text-[10px] text-muted-foreground">
            No published calibration data for: {result.unrated.map((d) => d.name).join(', ')} — not ranked.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default RecommendationPanel;
```

- [ ] **Step 3: Mount it in QRoutePage**

In `frontend/src/modules/qroute/pages/QRoutePage.tsx`, add the import alongside the other component imports:

```tsx
import RecommendationPanel from '../components/RecommendationPanel';
```

Then insert the panel immediately **before** the device-selector `<Card size="sm" className="shrink-0">` block that begins at approximately line 324 (the card whose `CardContent` renders `devicesByModality`):

```tsx
            <RecommendationPanel
              qasm={qasm}
              shots={shots}
              onSelect={setSelectedDeviceKey}
            />
```

`setSelectedDeviceKey` and `shots` are already state in this component (lines 50-51), and `qasm` is the editor's current value — no new state needed. The backend emits `device_key` in the identical `provider::device_id` format `selectedDeviceKey` uses, so selection needs no translation.

- [ ] **Step 4: Verify it typechecks and builds**

Run: `cd frontend && npx tsc -b --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Verify in the browser**

Run `npm run dev` (NOT `npm run preview` — `import.meta.env.PROD` gates other features in a built bundle). Open `/qroute`, load or draw a circuit, click **Balanced**.

Expected: ranked backend cards appear with fidelity percentages and rationale text; clicking one highlights it in the device selector below; clicking **Accuracy** reorders the list.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/modules/qroute/hooks/useQRouteApi.ts frontend/src/modules/qroute/components/RecommendationPanel.tsx frontend/src/modules/qroute/pages/QRoutePage.tsx
git commit -m "feat(qroute): resource optimizer panel with accuracy/speed/balanced presets"
```

---

### Task 6: Record predictions and expose the calibration loop

**Files:**
- Modify: `backend/routers/qroute_router.py` (`submit_job`, `_serialize_job`, new `GET /calibration`)
- Test: `backend/tests/test_prediction_calibration.py`

**Interfaces:**
- Consumes: `rank_devices` from Task 3; the existing `quantum_hw_jobs` and `qcompare_reports` collections
- Produces:
  - `predicted_fidelity: float | None` persisted on each `quantum_hw_jobs` doc and returned by `_serialize_job`
  - `GET /api/v1/qroute/calibration` returning `{"points": [{"job_id", "device_id", "provider", "predicted_fidelity", "measured_fidelity", "created_at"}], "metrics": {"n", "mae", "rmse", "bias", "pearson_r"} | None}`
  - `_pearson(xs: list[float], ys: list[float]) -> float | None`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_prediction_calibration.py`:

```python
# backend/tests/test_prediction_calibration.py
from routers.qroute_router import _predict_fidelity, _calibration_points

GHZ_QASM = """OPENQASM 2.0;
include "qelib1.inc";
qreg q[3];
creg c[3];
h q[0];
cx q[0],q[1];
cx q[1],q[2];
measure q[0] -> c[0];
measure q[1] -> c[1];
measure q[2] -> c[2];
"""


def test_predicts_a_fidelity_for_a_catalogued_device():
    f = _predict_fidelity(GHZ_QASM, "ibm", "ibm_torino")
    assert f is not None
    assert 0.0 < f < 1.0


def test_returns_none_for_an_uncatalogued_device_rather_than_guessing():
    assert _predict_fidelity(GHZ_QASM, "qbraid", "never_heard_of_it") is None


def test_bad_qasm_predicts_none_instead_of_blocking_submission():
    # A prediction is a nice-to-have on the submit path. It must never be the
    # reason a student's job fails to submit.
    assert _predict_fidelity("garbage", "ibm", "ibm_torino") is None


def test_calibration_pairs_prediction_with_measured_fidelity():
    jobs = [
        {"_id": "j1", "provider": "ibm", "device_id": "ibm_torino",
         "predicted_fidelity": 0.90, "created_at": "2026-07-30T00:00:00Z"},
        {"_id": "j2", "provider": "ionq", "device_id": "qpu.forte-1",
         "predicted_fidelity": 0.80, "created_at": "2026-07-30T01:00:00Z"},
    ]
    reports = {"j1": 0.15, "j2": 0.30}   # job_id -> total_variation_distance
    points, metrics = _calibration_points(jobs, reports)

    assert len(points) == 2
    # measured fidelity is defined as 1 - TVD
    assert abs(points[0]["measured_fidelity"] - 0.85) < 1e-9
    assert abs(points[1]["measured_fidelity"] - 0.70) < 1e-9
    # errors are +0.05 and +0.10
    assert abs(metrics["mae"] - 0.075) < 1e-9
    assert abs(metrics["rmse"] - ((0.05**2 + 0.10**2) / 2) ** 0.5) < 1e-9
    # Positive bias: the upper-bound model over-predicts, as designed.
    assert metrics["bias"] > 0
    assert metrics["n"] == 2


def test_pearson_r_is_none_when_undefined():
    # A single point, and multiple identical points, both have no correlation
    # defined. Reporting 0.0 or 1.0 there would be a fabricated statistic.
    one = [{"_id": "j1", "provider": "ibm", "device_id": "d",
            "predicted_fidelity": 0.9, "created_at": "x"}]
    _, metrics = _calibration_points(one, {"j1": 0.1})
    assert metrics["pearson_r"] is None


def test_pearson_r_detects_correct_ranking_despite_absolute_error():
    # Model is uniformly 0.1 too optimistic — bad MAE, PERFECT ranking. r must
    # show that, because ranking is what the optimizer actually needs.
    jobs = [
        {"_id": f"j{i}", "provider": "ibm", "device_id": "d",
         "predicted_fidelity": p, "created_at": "x"}
        for i, p in enumerate([0.95, 0.85, 0.75])
    ]
    reports = {"j0": 0.15, "j1": 0.25, "j2": 0.35}   # measured 0.85, 0.75, 0.65
    _, metrics = _calibration_points(jobs, reports)
    assert abs(metrics["mae"] - 0.10) < 1e-9
    assert abs(metrics["pearson_r"] - 1.0) < 1e-9


def test_jobs_without_a_prediction_or_report_are_excluded():
    jobs = [
        {"_id": "j1", "provider": "ibm", "device_id": "d", "predicted_fidelity": None,
         "created_at": "x"},
        {"_id": "j2", "provider": "ibm", "device_id": "d", "predicted_fidelity": 0.9,
         "created_at": "x"},
    ]
    points, metrics = _calibration_points(jobs, {"j1": 0.1})   # j2 has no report
    assert points == []
    assert metrics is None


if __name__ == "__main__":
    test_predicts_a_fidelity_for_a_catalogued_device()
    test_returns_none_for_an_uncatalogued_device_rather_than_guessing()
    test_bad_qasm_predicts_none_instead_of_blocking_submission()
    test_calibration_pairs_prediction_with_measured_fidelity()
    test_pearson_r_is_none_when_undefined()
    test_pearson_r_detects_correct_ranking_despite_absolute_error()
    test_jobs_without_a_prediction_or_report_are_excluded()
    print("ok")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_prediction_calibration.py -v`
Expected: FAIL with `ImportError: cannot import name '_predict_fidelity'`

- [ ] **Step 3: Add the two helpers**

In `backend/routers/qroute_router.py`, add after `_serialize_recommendation`:

```python
def _predict_fidelity(qasm: str, provider: str, device_id: str) -> float | None:
    """The fidelity this circuit is predicted to achieve on this device.

    Recorded at submission so it can later be compared against qCompare's
    MEASURED divergence — that comparison is what turns the model from an
    assertion into something with a known error bar. Returns None rather than
    raising: a failed prediction must never block a student's submission."""
    try:
        ranked, _ = rank_devices(qasm, 1, [{"id": device_id, "name": device_id, "provider": provider}])
    except Exception:
        return None
    if not ranked or not ranked[0].estimate.fits:
        return None
    return ranked[0].estimate.expected_fidelity


def _calibration_points(jobs: list[dict], tvd_by_job: dict[str, float]):
    """Pairs each job's predicted fidelity with the fidelity actually measured.

    Measured fidelity is defined as 1 - TVD, where TVD is qCompare's total
    variation distance between the hardware counts and an ideal Aer simulation
    of the same circuit. Returns (points, metrics).

    `metrics` reports MAE, RMSE, bias and Pearson r — the set a paper would
    report, not just MAE. Each answers a different question: MAE is typical
    error size, RMSE punishes large misses, BIAS shows the model is
    systematically optimistic (it should be — the fidelity product is an upper
    bound), and Pearson r shows whether the model at least RANKS devices
    correctly even when its absolute values are off. Ranking correctly is what
    the optimizer actually needs.

    Deliberately no R^2: on a predicted-vs-measured comparison there are two
    different R^2s (about the parity line, and about a fitted line) and
    reporting an undefined one invites a fair challenge. RMSE plus r carries
    the same information unambiguously."""
    points = []
    for job in jobs:
        predicted = job.get("predicted_fidelity")
        tvd = tvd_by_job.get(str(job["_id"]))
        if predicted is None or tvd is None:
            continue
        points.append({
            "job_id": str(job["_id"]),
            "provider": job.get("provider", "qbraid"),
            "device_id": job["device_id"],
            "predicted_fidelity": predicted,
            "measured_fidelity": 1.0 - tvd,
            "created_at": job["created_at"],
        })

    if not points:
        return [], None

    n = len(points)
    errors = [p["predicted_fidelity"] - p["measured_fidelity"] for p in points]
    metrics = {
        "n": n,
        "mae": sum(abs(e) for e in errors) / n,
        "rmse": (sum(e * e for e in errors) / n) ** 0.5,
        # Positive bias = model optimistic, which is the expected direction.
        "bias": sum(errors) / n,
        "pearson_r": _pearson(
            [p["predicted_fidelity"] for p in points],
            [p["measured_fidelity"] for p in points],
        ),
    }
    return points, metrics


def _pearson(xs: list[float], ys: list[float]) -> float | None:
    """Pearson correlation, or None when it is undefined (fewer than 2 points,
    or no variance in either axis — e.g. every run on the same device)."""
    n = len(xs)
    if n < 2:
        return None
    mx, my = sum(xs) / n, sum(ys) / n
    dx = [x - mx for x in xs]
    dy = [y - my for y in ys]
    denom = (sum(v * v for v in dx) ** 0.5) * (sum(v * v for v in dy) ** 0.5)
    if denom == 0:
        return None
    return sum(a * b for a, b in zip(dx, dy)) / denom
```

- [ ] **Step 4: Record the prediction at submission**

In `submit_job`, inside the `doc = {...}` literal, add one key right after `"status_detail": None,`:

```python
        "predicted_fidelity": _predict_fidelity(qasm, request.provider, request.device_id),
```

Note it uses `qasm` (the measurement-normalized string), not `request.qasm` — the prediction must describe what actually ran.

In `_serialize_job`, add one line before `"created_at"`:

```python
        # Absent on jobs submitted before the resource optimizer shipped.
        "predicted_fidelity": doc.get("predicted_fidelity"),
```

- [ ] **Step 5: Add the calibration endpoint**

Add at the end of `backend/routers/qroute_router.py`:

```python
@router.get("/calibration")
async def get_calibration(current_user: dict = Depends(get_current_user)):
    """Predicted vs measured fidelity across this user's completed jobs.

    The optimizer's fidelity model assumes independent gate errors and ignores
    crosstalk and idle decoherence, so it is an upper bound. This endpoint says
    by how much, using real measurements — which is the difference between
    claiming a model works and showing it."""
    db = get_db()
    user_id = current_user.get("_id") or current_user.get("firebase_uid")

    jobs = await db.quantum_hw_jobs.find(
        {"user_id": user_id, "predicted_fidelity": {"$ne": None}}
    ).sort("created_at", -1).to_list(length=200)

    job_ids = [str(j["_id"]) for j in jobs]
    reports = await db.qcompare_reports.find(
        {"job_id": {"$in": job_ids}}
    ).to_list(length=200)
    tvd_by_job = {r["job_id"]: r["total_variation_distance"] for r in reports}

    points, metrics = _calibration_points(jobs, tvd_by_job)
    return {"points": points, "metrics": metrics}
```

- [ ] **Step 6: Run tests**

Run: `cd backend && pytest -v`
Expected: PASS, all tests including the 5 new ones.

- [ ] **Step 7: Commit**

```bash
git add backend/routers/qroute_router.py backend/tests/test_prediction_calibration.py
git commit -m "feat(qroute): record predicted fidelity per job and expose predicted-vs-measured calibration"
```

---

### Task 7: Prediction accuracy chart

**Files:**
- Modify: `frontend/src/modules/qroute/hooks/useQRouteApi.ts`
- Create: `frontend/src/modules/qroute/components/PredictionAccuracyChart.tsx`
- Modify: `frontend/src/modules/qroute/pages/QRoutePage.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/qroute/calibration` from Task 6
- Produces: `CalibrationPoint`, `CalibrationResponse` types; `getCalibration()` on `useQRouteApi`; `<PredictionAccuracyChart />` (no props)

- [ ] **Step 1: Add types and the API call**

In `frontend/src/modules/qroute/hooks/useQRouteApi.ts`, add after `RecommendResponse`:

```typescript
export interface CalibrationPoint {
  job_id: string;
  provider: string;
  device_id: string;
  predicted_fidelity: number;
  measured_fidelity: number;
  created_at: string;
}

export interface CalibrationMetrics {
  n: number;
  mae: number;
  rmse: number;
  // Positive = the model is systematically optimistic, which is expected:
  // the fidelity product is an upper bound.
  bias: number;
  // null when undefined (<2 points, or no variance on either axis).
  pearson_r: number | null;
}

export interface CalibrationResponse {
  points: CalibrationPoint[];
  metrics: CalibrationMetrics | null;
}
```

Add the callback and include `getCalibration` in the returned object:

```typescript
  const getCalibration = useCallback(async (): Promise<CalibrationResponse> => {
    try {
      const response = await apiClient.get('/api/v1/qroute/calibration');
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to load calibration data');
      throw err;
    }
  }, []);
```

- [ ] **Step 2: Build the chart**

Create `frontend/src/modules/qroute/components/PredictionAccuracyChart.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import {
  CartesianGrid, Legend, Line, ResponsiveContainer, Scatter, ScatterChart,
  Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQRouteApi, type CalibrationResponse } from '../hooks/useQRouteApi';

// y = x. Points on this line are perfect predictions; points above it mean the
// model was optimistic, which is the expected direction — the fidelity product
// ignores crosstalk and idle decoherence.
const PARITY = [{ x: 0, y: 0 }, { x: 1, y: 1 }];

const PredictionAccuracyChart: React.FC = () => {
  const { getCalibration } = useQRouteApi();
  const [data, setData] = useState<CalibrationResponse | null>(null);

  useEffect(() => {
    getCalibration().then(setData).catch(() => setData(null));
  }, [getCalibration]);

  if (!data || data.points.length === 0) return null;

  const points = data.points.map((p) => ({
    x: p.predicted_fidelity,
    y: p.measured_fidelity,
    device: p.device_id,
  }));

  return (
    <Card size="sm" className="shrink-0">
      <CardHeader className="py-2 border-b">
        <CardTitle className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Model Accuracy — Predicted vs Measured
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 8, bottom: 24, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                type="number" dataKey="x" domain={[0, 1]} tick={{ fontSize: 10 }}
                label={{ value: 'Predicted fidelity', position: 'insideBottom', offset: -12, fontSize: 11 }}
              />
              <YAxis
                type="number" dataKey="y" domain={[0, 1]} tick={{ fontSize: 10 }}
                label={{ value: 'Measured (1 − TVD)', angle: -90, position: 'insideLeft', fontSize: 11 }}
              />
              <ZAxis range={[60, 60]} />
              <Tooltip
                formatter={(v: number) => `${(v * 100).toFixed(1)}%`}
                labelFormatter={() => ''}
              />
              <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: 11 }} />
              <Line
                data={PARITY} dataKey="y" stroke="currentColor" strokeDasharray="4 4"
                dot={false} name="Perfect prediction" opacity={0.4} legendType="line"
              />
              <Scatter data={points} name="Your jobs" fill="#8b5cf6" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        {data.metrics && (
          <div className="mt-2 space-y-1">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <span>n = {data.metrics.n}</span>
              <span>MAE {(data.metrics.mae * 100).toFixed(1)}%</span>
              <span>RMSE {(data.metrics.rmse * 100).toFixed(1)}%</span>
              <span>bias {data.metrics.bias >= 0 ? '+' : ''}{(data.metrics.bias * 100).toFixed(1)}%</span>
              {data.metrics.pearson_r !== null && <span>r = {data.metrics.pearson_r.toFixed(2)}</span>}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Points below the dashed line mean the model was optimistic — expected, since the
              fidelity product ignores T1/T2 decoherence, crosstalk and idle decay. This measured{' '}
              <span className="font-mono">±{(data.metrics.mae * 100).toFixed(1)}%</span> is the
              optimizer's real error bar, earned from your own hardware runs rather than assumed.
              {data.metrics.pearson_r !== null && data.metrics.pearson_r > 0.8 && (
                <> Correlation is strong, so the model ranks devices correctly even where its
                absolute values are off — which is what choosing a backend actually needs.</>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PredictionAccuracyChart;
```

- [ ] **Step 3: Mount it**

In `frontend/src/modules/qroute/pages/QRoutePage.tsx`, add the import:

```tsx
import PredictionAccuracyChart from '../components/PredictionAccuracyChart';
```

and render it immediately **after** the job-history `<Card size="sm" className="h-64 shrink-0 ...">` block (approximately line 451). It takes no props and renders `null` until the user has at least one job with both a prediction and a qCompare report, so it costs nothing on an empty account.

- [ ] **Step 4: Verify it typechecks and builds**

Run: `cd frontend && npx tsc -b --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Verify end-to-end**

With `npm run dev` running and the backend up:
1. Open `/qroute`, build a small circuit, click **Balanced**, select the top recommendation, submit.
2. Wait for the job to complete (use a simulator device for a fast loop).
3. Open the job and click **Run qCompare**.
4. Return to `/qroute` — the accuracy chart now shows one point with its mean absolute error.

Expected: exactly one scatter point, positioned relative to the dashed parity line.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/modules/qroute/hooks/useQRouteApi.ts frontend/src/modules/qroute/components/PredictionAccuracyChart.tsx frontend/src/modules/qroute/pages/QRoutePage.tsx
git commit -m "feat(qroute): predicted-vs-measured fidelity calibration chart"
```

---

## Verification checklist

Before calling this done, confirm each of these by running it:

- [ ] `cd backend && pytest -v` — all tests pass, including the 12 pre-existing ones
- [ ] `cd frontend && npx tsc -b --noEmit` — clean
- [ ] `cd frontend && npm run lint` — clean
- [ ] `/recommend` answers in under 5s with the device cache warm (it does no network I/O of its own)
- [ ] A device absent from the capability table appears under "no published calibration data", is never scored, and never disappears from the roster
- [ ] Clicking a recommendation selects that exact device in the existing selector
- [ ] Submitting a job still works when the device has no capability entry (`predicted_fidelity` is `None`, submission succeeds)
- [ ] No UI surface presents fidelity as exact — every one shows `≤`, "upper bound", or a confidence chip
- [ ] A stale capability entry (edit a `published_date` back a year) downgrades its confidence chip to "low"
- [ ] `GET /calibration` returns `pearson_r: null` rather than a number when only one job has been compared

## Out of scope — deliberately

- **Queue-time *prediction*.** Live depth is reported; a forecast needs historical data that doesn't exist yet and can't be validated before the deadline.
- **Job batching / scheduling.** Needs multi-user job volume that won't exist at demo time.
- **Per-provider live calibration ingestion.** The static table plus IBM's live queue depth is enough; `get_capability`'s `live` parameter is the seam to add it through later.
- **Real coupling maps.** A linear chain is a deliberate pessimistic proxy — marked with a `ponytail:` comment in `resource_optimizer.py` naming the upgrade path.

## Follow-on plan

The transpile engine from Task 2 is the shared dependency for the **Circuit Optimizer panel** in Gates Playground (transpile at `optimization_level` 0–3, show depth and CX count before/after). That's a separate plan against `backend/routers/gates_playground_router.py` and `GatesPlaygroundPage.tsx` — write it after this ships, reusing `estimate_execution` unchanged.
