"""
Optimized Qiskit quantum-circuit playground backend.

Public API is unchanged:
    QiskitService.build_qiskit_circuit(gates, num_qubits, num_cbits=None)
    QiskitService.run_simulation(qc, shots=1024)
    QiskitService.run_stepwise(gates, num_qubits, num_cbits=None)

JSON response shapes are identical to the original implementation.
`run_stepwise` gains OPTIONAL keyword arguments (all default to the
original "compute everything" behaviour) so existing callers see zero
change, while callers who want the memory/CPU savings can opt in.
"""

from functools import lru_cache

import numpy as np
import qiskit
import qiskit.qasm2
import qiskit.quantum_info as qi
from qiskit import QuantumCircuit
from qiskit.circuit.library import QFT          # OPTIMIZATION 6: import once at
from qiskit_aer import AerSimulator              # module load time, not per call/per gate.

# --------------------------------------------------------------------------
# OPTIMIZATION 1: Gate dispatch table
# --------------------------------------------------------------------------
# The original code used a long if/elif chain that was re-evaluated (string
# comparisons, in order) for every single gate application. A dict dispatch
# turns "find the handler" into a single O(1) hash lookup and makes adding a
# new gate a one-line change instead of another elif branch.
#
# Every handler has the identical signature (qc, target, control, params)
# so the call site never needs to branch on gate type.

def _p(params, idx, default):
    """Small helper: fetch params[idx] if present, else default.
    Centralised so every parametric gate handler avoids repeating
    'params[0] if params else ...' boilerplate."""
    return params[idx] if params and len(params) > idx else default


def _apply_u(qc, target, control, params):
    qc.u(_p(params, 0, 1.5708), _p(params, 1, 0), _p(params, 2, 0), target)


def _apply_cnot(qc, target, control, params):
    if control is not None:
        qc.cx(control, target)


def _apply_cz(qc, target, control, params):
    if control is not None:
        qc.cz(control, target)


def _apply_cp(qc, target, control, params):
    if control is not None:
        qc.cp(_p(params, 0, 1.5708), control, target)


def _apply_cy(qc, target, control, params):
    if control is not None:
        qc.cy(control, target)


def _apply_swap(qc, target, control, params):
    if control is not None:
        qc.swap(control, target)


def _apply_qft(qc, target, control, params):
    qc.append(_cached_qft_instruction(qc.num_qubits, False), range(qc.num_qubits))


def _apply_iqft(qc, target, control, params):
    qc.append(_cached_qft_instruction(qc.num_qubits, True), range(qc.num_qubits))


def _noop(qc, target, control, params):
    # MEASURE is handled separately by run_simulation / ignored for the
    # density-matrix evolution in run_stepwise, exactly as before.
    pass


_GATE_DISPATCH = {
    'H':    lambda qc, t, c, p: qc.h(t),
    'X':    lambda qc, t, c, p: qc.x(t),
    'Y':    lambda qc, t, c, p: qc.y(t),
    'Z':    lambda qc, t, c, p: qc.z(t),
    'S':    lambda qc, t, c, p: qc.s(t),
    'SDG':  lambda qc, t, c, p: qc.sdg(t),
    'I':    lambda qc, t, c, p: qc.id(t),
    'T':    lambda qc, t, c, p: qc.t(t),
    'TDG':  lambda qc, t, c, p: qc.tdg(t),
    'P':    lambda qc, t, c, p: qc.p(_p(p, 0, 1.5708), t),
    'RX':   lambda qc, t, c, p: qc.rx(_p(p, 0, 1.5708), t),
    'RY':   lambda qc, t, c, p: qc.ry(_p(p, 0, 1.5708), t),
    'RZ':   lambda qc, t, c, p: qc.rz(_p(p, 0, 1.5708), t),
    'U':    _apply_u,
    'CNOT': _apply_cnot,
    'CX':   _apply_cnot,
    'CTRL': _apply_cnot,
    'CZ':   _apply_cz,
    'CP':   _apply_cp,
    'CY':   _apply_cy,
    'SWAP': _apply_swap,
    'MEASURE': _noop,
    'BARRIER': lambda qc, t, c, p: qc.barrier(),
    'RESET':   lambda qc, t, c, p: qc.reset(t),
    'QFT':  _apply_qft,
    'IQFT': _apply_iqft,
}

# Reverse of _GATE_DISPATCH's naming, for turning a Qiskit-parsed circuit
# (qiskit.qasm2.loads) back into this app's gate JSON. Keys are Qiskit's own
# lowercase instruction names (qc.data[i].operation.name); 'u3' is mapped
# defensively alongside 'u' since older OpenQASM 2 sources commonly use the
# legacy u3(...) gate name for the same operation.
_REVERSE_GATE_MAP = {
    'h': 'H', 'x': 'X', 'y': 'Y', 'z': 'Z', 's': 'S', 'sdg': 'SDG', 'id': 'I',
    't': 'T', 'tdg': 'TDG', 'p': 'P', 'rx': 'RX', 'ry': 'RY', 'rz': 'RZ',
    'u': 'U', 'u3': 'U',
    'cx': 'CNOT', 'cz': 'CZ', 'cp': 'CP', 'cy': 'CY', 'swap': 'SWAP',
}

# Gates whose unitary does not depend on any runtime parameter. Their
# Instruction objects are identical every time they're used, so we can
# build them once and reuse the object (see OPTIMIZATION 2).
_FIXED_SINGLE_QUBIT_GATES = frozenset(
    {'H', 'X', 'Y', 'Z', 'S', 'SDG', 'I', 'T', 'TDG'}
)
_FIXED_TWO_QUBIT_GATES = frozenset({'CNOT', 'CX', 'CTRL', 'CZ', 'CY', 'SWAP'})
_NON_UNITARY_GATES = frozenset({'MEASURE', 'BARRIER'})
_WIDE_GATES = frozenset({'QFT', 'IQFT'})  # act on the whole register


def apply_gate_to_circuit(qc, gate):
    """Apply a single gate spec to a QuantumCircuit. Behaviour identical to
    the original implementation; dispatch is now a dict lookup instead of
    an if/elif chain."""
    name = gate.get("name").upper()
    handler = _GATE_DISPATCH.get(name)
    if handler is None:
        raise ValueError(f"Unsupported gate: {name}")
    handler(qc, gate.get("target"), gate.get("control"), gate.get("params", []))


# --------------------------------------------------------------------------
# OPTIMIZATION 6: QFT/IQFT instructions cached by qubit count
# --------------------------------------------------------------------------
# QFT(n) construction is not free (it builds an n-qubit circuit of H/CP
# gates). Since the same num_qubits is used for the whole simulation, we
# cache the resulting Instruction and reuse it instead of rebuilding.
@lru_cache(maxsize=None)
def _cached_qft_instruction(num_qubits, inverse):
    return QFT(num_qubits, inverse=inverse).to_instruction()


# --------------------------------------------------------------------------
# OPTIMIZATION 2: Cached fixed-gate instructions for stepwise evolution
# --------------------------------------------------------------------------
# For parameter-free gates (H, X, CNOT, SWAP, ...) the resulting unitary is
# always the same, so we only ever need to build the tiny (1- or 2-qubit)
# Instruction once per gate name and reuse it on every occurrence.
@lru_cache(maxsize=None)
def _cached_fixed_instruction(name):
    arity = 2 if name in _FIXED_TWO_QUBIT_GATES else 1
    qc = QuantumCircuit(arity)
    control = 0 if arity == 2 else None
    target = arity - 1
    apply_gate_to_circuit(qc, {"name": name, "target": target, "control": control})
    return qc.to_instruction()


def _instruction_and_qargs_for_gate(gate, num_qubits):
    """
    Build (Instruction, qargs) for a single gate, sized to only the qubits
    the gate actually touches (1 or 2 qubits) rather than a full
    num_qubits-wide circuit. This is the core fix for stepwise performance:
    the original code allocated a brand-new num_qubits-wide QuantumCircuit
    for *every* gate at *every* step, which for a 12-qubit / 300-gate
    circuit means 300 circuit objects each carrying 12 qubits of bookkeeping.
    Returns None if the gate has no unitary effect (MEASURE/BARRIER).
    """
    name = gate.get("name").upper()
    if name in _NON_UNITARY_GATES:
        return None

    if name in _WIDE_GATES:
        instr = _cached_qft_instruction(num_qubits, name == 'IQFT')
        return instr, list(range(num_qubits))

    target = gate.get("target")
    control = gate.get("control")

    if name in _FIXED_SINGLE_QUBIT_GATES:
        return _cached_fixed_instruction(name), [target]

    if name in _FIXED_TWO_QUBIT_GATES:
        if control is None:
            return None
        return _cached_fixed_instruction(name), [control, target]

    # Parameterized gates (P, RX, RY, RZ, U, CP): can't be cached because
    # the rotation angle changes, but we still only build a 1- or 2-qubit
    # circuit instead of a full-width one.
    params = gate.get("params", [])
    if control is not None:
        local_qc = QuantumCircuit(2)
        apply_gate_to_circuit(local_qc, {"name": name, "target": 1, "control": 0, "params": params})
        return local_qc.to_instruction(), [control, target]
    else:
        local_qc = QuantumCircuit(1)
        apply_gate_to_circuit(local_qc, {"name": name, "target": 0, "control": None, "params": params})
        return local_qc.to_instruction(), [target]


# --------------------------------------------------------------------------
# OPTIMIZATION 5: Fast single-qubit reduced density matrix (Bloch vectors)
# --------------------------------------------------------------------------
# qiskit.quantum_info.partial_trace() is general-purpose: for every qubit it
# builds a new DensityMatrix object (with dimension/label bookkeeping) and
# reshapes/contracts the full 2^n x 2^n array. Calling it once per qubit,
# per step means num_qubits full-array contractions per step.
#
# We replace it with a direct numpy einsum contraction on the raw ndarray
# that computes exactly the same reduced 2x2 matrix, but skips all the
# Qiskit object-construction overhead. Numerically identical results.
_LETTERS = [chr(c) for c in list(range(97, 123)) + list(range(65, 91))]  # a-z, A-Z


@lru_cache(maxsize=None)
def _einsum_subscript(num_qubits, keep_qubit):
    """Build (and cache) the einsum subscript string for tracing out every
    qubit except `keep_qubit` from an num_qubits-qubit density matrix."""
    row_letters, col_letters = [], []
    li = 0
    kept_row = kept_col = None
    for axis in range(num_qubits):
        qubit_idx = num_qubits - 1 - axis  # numpy reshape axis 0 = most-significant qubit
        if qubit_idx == keep_qubit:
            row_letters.append(_LETTERS[li]); li += 1
            col_letters.append(_LETTERS[li]); li += 1
            kept_row, kept_col = row_letters[-1], col_letters[-1]
        else:
            letter = _LETTERS[li]; li += 1
            row_letters.append(letter)
            col_letters.append(letter)
    return f"{''.join(row_letters)}{''.join(col_letters)}->{kept_row}{kept_col}"


def _fast_reduced_single_qubit_dm(rho_flat, num_qubits, keep_qubit):
    """rho_flat: raw (2**n, 2**n) complex ndarray. Returns the 2x2 reduced
    density matrix for `keep_qubit`, numerically identical to
    qi.partial_trace(dm, all-other-qubits).data."""
    if num_qubits == 1:
        return rho_flat
    subscript = _einsum_subscript(num_qubits, keep_qubit)
    tensor = rho_flat.reshape((2,) * (2 * num_qubits))
    return np.einsum(subscript, tensor, optimize=True)


def _compute_bloch_vectors(rho_flat, num_qubits):
    result = {}
    for q in range(num_qubits):
        reduced = _fast_reduced_single_qubit_dm(rho_flat, num_qubits, q)
        x = 2.0 * reduced[0, 1].real
        y = 2.0 * reduced[1, 0].imag
        z = reduced[0, 0].real - reduced[1, 1].real
        result[str(q)] = {"x": float(x), "y": float(y), "z": float(z)}
    return result


# --------------------------------------------------------------------------
# OPTIMIZATION 7: Fast, allocation-light serialization helpers
# --------------------------------------------------------------------------
# numpy.float64 is a subclass of the built-in float, so json.dumps() can
# serialize it directly -- the original code's explicit float(...) calls on
# every single element are unnecessary. Pulling .real/.imag out as whole
# numpy arrays once (instead of per-element attribute access on Python
# complex scalars) also cuts per-element Python overhead.

def _complex_vector_to_dicts(vec):
    real = vec.real
    imag = vec.imag
    return [{"real": r, "imag": i} for r, i in zip(real, imag)]


def _complex_matrix_to_dicts(mat):
    real = mat.real
    imag = mat.imag
    return [
        [{"real": r, "imag": i} for r, i in zip(real_row, imag_row)]
        for real_row, imag_row in zip(real, imag)
    ]


def _probabilities_from_diagonal(diag_real, num_qubits):
    fmt = f'0{num_qubits}b'
    # format() in a comprehension is unavoidable Python-level work (JSON
    # keys must be these exact bitstrings), but we avoid the original's
    # repeated 2D fancy-indexing current_dm.data[i, i] by pulling the whole
    # diagonal out with one vectorized numpy call up front.
    return {format(i, fmt): d for i, d in enumerate(diag_real)}


class QiskitService:
    def build_qiskit_circuit(self, gates, num_qubits, num_cbits=None):
        num_cbits = num_cbits if num_cbits is not None else num_qubits
        qc = qiskit.QuantumCircuit(num_qubits, num_cbits)
        for gate in gates:
            apply_gate_to_circuit(qc, gate)
        return qc

    def circuit_to_qasm2(self, gates, num_qubits, num_cbits=None):
        """Real OpenQASM 2.0 export via Qiskit (qiskit.qasm2.dumps), replacing
        the frontend's hand-rolled string templating in qasmParser.ts's
        gatesToQasm. Reuses build_qiskit_circuit so the gate sequence is
        guaranteed to match what /simulate and /debug/steps actually run —
        but build_qiskit_circuit's MEASURE dispatch is a deliberate no-op
        (those two endpoints each manage measurement themselves), so real
        measure statements have to be added here, mirroring exactly what
        qasmParser.ts's gatesToQasm does: one measure per MEASURE gate the
        user placed, and none if they placed none.

        A circuit with no MEASURE gates therefore exports with no measurements
        — fine for /simulate (run_simulation samples counts off the statevector
        regardless) but rejected outright by real hardware. Submitting to a
        provider goes through ensure_measurements() below, which fills them in;
        this export deliberately stays a faithful rendering of the canvas."""
        num_cbits = num_cbits if num_cbits is not None else num_qubits
        qc = self.build_qiskit_circuit(gates, num_qubits, num_cbits)

        explicit_measures = [g for g in gates if g.get("name", "").upper() == "MEASURE"]
        if explicit_measures:
            for gate in explicit_measures:
                target = gate.get("target")
                qc.measure(target, min(target, num_cbits - 1))

        return qiskit.qasm2.dumps(qc)

    def _circuit_to_gates(self, qc):
        qubit_index = {qubit: i for i, qubit in enumerate(qc.qubits)}
        gates = []
        for step, instruction in enumerate(qc.data):
            op = instruction.operation
            name = op.name.lower()
            qargs = [qubit_index[q] for q in instruction.qubits]

            if name == 'barrier':
                gates.append({"name": "BARRIER", "target": qargs[0] if qargs else 0, "step": step})
                continue
            if name == 'reset':
                gates.append({"name": "RESET", "target": qargs[0], "step": step})
                continue
            if name == 'measure':
                gates.append({"name": "MEASURE", "target": qargs[0], "step": step})
                continue

            gate = {
                "name": _REVERSE_GATE_MAP.get(name, name.upper()),
                "target": qargs[-1],
                "step": step,
            }
            if len(qargs) > 1:
                gate["control"] = qargs[0]
            if op.params:
                gate["params"] = [float(p) for p in op.params]
            gates.append(gate)

        return {
            "gates": gates,
            "num_qubits": qc.num_qubits,
            "num_cbits": qc.num_clbits,
        }

    def qasm2_to_gates(self, qasm_str):
        """Real OpenQASM 2.0 import via Qiskit (qiskit.qasm2.loads), replacing
        the frontend's regex-based qasmToGates. Raises whatever exception
        Qiskit raises on invalid QASM (e.g. QASM2ParseError) — the router
        turns that into a 400 with Qiskit's own message instead of silently
        dropping unparseable input."""
        
        # Inject standard missing gates that Qiskit dumps but doesn't define in qelib1.inc
        import re
        missing_gates = {
            "swap": "gate swap a,b { cx a,b; cx b,a; cx a,b; }",
            "cp": "gate cp(lambda) a,b { U(0,0,lambda/2) a; cx a,b; U(0,0,-lambda/2) b; cx a,b; U(0,0,lambda/2) b; }"
        }
        injected = ""
        for gate, definition in missing_gates.items():
            if re.search(r'\b' + gate + r'\b', qasm_str) and not re.search(r'\bgate\s+' + gate + r'\b', qasm_str):
                injected += definition + "\n"
        
        if injected:
            if 'include "qelib1.inc";' in qasm_str:
                qasm_str = qasm_str.replace('include "qelib1.inc";', 'include "qelib1.inc";\n' + injected, 1)
            else:
                qasm_str = injected + qasm_str

        qc = qiskit.qasm2.loads(qasm_str)
        return self._circuit_to_gates(qc)

    def circuit_to_qiskit(self, gates, num_qubits, num_cbits=None):
        if num_cbits is None:
            num_cbits = num_qubits
        py = "from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister\n"
        py += "from qiskit_aer import AerSimulator\n\n"
        py += "# Create registers\n"
        py += f"q = QuantumRegister({num_qubits}, 'q')\n"
        py += f"c = ClassicalRegister({num_cbits}, 'c')\n"
        py += "qc = QuantumCircuit(q, c)\n\n"
        py += "# Build circuit\n"

        sorted_gates = sorted(
            [g for g in gates if g.get("target", 0) < num_qubits and (g.get("control") is None or g.get("control") < num_qubits)],
            key=lambda g: g.get("step", 0)
        )

        for gate in sorted_gates:
            name = gate.get("name", "").lower()
            target = gate.get("target", 0)
            control = gate.get("control")
            params = gate.get("params", [])
            params_str = ", ".join(f"{float(p):.4g}" for p in params) if params else ""

            if name == "measure":
                py += f"qc.measure(q[{target}], c[{min(target, num_cbits-1)}])\n"
            elif name == "barrier":
                py += "qc.barrier()\n"
            elif name == "reset":
                py += f"qc.reset(q[{target}])\n"
            elif name in ("cnot", "cx", "ctrl"):
                py += f"qc.cx(q[{control}], q[{target}])\n"
            elif name == "cz":
                py += f"qc.cz(q[{control}], q[{target}])\n"
            elif name == "cy":
                py += f"qc.cy(q[{control}], q[{target}])\n"
            elif name in ("cp", "cu1"):
                py += f"qc.cp({params_str or '0'}, q[{control}], q[{target}])\n"
            elif name == "swap":
                py += f"qc.swap(q[{control}], q[{target}])\n"
            elif name in ("rx", "ry", "rz", "p", "u", "u1", "u2", "u3"):
                py += f"qc.{name}({params_str or '0'}, q[{target}])\n"
            elif name in ("h", "x", "y", "z", "s", "sdg", "t", "tdg", "id", "i"):
                fn = "id" if name == "i" else name
                py += f"qc.{fn}(q[{target}])\n"
            elif name == "qft":
                py += "# QFT applied to circuit\n"
            elif control is not None:
                arg_str = f"{params_str}, " if params_str else ""
                py += f"qc.{name}({arg_str}q[{control}], q[{target}])\n"
            else:
                arg_str = f"{params_str}, " if params_str else ""
                py += f"qc.{name}({arg_str}q[{target}])\n"

        py += "\n# Run simulation\n"
        py += "simulator = AerSimulator()\n"
        py += "qc_sim = qc.copy()\n"
        py += "if not any(inst.operation.name == 'measure' for inst in qc_sim.data):\n"
        py += "    qc_sim.measure_all()\n"
        py += "result = simulator.run(qc_sim, shots=1024).result()\n"
        py += "counts = result.get_counts()\n"
        py += "print(counts)\n"
        return py

    def qiskit_to_gates(self, py_str):
        """Real Qiskit Python import: executes the python code in a sandbox, extracts the QuantumCircuit object, and converts it to gates."""
        from services.code_execution_service import code_execution_service
        wrapper = """
import json as _json
import sys as _sys

{user_code}

_qc_var = None
if 'qc' in dir() and hasattr(qc, 'data'):
    _qc_var = qc
else:
    for _name, _obj in list(locals().items()):
        from qiskit import QuantumCircuit as _QC
        if isinstance(_obj, _QC):
            _qc_var = _obj
            break

if _qc_var is not None:
    try:
        import qiskit.qasm2 as _qasm2
        print("__QRIOUS_QASM__" + _qasm2.dumps(_qc_var))
    except Exception as _e:
        pass
""".format(user_code=py_str)

        res = code_execution_service.execute_code(wrapper, timeout_seconds=10)
        for line in res.get("stdout", "").splitlines():
            if "__QRIOUS_QASM__" in line:
                qasm_str = line.split("__QRIOUS_QASM__", 1)[1]
                return self.qasm2_to_gates(qasm_str)
        raise ValueError("Could not extract a valid QuantumCircuit from Python code.")


    def run_simulation(self, qc, shots=1024):
        """
        OPTIMIZATION 8: single simulator execution instead of two.
        The original ran the circuit once to get the statevector and a
        SECOND, independent time (via qc.copy() + measure_all()) purely to
        get measurement counts -- doubling simulation time for no benefit,
        since Aer can save the statevector *and* sample measurement counts
        from the same run. We insert save_statevector() before the
        measurements and let Aer's automatic measurement-sampling optimization
        produce `shots` samples from that one execution.
        """
        simulator = AerSimulator(method='statevector')

        qc_run = qc.remove_final_measurements(inplace=False)
        qc_run.save_statevector()
        qc_run.measure_all()

        result = simulator.run(qc_run, shots=shots).result()
        sv_data = result.get_statevector(qc_run)
        counts = result.get_counts(qc_run)

        statevector = _complex_vector_to_dicts(np.asarray(sv_data.data))
        probabilities = sv_data.probabilities_dict()

        circuit_diagram_text = str(qc.draw(output='text'))

        return {
            "statevector": statevector,
            "probabilities": probabilities,
            "counts": counts,
            "circuit_diagram_text": circuit_diagram_text,
        }

    def run_stepwise(
        self,
        gates,
        num_qubits,
        num_cbits=None,
        include_statevector=True,
        include_density_matrix=True,
        include_bloch_vectors=True,
    ):
        """
        Behaviourally identical to the original when called with no extra
        arguments (all include_* flags default to True, matching the old
        "always compute everything" behaviour and producing byte-for-byte
        the same JSON shape).

        New OPTIONAL kwargs let a caller skip fields it doesn't render,
        which is the single biggest lever on both memory and CPU for large
        step counts (density_matrix serialization is O(4^n) objects and
        dominates cost/memory for n >= ~8).
        """
        num_cbits = num_cbits if num_cbits is not None else num_qubits
        dim = 2 ** num_qubits
        steps = []

        # Start with the ground-state density matrix (unchanged behaviour).
        qc_init = qiskit.QuantumCircuit(num_qubits, num_cbits)
        dm = qi.DensityMatrix.from_instruction(qc_init)

        def extract_state(current_dm, step_index, gate_applied):
            rho = current_dm.data  # raw ndarray, no extra copy
            diag_real = np.diagonal(rho).real
            probabilities = _probabilities_from_diagonal(diag_real, num_qubits)

            if include_statevector:
                try:
                    sv = current_dm.to_statevector()
                    statevector = _complex_vector_to_dicts(np.asarray(sv.data))
                except Exception:
                    statevector = [{"real": 0.0, "imag": 0.0} for _ in range(dim)]
            else:
                statevector = None

            density_matrix = _complex_matrix_to_dicts(rho) if include_density_matrix else None

            per_qubit_bloch_vectors = (
                _compute_bloch_vectors(rho, num_qubits) if include_bloch_vectors else None
            )

            step = {
                "step_index": step_index,
                "gate_applied": gate_applied,
                "statevector": statevector,
                "density_matrix": density_matrix,
                "per_qubit_bloch_vectors": per_qubit_bloch_vectors,
                "probabilities": probabilities,
            }
            return step

        steps.append(extract_state(dm, 0, None))

        # OPTIMIZATION 3 (core of stepwise perf): evolve using a small,
        # cached Instruction + qargs instead of allocating a fresh
        # num_qubits-wide QuantumCircuit for every gate at every step.
        for i, gate in enumerate(gates):
            op = _instruction_and_qargs_for_gate(gate, num_qubits)
            if op is not None:
                instruction, qargs = op
                dm = dm.evolve(instruction, qargs=qargs)

            steps.append(extract_state(dm, i + 1, gate))

        return steps


def ensure_measurements(qasm: str) -> str:
    """Returns `qasm` with measurements added if it has none, unchanged otherwise.

    Real hardware requires them: IBM rejects a measurement-free circuit outright
    ("Error code 1515; Circuits without measurements are not allowed"), and the
    other providers accept the job only to return empty counts. But BOTH QASM
    writers — qasmParser.ts's gatesToQasm and circuit_to_qasm2 above — only emit
    `measure` for MEASURE gates the user explicitly dropped on the canvas, so an
    ordinary H+CNOT circuit reaches the provider with nothing measured. Measuring
    every qubit is what "run this circuit" means, and it's what the results view
    already assumes, so it's applied at submission rather than making every user
    discover the M gate.

    Callers submit the returned QASM AND store it, so the saved circuit is what
    actually ran (qCompare reconstructs the job from that field)."""
    qc = qiskit.qasm2.loads(qasm)
    if any(instruction.operation.name == "measure" for instruction in qc.data):
        return qasm

    if qc.num_clbits >= qc.num_qubits:
        # Same qubit i -> classical bit i convention gatesToQasm uses for an
        # explicit MEASURE gate, reusing the cregs the circuit already declares.
        qc.measure(range(qc.num_qubits), range(qc.num_qubits))
    else:
        # Too few classical bits to land every qubit — measure_all() adds its own
        # register. Providers read the counts off whichever creg exists (see
        # ibm_adapter's "first classical register" note), so the name is free.
        qc.measure_all()
    return qiskit.qasm2.dumps(qc)


qiskit_service = QiskitService()