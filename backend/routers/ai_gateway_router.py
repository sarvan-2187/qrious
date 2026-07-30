from fastapi import APIRouter, Depends

from ai import ai_gateway
from auth import get_current_user

router = APIRouter(prefix="/api/ai", tags=["AI Gateway"])


@router.get("/health")
async def ai_gateway_health(current_user: dict = Depends(get_current_user)):
    """Requires auth (same convention every other Qrious endpoint follows,
    via auth.get_current_user) — deliberately not a public endpoint, since
    even the shape of "which providers are configured" is internal
    operational detail, not something to hand out anonymously. Never
    returns quota/account-level detail, only configured/available/circuit
    state (task spec §18)."""
    health = await ai_gateway.health()
    return health.model_dump()
