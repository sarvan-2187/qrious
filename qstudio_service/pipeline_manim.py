import asyncio
import json
import os
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

import edge_tts
from bson import ObjectId

from ai import ai_gateway, AITask, ChatMessage
from database import get_db
from models.qstudio import AnimationStoryboard
from pipeline import DEFAULT_VOICE, VOICE_MAP
from storage_service import upload_file

MANIM_SCENES_FILE = Path(__file__).parent / "manim_scenes.py"

# Kept as plain strings here rather than importing manim_scenes.THEME_PALETTES
# — this module deliberately never imports that one (it always renders it as
# a `manim` CLI subprocess, see manim_scenes.py's own docstring). Must stay
# in sync with THEME_PALETTES' keys there, same convention as pipeline_slides.py's
# own THEME_FILES/DEFAULT_THEME living apart from the templates they name.
ANIMATION_THEMES = {"minimal_dark", "academic_light", "bold_gradient"}
DEFAULT_ANIMATION_THEME = "minimal_dark"

# 720p, not 1080p — decided over 1080p specifically to keep render time
# manageable (PLANS/qstudio-animation.md §8 Q5). "-q m" is Manim's own
# documented quality preset for exactly this resolution/framerate
# (1280x720 30FPS), rather than hand-specifying --resolution.
MANIM_QUALITY_FLAG = "m"

# A Manim render is exactly the kind of call that can hang — same reasoning
# as every ffmpeg timeout in this codebase (pipeline.py's _assemble_video
# comment). 8 minutes, not ffmpeg's 60-120s: Manim renders frame-by-frame in
# pure Python/Cairo, an order of magnitude slower than ffmpeg re-encoding.
# Not yet calibrated against a real render (§8 Q5) — this sandbox has no
# ffmpeg, so subprocess-level render timing couldn't be measured here either.
MANIM_RENDER_TIMEOUT_SECONDS = 8 * 60

FFMPEG_TIMEOUT_SECONDS = 60
FFPROBE_TIMEOUT_SECONDS = 30

MIN_STEP_SECONDS = 3.0

# Voice is optional (§ below). The first version of this paced silent steps
# off narration word count at speaking rate (~150 wpm) — measured live: a
# real 7-step generation (100-130 words/step) produced 39-52s *per step*,
# ~5 minutes of video for content nobody is narrating, and pushed real
# render time close to MANIM_RENDER_TIMEOUT_SECONDS. That paces for
# listening to speech that was never synthesized; a silent animation is
# something to *watch*, and reading a title/bullets/a labeled diagram is
# far faster than a narrator explaining them out loud. Flat and short
# instead — no scaling by narration length, since narration text is never
# shown or spoken in this mode at all.
SILENT_STEP_SECONDS = 5.0

SYSTEM_PROMPT = (
    "You are an instructional designer creating a short narrated Manim animation storyboard "
    "for a quantum computing course. Produce between 4 and 10 steps, each assigned one of "
    "seven blocks:\n"
    "- 'title_card': the storyboard's opening step (use this exactly once, always first). "
    "Fields: title, subtitle.\n"
    "- 'define_term': a term appears, then its definition. Fields: term, definition.\n"
    "- 'bullet_reveal': a title + up to 4 points revealed one at a time. Fields: title, "
    "bullets.\n"
    "- 'compare_two': two labeled columns placed side by side, each with up to 4 points. "
    "Fields: left_label, left_points, right_label, right_points.\n"
    "- 'process_flow': up to 5 labeled boxes connected by arrows, appearing in sequence. "
    "Fields: title, flow_steps.\n"
    "- 'timeline': up to 5 labeled events placed along a horizontal line, in order. Fields: "
    "title, timeline_events.\n"
    "- 'graph_plot': a labeled axes with one plotted function, drawn on screen. Fields: "
    "graph_label, graph_expression (a simple mathematical expression in the single variable "
    "x, using only +, -, *, /, **, and the functions sin/cos/exp/sqrt/log/abs — e.g. 'sin(x)' "
    "or 'x**2 - 1'; no other functions or variables).\n\n"
    "Only fill in the fields that belong to a step's own block — leave every other field "
    "empty. Structure the storyboard like a real short explainer: the 'title_card' first, "
    "then a mix of the other blocks covering the material, in an order that makes sense to "
    "watch in sequence.\n\n"
    "CRITICAL narration requirement: each step's narration MUST be 4-6 full sentences, "
    "60-110 words. This is a strict minimum, not a suggestion — a short caption or a single "
    "sentence will be rejected. Write as if you are a teacher explaining the concept out "
    "loud to a student watching the animation: narrate the idea, give context, explain why "
    "it matters. Do not just restate the on-screen text in sentence form. No markdown, no "
    "code."
)


async def run_animation_pipeline(output_id: str, grounding_text: str, voice_key: Optional[str], theme: Optional[str] = None) -> None:
    """Runs the Animation Overview pipeline for one qstudio_outputs doc, writing
    status transitions back to MongoDB — same set_status pattern
    pipeline_audio.py/pipeline_slides.py already use.

    `voice_key` is optional: falsy (None/missing/empty string) means a silent
    animation — no edge-tts synthesis, no audio mux, and each step gets a
    short flat duration (SILENT_STEP_SECONDS) instead of a narration clip's
    real duration. An unrecognized non-empty value still falls back to
    DEFAULT_VOICE (a typo shouldn't silently produce a silent render) —
    only an explicit "no voice" skips narration.

    `theme` picks the render's color palette (manim_scenes.py's THEME_PALETTES)
    — same three names/labels Slides/Video Overview already use. An
    unrecognized/missing value falls back to DEFAULT_ANIMATION_THEME, same
    "don't fail the whole render over a bad enum value" reasoning as voice."""
    db = get_db()
    log_prefix = f"[qstudio-animation {output_id}]"

    async def set_status(status: str, **fields):
        print(f"{log_prefix} -> {status}", flush=True)
        update = {"status": status, "updated_at": datetime.now(timezone.utc), **fields}
        await db.qstudio_outputs.update_one({"_id": ObjectId(output_id)}, {"$set": update})

    if not voice_key:
        resolved_voice_key = None
    elif voice_key in VOICE_MAP:
        resolved_voice_key = voice_key
    else:
        resolved_voice_key = DEFAULT_VOICE
    voice_id = VOICE_MAP[resolved_voice_key] if resolved_voice_key else None

    theme_key = theme if theme in ANIMATION_THEMES else DEFAULT_ANIMATION_THEME

    try:
        await set_status("scripting")
        storyboard = await _generate_storyboard(grounding_text)
        print(f"{log_prefix} generated {len(storyboard.steps)} steps", flush=True)

        with tempfile.TemporaryDirectory(prefix="qstudio_animation_") as tmp:
            tmp_path = Path(tmp)

            await set_status("narrating")
            if voice_id:
                clip_paths, durations = await _generate_narration(storyboard, tmp_path, voice_id)
                print(f"{log_prefix} narration done: {len(clip_paths)} clips", flush=True)
                steps_with_timing = [
                    {**step.model_dump(), "wait_seconds": max(duration, MIN_STEP_SECONDS)}
                    for step, duration in zip(storyboard.steps, durations)
                ]
            else:
                clip_paths, durations = [], []
                steps_with_timing = [
                    {**step.model_dump(), "wait_seconds": SILENT_STEP_SECONDS}
                    for step in storyboard.steps
                ]
                print(f"{log_prefix} narration skipped (silent animation) — flat {SILENT_STEP_SECONDS}s/step", flush=True)

            storyboard_path = tmp_path / "storyboard.json"
            storyboard_path.write_text(json.dumps({"steps": steps_with_timing}), encoding="utf-8")

            await set_status("rendering")
            media_dir = tmp_path / "media"
            video_path = await asyncio.to_thread(
                _render_manim, storyboard_path, media_dir, tmp_path, log_prefix, theme_key,
            )
            print(f"{log_prefix} manim render done: {video_path}", flush=True)

            await set_status("assembling")
            if voice_id:
                audio_track_path = await asyncio.to_thread(
                    _build_audio_track, clip_paths, durations, steps_with_timing, tmp_path, log_prefix,
                )
                final_path = await asyncio.to_thread(
                    _mux_audio_video, video_path, audio_track_path, tmp_path, log_prefix,
                )
            else:
                final_path = video_path
            thumbnail_path = await asyncio.to_thread(_extract_thumbnail, final_path, tmp_path, log_prefix)
            duration_seconds = await asyncio.to_thread(_probe_duration, final_path)
            print(f"{log_prefix} assembly done: {final_path}", flush=True)

            await set_status("uploading")
            b2_key = f"qstudio/animation/{output_id}.mp4"
            thumbnail_b2_key = f"qstudio/animation/{output_id}_thumb.png"
            await asyncio.to_thread(upload_file, str(final_path), b2_key, "video/mp4")
            await asyncio.to_thread(upload_file, str(thumbnail_path), thumbnail_b2_key, "image/png")
            print(f"{log_prefix} uploaded to B2: {b2_key}", flush=True)

        await set_status(
            "ready",
            result={
                "b2_key": b2_key,
                "thumbnail_b2_key": thumbnail_b2_key,
                "duration_seconds": duration_seconds,
                "voice": resolved_voice_key,
                "theme": theme_key,
            },
        )
    except Exception as e:
        print(f"{log_prefix} FAILED: {type(e).__name__}: {e}", flush=True)
        await set_status("failed", error=str(e))


async def _generate_storyboard(grounding_text: str) -> AnimationStoryboard:
    messages = [
        ChatMessage(role="system", content=SYSTEM_PROMPT),
        ChatMessage(role="user", content=f"Source material:\n{grounding_text}"),
    ]
    response = await ai_gateway.chat(messages=messages, task=AITask.MANIM, response_model=AnimationStoryboard)
    return response.parsed


async def _generate_narration(storyboard: AnimationStoryboard, tmp_path: Path, voice_id: str) -> tuple[List[Path], List[float]]:
    clip_paths: List[Path] = []
    for i, step in enumerate(storyboard.steps):
        clip_path = tmp_path / f"line_{i}.mp3"
        await edge_tts.Communicate(step.narration, voice_id).save(str(clip_path))
        clip_paths.append(clip_path)
    durations = [await asyncio.to_thread(_probe_duration, p) for p in clip_paths]
    return clip_paths, durations


def _render_manim(storyboard_path: Path, media_dir: Path, tmp_path: Path, log_prefix: str, theme_key: str) -> Path:
    """Renders StoryboardScene (manim_scenes.py — static, hand-written, never
    generated per-request) as a subprocess, same timeout-guarded pattern
    every ffmpeg call in this codebase already uses. `STORYBOARD_PATH` is how
    the storyboard JSON (data, not code) reaches the scene's construct();
    QSTUDIO_ANIMATION_THEME is the same handoff for the color palette
    (manim_scenes.py::_resolve_theme)."""
    print(f"{log_prefix} manim: rendering {len(json.loads(storyboard_path.read_text())['steps'])} steps, theme={theme_key}", flush=True)
    env = {**os.environ, "STORYBOARD_PATH": str(storyboard_path), "QSTUDIO_ANIMATION_THEME": theme_key}
    try:
        subprocess.run(
            [
                "manim", "render",
                "--media_dir", str(media_dir),
                "-q", MANIM_QUALITY_FLAG,
                "--format", "mp4",
                "-o", "animation",
                "--progress_bar", "none",
                str(MANIM_SCENES_FILE), "StoryboardScene",
            ],
            check=True, capture_output=True, cwd=str(tmp_path), timeout=MANIM_RENDER_TIMEOUT_SECONDS,
            env=env,
        )
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"manim render failed: {e.stderr.decode(errors='replace')[-2000:]}") from e
    except subprocess.TimeoutExpired as e:
        raise RuntimeError(f"manim render timed out after {MANIM_RENDER_TIMEOUT_SECONDS}s") from e

    # Confirmed live (not guessed): rglob("*.mp4") over-matches. Manim caches
    # every individual self.play() call as its own "partial movie file" mp4
    # under .../partial_movie_files/StoryboardScene/<hash>.mp4 alongside the
    # real combined output — a 2-step/6-animation test storyboard produced 7
    # mp4s total (6 partial + 1 final), and a real 9-step generation hit this
    # in production as "found 42". The one file we actually want is always
    # named after `-o` above (verified: lands at .../<quality>/animation.mp4,
    # the partial files never share that name) — match on that instead of
    # every mp4 under the tree.
    videos = list(media_dir.rglob("animation.mp4"))
    if len(videos) != 1:
        raise RuntimeError(f"expected exactly one rendered animation.mp4 under {media_dir}, found {len(videos)}")
    return videos[0]


def _build_audio_track(clip_paths: List[Path], durations: List[float], steps_with_timing: List[dict], tmp_path: Path, log_prefix: str) -> Path:
    """Concatenates narration clips into one continuous track whose total
    duration exactly matches the rendered video's (sum of wait_seconds) —
    padding each clip with silence for the (usually zero, only when a clip's
    natural length is under MIN_STEP_SECONDS) gap between its own duration
    and its step's wait_seconds, so audio never drifts out of sync with the
    Manim render as the storyboard progresses."""
    ordered: List[Path] = []
    for i, (clip_path, duration, step) in enumerate(zip(clip_paths, durations, steps_with_timing)):
        ordered.append(clip_path)
        gap = step["wait_seconds"] - duration
        if gap > 0.05:
            silence_path = tmp_path / f"silence_{i}.mp3"
            _generate_silence(silence_path, gap, log_prefix)
            ordered.append(silence_path)

    concat_list_path = tmp_path / "audio_concat.txt"
    concat_list_path.write_text("\n".join(f"file '{p.name}'" for p in ordered))
    audio_track_path = tmp_path / "audio_track.mp3"
    print(f"{log_prefix} ffmpeg: concatenating {len(ordered)} audio segments", flush=True)
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_list_path), "-c", "copy", str(audio_track_path)],
            check=True, capture_output=True, cwd=str(tmp_path), timeout=FFMPEG_TIMEOUT_SECONDS,
        )
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"ffmpeg failed concatenating narration track: {e.stderr.decode(errors='replace')[-2000:]}") from e
    except subprocess.TimeoutExpired as e:
        raise RuntimeError(f"ffmpeg timed out after {FFMPEG_TIMEOUT_SECONDS}s concatenating narration track") from e
    return audio_track_path


def _generate_silence(silence_path: Path, duration_seconds: float, log_prefix: str) -> None:
    try:
        subprocess.run(
            [
                "ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
                "-t", f"{duration_seconds:.2f}", "-c:a", "libmp3lame", str(silence_path),
            ],
            check=True, capture_output=True, timeout=FFMPEG_TIMEOUT_SECONDS,
        )
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"ffmpeg failed generating silence padding: {e.stderr.decode(errors='replace')[-2000:]}") from e
    except subprocess.TimeoutExpired as e:
        raise RuntimeError(f"ffmpeg timed out after {FFMPEG_TIMEOUT_SECONDS}s generating silence padding") from e


def _mux_audio_video(video_path: Path, audio_path: Path, tmp_path: Path, log_prefix: str) -> Path:
    """`-c:v copy`: Manim already rendered the video at final quality, no
    re-encoding needed — mirrors pipeline_audio.py/pipeline.py's own mux
    calls, which never re-encode a stream that's already correct."""
    final_path = tmp_path / "final.mp4"
    print(f"{log_prefix} ffmpeg: muxing video + narration", flush=True)
    try:
        subprocess.run(
            [
                "ffmpeg", "-y", "-i", str(video_path), "-i", str(audio_path),
                "-c:v", "copy", "-c:a", "aac", "-shortest", str(final_path),
            ],
            check=True, capture_output=True, cwd=str(tmp_path), timeout=FFMPEG_TIMEOUT_SECONDS,
        )
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"ffmpeg failed muxing audio/video: {e.stderr.decode(errors='replace')[-2000:]}") from e
    except subprocess.TimeoutExpired as e:
        raise RuntimeError(f"ffmpeg timed out after {FFMPEG_TIMEOUT_SECONDS}s muxing audio/video") from e
    return final_path


def _extract_thumbnail(video_path: Path, tmp_path: Path, log_prefix: str) -> Path:
    thumbnail_path = tmp_path / "thumbnail.png"
    print(f"{log_prefix} ffmpeg: extracting thumbnail", flush=True)
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(video_path), "-ss", "0", "-frames:v", "1", str(thumbnail_path)],
            check=True, capture_output=True, timeout=FFMPEG_TIMEOUT_SECONDS,
        )
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"ffmpeg failed extracting thumbnail: {e.stderr.decode(errors='replace')[-2000:]}") from e
    except subprocess.TimeoutExpired as e:
        raise RuntimeError(f"ffmpeg timed out after {FFMPEG_TIMEOUT_SECONDS}s extracting thumbnail") from e
    return thumbnail_path


def _probe_duration(path: Path) -> float:
    """ffprobe ships alongside ffmpeg — same pattern as
    pipeline_audio.py::_probe_duration."""
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        check=True, capture_output=True, timeout=FFPROBE_TIMEOUT_SECONDS,
    )
    return round(float(result.stdout.decode().strip()), 1)
