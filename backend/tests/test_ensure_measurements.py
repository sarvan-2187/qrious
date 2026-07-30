# backend/tests/test_ensure_measurements.py
import qiskit.qasm2

from services.qiskit_service import ensure_measurements

HEADER = 'OPENQASM 2.0;\ninclude "qelib1.inc";\n\n'

# The exact circuit IBM rejected with "Error code 1515; Circuits without
# measurements are not allowed" — H + CNOT drawn on the canvas, no M gate.
BELL_UNMEASURED = HEADER + "qreg q[2];\ncreg c[2];\n\nh q[0];\ncx q[0],q[1];\n"


def _measured_qubits(qasm: str) -> int:
    qc = qiskit.qasm2.loads(qasm)
    return sum(1 for inst in qc.data if inst.operation.name == "measure")


def test_adds_measurements_when_circuit_has_none():
    out = ensure_measurements(BELL_UNMEASURED)
    assert _measured_qubits(out) == 2


def test_leaves_an_already_measured_circuit_byte_for_byte_alone():
    """User-placed measurements are the user's business — a partial measurement
    (only q[0] here) is a legitimate circuit, not something to 'complete'."""
    partial = BELL_UNMEASURED + "measure q[0] -> c[0];\n"
    assert ensure_measurements(partial) == partial


def test_handles_fewer_classical_bits_than_qubits():
    """Canvas lets cbits drop below qubits, so the same-index mapping can't
    always be used — measure_all() brings its own register."""
    narrow = HEADER + "qreg q[3];\ncreg c[1];\n\nh q[0];\n"
    out = ensure_measurements(narrow)
    assert _measured_qubits(out) == 3


def test_invalid_qasm_raises_for_the_router_to_turn_into_a_400():
    try:
        ensure_measurements("not qasm at all")
    except Exception:
        return
    raise AssertionError("expected a parse error")


if __name__ == "__main__":
    test_adds_measurements_when_circuit_has_none()
    test_leaves_an_already_measured_circuit_byte_for_byte_alone()
    test_handles_fewer_classical_bits_than_qubits()
    test_invalid_qasm_raises_for_the_router_to_turn_into_a_400()
    print("ok")
