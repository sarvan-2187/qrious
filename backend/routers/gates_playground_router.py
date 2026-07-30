from fastapi import APIRouter, Depends, HTTPException
from typing import List
from auth import get_current_user
from models.circuit_model import CircuitBase, Circuit
from services.circuit_service import circuit_service

router = APIRouter(prefix="/api/v1/circuits", tags=["Gates Playground"])

@router.post("/", response_model=Circuit)
async def create_circuit(circuit: CircuitBase, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    return await circuit_service.create_circuit(user_id, circuit)

@router.get("/", response_model=List[Circuit])
async def list_circuits(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    return await circuit_service.list_circuits(user_id)

@router.get("/{circuit_id}", response_model=Circuit)
async def get_circuit(circuit_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    circuit = await circuit_service.get_circuit(user_id, circuit_id)
    if not circuit:
        raise HTTPException(status_code=404, detail="Circuit not found")
    return circuit

@router.put("/{circuit_id}", response_model=Circuit)
async def update_circuit(circuit_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    circuit = await circuit_service.update_circuit(user_id, circuit_id, updates)
    if not circuit:
        raise HTTPException(status_code=404, detail="Circuit not found")
    return circuit

@router.delete("/{circuit_id}")
async def delete_circuit(circuit_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    deleted = await circuit_service.delete_circuit(user_id, circuit_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Circuit not found")
    return {"deleted": True}
