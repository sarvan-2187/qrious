from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class BitstringDivergence(BaseModel):
    bitstring: str
    ideal_probability: float
    real_probability: float
    delta: float  # real - ideal


class QCompareExplanation(BaseModel):
    """The AI Gateway's structured output — the model only ever fills this.
    ideal_counts/real_counts/total_variation_distance/top_divergences are
    computed deterministically in qcompare_service.py, never by the LLM."""
    summary: str
    likely_causes: List[str] = Field(max_length=5)
    # Plain-English restatement of `summary` — no jargon (T1/T2, TVD, readout
    # error, etc.), aimed at someone with no quantum computing background.
    # Rendered as its own "Explained Simply" section in the UI, separate from
    # the technical summary/likely_causes above.
    simple_explanation: str


class QCompareResult(BaseModel):
    """Persisted to `qcompare_reports` (one per job_id) and returned as-is
    to the frontend."""
    id: str
    job_id: str
    provider: str
    device_id: str
    shots: int
    # Human-readable "N qubits, depth D — gate counts" — same string
    # qcompare_service.summarize_circuit() produces, persisted so the
    # audio/animation grounding text can reference the actual circuit that
    # ran without re-fetching and re-parsing the job's QASM.
    circuit_summary: str
    ideal_counts: Dict[str, int]
    real_counts: Dict[str, int]
    total_variation_distance: float
    top_divergences: List[BitstringDivergence]
    summary: str
    likely_causes: List[str]
    simple_explanation: str
    created_at: datetime
    # Phase 2 — set once "turn into podcast/animation" is triggered. These are
    # qstudio_outputs _ids; the frontend polls/plays them via the existing
    # AudioOverviewOutputCard/AnimationOverviewOutputCard components, unchanged.
    audio_output_id: Optional[str] = None
    animation_output_id: Optional[str] = None
