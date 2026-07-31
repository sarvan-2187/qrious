from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any, Optional
from database import get_db
from firebase_admin import auth
from auth import get_current_user
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

@router.post("/freeze/consume", summary="Manually consume a freeze token to protect an at-risk streak")
async def consume_freeze_token(user: dict = Depends(get_current_user)):
    # streak_engine.consume_freeze_token() was fully implemented but never
    # wired to a route -- the frontend's "Use Freeze Token" button has been
    # calling this exact path and getting a 404 every time. Requires a real
    # logged-in user (not the optional guest fallback the GET status above
    # uses) since this mutates a limited per-account resource.
    db = get_db()
    result = await streak_engine.consume_freeze_token(db, user.get("firebase_uid"))

    return {
        "data": result,
        "meta": None,
        "error": None
    }
