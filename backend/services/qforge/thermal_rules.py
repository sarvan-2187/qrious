from .models import BuildGraph, ScoreBreakdown

def check_thermal_budget(graph: BuildGraph) -> tuple[float, list[str], list[str]]:
    warnings = []
    failures = []
    
    # In Phase 1, just basic total attenuation check for drive lines
    drive_comps = [c for c in graph.placedComponents if c.line == "drive"]
    total_att = 0
    # Dummy logic to calculate attenuation from component ID for MVP
    for c in drive_comps:
        if "20db" in c.componentId:
            total_att += 20
        elif "10db" in c.componentId:
            total_att += 10
        elif "6db" in c.componentId:
            total_att += 6
            
    if len(drive_comps) > 0 and (total_att < 59 or total_att > 65):
        failures.append(f"Drive line total attenuation is {total_att} dB. Target is ~62 dB (±3 dB).")
        
    score = 100.0 if not failures else 50.0
    return score, warnings, failures
