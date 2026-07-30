import math
from datetime import datetime
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

class XPEngine:
    def get_level_rank(self, level: int) -> str:
        """Returns learner rank title based on level."""
        if level <= 1:
            return "Quantum Novice"
        elif level <= 3:
            return "Qubit Explorer"
        elif level <= 6:
            return "Superposition Pioneer"
        elif level <= 10:
            return "Entanglement Master"
        else:
            return "Quantum Architect"

    def get_level_info(self, xp_total: int) -> Dict[str, Any]:
        """Calculates level, current level progress, and XP needed for next level."""
        level = math.floor(math.sqrt(xp_total / 100)) + 1 if xp_total >= 0 else 1
        current_level_base_xp = ((level - 1) ** 2) * 100
        next_level_target_xp = (level ** 2) * 100
        xp_in_level = xp_total - current_level_base_xp
        xp_for_next_level = next_level_target_xp - current_level_base_xp
        progress_pct = min(100.0, max(0.0, (xp_in_level / xp_for_next_level) * 100)) if xp_for_next_level > 0 else 100.0

        return {
            "level": level,
            "rank_title": self.get_level_rank(level),
            "xp_total": xp_total,
            "current_level_xp": xp_in_level,
            "next_level_target_xp": xp_for_next_level,
            "progress_pct": round(progress_pct, 1)
        }

    async def award_xp(
        self,
        db: AsyncIOMotorDatabase,
        firebase_uid: str,
        source: str,
        amount: int,
        source_ref_id: Optional[Any] = None,
        idempotent_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Single-writer engine for awarding XP to a user.
        Guarantees idempotency via idempotent_key.
        """
        if db is None or not firebase_uid:
            return {"xp_awarded": 0, "xp_total": 0, "level": 1, "rank_title": "Quantum Novice"}

        user_doc = await db.users.find_one({"firebase_uid": firebase_uid})
        current_xp = (user_doc.get("xp_total") or 0) if user_doc else 0

        # Check idempotency
        if idempotent_key:
            existing = await db.xp_history.find_one({
                "firebase_uid": firebase_uid,
                "idempotent_key": idempotent_key
            })
            if existing:
                info = self.get_level_info(current_xp)
                return {
                    "xp_awarded": 0,
                    "already_awarded": True,
                    **info
                }

        if amount <= 0:
            info = self.get_level_info(current_xp)
            return {"xp_awarded": 0, "already_awarded": False, **info}

        now = datetime.utcnow()
        ref_id = source_ref_id
        if isinstance(source_ref_id, str) and ObjectId.is_valid(source_ref_id):
            ref_id = ObjectId(source_ref_id)

        # Log to xp_history ledger
        xp_entry = {
            "firebase_uid": firebase_uid,
            "source": source,  # 'quiz' | 'flashcard' | 'note' | 'roadmap' | 'badge' | 'streak_bonus'
            "source_ref_id": ref_id,
            "amount": amount,
            "idempotent_key": idempotent_key,
            "created_at": now
        }
        await db.xp_history.insert_one(xp_entry)

        # Update user cache
        new_xp_total = current_xp + amount
        level_info = self.get_level_info(new_xp_total)

        await db.users.update_one(
            {"firebase_uid": firebase_uid},
            {
                "$set": {
                    "xp_total": new_xp_total,
                    "level": level_info["level"],
                    "rank_title": level_info["rank_title"],
                    "last_active_at": now
                }
            },
            upsert=True
        )

        return {
            "xp_awarded": amount,
            "already_awarded": False,
            **level_info
        }

xp_engine = XPEngine()
