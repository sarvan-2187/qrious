import asyncio
from database import connect_to_mongo, close_mongo_connection, get_db

async def run():
    await connect_to_mongo()
    db = get_db()
    algs = await db.algorithm_catalog.find({}).to_list(length=100)
    print("Slugs in DB:")
    for a in algs:
        print(a.get('slug'), 'example_circuit' in a)
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(run())
