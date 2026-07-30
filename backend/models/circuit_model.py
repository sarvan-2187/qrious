from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class GateInstance(BaseModel):
    id: str
    name: str
    target: int
    control: Optional[int] = None
    step: int = 0
    params: Optional[list] = None

class CircuitBase(BaseModel):
    name: str
    num_qubits: int = Field(..., ge=1, le=10)
    gates: List[GateInstance] = []

class Circuit(CircuitBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
