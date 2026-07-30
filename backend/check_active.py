import asyncio
from database import connect_to_mongo, get_db

async def run():
    await connect_to_mongo()
    db = get_db()
    algs = await db.algorithm_catalog.find({}).to_list(100)
    unlocked = [a for a in algs if a.get('status') != 'coming_soon']
    for a in unlocked:
        print(f"Level {a.get('level')}: {a.get('slug')} - Has circuit: {'example_circuit' in a}")

if __name__ == "__main__":
    asyncio.run(run())
