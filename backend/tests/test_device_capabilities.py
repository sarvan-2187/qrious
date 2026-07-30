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
