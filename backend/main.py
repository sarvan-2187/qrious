from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import connect_to_mongo, close_mongo_connection

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()

app = FastAPI(
    title="Qrious API",
    description="Backend API built with FastAPI",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "message": "Welcome to Qrious API!",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy"
    }


from models.user import UserOnboarding
from database import get_db

@app.post("/api/onboarding")
async def save_onboarding(user_data: UserOnboarding):
    db = get_db()
    if db is None:
        return {"error": "Database not connected"}
    
    user_dict = user_data.model_dump()
    
    existing_user = await db.users.find_one({"firebase_uid": user_data.firebase_uid})
    if existing_user:
        await db.users.update_one({"firebase_uid": user_data.firebase_uid}, {"$set": user_dict})
        return {"message": "User updated successfully"}
    
    await db.users.insert_one(user_dict)
    return {"message": "User saved successfully"}

@app.get("/api/user/{firebase_uid}")
async def get_user(firebase_uid: str):
    from fastapi import HTTPException
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    user = await db.users.find_one({"firebase_uid": firebase_uid})
    if user:
        user['_id'] = str(user['_id'])
        return user
    
    raise HTTPException(status_code=404, detail="User not found")