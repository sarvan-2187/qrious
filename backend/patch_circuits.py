import asyncio
from database import connect_to_mongo, close_mongo_connection, get_db

circuits = {
    "bell-state": {
        "num_qubits": 2,
        "num_cbits": 2,
        "gates": [
            {"id": "h1", "name": "H", "target": 0, "step": 0, "params": []},
            {"id": "cnot1", "name": "CX", "target": 1, "control": 0, "step": 1, "params": []}
        ]
    },
    "ghz-state": {
        "num_qubits": 3,
        "num_cbits": 3,
        "gates": [
            {"id": "h1", "name": "H", "target": 0, "step": 0, "params": []},
            {"id": "cnot1", "name": "CX", "target": 1, "control": 0, "step": 1, "params": []},
            {"id": "cnot2", "name": "CX", "target": 2, "control": 1, "step": 2, "params": []}
        ]
    },
    "deutsch-jozsa-algorithm": {
        "num_qubits": 4,
        "num_cbits": 3,
        "gates": [
            {"id": "x1", "name": "X", "target": 3, "step": 0, "params": []},
            {"id": "h1", "name": "H", "target": 0, "step": 1, "params": []},
            {"id": "h2", "name": "H", "target": 1, "step": 1, "params": []},
            {"id": "h3", "name": "H", "target": 2, "step": 1, "params": []},
            {"id": "h4", "name": "H", "target": 3, "step": 1, "params": []},
            {"id": "cx1", "name": "CX", "target": 3, "control": 0, "step": 2, "params": []},
            {"id": "cx2", "name": "CX", "target": 3, "control": 1, "step": 3, "params": []},
            {"id": "cx3", "name": "CX", "target": 3, "control": 2, "step": 4, "params": []},
            {"id": "h5", "name": "H", "target": 0, "step": 5, "params": []},
            {"id": "h6", "name": "H", "target": 1, "step": 5, "params": []},
            {"id": "h7", "name": "H", "target": 2, "step": 5, "params": []}
        ]
    },
    "quantum-teleportation": {
        "num_qubits": 3,
        "num_cbits": 3,
        "gates": [
            {"id": "h1", "name": "H", "target": 1, "step": 0, "params": []},
            {"id": "cx1", "name": "CX", "target": 2, "control": 1, "step": 1, "params": []},
            {"id": "cx2", "name": "CX", "target": 1, "control": 0, "step": 2, "params": []},
            {"id": "h2", "name": "H", "target": 0, "step": 3, "params": []}
        ]
    }
}

async def run():
    await connect_to_mongo()
    db = get_db()
    for slug, circuit in circuits.items():
        res = await db.algorithm_catalog.update_one(
            {"slug": slug},
            {"$set": {"example_circuit": circuit}}
        )
        print(f"Updated {slug}: {res.modified_count}")
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(run())
