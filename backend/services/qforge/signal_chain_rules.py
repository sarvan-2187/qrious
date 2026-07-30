from .models import BuildGraph

def check_signal_chain(graph: BuildGraph) -> tuple[float, list[str], list[str]]:
    warnings = []
    failures = []
    
    readout = [c for c in graph.placedComponents if c.line == "readout"]
    
    has_purcell = any("purcell" in c.componentId for c in readout)
    has_twpa = any("twpa" in c.componentId for c in readout)
    has_hemt = any("hemt" in c.componentId for c in readout)
    
    if not has_purcell and has_twpa:
        failures.append("Missing Purcell filter before TWPA.")
        
    if not has_twpa and has_hemt:
        warnings.append("Missing TWPA. Readout fidelity will be degraded.")
        
    score = 100.0 if not failures else 50.0
    if warnings:
        score -= 10
        
    return max(score, 0.0), warnings, failures
