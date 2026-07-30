from pydantic import BaseModel

class UploadUrlRequest(BaseModel):
    resource_type: str
    title: str
    description: str
    filename: str
    content_type: str
