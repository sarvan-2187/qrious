import itertools
from unittest.mock import patch

import numpy as np

from services import learning_qaoa
from services.learning_qaoa import (
    build_qubo_matrix, qubo_to_ising, qubo_cost, _bitstring_to_bits,
    greedy_knapsack_selection, optimize_learning_path, PENALTY_LAMBDA,
)


def _candidates():
    return [
        {"slug": "a", "title": "A", "time": 20, "weight": 80.0},
        {"slug": "b", "title": "B", "time": 15, "weight": 60.0},
        {"slug": "c", "title": "C", "time": 30, "weight": 90.0},
        {"slug": "d", "title": "D", "time": 10, "weight": 40.0},
    ]


# --------------------------------------------------------------------------
# QUBO matrix construction correctness
# --------------------------------------------------------------------------

def test_qubo_matrix_diagonal_rewards_weight_and_penalizes_time_squared():
    candidates = [{"slug": "x", "title": "X", "time": 10, "weight": 50.0}]
    Q = build_qubo_matrix(candidates, max_session_minutes=20)
    # cost(x=1) = -50 + 0.5*(10^2 - 2*20*10) = -50 + 0.5*(100-400) = -50 - 150 = -200
    expected_diag = -50.0 + PENALTY_LAMBDA * (10 ** 2 - 2 * 20 * 10)
    assert Q[0, 0] == expected_diag


def test_qubo_matrix_selecting_exactly_the_budget_is_favoured_over_under_or_over():
    """Penalty term is minimized (cost most negative, i.e. best) when the
    selection's total time exactly matches the budget -- verifies the
    penalty method is actually shaping the cost landscape as intended."""
    candidates = _candidates()
    Q = build_qubo_matrix(candidates, max_session_minutes=45)

    def cost_of(mask):
        return qubo_cost(Q, list(mask))

    # a+b+d = 45 minutes exactly (on budget); a+b+c = 65 (over budget)
    on_budget = cost_of([1, 1, 0, 1])
    over_budget = cost_of([1, 1, 1, 0])
    under_budget = cost_of([1, 0, 0, 0])  # only 20 minutes, well under

    assert on_budget < over_budget
    assert on_budget < under_budget


def test_qubo_to_ising_matches_direct_qubo_cost_exhaustively():
    """Ground-truth check: for every bitstring of several fixture sizes,
    the Ising Hamiltonian (offset + sum h_i*z_i + sum J_ij*z_i*z_j) must
    equal the QUBO's own cost(x) evaluated directly -- this is what actually
    verifies the QUBO -> Ising conversion (and therefore every penalty term)
    is correct, rather than eyeballing coefficients."""
    for n in (1, 2, 3, 4, 5):
        candidates = [
            {"slug": f"t{i}", "title": f"T{i}", "time": 5 + i * 3, "weight": 10.0 + i * 7}
            for i in range(n)
        ]
        Q = build_qubo_matrix(candidates, max_session_minutes=25)
        h, J, offset = qubo_to_ising(Q)

        for bits in itertools.product([0, 1], repeat=n):
            direct_cost = qubo_cost(Q, list(bits))

            z = [1 - 2 * b for b in bits]  # x=0 -> z=+1, x=1 -> z=-1
            ising_cost = offset + sum(h[i] * z[i] for i in range(n))
            ising_cost += sum(coeff * z[i] * z[j] for (i, j), coeff in J.items())

            assert abs(direct_cost - ising_cost) < 1e-9, (n, bits, direct_cost, ising_cost)


def test_bitstring_to_bits_is_little_endian():
    # qiskit convention: rightmost character is qubit 0
    assert _bitstring_to_bits("1011", 4) == [1, 1, 0, 1]  # q0=1,q1=1,q2=0,q3=1
    assert _bitstring_to_bits("0001", 4) == [1, 0, 0, 0]


# --------------------------------------------------------------------------
# Greedy fallback
# --------------------------------------------------------------------------

def test_greedy_knapsack_respects_budget():
    candidates = _candidates()
    selected = greedy_knapsack_selection(candidates, max_session_minutes=45)
    total_time = sum(c["time"] for c in selected)
    assert total_time <= 45


def test_greedy_knapsack_prefers_higher_value_per_minute():
    candidates = [
        {"slug": "efficient", "title": "E", "time": 10, "weight": 100.0},  # ratio 10
        {"slug": "inefficient", "title": "I", "time": 10, "weight": 10.0},  # ratio 1
    ]
    selected = greedy_knapsack_selection(candidates, max_session_minutes=10)
    assert [c["slug"] for c in selected] == ["efficient"]


# --------------------------------------------------------------------------
# optimize_learning_path — end to end (real Aer simulator) + fallback path
# --------------------------------------------------------------------------

def test_optimize_learning_path_returns_feasible_selection():
    candidates = _candidates()
    result = optimize_learning_path(candidates, max_session_minutes=45)
    assert result["fallback_used"] is False
    assert result["algorithm"] == "QAOA (p=1)"
    assert result["qaoa_parameters"] is not None
    assert set(result["qaoa_parameters"].keys()) == {"gamma", "beta"}
    assert result["total_estimated_time"] == sum(c["time"] for c in result["selected_topics"])
    assert result["total_learning_value"] == sum(c["weight"] for c in result["selected_topics"])


def test_optimize_learning_path_falls_back_on_simulator_failure():
    candidates = _candidates()
    with patch.object(learning_qaoa.qiskit_service, "run_simulation", side_effect=RuntimeError("boom")):
        result = optimize_learning_path(candidates, max_session_minutes=45)

    assert result["fallback_used"] is True
    assert result["algorithm"].startswith("Greedy")
    assert result["bitstring"] is None
    assert result["qaoa_parameters"] is None
    assert result["total_estimated_time"] <= 45


def test_optimize_learning_path_rejects_qaoa_result_that_exceeds_budget():
    """The QUBO's budget term only softly penalizes overshooting -- QAOA can still
    land on an over-budget bitstring. optimize_learning_path must reject it and
    fall back to the budget-safe greedy result instead of returning it as-is."""
    candidates = _candidates()  # times 20+15+30+10 = 75, all over a 45-min budget
    fake_result = {"probabilities": {"1111": 1.0}}  # forces "select everything"
    with patch.object(learning_qaoa.qiskit_service, "run_simulation", return_value=fake_result):
        result = optimize_learning_path(candidates, max_session_minutes=45)

    assert result["fallback_used"] is True
    assert result["algorithm"].startswith("Greedy")
    assert result["total_estimated_time"] <= 45


def test_optimize_learning_path_never_raises_on_bad_input():
    # A single candidate whose time is exactly zero is a degenerate QUBO —
    # must still return a well-formed result, never propagate an exception.
    candidates = [{"slug": "solo", "title": "Solo", "time": 0, "weight": 10.0}]
    result = optimize_learning_path(candidates, max_session_minutes=45)
    assert "fallback_used" in result
