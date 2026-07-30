import os

import jwt

QBOOK_SERVICE_SECRET = os.getenv("QBOOK_SERVICE_SECRET")


class InvalidSessionToken(Exception):
    pass


def verify_session_token(token: str) -> dict:
    """Verifies the short-lived HS256 token minted by backend/routers/qbook_router.py's
    POST /notebooks/{id}/session. Raises InvalidSessionToken on any failure (bad
    signature, expiry, or missing claims) — callers should treat that as a hard
    connection reject, not a retryable error.
    """
    if not QBOOK_SERVICE_SECRET:
        raise InvalidSessionToken("QBOOK_SERVICE_SECRET is not configured on this service")
    try:
        payload = jwt.decode(token, QBOOK_SERVICE_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError as e:
        raise InvalidSessionToken(str(e)) from e

    if not payload.get("uid") or not payload.get("notebook_id"):
        raise InvalidSessionToken("Token is missing required claims")

    return payload