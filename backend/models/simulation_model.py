from pydantic import BaseModel, Field
from typing import Dict, List, Optional

class ComplexNumber(BaseModel):
    real: float
    imag: float

class SimulationResult(BaseModel):
    statevector: List[ComplexNumber]
    probabilities: Dict[str, float]
    counts: Dict[str, int]
    circuit_diagram_text: str

class SimulationRequest(BaseModel):
    circuit_id: Optional[str] = None
    num_qubits: Optional[int] = None
    num_cbits: Optional[int] = None
    gates: Optional[List[dict]] = None
    shots: int = 1024
    noisy: Optional[bool] = False

class BlochVector(BaseModel):
    x: float
    y: float
    z: float

class DebugStep(BaseModel):
    step_index: int
    gate_applied: Optional[dict]
    statevector: List[ComplexNumber]
    density_matrix: List[List[ComplexNumber]]
    per_qubit_bloch_vectors: Dict[str, BlochVector]
    probabilities: Dict[str, float]

class DebugRequest(BaseModel):
    circuit_id: Optional[str] = None
    num_qubits: Optional[int] = None
    gates: Optional[List[dict]] = None

class QasmExportRequest(BaseModel):
    gates: List[dict]
    num_qubits: int
    num_cbits: Optional[int] = None
    language: Optional[str] = "openqasm2"

class QasmExportResponse(BaseModel):
    qasm: str

class QasmImportRequest(BaseModel):
    qasm: str
    language: Optional[str] = "openqasm2"

class QasmImportResponse(BaseModel):
    gates: List[dict]
    num_qubits: int
    num_cbits: int
