import asyncio
from database import connect_to_mongo, get_db, close_mongo_connection

async def run():
    await connect_to_mongo()
    db = get_db()
        
    algs = await db.algorithm_catalog.find({}).to_list(100)
    for a in algs:
        if 'example_circuit' not in a and a.get('status') != 'coming_soon':
            default_circuit = {
                "num_qubits": 2, "num_cbits": 2,
                "gates": [
                    {"id": "h1", "name": "H", "target": 0, "step": 0, "params": []},
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
