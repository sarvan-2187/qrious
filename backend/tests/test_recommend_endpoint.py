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
