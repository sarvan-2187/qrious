import os
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise ValueError("MONGODB_URI environment variable is not set")

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_to_mongo():
    """
    Connect to MongoDB on render service startup. Index creation is owned by the main
    FastAPI Cloud API (backend/database.py) — that service is always running and already
    creates the video_overviews.lesson_id index this service relies on, so this copy only
    needs a connection, not index setup.
    """
    print("Connecting to MongoDB...")
    kwargs = {}
    if "+srv" in MONGODB_URI:
        kwargs["tlsCAFile"] = certifi.where()
    db_instance.client = AsyncIOMotorClient(MONGODB_URI, **kwargs)
    db_instance.db = db_instance.client.get_database("qrious-db")
    print("Connected to MongoDB!")

async def close_mongo_connection():
    """Close the MongoDB connection on application shutdown."""
    if db_instance.client:
        print("Closing MongoDB connection...")
        db_instance.client.close()
        print("MongoDB connection closed.")

def get_db():
    """Dependency to get the database instance."""
    return db_instance.db
