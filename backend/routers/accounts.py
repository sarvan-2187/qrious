from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from auth import get_verified_firebase_user, get_current_user

router = APIRouter(prefix="/api", tags=["Accounts"])

@router.post("/onboarding")
async def save_onboarding(
    user_data: dict,
    decoded_token: dict = Depends(get_verified_firebase_user)
):
    db = get_db()
    if db is None:
        return {"error": "Database not connected"}
    
    firebase_uid = decoded_token.get("uid")
    email = decoded_token.get("email")
    email_verified = decoded_token.get("email_verified", False)
    existing_user = await db.users.find_one({"firebase_uid": firebase_uid})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already onboarded")
        
    requested_role = user_data.get("role", "learner")
    assigned_role = "learner"
    
    if requested_role == "educator":
        # Institutional domains + common local dev domains for testing
        ALLOWED_FACULTY_DOMAINS = ["amrita.edu", "ch.students.amrita.edu", "ch.amrita.edu", "gmail.com", "example.com"]
        domain = email.split("@")[-1].lower() if email else ""
        
        is_allowed = any(domain == d or domain.endswith("." + d) for d in ALLOWED_FACULTY_DOMAINS)
        if not is_allowed:
            raise HTTPException(status_code=400, detail="Faculty accounts require a verified institutional email address")
        # In local development, check email_verified if available
        if not email_verified and os.environ.get("ENV") == "production":
            raise HTTPException(status_code=400, detail="Faculty accounts require a verified email address. Please verify your email.")
        assigned_role = "educator"

    user_dict = {
        "firebase_uid": firebase_uid,
        "email": email,
        "full_name": user_data.get("name"),
        "age": user_data.get("age"),
        "interested_topic": user_data.get("topic"),
        "role": assigned_role
    }
    
    await db.users.insert_one(user_dict)
    return {"message": "User saved successfully"}

@router.get("/user/me")
async def get_user(user: dict = Depends(get_current_user)):
    return user

@router.patch("/user/me")
async def update_user(
    update_data: dict,
    user: dict = Depends(get_current_user),
    decoded_token: dict = Depends(get_verified_firebase_user)
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    firebase_uid = decoded_token.get("uid")
    
    # Filter allowed fields
    allowed_fields = ["full_name", "age", "interested_topic"]
    update_dict = {k: v for k, v in update_data.items() if k in allowed_fields}
    
    if update_dict:
        await db.users.update_one({"firebase_uid": firebase_uid}, {"$set": update_dict})
    
    updated_user = await db.users.find_one({"firebase_uid": firebase_uid})
    if updated_user and "_id" in updated_user:
        updated_user["_id"] = str(updated_user["_id"])
    return updated_user
