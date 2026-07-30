from routers.qroute_router import _calibration_points, _predict_fidelity

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
    fidelity = _predict_fidelity(GHZ_QASM, "ibm", "ibm_torino")
    assert fidelity is not None
    assert 0.0 < fidelity < 1.0


def test_returns_none_for_an_uncatalogued_device_rather_than_guessing():
    assert _predict_fidelity(GHZ_QASM, "qbraid", "never_heard_of_it") is None


def test_bad_qasm_predicts_none_instead_of_blocking_submission():
    assert _predict_fidelity("garbage", "ibm", "ibm_torino") is None


def test_calibration_pairs_prediction_with_measured_fidelity():
    jobs = [
        {"_id": "j1", "provider": "ibm", "device_id": "ibm_torino", "predicted_fidelity": 0.90, "created_at": "2026-07-30T00:00:00Z"},
        {"_id": "j2", "provider": "ionq", "device_id": "qpu.forte-1", "predicted_fidelity": 0.80, "created_at": "2026-07-30T01:00:00Z"},
    ]
    points, metrics = _calibration_points(jobs, {"j1": 0.15, "j2": 0.30})
    assert len(points) == 2
    assert abs(points[0]["measured_fidelity"] - 0.85) < 1e-9
    assert abs(points[1]["measured_fidelity"] - 0.70) < 1e-9
    assert abs(metrics["mae"] - 0.075) < 1e-9
    assert abs(metrics["rmse"] - ((0.05**2 + 0.10**2) / 2) ** 0.5) < 1e-9
    assert metrics["bias"] > 0
    assert metrics["n"] == 2


def test_pearson_r_is_none_when_undefined():
    jobs = [{"_id": "j1", "provider": "ibm", "device_id": "d", "predicted_fidelity": 0.9, "created_at": "x"}]
    _, metrics = _calibration_points(jobs, {"j1": 0.1})
    assert metrics["pearson_r"] is None


def test_pearson_r_detects_correct_ranking_despite_absolute_error():
    jobs = [{"_id": f"j{i}", "provider": "ibm", "device_id": "d", "predicted_fidelity": predicted, "created_at": "x"} for i, predicted in enumerate([0.95, 0.85, 0.75])]
    _, metrics = _calibration_points(jobs, {"j0": 0.15, "j1": 0.25, "j2": 0.35})
    assert abs(metrics["mae"] - 0.10) < 1e-9
    assert abs(metrics["pearson_r"] - 1.0) < 1e-9


def test_jobs_without_a_prediction_or_report_are_excluded():
    jobs = [
        {"_id": "j1", "provider": "ibm", "device_id": "d", "predicted_fidelity": None, "created_at": "x"},
        {"_id": "j2", "provider": "ibm", "device_id": "d", "predicted_fidelity": 0.9, "created_at": "x"},
    ]
    points, metrics = _calibration_points(jobs, {"j1": 0.1})
    assert points == []
    assert metrics is None
