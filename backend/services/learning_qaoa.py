"""Stage 2 of the QAOA learning-path pipeline: quantum optimizer.

Takes Stage 1's already-filtered candidate list (<= topic_prefilter.MAX_CANDIDATES,
i.e. <= 12 topics == <= 12 qubits) and picks the subset that maximizes total
learning value subject to a time budget, using a 1-layer QAOA circuit run on
qiskit_service's existing AerSimulator (via run_simulation) -- no second
simulator instance is created here.

Knapsack constraint (sum(time_i * x_i) <= budget) is encoded as a quadratic
penalty directly on the qubit count Stage 1 already capped at, i.e. WITHOUT
slack qubits (a slack-qubit exact inequality encoding would add qubits beyond
the N Stage 1 promised). This penalizes deviation from the budget in EITHER
direction (including using less than the full budget), which is an
approximation of "at most" rather than an exact encoding -- acceptable for a
shallow p=1/15-iteration demo circuit whose job is to bias the sampling
distribution, not solve the knapsack exactly. The classical greedy fallback
below is what guarantees a materially correct answer regardless.
"""
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from qiskit import QuantumCircuit
from scipy.optimize import minimize

from services.qiskit_service import qiskit_service

PENALTY_LAMBDA = 0.5
QAOA_INITIAL_PARAMS = [0.1, 0.1]
QAOA_MAXITER = 15
FINAL_SHOTS = 1024


# --------------------------------------------------------------------------
# QUBO construction + QUBO -> Ising conversion
# --------------------------------------------------------------------------

def build_qubo_matrix(candidates: List[Dict[str, Any]], max_session_minutes: int) -> np.ndarray:
    """cost(x) = sum_i Q[i,i]*x_i + sum_{i<j} Q[i,j]*x_i*x_j, to MINIMIZE.

    cost(x) = -sum(weight_i * x_i) + PENALTY_LAMBDA * (sum(time_i * x_i) - budget)^2
    (maximize learning value, penalize deviation from the time budget).
    Only the upper triangle (including diagonal) of the returned matrix is
    meaningful -- the lower triangle is left zero.
    """
    n = len(candidates)
    weights = np.array([c["weight"] for c in candidates], dtype=float)
    times = np.array([c["time"] for c in candidates], dtype=float)
    budget = float(max_session_minutes)

    Q = np.zeros((n, n))
    for i in range(n):
        Q[i, i] = -weights[i] + PENALTY_LAMBDA * (times[i] ** 2 - 2 * budget * times[i])
        for j in range(i + 1, n):
            Q[i, j] = 2 * PENALTY_LAMBDA * times[i] * times[j]
    return Q


def qubo_to_ising(Q: np.ndarray) -> Tuple[np.ndarray, Dict[Tuple[int, int], float], float]:
    """Standard x_i = (1 - z_i) / 2 substitution (z_i in {+1,-1}).
    Returns (h, J, offset) such that for every bitstring x with z_i = 1-2*x_i:
        cost(x) == offset + sum_i h[i]*z_i + sum_{i<j} J[(i,j)]*z_i*z_j
    (verified exhaustively in tests/test_learning_qaoa.py against build_qubo_matrix's
    own cost(x) evaluated directly on x, for every bitstring of several fixture sizes)."""
    n = Q.shape[0]
    h = np.zeros(n)
    J: Dict[Tuple[int, int], float] = {}
    offset = 0.0

    for i in range(n):
        offset += Q[i, i] / 2.0
        h[i] -= Q[i, i] / 2.0
        for j in range(i + 1, n):
            offset += Q[i, j] / 4.0
            h[i] -= Q[i, j] / 4.0
            h[j] -= Q[i, j] / 4.0
            J[(i, j)] = Q[i, j] / 4.0

    return h, J, offset


def qubo_cost(Q: np.ndarray, bits: List[int]) -> float:
    """Direct cost(x) evaluation from the QUBO matrix -- the ground-truth
    reference build_qubo_matrix/qubo_to_ising are tested against."""
    n = Q.shape[0]
    total = 0.0
    for i in range(n):
        if not bits[i]:
            continue
        total += Q[i, i]
        for j in range(i + 1, n):
            if bits[j]:
                total += Q[i, j]
    return total


# --------------------------------------------------------------------------
# QAOA circuit (p=1)
# --------------------------------------------------------------------------

def build_qaoa_circuit(h: np.ndarray, J: Dict[Tuple[int, int], float], gamma: float, beta: float) -> QuantumCircuit:
    n = len(h)
    qc = QuantumCircuit(n)

    qc.h(range(n))  # uniform superposition init

    for i in range(n):
        if h[i] != 0:
            qc.rz(2 * gamma * h[i], i)
    for (i, j), coeff in J.items():
        if coeff != 0:
            qc.rzz(2 * gamma * coeff, i, j)

    qc.rx(2 * beta, range(n))  # mixer unitary

    return qc


def _bitstring_to_bits(bitstring: str, n: int) -> List[int]:
    """Qiskit bitstrings are little-endian (rightmost char = qubit 0)."""
    return [int(bitstring[n - 1 - i]) for i in range(n)]


def _expected_cost(probabilities: Dict[str, float], Q: np.ndarray, n: int) -> float:
    return sum(
        prob * qubo_cost(Q, _bitstring_to_bits(bitstring, n))
        for bitstring, prob in probabilities.items()
    )


# --------------------------------------------------------------------------
# Classical greedy fallback (weight/time ratio knapsack heuristic)
# --------------------------------------------------------------------------

def greedy_knapsack_selection(candidates: List[Dict[str, Any]], max_session_minutes: int) -> List[Dict[str, Any]]:
    ranked = sorted(candidates, key=lambda c: c["weight"] / max(c["time"], 1), reverse=True)
    selected = []
    remaining = max_session_minutes
    for c in ranked:
        if c["time"] <= remaining:
            selected.append(c)
            remaining -= c["time"]
    return selected


def _summarize_selection(selected: List[Dict[str, Any]]) -> Tuple[int, float]:
    total_time = sum(c["time"] for c in selected)
    total_value = round(sum(c["weight"] for c in selected), 2)
    return total_time, total_value


def _fallback_result(candidates: List[Dict[str, Any]], max_session_minutes: int) -> Dict[str, Any]:
    selected = greedy_knapsack_selection(candidates, max_session_minutes)
    total_time, total_value = _summarize_selection(selected)
    return {
        "algorithm": "Greedy Knapsack (classical fallback)",
        "bitstring": None,
        "selected_topics": selected,
        "qaoa_parameters": None,
        "total_estimated_time": total_time,
        "total_learning_value": total_value,
        "fallback_used": True,
    }


# --------------------------------------------------------------------------
# Public entry point
# --------------------------------------------------------------------------

def optimize_learning_path(candidates: List[Dict[str, Any]], max_session_minutes: int) -> Dict[str, Any]:
    """Stage 2: run QAOA over Stage 1's candidates; fall back to a classical
    greedy knapsack on any simulator/optimization failure. Never raises --
    the router this feeds must never 500 on this call."""
    try:
        n = len(candidates)
        Q = build_qubo_matrix(candidates, max_session_minutes)
        h, J, _offset = qubo_to_ising(Q)

        def cost_fn(params) -> float:
            gamma, beta = params
            qc = build_qaoa_circuit(h, J, gamma, beta)
            result = qiskit_service.run_simulation(qc, shots=FINAL_SHOTS)
            return _expected_cost(result["probabilities"], Q, n)

        opt_result = minimize(
            cost_fn, x0=QAOA_INITIAL_PARAMS, method="COBYLA",
            options={"maxiter": QAOA_MAXITER},
        )
        best_gamma, best_beta = opt_result.x

        final_circuit = build_qaoa_circuit(h, J, best_gamma, best_beta)
        final_result = qiskit_service.run_simulation(final_circuit, shots=FINAL_SHOTS)
        probabilities = final_result["probabilities"]
        best_bitstring = max(probabilities, key=probabilities.get)

        bits = _bitstring_to_bits(best_bitstring, n)
        selected = [c for c, bit in zip(candidates, bits) if bit]
        total_time, total_value = _summarize_selection(selected)

        if total_time > max_session_minutes:
            # The QUBO's budget term is a soft penalty (discourages drifting from
            # the budget, doesn't forbid it) -- QAOA can still land on an
            # over-budget bitstring. Reject it and use the budget-safe greedy
            # result instead, rather than returning an infeasible "optimized" plan.
            return _fallback_result(candidates, max_session_minutes)

        return {
            "algorithm": "QAOA (p=1)",
            "bitstring": best_bitstring,
            "selected_topics": selected,
            "qaoa_parameters": {"gamma": float(best_gamma), "beta": float(best_beta)},
            "total_estimated_time": total_time,
            "total_learning_value": total_value,
            "fallback_used": False,
        }
    except Exception:
        return _fallback_result(candidates, max_session_minutes)
