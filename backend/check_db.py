import asyncio
from database import connect_to_mongo, get_db

async def main():
    await connect_to_mongo()
    db = get_db()
    if db is None:
        print("MongoDB not connected")
        return
    users = await db.users.find({}).to_list(50)
    print(f"Total users found: {len(users)}")
    for u in users:
        print(f"Email: {u.get('email')} | Role: {u.get('role')} | Name: {u.get('full_name')}")

if __name__ == '__main__':
    asyncio.run(main())
