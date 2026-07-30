from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List, Optional
from database import get_db
from auth import get_verified_firebase_user
from services.xp_engine import xp_engine
from services.badge_engine import badge_engine
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/v1/learning/puzzles", tags=["Quantum Puzzles"])

def get_daily_puzzle_id() -> str:
    puzzle_ids = [
        "beg-1", "beg-2", "beg-3", "beg-4", "beg-5", "beg-6", "beg-7", "beg-8", "beg-9", "beg-10",
        "int-1", "int-2", "int-3", "int-4", "int-5", "int-6", "int-7", "int-8", "int-9", "int-10",
        "adv-1", "adv-2", "adv-3", "adv-4", "adv-5", "adv-6", "adv-7", "adv-8", "adv-9", "adv-10"
    ]
    # Rotate daily using days since epoch
    days = (datetime.utcnow() - datetime(1970, 1, 1)).days
    return puzzle_ids[days % len(puzzle_ids)]

@router.get("/completed", summary="Get all completed puzzle IDs for the user")
async def get_completed_puzzles(decoded_token: dict = Depends(get_verified_firebase_user)):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    firebase_uid = decoded_token.get("uid")
    
    cursor = db.puzzle_completions.find({"firebase_uid": firebase_uid})
    completions = await cursor.to_list(length=100)
    
    completed_ids = [c["puzzle_id"] for c in completions if "puzzle_id" in c]
    return {
        "data": completed_ids,
        "meta": {"total": len(completed_ids)},
        "error": None
    }

@router.get("/daily/status", summary="Get current daily challenge status and streak info")
async def get_daily_status(decoded_token: dict = Depends(get_verified_firebase_user)):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    firebase_uid = decoded_token.get("uid")
    daily_id = get_daily_puzzle_id()
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    yesterday_str = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
    
    # Check if user solved it today
    solved_today = False
    completion = await db.daily_puzzle_completions.find_one({
        "firebase_uid": firebase_uid,
        "date_str": today_str
    })
    if completion:
        solved_today = True
        
    # Get user daily puzzle streak
    streak_doc = await db.daily_puzzle_streaks.find_one({"firebase_uid": firebase_uid})
    current_streak = 0
    longest_streak = 0
    
    if streak_doc:
        last_date = streak_doc.get("last_solved_date")
        current_streak = streak_doc.get("current_streak", 0)
        longest_streak = streak_doc.get("longest_streak", 0)
        
        # If the user has not solved it today and did not solve it yesterday, the streak is broken/0
        if last_date != today_str and last_date != yesterday_str:
            current_streak = 0
            
    # Calculate global solved count for today
    global_solve_count = await db.daily_puzzle_completions.count_documents({"date_str": today_str})
    
    return {
        "data": {
            "daily_puzzle_id": daily_id,
            "solved_today": solved_today,
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "global_solve_count": global_solve_count
        },
        "meta": None,
        "error": None
    }

@router.get("/leaderboard", summary="Get leaderboard combining total XP and daily challenge solves")
async def get_puzzles_leaderboard(decoded_token: dict = Depends(get_verified_firebase_user)):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    firebase_uid = decoded_token.get("uid")
    current_user_doc = await db.users.find_one({"firebase_uid": firebase_uid})
    if current_user_doc and current_user_doc.get("role") == "educator":
        return {
            "data": [],
            "meta": {"total": 0, "is_educator": True},
            "error": None
        }

    # 1. Aggregate total daily challenge completions per user
    pipeline = [
        {"$group": {"_id": "$firebase_uid", "daily_solves_count": {"$sum": 1}}}
    ]
    try:
        completions_cursor = db.daily_puzzle_completions.aggregate(pipeline)
        completions_list = await completions_cursor.to_list(length=1000)
    except Exception as e:
        print(f"[Leaderboard Warning] Fail daily_puzzle_completions aggregate: {e}")
        completions_list = []
    
    solves_map = {item["_id"]: item["daily_solves_count"] for item in completions_list if "_id" in item}

    # 2. Fetch all users who are not educators (learners only)
    try:
        users_cursor = db.users.find(
            {"role": {"$ne": "educator"}},
            {"firebase_uid": 1, "full_name": 1, "display_name": 1, "email": 1, "xp_total": 1, "role": 1}
        )
        users_list = await users_cursor.to_list(length=1000)
    except Exception as e:
        print(f"[Leaderboard Warning] Fail users find: {e}")
        users_list = []

    leaderboard = []
    for user in users_list:
        if user.get("role") == "educator":
            continue
        uid = user.get("firebase_uid")
        if not uid:
            continue
        email = user.get("email") or ""
        
        display_name = user.get("display_name") or user.get("full_name")
        if not display_name:
            if email:
                display_name = email.split("@")[0]
            else:
                display_name = "Quantum Learner"

        xp_total = user.get("xp_total", 0)
        daily_solves = solves_map.get(uid, 0)
        
        # Combined score formula: XP + (daily solves * 50)
        combined_score = xp_total + (daily_solves * 50)
        
        leaderboard.append({
            "firebase_uid": uid,
            "display_name": display_name,
            "xp_total": xp_total,
            "daily_solves_count": daily_solves,
            "combined_score": combined_score
        })

    # Default demo leaderboard entries if DB users list is empty
    if not leaderboard:
        demo_ranks = [
            {"firebase_uid": "demo_1", "display_name": "Quantum Master", "xp_total": 1250, "daily_solves_count": 8, "combined_score": 1650},
            {"firebase_uid": "demo_2", "display_name": "Qubit Scholar", "xp_total": 980, "daily_solves_count": 5, "combined_score": 1230},
            {"firebase_uid": "demo_3", "display_name": "Entanglement Expert", "xp_total": 850, "daily_solves_count": 4, "combined_score": 1050},
            {"firebase_uid": "demo_4", "display_name": "Circuit Pioneer", "xp_total": 620, "daily_solves_count": 3, "combined_score": 770},
        ]
        leaderboard.extend(demo_ranks)

    # Sort by combined score descending, then by xp_total, then by daily_solves_count
    leaderboard.sort(key=lambda u: (u["combined_score"], u["xp_total"], u["daily_solves_count"]), reverse=True)

    # Add rank starting from 1
    for idx, u in enumerate(leaderboard):
        u["rank"] = idx + 1

    return {
        "data": leaderboard,
        "meta": {"total": len(leaderboard)},
        "error": None
    }

@router.post("/complete/{puzzle_id}", summary="Mark a quantum puzzle as completed")
async def complete_puzzle(
    puzzle_id: str,
    payload: Dict[str, Any] = {},
    decoded_token: dict = Depends(get_verified_firebase_user)
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    firebase_uid = decoded_token.get("uid")
    stars = payload.get("stars", 3)
    
    # Save completion to database (upsert)
    await db.puzzle_completions.update_one(
        {"firebase_uid": firebase_uid, "puzzle_id": puzzle_id},
        {
            "$set": {
                "firebase_uid": firebase_uid,
                "puzzle_id": puzzle_id,
                "stars": stars,
                "completed_at": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    # Award 10 XP for solving the puzzle
    # Use idempotent_key so XP is only awarded once
    xp_result = await xp_engine.award_xp(
        db=db,
        firebase_uid=firebase_uid,
        source="puzzle",
        amount=10,
        idempotent_key=f"puzzle_completion_{puzzle_id}"
    )
    
    # Check and award badges
    newly_unlocked_badges = await badge_engine.check_and_award_badges(db, firebase_uid)
    
    return {
        "data": {
            "puzzle_id": puzzle_id,
            "stars": stars,
            "xp_awarded": xp_result.get("xp_awarded", 0),
            "xp_total": xp_result.get("xp_total", 0),
            "level": xp_result.get("level", 1),
            "rank_title": xp_result.get("rank_title", "Quantum Novice"),
            "newly_unlocked_badges": newly_unlocked_badges
        },
        "meta": None,
        "error": None
    }

@router.post("/daily/complete", summary="Submit completion for today's daily puzzle challenge")
async def complete_daily_puzzle(
    payload: Dict[str, Any] = {},
    decoded_token: dict = Depends(get_verified_firebase_user)
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    firebase_uid = decoded_token.get("uid")
    daily_id = get_daily_puzzle_id()
    stars = payload.get("stars", 3)
    
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    yesterday_str = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
    
    # 1. Record daily completion (idempotent unique key (uid, date_str))
    await db.daily_puzzle_completions.update_one(
        {"firebase_uid": firebase_uid, "date_str": today_str},
        {
            "$set": {
                "firebase_uid": firebase_uid,
                "date_str": today_str,
                "puzzle_id": daily_id,
                "stars": stars,
                "completed_at": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    # Also save as normal completed puzzle so it is marked solved globally
    await db.puzzle_completions.update_one(
        {"firebase_uid": firebase_uid, "puzzle_id": daily_id},
        {
            "$set": {
                "firebase_uid": firebase_uid,
                "puzzle_id": daily_id,
                "stars": stars,
                "completed_at": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    # 2. Update Daily Streak
    streak_doc = await db.daily_puzzle_streaks.find_one({"firebase_uid": firebase_uid})
    
    if not streak_doc:
        current_streak = 1
        longest_streak = 1
        new_streak_doc = {
            "firebase_uid": firebase_uid,
            "current_streak": 1,
            "longest_streak": 1,
            "last_solved_date": today_str,
            "history_dates": [today_str],
            "updated_at": datetime.utcnow()
        }
        await db.daily_puzzle_streaks.insert_one(new_streak_doc)
    else:
        last_date = streak_doc.get("last_solved_date")
        current_streak = streak_doc.get("current_streak", 0)
        longest_streak = streak_doc.get("longest_streak", 0)
        history_dates = set(streak_doc.get("history_dates", []))
        
        if last_date == today_str:
            pass
        elif last_date == yesterday_str:
            current_streak += 1
        else:
            current_streak = 1
            
        longest_streak = max(longest_streak, current_streak)
        history_dates.add(today_str)
        
        await db.daily_puzzle_streaks.update_one(
            {"firebase_uid": firebase_uid},
            {
                "$set": {
                    "current_streak": current_streak,
                    "longest_streak": longest_streak,
                    "last_solved_date": today_str,
                    "history_dates": sorted(list(history_dates)),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
    # 3. Award 10 XP for daily puzzle
    xp_result = await xp_engine.award_xp(
        db=db,
        firebase_uid=firebase_uid,
        source="daily_puzzle",
        amount=10,
        idempotent_key=f"daily_puzzle_solve_{today_str}"
    )
    
    # Check and award badges
    newly_unlocked_badges = await badge_engine.check_and_award_badges(db, firebase_uid)
    
    # Advance overall learning streak as well
    try:
        from services.streak_engine import streak_engine
        await streak_engine.record_daily_activity(db, firebase_uid)
    except Exception:
        pass
        
    return {
        "data": {
            "puzzle_id": daily_id,
            "stars": stars,
            "solved_today": True,
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "xp_awarded": xp_result.get("xp_awarded", 0),
            "xp_total": xp_result.get("xp_total", 0),
            "level": xp_result.get("level", 1),
            "rank_title": xp_result.get("rank_title", "Quantum Novice"),
            "newly_unlocked_badges": newly_unlocked_badges
        },
        "meta": None,
        "error": None
    }
