from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone

def get_current_utc_time() -> datetime:
    return datetime.now(timezone.utc)

class UserOnboarding(BaseModel):
    firebase_uid: str = Field(..., description="Firebase User ID")
    email: Optional[str] = Field(None, description="User's email from Firebase")
    name: str = Field(..., description="User's full name")
    age: int = Field(..., ge=1, description="User's age")
    topic: str = Field(..., description="Interested Quantum Computing Topic")
    created_at: datetime = Field(default_factory=get_current_utc_time)

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "firebase_uid": "abc123xyz",
                "email": "user@example.com",
                "name": "Alice Quantum",
                "age": 25,
                "topic": "Algorithms"
            }
        }
    )
