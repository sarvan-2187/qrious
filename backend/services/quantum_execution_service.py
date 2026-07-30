"""
quantum_execution_service.py
Handles /api/quantum/execute and /api/quantum/debug for OpenQASM 2.0 and Qiskit.
"""

from __future__ import annotations

import re
import time
from typing import Any

import numpy as np
import qiskit.qasm2
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector
from qiskit_aer import AerSimulator

from services.code_execution_service import code_execution_service


# ── helpers ───────────────────────────────────────────────────────────────────

def _extract_error_line(exc: Exception) -> int | None:
    """Try to pull a line number from a Qiskit parse error message."""
    msg = str(exc)
    m = re.search(r"line (\d+)", msg, re.IGNORECASE)
    return int(m.group(1)) if m else None


def _statevector_real(sv: Statevector) -> list[float]:
    """Return the real parts of amplitudes as a plain Python list."""
    return [float(np.real(a)) for a in sv.data]


def _statevector_from_circuit(qc: QuantumCircuit) -> list[float]:
    """Simulate without measurement and return statevector real parts."""
    qc_no_measure = qc.remove_final_measurements(inplace=False)
    sv = Statevector.from_instruction(qc_no_measure)
    return _statevector_real(sv)


# ── OpenQASM 2.0 helpers ──────────────────────────────────────────────────────

def _execute_openqasm(code: str, shots: int) -> dict[str, Any]:
    t0 = time.perf_counter()
    try:
        qc = qiskit.qasm2.loads(code)
    except Exception as exc:
        line = _extract_error_line(exc)
        return {
            "success": False,
            "error": f"Syntax error: {exc}",
            "errorLine": line,
        }

    try:
        if not any(inst.operation.name == "measure" for inst in qc.data):
            qc_run = qc.copy()
            qc_run.measure_all()
        else:
            qc_run = qc
        simulator = AerSimulator()
        job = simulator.run(qc_run, shots=shots)
        result = job.result()
        counts = result.get_counts()
        elapsed_ms = (time.perf_counter() - t0) * 1000

        # statevector (remove measurements for SV simulation)
        statevector = _statevector_from_circuit(qc)

        return {
            "success": True,
            "results": {
                "counts": dict(counts),
                "statevector": statevector,
                "executionTime": round(elapsed_ms, 2),
            },
        }
    except Exception as exc:
        return {"success": False, "error": str(exc)}


def _debug_openqasm(code: str) -> dict[str, Any]:
    try:
        qc = qiskit.qasm2.loads(code)
    except Exception as exc:
        line = _extract_error_line(exc)
        return {"success": False, "error": f"Syntax error: {exc}", "errorLine": line}

    # Decompose to 1-qubit / 2-qubit basis gates for a clean step list
    qc_decomposed = qc.decompose()
    instructions = list(qc_decomposed.data)

    trace = []
    accumulated_gates: list[str] = []
    t0 = time.perf_counter()

    # Build a partial circuit up to each instruction and extract statevector
    for idx, instruction in enumerate(instructions):
        gate = instruction.operation
        qargs = instruction.qubits

        if gate.name == "measure":
            continue  # skip measurement for statevector capture

        partial_qc = QuantumCircuit(qc.num_qubits)
        for prev_inst in instructions[: idx + 1]:
            if prev_inst.operation.name == "measure":
                continue
            prev_qargs = [qc.find_bit(q).index for q in prev_inst.qubits]
            partial_qc.append(prev_inst.operation, prev_qargs)

        try:
            sv = Statevector.from_instruction(partial_qc)
            state = _statevector_real(sv)
        except Exception:
            state = []

        qubit_labels = [f"q[{qc.find_bit(q).index}]" for q in qargs]
        gate_name = gate.name.upper()
        accumulated_gates.append(gate_name)

        # Try to map gate to the approximate source line
        # QASM line 1 = OPENQASM header, lines 2–4 = includes/qreg/creg.
        # Gate instructions typically start at line 5.
        estimated_line = idx + 5

        trace.append({
            "step": idx + 1,
            "line": estimated_line,
            "operation": f"{gate_name} {', '.join(qubit_labels)}",
            "state": state,
            "gates": list(accumulated_gates),
            "timestamp": round(time.perf_counter() - t0, 4),
        })

    return {"success": True, "trace": trace}


# ── Qiskit (Python) helpers ───────────────────────────────────────────────────

# Wrapper injected around user Qiskit code to capture counts as JSON on stdout.
_QISKIT_EXECUTE_WRAPPER = """
import json as _json

# ---- user code starts ----
{user_code}
# ---- user code ends ----

# Attempt to auto-capture 'counts' or 'result' variable
_output = {{}}
if 'counts' in dir():
    _output['counts'] = {{k: int(v) for k, v in counts.items()}}
elif 'result' in dir() and hasattr(result, 'get_counts'):
    _output['counts'] = {{k: int(v) for k, v in result.get_counts().items()}}
elif 'qc' in dir() and hasattr(qc, 'data'):
    try:
        from qiskit_aer import AerSimulator as _AS
        _sim = _AS()
        _qc_copy = qc.copy()
        if not any(_inst.operation.name == 'measure' for _inst in _qc_copy.data):
            _qc_copy.measure_all()
        _res = _sim.run(_qc_copy, shots=1024).result()
        _output['counts'] = {{k: int(v) for k, v in _res.get_counts().items()}}
    except Exception:
        pass
print("__QRIOUS_COUNTS__" + _json.dumps(_output))
"""

_QISKIT_DEBUG_WRAPPER = """
import json as _json
from qiskit.quantum_info import Statevector as _SV
import time as _time

_trace = []
_gates = []
_t0 = _time.perf_counter()

# ---- user code starts ----
{user_code}
# ---- user code ends ----

# Attempt to pull the QuantumCircuit object and generate trace
try:
    import re as _re
    _qc_var = None
    for _name, _obj in list(locals().items()):
        from qiskit import QuantumCircuit as _QC
        if isinstance(_obj, _QC):
            _qc_var = _obj
            break
    if _qc_var is not None:
        _decomp = _qc_var.decompose()
        for _i, _inst in enumerate(_decomp.data):
            if _inst.operation.name == 'measure':
                continue
            _partial = _decomp.__class__(_decomp.num_qubits)
            for _prev in list(_decomp.data)[:_i+1]:
                if _prev.operation.name == 'measure':
                    continue
                _pq = [_decomp.find_bit(q).index for q in _prev.qubits]
                _partial.append(_prev.operation, _pq)
            try:
                _sv = _SV.from_instruction(_partial)
                _state = [float(a.real) for a in _sv.data]
            except Exception:
                _state = []
            _gname = _inst.operation.name.upper()
            _qidxs = [_decomp.find_bit(q).index for q in _inst.qubits]
            _gates.append(_gname)
            _trace.append({{
                "step": _i+1,
                "line": _i+5,
                "operation": f"{{_gname}} {{', '.join(f'q[{{q}}]' for q in _qidxs)}}",
                "state": _state,
                "gates": list(_gates),
                "timestamp": round(_time.perf_counter()-_t0, 4),
            }})
except Exception as _e:
    pass

print("__QRIOUS_TRACE__" + _json.dumps(_trace))
"""


def _parse_counts_from_stdout(stdout: str) -> dict[str, int] | None:
    for line in stdout.splitlines():
        if "__QRIOUS_COUNTS__" in line:
            try:
                data = line.split("__QRIOUS_COUNTS__", 1)[1]
                return eval(data).get("counts", {})  # noqa: S307 — controlled string
            except Exception:
                return None
    return None


def _parse_trace_from_stdout(stdout: str) -> list[dict] | None:
    for line in stdout.splitlines():
        if "__QRIOUS_TRACE__" in line:
            try:
                import json
                data = line.split("__QRIOUS_TRACE__", 1)[1]
                return json.loads(data)
            except Exception:
                return None
    return None


def _execute_qiskit(code: str, shots: int) -> dict[str, Any]:
    wrapped = _QISKIT_EXECUTE_WRAPPER.format(user_code=code)
    t0 = time.perf_counter()
    res = code_execution_service.execute_code(wrapped, timeout_seconds=15)
    elapsed_ms = (time.perf_counter() - t0) * 1000

    if res["exit_code"] != 0:
        stderr = res.get("stderr", "Execution failed")
        line = _extract_error_line(Exception(stderr))
        return {"success": False, "error": stderr, "errorLine": line}

    counts = _parse_counts_from_stdout(res["stdout"])
    # Clean up the stdout shown to the user (strip our sentinel line)
    clean_stdout = "\n".join(
        l for l in res["stdout"].splitlines() if "__QRIOUS_COUNTS__" not in l
    )

    return {
        "success": True,
        "results": {
            "counts": counts or {},
            "statevector": None,
            "executionTime": round(elapsed_ms, 2),
        },
        "_stdout": clean_stdout,  # passed through to response for display
    }


def _debug_qiskit(code: str) -> dict[str, Any]:
    wrapped = _QISKIT_DEBUG_WRAPPER.format(user_code=code)
    res = code_execution_service.execute_code(wrapped, timeout_seconds=20)

    if res["exit_code"] != 0:
        stderr = res.get("stderr", "Execution failed")
        line = _extract_error_line(Exception(stderr))
        return {"success": False, "error": stderr, "errorLine": line}

    trace = _parse_trace_from_stdout(res["stdout"]) or []
    return {"success": True, "trace": trace}


# ── Public service ─────────────────────────────────────────────────────────────

class QuantumExecutionService:
    def execute(self, language: str, code: str, shots: int = 1024) -> dict[str, Any]:
        if not code.strip():
            return {"success": False, "error": "Code editor is empty"}

        if language == "openqasm2":
            return _execute_openqasm(code, shots)
        elif language == "qiskit":
            return _execute_qiskit(code, shots)
        elif language == "cirq":
            return {"success": False, "error": "CIRQ support coming soon"}
        else:
            return {"success": False, "error": f"Unknown language: {language}"}

    def debug(self, language: str, code: str) -> dict[str, Any]:
        if not code.strip():
            return {"success": False, "error": "Code editor is empty"}

        if language == "openqasm2":
            return _debug_openqasm(code)
        elif language == "qiskit":
            return _debug_qiskit(code)
        elif language == "cirq":
            return {"success": False, "error": "CIRQ support coming soon"}
        else:
            return {"success": False, "error": f"Unknown language: {language}"}


quantum_execution_service = QuantumExecutionService()
