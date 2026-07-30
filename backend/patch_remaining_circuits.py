import asyncio
from database import connect_to_mongo, get_db, close_mongo_connection

circuits = {
    "quantum-random-number-generation-qrng": {
        "num_qubits": 1, "num_cbits": 1,
        "gates": [
            {"id": "h1", "name": "H", "target": 0, "step": 0, "params": []},
            {"id": "m1", "name": "MEASURE", "target": 0, "step": 1, "params": []}
        ]
    },
    "deutsch-algorithm": {
        "num_qubits": 2, "num_cbits": 1,
        "gates": [
            {"id": "x1", "name": "X", "target": 1, "step": 0, "params": []},
            {"id": "h1", "name": "H", "target": 0, "step": 1, "params": []},
            {"id": "h2", "name": "H", "target": 1, "step": 1, "params": []},
            {"id": "cx1", "name": "CX", "target": 1, "control": 0, "step": 2, "params": []},
            {"id": "h3", "name": "H", "target": 0, "step": 3, "params": []}
        ]
    },
    "bernstein-vazirani-algorithm": {
        "num_qubits": 3, "num_cbits": 2,
        "gates": [
            {"id": "x1", "name": "X", "target": 2, "step": 0, "params": []},
            {"id": "h1", "name": "H", "target": 0, "step": 1, "params": []},
            {"id": "h2", "name": "H", "target": 1, "step": 1, "params": []},
            {"id": "h3", "name": "H", "target": 2, "step": 1, "params": []},
            {"id": "cx1", "name": "CX", "target": 2, "control": 0, "step": 2, "params": []},
            {"id": "h4", "name": "H", "target": 0, "step": 3, "params": []},
            {"id": "h5", "name": "H", "target": 1, "step": 3, "params": []}
        ]
    },
    "quantum-fourier-transform-qft": {
        "num_qubits": 3, "num_cbits": 3,
        "gates": [
            {"id": "h1", "name": "H", "target": 0, "step": 0, "params": []},
            {"id": "cp1", "name": "CP", "target": 0, "control": 1, "step": 1, "params": []},
            {"id": "cp2", "name": "CP", "target": 0, "control": 2, "step": 2, "params": []},
            {"id": "h2", "name": "H", "target": 1, "step": 3, "params": []},
            {"id": "cp3", "name": "CP", "target": 1, "control": 2, "step": 4, "params": []},
            {"id": "h3", "name": "H", "target": 2, "step": 5, "params": []},
            {"id": "swap1", "name": "SWAP", "target": 2, "control": 0, "step": 6, "params": []}
        ]
    },
    "quantum-phase-estimation-qpe": {
        "num_qubits": 3, "num_cbits": 2,
        "gates": [
            {"id": "x1", "name": "X", "target": 2, "step": 0, "params": []},
            {"id": "h1", "name": "H", "target": 0, "step": 1, "params": []},
            {"id": "h2", "name": "H", "target": 1, "step": 1, "params": []},
            {"id": "cp1", "name": "CP", "target": 2, "control": 1, "step": 2, "params": []},
            {"id": "iqft1", "name": "IQFT", "target": 0, "step": 3, "params": []},
            {"id": "iqft2", "name": "IQFT", "target": 1, "step": 3, "params": []}
        ]
    },
    "amplitude-amplification": {
        "num_qubits": 2, "num_cbits": 2,
        "gates": [
            {"id": "h1", "name": "H", "target": 0, "step": 0, "params": []},
            {"id": "h2", "name": "H", "target": 1, "step": 0, "params": []},
            {"id": "cz1", "name": "CZ", "target": 1, "control": 0, "step": 1, "params": []},
            {"id": "h3", "name": "H", "target": 0, "step": 2, "params": []},
            {"id": "h4", "name": "H", "target": 1, "step": 2, "params": []},
            {"id": "x1", "name": "X", "target": 0, "step": 3, "params": []},
            {"id": "x2", "name": "X", "target": 1, "step": 3, "params": []},
            {"id": "cz2", "name": "CZ", "target": 1, "control": 0, "step": 4, "params": []},
            {"id": "x3", "name": "X", "target": 0, "step": 5, "params": []},
            {"id": "x4", "name": "X", "target": 1, "step": 5, "params": []},
            {"id": "h5", "name": "H", "target": 0, "step": 6, "params": []},
            {"id": "h6", "name": "H", "target": 1, "step": 6, "params": []}
        ]
    },
    "grover-s-search-algorithm": {
        "num_qubits": 2, "num_cbits": 2,
        "gates": [
            {"id": "h1", "name": "H", "target": 0, "step": 0, "params": []},
            {"id": "h2", "name": "H", "target": 1, "step": 0, "params": []},
            {"id": "cz1", "name": "CZ", "target": 1, "control": 0, "step": 1, "params": []},
            {"id": "h3", "name": "H", "target": 0, "step": 2, "params": []},
            {"id": "h4", "name": "H", "target": 1, "step": 2, "params": []},
            {"id": "x1", "name": "X", "target": 0, "step": 3, "params": []},
            {"id": "x2", "name": "X", "target": 1, "step": 3, "params": []},
            {"id": "cz2", "name": "CZ", "target": 1, "control": 0, "step": 4, "params": []},
            {"id": "x3", "name": "X", "target": 0, "step": 5, "params": []},
            {"id": "x4", "name": "X", "target": 1, "step": 5, "params": []},
            {"id": "h5", "name": "H", "target": 0, "step": 6, "params": []},
            {"id": "h6", "name": "H", "target": 1, "step": 6, "params": []}
        ]
    },
    "superdense-coding": {
        "num_qubits": 2, "num_cbits": 2,
        "gates": [
            {"id": "h1", "name": "H", "target": 0, "step": 0, "params": []},
            {"id": "cx1", "name": "CX", "target": 1, "control": 0, "step": 1, "params": []},
            {"id": "x1", "name": "X", "target": 0, "step": 2, "params": []},
            {"id": "z1", "name": "Z", "target": 0, "step": 3, "params": []},
            {"id": "cx2", "name": "CX", "target": 1, "control": 0, "step": 4, "params": []},
            {"id": "h2", "name": "H", "target": 0, "step": 5, "params": []}
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
        
    # Also add a generic default circuit for ANY missing algorithm to prevent empty sections
    algs = await db.algorithm_catalog.find({'status': 'active'}).to_list(100)
    for a in algs:
        if 'example_circuit' not in a and a.get('slug') not in circuits:
            default_circuit = {
                "num_qubits": 2, "num_cbits": 2,
                "gates": [
                    {"id": "u1", "name": "U", "target": 0, "step": 0, "params": []},
                    {"id": "u2", "name": "U", "target": 1, "step": 0, "params": []},
                    {"id": "cx1", "name": "CX", "target": 1, "control": 0, "step": 1, "params": []}
                ]
            }
            res = await db.algorithm_catalog.update_one(
                {"_id": a["_id"]},
                {"$set": {"example_circuit": default_circuit}}
            )
            print(f"Added default circuit for {a.get('slug')}: {res.modified_count}")

    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(run())
