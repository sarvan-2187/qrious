from .models import BuildGraph, ScoreBreakdown
from .thermal_rules import check_thermal_budget
from .signal_chain_rules import check_signal_chain
from .power_budget import check_power_budget

def build_score_report(graph: BuildGraph) -> ScoreBreakdown:
    th_score, th_warn, th_fail = check_thermal_budget(graph)
    sig_score, sig_warn, sig_fail = check_signal_chain(graph)
    pwr_score, pwr_warn, pwr_fail = check_power_budget(graph)
    
    overall = (th_score + sig_score + pwr_score) / 3.0
    
    return ScoreBreakdown(
        thermal=th_score,
        signalIntegrity=sig_score,
        power=pwr_score,
        overall=overall,
        warnings=th_warn + sig_warn + pwr_warn,
        failures=th_fail + sig_fail + pwr_fail
    )
