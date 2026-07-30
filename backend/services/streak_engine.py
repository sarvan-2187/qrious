from typing import Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta

class StreakEngine:
    async def get_evaluated_streak(self, db: AsyncIOMotorDatabase, firebase_uid: str) -> Dict[str, Any]:
        """
        Evaluates and returns live streak status for a user.
        If the user missed days without freeze tokens, resets current_streak to 0.
        """
        if db is None or not firebase_uid:
            return {
                "current_streak": 0,
                "max_streak": 0,
                "freeze_tokens": 1,
                "last_activity_date": None,
                "history_dates": []
            }

        streak_doc = await db.streaks.find_one({"firebase_uid": firebase_uid})
        if not streak_doc:
            return {
                "current_streak": 0,
                "max_streak": 0,
                "freeze_tokens": 1,
                "last_activity_date": None,
                "history_dates": []
            }

        now = datetime.utcnow()
        today_str = now.strftime("%Y-%m-%d")
        yesterday_str = (now - timedelta(days=1)).strftime("%Y-%m-%d")

        last_date = streak_doc.get("last_activity_date")
        current_streak = streak_doc.get("current_streak", 0)
        max_streak = streak_doc.get("max_streak", 0)
        freeze_tokens = streak_doc.get("freeze_tokens", 0)
        history_dates = streak_doc.get("history_dates", [])

        # Check missed days
        if last_date and last_date != today_str and last_date != yesterday_str:
            try:
                last_dt = datetime.strptime(last_date, "%Y-%m-%d")
                days_diff = (now.replace(hour=0, minute=0, second=0, microsecond=0) - last_dt).days
            except Exception:
                days_diff = 2

            if days_diff == 2 and freeze_tokens > 0:
                # Missed 1 day with freeze token available -> Freeze token protects streak
                pass
            else:
                # Missed 2+ days or no freeze token -> Streak breaks to 0
                current_streak = 0
                try:
                    await db.streaks.update_one(
                        {"firebase_uid": firebase_uid},
                        {"$set": {"current_streak": 0, "updated_at": now}}
                    )
                except Exception as e:
                    print(f"[Streak Reset Notice] {e}")

        return {
            "current_streak": current_streak,
            "max_streak": max_streak,
            "freeze_tokens": freeze_tokens,
            "last_activity_date": last_date,
            "history_dates": history_dates
        }

    async def record_daily_activity(self, db: AsyncIOMotorDatabase, firebase_uid: str) -> Dict[str, Any]:
        """
        Records learning activity for today (UTC).
        Updates current streak, max streak, and activity history dates.
        """
        if db is None or not firebase_uid:
            return {"current_streak": 0, "max_streak": 0, "freeze_tokens": 0, "is_new_day": False}

        now = datetime.utcnow()
        today_str = now.strftime("%Y-%m-%d")
        yesterday_str = (now - timedelta(days=1)).strftime("%Y-%m-%d")

        streak_doc = await db.streaks.find_one({"firebase_uid": firebase_uid})

        if not streak_doc:
            new_streak = {
                "firebase_uid": firebase_uid,
                "current_streak": 1,
                "max_streak": 1,
                "freeze_tokens": 1,  # Grant 1 free token on signup
                "last_activity_date": today_str,
                "history_dates": [today_str],
                "created_at": now,
                "updated_at": now
            }
            await db.streaks.insert_one(new_streak)
            return {
                "current_streak": 1,
                "max_streak": 1,
                "freeze_tokens": 1,
                "is_new_day": True,
                "activity_date": today_str
            }

        last_date = streak_doc.get("last_activity_date")
        current_streak = streak_doc.get("current_streak", 0)
        max_streak = streak_doc.get("max_streak", 0)
        freeze_tokens = streak_doc.get("freeze_tokens", 0)
        history = set(streak_doc.get("history_dates", []))

        is_new_day = False

        if last_date == today_str:
            # Activity already recorded today
            is_new_day = False
        elif last_date == yesterday_str:
            # Consecutive day!
            current_streak += 1
            is_new_day = True
        else:
            # Missed a day or more
            try:
                last_dt = datetime.strptime(last_date, "%Y-%m-%d") if last_date else None
                days_diff = (now.replace(hour=0, minute=0, second=0, microsecond=0) - last_dt).days if last_dt else 999
            except Exception:
                days_diff = 999

            if days_diff == 2 and freeze_tokens > 0:
                freeze_tokens -= 1
                current_streak += 1
                is_new_day = True
            else:
                # Missed 2+ days: Reset streak to 1 for today's new activity
                current_streak = 1
                is_new_day = True

        if current_streak > max_streak:
            max_streak = current_streak

        history.add(today_str)

        await db.streaks.update_one(
            {"firebase_uid": firebase_uid},
            {
                "$set": {
                    "current_streak": current_streak,
                    "max_streak": max_streak,
                    "freeze_tokens": freeze_tokens,
                    "last_activity_date": today_str,
                    "history_dates": sorted(list(history)),
                    "updated_at": now
                }
            }
        )

        return {
            "current_streak": current_streak,
            "max_streak": max_streak,
            "freeze_tokens": freeze_tokens,
            "is_new_day": is_new_day,
            "activity_date": today_str
        }

    async def consume_freeze_token(self, db: AsyncIOMotorDatabase, firebase_uid: str) -> Dict[str, Any]:
        """Atomically consumes 1 freeze token to protect streak."""
        if db is None or not firebase_uid:
            return {"success": False, "reason": "Database connection error"}

        result = await db.streaks.find_one_and_update(
            {"firebase_uid": firebase_uid, "freeze_tokens": {"$gt": 0}},
            {"$inc": {"freeze_tokens": -1}},
            return_document=True
        )

        if not result:
            return {"success": False, "reason": "No freeze tokens available"}

        return {
            "success": True,
            "freeze_tokens_remaining": result.get("freeze_tokens", 0)
        }

streak_engine = StreakEngine()
