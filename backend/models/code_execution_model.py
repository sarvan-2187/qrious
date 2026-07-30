from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class CodeExecutionRequest(BaseModel):
    source_code: str

class CodeExecutionResult(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    simulation_result: Optional[Any] = None

class SaveSnippetRequest(BaseModel):
    title: str
    source_code: str

class CodeSnippetBase(SaveSnippetRequest):
    pass

class CodeSnippet(CodeSnippetBase):
    id: str
    user_id: str
    created_at: datetime
