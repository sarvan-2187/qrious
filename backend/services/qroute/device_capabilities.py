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
