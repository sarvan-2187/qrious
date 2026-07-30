from fastapi import APIRouter, Depends, HTTPException
from typing import List
from auth import get_current_user
from models.algorithm_model import AlgorithmBase, AlgorithmSummary
from models.simulation_model import SimulationResult
from services.algorithm_service import algorithm_service
from services.qiskit_service import qiskit_service

router = APIRouter(prefix="/api/v1/algorithms", tags=["Algorithm Explorer"])

@router.get("", response_model=List[AlgorithmSummary])
@router.get("/", response_model=List[AlgorithmSummary], include_in_schema=False)
async def list_algorithms(current_user: dict = Depends(get_current_user)):
    algs = await algorithm_service.get_algorithms()
    return [{
        "slug": a["slug"], 
        "name": a["name"],
        "shortDescription": a.get("shortDescription", ""),
        "difficulty": a.get("quickInfo", {}).get("difficulty", ""),
        "category": a.get("quickInfo", {}).get("category", ""),
        "learningLevel": a.get("level", 1),
        "status": a.get("status", "active")
    } for a in algs]

@router.get("/{slug}", response_model=AlgorithmBase)
async def get_algorithm(slug: str, current_user: dict = Depends(get_current_user)):
    alg = await algorithm_service.get_algorithm(slug)
    if not alg:
        raise HTTPException(status_code=404, detail="Algorithm not found")
    return alg

@router.post("/{slug}/run")
async def run_algorithm(slug: str, current_user: dict = Depends(get_current_user)):
    alg = await algorithm_service.get_algorithm(slug)
    if not alg:
        raise HTTPException(status_code=404, detail="Algorithm not found")
        
    num_qubits = alg["example_circuit"]["num_qubits"]
    gates = alg["example_circuit"]["gates"]
    
    try:
        qc = qiskit_service.build_qiskit_circuit(gates, num_qubits)
        result = qiskit_service.run_simulation(qc, shots=1024)
        steps = qiskit_service.run_stepwise(gates, num_qubits, include_density_matrix=False, include_bloch_vectors=False)
        return {
            "simulation": result,
            "steps": steps
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")
