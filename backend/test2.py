import asyncio, json
from database import connect_to_mongo, get_db

async def run():
    await connect_to_mongo()
    db = get_db()
    algs = await db.algorithm_catalog.find().to_list(100)
    for a in algs:
        print(f"Slug: {a.get('slug')}")
        print(f"Related: {a.get('relatedAlgorithms', [])}")

if __name__ == "__main__":
    asyncio.run(run())
