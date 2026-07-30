from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class AudioOverviewTrigger(BaseModel):
    """Payload backend/routers/qstudio_router.py sends to
    /internal/qstudio-audio-overview. Self-contained — unlike the video-overview
    trigger, this service doesn't need to look the job up in Mongo first; it only
    needs Mongo to write status/result updates back to qstudio_outputs."""
    output_id: str
    grounding_text: str
    voice_a: str = "jenny"
    voice_b: str = "guy"


class DialogueLine(BaseModel):
    speaker: Literal["host_a", "host_b"]
    line: str


class AudioOverviewScript(BaseModel):
    lines: List[DialogueLine] = Field(min_length=12, max_length=60)


class SlidesTrigger(BaseModel):
    """Payload backend/routers/qstudio_router.py sends to /internal/qstudio-slides.
    Self-contained like AudioOverviewTrigger — no Mongo lookup needed here, only
    writes back to qstudio_outputs."""
    output_id: str
    grounding_text: str
    theme: str = "minimal_dark"


# --- Slides generation schema (Groq structured output) ---
# Deliberately one flat model rather than a discriminated union — Groq's
# structured-output/tool-calling is better proven in this codebase against flat
# schemas than nested anyOf unions (see PLANS/qstudio.md §4). Irrelevant fields
# per layout just sit None/empty.

class StatItem(BaseModel):
    value: str  # e.g. "1000x", "99.9%"
    label: str


class Slide(BaseModel):
    layout: Literal["title", "section", "bullets", "quote", "comparison", "stat"]
    title: Optional[str] = None
    subtitle: Optional[str] = None
    bullets: List[str] = Field(default_factory=list, max_length=5)
    quote: Optional[str] = None
    attribution: Optional[str] = None
    left_label: Optional[str] = None
    left_points: List[str] = Field(default_factory=list, max_length=4)
    right_label: Optional[str] = None
    right_points: List[str] = Field(default_factory=list, max_length=4)
    stats: List[StatItem] = Field(default_factory=list, max_length=3)


class SlideDeck(BaseModel):
    slides: List[Slide] = Field(min_length=6, max_length=16)


class AnimationTrigger(BaseModel):
    """Payload backend/routers/qstudio_router.py sends to /internal/qstudio-animation.
    Self-contained like AudioOverviewTrigger/SlidesTrigger — no Mongo lookup needed
    here, only writes back to qstudio_outputs.

    `voice` is optional — None means a silent animation (no narration
    synthesis, per-step timing estimated from narration text instead of an
    audio clip's real duration). See pipeline_manim.py::run_animation_pipeline.

    `theme` picks the render's color palette — same three names SlidesTrigger
    uses above (minimal_dark/academic_light/bold_gradient)."""
    output_id: str
    grounding_text: str
    voice: Optional[str] = None
    theme: str = "minimal_dark"


# --- Animation storyboard schema (Multi-AI Gateway structured output, AITask.MANIM) ---
# Same flat-model-over-discriminated-union reasoning as SlideDeck above — every
# block's irrelevant fields just sit None/empty. See PLANS/qstudio-animation.md §1.
# `AnimationStep`/`AnimationStoryboard` MUST stay shape-identical to
# `manim_scenes.py`'s expectations — that module reads the storyboard back from a
# JSON file (via `AnimationStep.model_dump()`/`AnimationStoryboard.model_dump()`),
# it doesn't re-import these classes (manim_scenes.py runs as a separate `manim`
# CLI subprocess, see pipeline_manim.py).

class AnimationStep(BaseModel):
    block: Literal[
        "title_card", "define_term", "bullet_reveal", "compare_two",
        "process_flow", "timeline", "graph_plot",
    ]
    title: Optional[str] = None
    subtitle: Optional[str] = None
    term: Optional[str] = None
    definition: Optional[str] = None
    bullets: List[str] = Field(default_factory=list, max_length=4)
    left_label: Optional[str] = None
    left_points: List[str] = Field(default_factory=list, max_length=4)
    right_label: Optional[str] = None
    right_points: List[str] = Field(default_factory=list, max_length=4)
    flow_steps: List[str] = Field(default_factory=list, max_length=5)
    timeline_events: List[str] = Field(default_factory=list, max_length=5)
    graph_label: Optional[str] = None
    # e.g. "x**2", "sin(x)" — narrow AST-whitelist evaluated, never eval()'d raw.
    # See manim_scenes.py::safe_eval_expression / PLANS/qstudio-animation.md §5.
    graph_expression: Optional[str] = None
    # Floor, not the real target (60-110 words — see pipeline_manim.py's
    # SYSTEM_PROMPT). Same rationale as SlideScript.narration
    # (qstudio_service/models/video_overview.py) — a strict minimum, not a
    # suggestion; the gateway's structured-output repair retry handles an
    # under-length generation (see ai/gateway.py).
    narration: str = Field(min_length=120)


class AnimationStoryboard(BaseModel):
    steps: List[AnimationStep] = Field(min_length=4, max_length=10)


# --- Storyboard-with-timing JSON, written by pipeline_manim.py and read back by
# manim_scenes.py (a separate `manim` CLI subprocess — see pipeline_manim.py) ---
# Deliberately NOT a field on AnimationStep itself: AnimationStep's schema is fed
# straight to the Multi-AI Gateway's structured-output tool-calling
# (`response_model=AnimationStoryboard`) — adding `wait_seconds` there would
# expose it to the model as a fillable field, which is wrong; it's computed
# afterward from each step's synthesized narration-clip duration (§3), never
# generated. `manim_scenes.py` reads plain JSON, not these pydantic classes
# directly (it runs in a separate process), so this is documentation of the
# on-disk shape, not a class manim_scenes.py imports:
#
#   {"steps": [{**AnimationStep.model_dump(), "wait_seconds": <float>}, ...]}
