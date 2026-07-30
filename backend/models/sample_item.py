from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone

def get_current_utc_time() -> datetime:
    return datetime.now(timezone.utc)

class SampleItem(BaseModel):
    """
    A sample Pydantic model representing a MongoDB document.
    """
    # MongoDB typically uses '_id' for the primary key. We map it to 'id' in our model.
    id: Optional[str] = Field(alias="_id", default=None, description="The MongoDB ObjectID as a string")
    
    name: str = Field(..., description="Name of the item")
    description: Optional[str] = Field(default=None, description="A detailed description")
    price: float = Field(default=0.0, ge=0.0, description="Price must be non-negative")
    created_at: datetime = Field(default_factory=get_current_utc_time)

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "name": "Qrious Sample",
                "description": "A test item for the Quant-A-Thon",
                "price": 29.99
            }
        }
    )
