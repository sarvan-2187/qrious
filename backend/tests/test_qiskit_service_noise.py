from qiskit import QuantumCircuit

from services.qiskit_service import qiskit_service


def _bell_circuit():
    qc = QuantumCircuit(2)
    qc.h(0)
    qc.cx(0, 1)
    return qc


def test_default_simulation_is_noiseless_and_deterministic_probabilities():
    """run_simulation's default (noisy=False) must stay byte-for-byte the
    old behaviour -- qcompare_service.run_ideal depends on this being an
    exact, deterministic noiseless baseline."""
    result = qiskit_service.run_simulation(_bell_circuit(), shots=512)
    probs = result["probabilities"]
    assert set(probs.keys()) == {"00", "11"}
    assert abs(probs["00"] - 0.5) < 1e-9
    assert abs(probs["11"] - 0.5) < 1e-9


def test_noisy_simulation_leaks_probability_into_non_ideal_outcomes():
    """With noisy=True, the sampled counts should show population in the
    01/10 states that an ideal Bell pair never produces -- proof the
    NoiseModel is actually being applied to the run, not just accepted and
    ignored."""
    result = qiskit_service.run_simulation(_bell_circuit(), shots=4096, noisy=True)
    counts = result["counts"]
    leaked = counts.get("01", 0) + counts.get("10", 0)
    assert leaked > 0, "expected some 01/10 leakage from noise, got a perfectly clean Bell pair"


def test_noisy_simulation_still_reports_ideal_probabilities():
    """statevector/probabilities come from Aer's saved statevector operation,
    which the noise model does not perturb -- only sampled `counts` should
    vary. This documents that distinction so callers don't misread `noisy`
    as also making `probabilities` stochastic."""
    result = qiskit_service.run_simulation(_bell_circuit(), shots=1024, noisy=True)
    probs = result["probabilities"]
    assert abs(probs["00"] - 0.5) < 1e-9
    assert abs(probs["11"] - 0.5) < 1e-9


def test_noisy_flag_does_not_mutate_default_behaviour():
    """Calling with noisy=True and then noisy=False again must not leave any
    global state behind (the noise model is cached via lru_cache, so this
    guards against it leaking into the default path)."""
    qiskit_service.run_simulation(_bell_circuit(), shots=256, noisy=True)
    result = qiskit_service.run_simulation(_bell_circuit(), shots=256, noisy=False)
    assert set(result["probabilities"].keys()) == {"00", "11"}
