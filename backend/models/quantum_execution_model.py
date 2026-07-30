from pydantic import BaseModel, Field
from typing import Optional, Any, Literal
from datetime import datetime


QuantumLanguage = Literal["openqasm2", "qiskit", "cirq"]


# ── Execute ──────────────────────────────────────────────────────────────────

class ExecuteOptions(BaseModel):
    shots: int = Field(default=1024, ge=1, le=8192)


class QuantumExecuteRequest(BaseModel):
    language: QuantumLanguage
    code: str
    options: ExecuteOptions = Field(default_factory=ExecuteOptions)


class ExecuteResults(BaseModel):
    counts: dict[str, int]
    statevector: Optional[list[float]] = None
    executionTime: float  # milliseconds


class QuantumExecuteResponse(BaseModel):
    success: bool
    results: Optional[ExecuteResults] = None
    error: Optional[str] = None
    errorLine: Optional[int] = None


# ── Debug ─────────────────────────────────────────────────────────────────────

class QuantumDebugRequest(BaseModel):
    language: QuantumLanguage
    code: str
    breakpoints: list[int] = Field(default_factory=list)


class DebugStep(BaseModel):
    step: int
    line: int
    operation: str
    state: list[float]   # real parts of statevector amplitudes (length = 2^n)
    gates: list[str]     # accumulated gate names up to this step
    timestamp: float     # seconds since start


class QuantumDebugResponse(BaseModel):
    success: bool
    trace: Optional[list[DebugStep]] = None
    circuitDiagram: Optional[str] = None   # SVG or base64 string
    error: Optional[str] = None
    errorLine: Optional[int] = None
