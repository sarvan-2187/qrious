from fastapi import APIRouter, Depends
from pydantic import BaseModel

from auth import get_verified_firebase_user
from database import get_db
from services.topic_prefilter import MAX_CANDIDATES, get_weak_topic_candidates
from services.learning_qaoa import optimize_learning_path

router = APIRouter(prefix="/api/v1/quantum-optimizer", tags=["Quantum Learning Path Optimizer"])


class RecommendPathRequest(BaseModel):
    max_time_minutes: int = 45


@router.post("/recommend-path", summary="QAOA-optimized personalized learning path for a study session")
async def recommend_path(
    payload: RecommendPathRequest,
    decoded_token: dict = Depends(get_verified_firebase_user),
):
    db = get_db()
    firebase_uid = decoded_token.get("uid")

    candidates = await get_weak_topic_candidates(db, firebase_uid, payload.max_time_minutes)
    stage1_candidate_count = len(candidates)

    if stage1_candidate_count < 2:
        return {
            "data": {
                "message": "no_optimization_needed",
                "stage1_candidate_count": stage1_candidate_count,
                "algorithm": None,
                "bitstring": None,
                "selected_topics": candidates,
                "qaoa_parameters": None,
                "total_estimated_time": sum(c["time"] for c in candidates),
                "total_learning_value": sum(c["weight"] for c in candidates),
                "fallback_used": False,
            },
            "meta": None,
            "error": None,
        }

    # get_weak_topic_candidates already truncates to MAX_CANDIDATES, but the
    # cap is enforced again here so a bug in Stage 1 can never hand Stage 2
    # more qubits than it's built to run.
    result = optimize_learning_path(candidates[:MAX_CANDIDATES], payload.max_time_minutes)

    return {
        "data": {
            "message": "ok",
            "stage1_candidate_count": stage1_candidate_count,
            **result,
        },
        "meta": None,
        "error": None,
    }
