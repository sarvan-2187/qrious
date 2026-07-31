import asyncio, json
from database import connect_to_mongo, get_db

async def run():
    await connect_to_mongo()
    db = get_db()
    doc = await db.algorithm_catalog.find_one({'slug': 'shors-algorithm'})
    if doc:
        doc['_id'] = str(doc['_id'])
        print(json.dumps(doc, indent=2))
    else:
        print("Not found")

if __name__ == "__main__":
    asyncio.run(run())
