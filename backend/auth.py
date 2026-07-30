import json
import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials, auth
from database import get_db

security = HTTPBearer()

# Initialize Firebase Admin
def init_firebase():
    if not firebase_admin._apps:
        # The service-account key is no longer committed to the repo, so the
        # deployed app has no file to point FIREBASE_SERVICE_ACCOUNT_PATH at.
        # credentials.Certificate() also accepts a parsed dict, so prefer the
        # whole JSON blob in an env var; the file path stays supported for
        # local dev where the key does sit on disk.
        cred_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
        cred_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH")

        if cred_json:
            source = credentials.Certificate(json.loads(cred_json))
        elif cred_path:
            source = credentials.Certificate(cred_path)
        else:
            raise RuntimeError(
                "Set FIREBASE_SERVICE_ACCOUNT_JSON (the key file's full contents) "
                "or FIREBASE_SERVICE_ACCOUNT_PATH (a path to it)"
            )

        try:
            firebase_admin.initialize_app(source)
        except Exception as e:
            print(f"Error initializing Firebase Admin SDK: {e}")
            raise e

init_firebase()

async def get_verified_firebase_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Dependency that extracts the Bearer token, verifies it with Firebase Admin,
    and returns the decoded token.
    """
    token = credentials.credentials
    try:
        # Allow 10 seconds of clock skew tolerance between local system time and Firebase servers
        decoded_token = auth.verify_id_token(token, check_revoked=True, clock_skew_seconds=10)
        return decoded_token
    except auth.RevokedIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(decoded_token: dict = Depends(get_verified_firebase_user)):
    """
    Dependency that returns the full MongoDB user document based on the verified Firebase token.
    Falls back to a default user dict if MongoDB is initializing or unavailable,
    and automatically upserts missing users into db.users.
    """
    db = get_db()
    uid = decoded_token.get("uid")
    
    user_doc = None
    if db is not None and uid:
        try:
            user_doc = await db.users.find_one({"firebase_uid": uid})
            if not user_doc:
                default_name = decoded_token.get("name") or (decoded_token.get("email", "").split("@")[0] if decoded_token.get("email") else "Quantum Learner")
                new_user = {
                    "firebase_uid": uid,
                    "email": decoded_token.get("email", ""),
                    "full_name": default_name,
                    "display_name": default_name,
                    "role": "learner",
                    "xp_total": 0
                }
                res = await db.users.insert_one(new_user)
                new_user["_id"] = str(res.inserted_id)
                return new_user
        except Exception as e:
            print(f"[Auth Warning] Failed to query/create user document from DB: {e}")
            
    if not user_doc:
        default_name = decoded_token.get("name") or "Quantum Learner"
        return {
            "_id": uid,
            "firebase_uid": uid,
            "email": decoded_token.get("email", ""),
            "full_name": default_name,
            "display_name": default_name,
            "role": "learner",
            "xp_total": 0
        }
    
    user_doc["_id"] = str(user_doc.get("_id", uid))
    return user_doc

def require_role(required_role: str):
    """
    Dependency generator for RBAC. Returns a dependency that verifies the user has the required role.
    """
    async def role_checker(user: dict = Depends(get_current_user)):
        if user.get("role") != required_role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user
    return role_checker
