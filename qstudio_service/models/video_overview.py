from pydantic import BaseModel, Field
from typing import List


class SlideScript(BaseModel):
    title: str
    bullets: List[str] = Field(max_length=6)
    # Floor, not the real target (60-110 words, ~300-650 chars — see pipeline.py's
    # SYSTEM_PROMPT). 180 chars is roughly 30 words: well below the target so natural
    # variance isn't rejected, but firmly above a one-sentence caption. Structural
    # validation matters here because with_structured_output's parsing raises on this
    # automatically — pipeline.py retries once on that failure, see
    # _generate_slide_script.
    narration: str = Field(min_length=180)


class VideoOverviewScript(BaseModel):
    slides: List[SlideScript] = Field(min_length=2, max_length=12)


class VideoOverviewTrigger(BaseModel):
    """Payload FastAPI Cloud sends to POST /internal/video-overview."""
    video_overview_id: str


# Trimmed vs. the API's copy (backend/models/video_overview.py) — VideoOverviewCreate
# (the POST request body) and VideoOverviewStatus (a response type alias) are API-only
# concerns this service never imports. SlideScript/VideoOverviewScript below MUST stay
# shape-identical to the API's copy — both describe the same slide_script data written
# to and read back from the video_overviews Mongo collection.
