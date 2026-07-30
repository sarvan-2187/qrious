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
