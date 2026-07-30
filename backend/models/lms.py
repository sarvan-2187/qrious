from pydantic import BaseModel, Field
from typing import Optional, Any, Literal, List
from bson import ObjectId
from datetime import datetime

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def __get_pydantic_core_schema__(
        cls, _source_type: Any, _handler: Any
    ) -> Any:
        from pydantic_core import core_schema
        return core_schema.no_info_after_validator_function(
            cls.validate,
            core_schema.str_schema()
        )

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str) and ObjectId.is_valid(v):
            return v
        raise ValueError("Invalid ObjectId")

class MongoBaseModel(BaseModel):
    id: str
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

def serialize(doc: dict, model: type[BaseModel]) -> BaseModel:
    if doc is None:
        return None
    doc = {**doc, "id": str(doc["_id"])}
    for k in ("course_id", "module_id", "lesson_id", "study_space_id"):
        if k in doc and isinstance(doc[k], ObjectId):
            doc[k] = str(doc[k])
    return model(**doc)

class CourseCreate(BaseModel):
    title: str
    description: str
    format: Literal["recorded", "live", "both"] = "recorded"

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    format: Optional[Literal["recorded", "live", "both"]] = None

class ModuleCreate(BaseModel):
    title: str
    order: int

class ModuleUpdate(BaseModel):
    title: Optional[str] = None
    order: Optional[int] = None

class LessonCreate(BaseModel):
    title: str
    order: int

class LessonUpdate(BaseModel):
    title: Optional[str] = None
    order: Optional[int] = None

class LiveSessionCreate(BaseModel):
    title: str
    scheduled_at: datetime

class LiveSessionOut(BaseModel):
    id: str
    course_id: str
    title: str
    scheduled_at: datetime
    status: str
    room_name: str
    created_by: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    recording_b2_key: Optional[str] = None

class CourseOut(MongoBaseModel):
    title: str
    description: str
    owner_uid: str
    status: str
    format: str = "recorded"
    category: Optional[str] = None
    level: Optional[str] = None
    duration: Optional[str] = None
    tags: Optional[List[str]] = []
    created_at: datetime
    updated_at: datetime

class ModuleOut(MongoBaseModel):
    course_id: str
    title: str
    order: int
    lessons: Optional[List['LessonOut']] = []

class LessonOut(MongoBaseModel):
    module_id: str
    title: str
    order: int
    resources: Optional[List[dict]] = []
