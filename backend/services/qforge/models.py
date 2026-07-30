from pydantic import BaseModel, Field
from typing import List, Literal, Optional

class PlacedComponent(BaseModel):
    id: str
    componentId: str
    stageId: str
    line: Literal["drive", "readout", "none"]
    orderIndex: Optional[int] = 0

class BuildGraph(BaseModel):
    qpuId: Optional[str]
    cryostatId: Optional[str]
    placedComponents: List[PlacedComponent]

class ValidateResponse(BaseModel):
    valid: bool
    messages: List[str]

class ScoreBreakdown(BaseModel):
    thermal: float
    signalIntegrity: float
    power: float
    overall: float
    warnings: List[str]
    failures: List[str]
