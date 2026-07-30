from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel

from models.lms import MongoBaseModel


class DatasetUploadRequest(BaseModel):
    filename: str
    content_type: str = "text/csv"
    size_bytes: int


class DatasetUploadUrlResponse(BaseModel):
    upload_url: str
    dataset_id: str


class DatasetDownloadUrlResponse(BaseModel):
    download_url: str
    filename: str


class DatasetOut(MongoBaseModel):
    owner_uid: str
    filename: str
    b2_key: str
    content_type: str
    size_bytes: int
    status: Literal["pending", "confirmed"]
    created_at: datetime
