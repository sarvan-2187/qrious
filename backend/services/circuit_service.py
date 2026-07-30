from typing import List, Optional
from datetime import datetime, timezone
from models.circuit_model import CircuitBase, Circuit
from database import get_db
import uuid

class CircuitService:
    @staticmethod
    async def create_circuit(user_id: str, circuit_data: CircuitBase) -> Circuit:
        db = get_db()
        collection = db["saved_circuits"]
        
        circuit_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        gate_dicts = [gate.model_dump() if hasattr(gate, 'model_dump') else gate.dict() for gate in circuit_data.gates]
        
        circuit_doc = {
            "id": circuit_id,
            "user_id": user_id,
            "name": circuit_data.name,
            "num_qubits": circuit_data.num_qubits,
            "gates": gate_dicts,
            "created_at": now,
            "updated_at": now
        }
        
        await collection.insert_one(circuit_doc)
        return Circuit(**circuit_doc)

    @staticmethod
    async def get_circuit(user_id: str, circuit_id: str) -> Optional[Circuit]:
        db = get_db()
        collection = db["saved_circuits"]
        doc = await collection.find_one({"id": circuit_id, "user_id": user_id})
        if doc:
            return Circuit(**doc)
        return None

    @staticmethod
    async def list_circuits(user_id: str) -> List[Circuit]:
        db = get_db()
        collection = db["saved_circuits"]
        cursor = collection.find({"user_id": user_id}).sort("updated_at", -1)
        circuits = []
        async for doc in cursor:
            circuits.append(Circuit(**doc))
        return circuits

    @staticmethod
    async def update_circuit(user_id: str, circuit_id: str, updates: dict) -> Optional[Circuit]:
        db = get_db()
        collection = db["saved_circuits"]
        updates["updated_at"] = datetime.now(timezone.utc)
        
        result = await collection.find_one_and_update(
            {"id": circuit_id, "user_id": user_id},
            {"$set": updates},
            return_document=True
        )
        if result:
            return Circuit(**result)
        return None

    @staticmethod
    async def delete_circuit(user_id: str, circuit_id: str) -> bool:
        db = get_db()
        collection = db["saved_circuits"]
        result = await collection.delete_one({"id": circuit_id, "user_id": user_id})
        return result.deleted_count > 0

circuit_service = CircuitService()
