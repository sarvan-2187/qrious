import os
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from db.indexes import create_all_indexes

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
    kwargs = {"serverSelectionTimeoutMS": 20000}
    if "+srv" in MONGODB_URI:
        kwargs["tlsCAFile"] = certifi.where()
        
    db_instance.client = AsyncIOMotorClient(MONGODB_URI, **kwargs)
    db_instance.db = db_instance.client.get_database("qrious-db")

    try:
        # Create unique indexes for LMS
        await db_instance.db.enrollments.create_index(
            [("student_uid", 1), ("course_id", 1)], unique=True
        )
        await db_instance.db.lesson_progress.create_index(
            [("student_uid", 1), ("lesson_id", 1)], unique=True
        )
        await db_instance.db.modules.create_index("course_id")
        await db_instance.db.lessons.create_index("module_id")
        await db_instance.db.resources.create_index("lesson_id")
        await db_instance.db.live_sessions.create_index("course_id")
        await db_instance.db.video_overviews.create_index("lesson_id")
        await db_instance.db.notebooks.create_index("owner_uid")
        await db_instance.db.qbook_datasets.create_index("owner_uid")
        await db_instance.db.qstudio_study_spaces.create_index("owner_uid")
        await db_instance.db.qstudio_sources.create_index("study_space_id")
        await db_instance.db.qstudio_outputs.create_index("study_space_id")
        await db_instance.db.qstudio_flashcard_reviews.create_index([("output_id", 1), ("owner_uid", 1)])

        # Quantum news indexes
        await db_instance.db.quantum_news.create_index("fetched_at", expireAfterSeconds=21600)
        await db_instance.db.quantum_news.create_index("url", unique=True)

        # Assessments index
        await db_instance.db.assessments.create_index([("firebase_uid", 1), ("taken_at", -1)])

        # Quantum puzzle completions index
        await db_instance.db.puzzle_completions.create_index([("firebase_uid", 1), ("puzzle_id", 1)], unique=True)

        # Daily puzzle completions and streaks indexes
        await db_instance.db.daily_puzzle_completions.create_index([("firebase_uid", 1), ("date_str", 1)], unique=True)
        await db_instance.db.daily_puzzle_streaks.create_index("firebase_uid", unique=True)
        
        # Bloch progress index
        await db_instance.db.bloch_progress.create_index("firebase_uid", unique=True)

        await create_all_indexes(db_instance.db)
        print("Connected to MongoDB!")
    except Exception as e:
        print(f"MongoDB connection warning/error: {e}")

async def close_mongo_connection():
    """Close the MongoDB connection on application shutdown."""
    if db_instance.client:
        print("Closing MongoDB connection...")
        client = db_instance.client
        db_instance.client = None
        db_instance.db = None
        client.close()
        print("MongoDB connection closed.")

def get_db():
    """Dependency to get the database instance."""
    return db_instance.db

# Trigger reload for updated .env directConnection
