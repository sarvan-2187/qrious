from pydantic import BaseModel, Field
from typing import Optional, Literal, List


class SlideScript(BaseModel):
    title: str
    bullets: List[str] = Field(max_length=6)
    # Floor, not the real target (60-110 words — see video_service/pipeline.py's
    # SYSTEM_PROMPT). Keep in sync with video_service/models/video_overview.py —
    # both describe the same slide_script data written to/read from video_overviews.
    narration: str = Field(min_length=180)


class VideoOverviewScript(BaseModel):
    slides: List[SlideScript] = Field(min_length=2, max_length=12)


VideoTemplate = Literal["minimal_dark", "bold_gradient", "academic_light"]
VoiceGender = Literal["male", "female"]


class VideoOverviewCreate(BaseModel):
    prompt: str
    source_resource_id: Optional[str] = None  # existing lesson PDF to ground on
    source_text: Optional[str] = None  # raw grounding text (qStudio study space sources) —
    # used interchangeably with source_resource_id; qstudio_service/pipeline.py checks
    # source_resource_id first, then source_text. Not exposed on the HTTP endpoints —
    # qStudio inserts video_overviews docs directly, it doesn't post through this model.
    template: VideoTemplate = "minimal_dark"
    voice: VoiceGender = "female"


VideoOverviewStatus = Literal[
    "queued", "scripting", "narrating", "rendering", "assembling", "uploading",
    "ready", "failed",
]


class VideoOverviewTrigger(BaseModel):
    """Payload FastAPI Cloud sends to the render service's /internal/video-overview."""
    video_overview_id: str
