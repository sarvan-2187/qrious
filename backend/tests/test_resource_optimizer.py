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
    test_ranking_returns_every_known_device_scored_and_sorted()
    test_uncatalogued_device_is_reported_unrated_not_scored()
    test_every_recommendation_explains_itself_with_numbers()
    test_fidelity_is_labelled_as_an_upper_bound_not_a_prediction()
    test_factors_are_signed_and_cover_the_real_tradeoffs()
    test_paid_device_cost_factor_names_its_unit()
    test_weighting_cost_heavily_demotes_the_paid_device()
    test_queue_depth_penalises_a_busy_device()
    test_device_too_small_is_ranked_last_not_dropped()
    test_default_weights_sum_to_one()
    print("ok")
