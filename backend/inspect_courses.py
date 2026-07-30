import asyncio
from database import connect_to_mongo, get_db

async def inspect():
    await connect_to_mongo()
    db = get_db()
    courses = await db.courses.find().to_list(100)
    print(f"Total courses in MongoDB: {len(courses)}")
    for c in courses:
        print(f" - ID: {c['_id']}, Title: '{c.get('title')}', Owner: '{c.get('owner_uid')}', Status: '{c.get('status')}'")

if __name__ == '__main__':
    asyncio.run(inspect())
