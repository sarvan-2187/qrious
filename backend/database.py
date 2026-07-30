import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise ValueError("MONGODB_URI environment variable is not set")

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_to_mongo():
    """Connect to MongoDB on application startup."""
    print("Connecting to MongoDB...")
    db_instance.client = AsyncIOMotorClient(MONGODB_URI)
    # The database name can be passed as a string here
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
