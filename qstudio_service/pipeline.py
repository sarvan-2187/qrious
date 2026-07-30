import asyncio
import io
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import edge_tts
from bson import ObjectId
from jinja2 import Environment, FileSystemLoader
from playwright.async_api import async_playwright
from pypdf import PdfReader

from ai import ai_gateway, AITask, ChatMessage
from database import get_db
from storage_service import download_bytes, upload_file
from models.video_overview import VideoOverviewScript

VIEWPORT = {"width": 1920, "height": 1080}
PDF_GROUNDING_MAX_CHARS = 8000

TEMPLATE_DIR = Path(__file__).parent / "templates"
FONT_BASE_URI = (TEMPLATE_DIR / "fonts").resolve().as_uri()
_jinja_env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))

# Slide visual style, chosen by the user in the frontend (VideoOverviewCreate.template).
TEMPLATE_FILES = {
    "minimal_dark": "slide.html",
    "bold_gradient": "slide_bold_gradient.html",
    "academic_light": "slide_academic_light.html",
}
DEFAULT_TEMPLATE = "minimal_dark"

# Narration voice, chosen by the user (VideoOverviewCreate.voice). edge-tts (Microsoft's
# free neural TTS) is used instead of gTTS specifically because gTTS has no real
# male/female distinction — it's a single Google Translate voice per language.
VOICE_MAP = {"female": "en-US-JennyNeural", "male": "en-US-GuyNeural"}
DEFAULT_VOICE = "female"

SYSTEM_PROMPT = (
    "You are an instructional designer creating a short narrated slide-deck video overview "
    "for a quantum computing course. Produce between 3 and 8 slides. Each slide has:\n"
    "- a short title (max ~8 words)\n"
    "- up to 6 short bullet points (max ~12 words each)\n"
    "- a narration script written for text-to-speech\n\n"
    "CRITICAL narration requirement: each slide's narration MUST be 4-6 full sentences, "
    "60-110 words. This is a strict minimum, not a suggestion — a short caption or a single "
    "sentence will be rejected. Write as if you are a teacher explaining the concept out loud "
    "to a student who cannot see the slide: narrate the idea, give context, explain why it "
    "matters. Do not just restate the bullet points in sentence form.\n\n"
    "Example of an ACCEPTABLE narration (67 words): \"Quantum entanglement is one of the "
    "strangest and most powerful phenomena in physics. When two particles become entangled, "
    "measuring the state of one instantly tells you the state of the other, no matter how far "
    "apart they are. Einstein famously called this spooky action at a distance because it "
    "seems to defy our everyday intuition about how the universe works. Entanglement isn't "
    "just a curiosity though, it's the foundation for quantum computing and secure "
    "communication.\"\n\n"
    "Example of an UNACCEPTABLE narration (too short, never do this): \"Entanglement links "
    "two particles so measuring one affects the other instantly.\"\n\n"
    "No markdown, no code."
)


async def run_pipeline(job: dict) -> dict:
    """Runs the full generation pipeline for one video_overviews job, writing status
    transitions back to MongoDB as it progresses. Returns the final {status, ...} dict."""
    db = get_db()
    video_overview_id = job["_id"]
    log_prefix = f"[{video_overview_id}]"

    async def set_status(status: str, **fields):
        print(f"{log_prefix} -> {status}", flush=True)
        update = {"status": status, "updated_at": datetime.now(timezone.utc), **fields}
        await db.video_overviews.update_one({"_id": video_overview_id}, {"$set": update})

    template_key = job.get("template") or DEFAULT_TEMPLATE
    voice_key = job.get("voice") or DEFAULT_VOICE

    try:
        grounding_text = None
        if job.get("source_resource_id"):
            source = await db.resources.find_one({"_id": job["source_resource_id"]})
            if source and source.get("b2_key"):
                print(f"{log_prefix} downloading source PDF for grounding", flush=True)
                pdf_bytes = await asyncio.to_thread(download_bytes, source["b2_key"])
                grounding_text = _extract_pdf_text(pdf_bytes)
        elif job.get("source_text"):
            # qStudio notebook path: the combined text of a notebook's sources, already
            # extracted/truncated by backend/routers/qstudio_router.py — used as-is, no
            # download/extraction needed here.
            print(f"{log_prefix} using qStudio source_text for grounding", flush=True)
            grounding_text = job["source_text"]

        await set_status("scripting")
        script = await _generate_slide_script(job["prompt"], grounding_text)
        print(f"{log_prefix} generated {len(script.slides)} slides", flush=True)
        await set_status("scripting", slide_script=[s.model_dump() for s in script.slides])

        with tempfile.TemporaryDirectory(prefix="video_overview_") as tmp:
            tmp_path = Path(tmp)

            await set_status("narrating")
            audio_paths = await _generate_narration(script, tmp_path, voice_key)
            print(f"{log_prefix} narration done: {len(audio_paths)} clips", flush=True)

            await set_status("rendering")
            image_paths = await _render_slides(script, tmp_path, template_key)
            print(f"{log_prefix} slide screenshots done: {len(image_paths)} images", flush=True)

            await set_status("assembling")
            final_video_path = await asyncio.to_thread(_assemble_video, image_paths, audio_paths, tmp_path, log_prefix)
            print(f"{log_prefix} ffmpeg assembly done: {final_video_path}", flush=True)

            await set_status("uploading")
            resource_id, b2_key = await _upload_and_register(job, final_video_path)
            print(f"{log_prefix} uploaded to B2: {b2_key}", flush=True)

        await set_status("ready", resource_id=resource_id, b2_key=b2_key)
        return {"status": "ready", "resource_id": str(resource_id) if resource_id else None}

    except Exception as e:
        print(f"{log_prefix} FAILED: {type(e).__name__}: {e}", flush=True)
        await set_status("failed", error=str(e))
        return {"status": "failed", "error": str(e)}


def _extract_pdf_text(pdf_bytes: bytes, max_chars: int = PDF_GROUNDING_MAX_CHARS) -> str:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    return text[:max_chars]


async def _generate_slide_script(prompt: str, grounding_text: Optional[str]) -> VideoOverviewScript:
    human_prompt = f"Topic / request: {prompt}"
    if grounding_text:
        human_prompt += f"\n\nGround the content in this source material:\n{grounding_text}"

    messages = [
        ChatMessage(role="system", content=SYSTEM_PROMPT),
        ChatMessage(role="user", content=human_prompt),
    ]

    # Narration shorter than SlideScript's min_length floor (models/qstudio.py) fails
    # response_model validation inside ai_gateway.chat() itself — the gateway already
    # retries that once per provider with a generic corrective message AND falls
    # over to the next configured provider on repeated failure (see ai/gateway.py).
    # This second, specifically-worded retry is kept on top of that as an extra,
    # cheap safety net using the exact corrective wording this prompt was tuned
    # against — only reached if every configured provider's own internal repair
    # attempt(s) were exhausted.
    try:
        response = await ai_gateway.chat(messages=messages, task=AITask.VIDEO_SCRIPT, response_model=VideoOverviewScript)
        return response.parsed
    except Exception:
        messages = messages + [
            ChatMessage(role="user", content=(
                "Your previous response's narration was too short. Every slide's "
                "narration MUST be 60-110 words, 4-6 full sentences — regenerate the "
                "complete slide script meeting this requirement."
            ))
        ]
        response = await ai_gateway.chat(messages=messages, task=AITask.VIDEO_SCRIPT, response_model=VideoOverviewScript)
        return response.parsed


async def _generate_narration(script: VideoOverviewScript, tmp_path: Path, voice_key: str) -> list[Path]:
    voice_id = VOICE_MAP.get(voice_key, VOICE_MAP[DEFAULT_VOICE])
    audio_paths = []
    for i, slide in enumerate(script.slides):
        audio_path = tmp_path / f"slide_{i}.mp3"
        await edge_tts.Communicate(slide.narration, voice_id).save(str(audio_path))
        audio_paths.append(audio_path)
    return audio_paths


async def _render_slides(script: VideoOverviewScript, tmp_path: Path, template_key: str) -> list[Path]:
    template_file = TEMPLATE_FILES.get(template_key, TEMPLATE_FILES[DEFAULT_TEMPLATE])
    template = _jinja_env.get_template(template_file)
    image_paths = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        try:
            page = await browser.new_page(viewport=VIEWPORT)
            total_slides = len(script.slides)
            for i, slide in enumerate(script.slides):
                html = template.render(
                    title=slide.title,
                    bullets=slide.bullets,
                    slide_number=i + 1,
                    total_slides=total_slides,
                    font_base=FONT_BASE_URI,
                )
                await page.set_content(html, wait_until="networkidle")
                image_path = tmp_path / f"slide_{i}.png"
                await page.screenshot(path=str(image_path))
                image_paths.append(image_path)
        finally:
            await browser.close()
    return image_paths


FFMPEG_CLIP_TIMEOUT_SECONDS = 120
FFMPEG_CONCAT_TIMEOUT_SECONDS = 60


def _assemble_video(image_paths: list[Path], audio_paths: list[Path], tmp_path: Path, log_prefix: str = "") -> Path:
    """Per slide, loops the image for exactly the audio's duration (-shortest stops the
    output once the finite audio stream ends), then concatenates the clips.

    Explicit timeouts on both ffmpeg calls: without one, subprocess.run blocks forever on a
    genuine hang, leaving the job stuck mid-status with no error ever written to MongoDB —
    exactly the failure mode this was debugged from in production.
    """
    clip_paths = []
    for i, (image_path, audio_path) in enumerate(zip(image_paths, audio_paths)):
        clip_path = tmp_path / f"clip_{i}.mp4"
        print(f"{log_prefix} ffmpeg: encoding clip {i+1}/{len(image_paths)}", flush=True)
        try:
            subprocess.run(
                [
                    "ffmpeg", "-y",
                    "-loop", "1", "-i", str(image_path),
                    "-i", str(audio_path),
                    "-c:v", "libx264", "-tune", "stillimage",
                    "-c:a", "aac", "-pix_fmt", "yuv420p",
                    "-shortest", str(clip_path),
                ],
                check=True, capture_output=True, timeout=FFMPEG_CLIP_TIMEOUT_SECONDS,
            )
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"ffmpeg failed encoding clip {i}: {e.stderr.decode(errors='replace')[-2000:]}") from e
        except subprocess.TimeoutExpired as e:
            raise RuntimeError(f"ffmpeg timed out after {FFMPEG_CLIP_TIMEOUT_SECONDS}s encoding clip {i}") from e
        clip_paths.append(clip_path)

    concat_list_path = tmp_path / "concat.txt"
    concat_list_path.write_text("\n".join(f"file '{p.name}'" for p in clip_paths))

    final_path = tmp_path / "final.mp4"
    print(f"{log_prefix} ffmpeg: concatenating {len(clip_paths)} clips", flush=True)
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_list_path), "-c", "copy", str(final_path)],
            check=True, capture_output=True, cwd=str(tmp_path), timeout=FFMPEG_CONCAT_TIMEOUT_SECONDS,
        )
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"ffmpeg failed concatenating clips: {e.stderr.decode(errors='replace')[-2000:]}") from e
    except subprocess.TimeoutExpired as e:
        raise RuntimeError(f"ffmpeg timed out after {FFMPEG_CONCAT_TIMEOUT_SECONDS}s concatenating clips") from e
    return final_path


async def _upload_and_register(job: dict, final_video_path: Path) -> tuple[Optional[ObjectId], str]:
    db = get_db()
    video_overview_id = job["_id"]
    lesson_id = job.get("lesson_id")

    if lesson_id:
        b2_key = f"video/{lesson_id}/{video_overview_id}_overview.mp4"
    else:
        # Standalone (student chat tab) job: no lesson to attach a `resources` doc to.
        # Playback reads the B2 key straight off the video_overviews doc instead
        # (see backend's GET /video-overviews/{id}/view-url).
        b2_key = f"video/standalone/{job['requested_by']}/{video_overview_id}_overview.mp4"

    await asyncio.to_thread(upload_file, str(final_video_path), b2_key, "video/mp4")

    if not lesson_id:
        return None, b2_key

    resource_doc = {
        "lesson_id": lesson_id,
        "resource_type": "video",
        "title": f"AI Video Overview: {job['prompt'][:80]}",
        "description": "AI-generated narrated video overview.",
        "filename": f"{video_overview_id}_overview.mp4",
        "b2_key": b2_key,
        "uploaded_by": job["requested_by"],
        "uploaded_at": datetime.now(timezone.utc),
        "status": "confirmed",
    }
    result = await db.resources.insert_one(resource_doc)
    return result.inserted_id, b2_key
