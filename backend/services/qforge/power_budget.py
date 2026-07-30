from .models import BuildGraph

def check_power_budget(graph: BuildGraph) -> tuple[float, list[str], list[str]]:
    warnings = []
    failures = []
    
    # Phase 1 simple power budget checking
    score = 100.0
    
    if not graph.cryostatId:
        failures.append("No cryostat selected to define cooling power.")
        score = 0.0
        
    return score, warnings, failures
