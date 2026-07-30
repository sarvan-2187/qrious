from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any, Optional
from database import get_db
from firebase_admin import auth
from services.streak_engine import streak_engine

router = APIRouter(prefix="/api/v1/learning/streak", tags=["Quantum Streak"])
security_optional = HTTPBearer(auto_error=False)

async def get_optional_firebase_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional)):
    if not credentials or not credentials.credentials:
        return None
    try:
        token = credentials.credentials
        decoded = auth.verify_id_token(token, check_revoked=False, clock_skew_seconds=10)
        return decoded
    except Exception:
        return None

@router.get("", summary="Get user streak status and activity calendar history")
@router.get("/", summary="Get user streak status and activity calendar history")
async def get_streak_status(decoded_token: Optional[dict] = Depends(get_optional_firebase_user)):
    db = get_db()
    firebase_uid = decoded_token.get("uid") if decoded_token else "guest_learner"

    streak_data = await streak_engine.get_evaluated_streak(db, firebase_uid)

    return {
        "data": streak_data,
        "meta": None,
        "error": None
    }
