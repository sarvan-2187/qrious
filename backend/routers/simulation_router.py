from fastapi import APIRouter, Depends, HTTPException
from typing import List
from auth import get_current_user
from models.simulation_model import (
    SimulationRequest, SimulationResult, DebugRequest, DebugStep,
    QasmExportRequest, QasmExportResponse, QasmImportRequest, QasmImportResponse,
)
from services.qiskit_service import qiskit_service
from services.circuit_service import circuit_service

router = APIRouter(prefix="/api/v1", tags=["Simulation Engine"])

@router.post("/simulate", response_model=SimulationResult)
async def simulate_circuit(request: SimulationRequest, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    
    if request.circuit_id:
        circuit = await circuit_service.get_circuit(user_id, request.circuit_id)
        if not circuit:
            raise HTTPException(status_code=404, detail="Circuit not found")
        gates = [gate.dict() for gate in circuit.gates]
        num_qubits = circuit.num_qubits
        num_cbits = getattr(circuit, 'num_cbits', circuit.num_qubits)
    elif request.num_qubits is not None and request.gates is not None:
        gates = request.gates
        num_qubits = request.num_qubits
        num_cbits = getattr(request, 'num_cbits', request.num_qubits)
    else:
        raise HTTPException(status_code=400, detail="Must provide circuit_id OR num_qubits and gates")

    try:
        qc = qiskit_service.build_qiskit_circuit(gates, num_qubits, num_cbits)
        result = qiskit_service.run_simulation(qc, shots=request.shots, noisy=bool(request.noisy))
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")

@router.post("/debug/steps", response_model=List[DebugStep])
async def debug_circuit_steps(request: DebugRequest, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    
    if request.circuit_id:
        circuit = await circuit_service.get_circuit(user_id, request.circuit_id)
        if not circuit:
            raise HTTPException(status_code=404, detail="Circuit not found")
        gates = [gate.dict() for gate in circuit.gates]
        num_qubits = circuit.num_qubits
        num_cbits = getattr(circuit, 'num_cbits', circuit.num_qubits)
    elif request.num_qubits is not None and request.gates is not None:
        gates = request.gates
        num_qubits = request.num_qubits
        num_cbits = getattr(request, 'num_cbits', request.num_qubits)
    else:
        raise HTTPException(status_code=400, detail="Must provide circuit_id OR num_qubits and gates")

    try:
        steps = qiskit_service.run_stepwise(gates, num_qubits, num_cbits)
        return steps
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Debug computation failed: {str(e)}")

@router.post("/qasm/export", response_model=QasmExportResponse)
async def export_qasm(request: QasmExportRequest, current_user: dict = Depends(get_current_user)):
    try:
        if request.language == "qiskit":
            code = qiskit_service.circuit_to_qiskit(request.gates, request.num_qubits, request.num_cbits)
        else:
            code = qiskit_service.circuit_to_qasm2(request.gates, request.num_qubits, request.num_cbits)
        return {"qasm": code}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"QASM export failed: {str(e)}")

@router.post("/qasm/import", response_model=QasmImportResponse)
async def import_qasm(request: QasmImportRequest, current_user: dict = Depends(get_current_user)):
    try:
        if request.language == "qiskit":
            return qiskit_service.qiskit_to_gates(request.qasm)
        else:
            return qiskit_service.qasm2_to_gates(request.qasm)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
