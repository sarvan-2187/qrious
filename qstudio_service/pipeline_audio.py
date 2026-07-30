import asyncio
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import List

import edge_tts
from bson import ObjectId

from ai import ai_gateway, AITask, ChatMessage
from database import get_db
from models.qstudio import AudioOverviewScript
from storage_service import upload_file

# A genuine two-person podcast needs two independently user-selectable voices, not the
# single-narrator male/female binary VOICE_MAP in pipeline.py was built for (that one
# stays untouched — Video Overview still uses it as-is). All six are free edge_tts
# neural voices; no new dependency.
VOICE_CATALOG = {
    "jenny": "en-US-JennyNeural",   # US, female, warm/conversational
    "aria": "en-US-AriaNeural",     # US, female, upbeat
    "guy": "en-US-GuyNeural",       # US, male, warm/conversational
    "davis": "en-US-DavisNeural",   # US, male, energetic
    "sonia": "en-GB-SoniaNeural",   # UK, female
    "ryan": "en-GB-RyanNeural",     # UK, male
}
DEFAULT_VOICE_A = "jenny"
DEFAULT_VOICE_B = "guy"

FFMPEG_TIMEOUT_SECONDS = 60
FFPROBE_TIMEOUT_SECONDS = 30

# VOICE_CATALOG's keys are almost all already first names (jenny, sonia, ryan, ...) —
# _display_name() just capitalizes one for use in the generation prompt / as the host's
# on-air name. 'guy' is the one exception: it's edge_tts's own voice name, not the name
# this host should go by, so it's overridden to "James" here rather than shown verbatim.
_DISPLAY_NAME_OVERRIDES = {"guy": "James"}


def _display_name(voice_key: str) -> str:
    return _DISPLAY_NAME_OVERRIDES.get(voice_key, voice_key.capitalize())


def _build_system_prompt(host_a_name: str, host_b_name: str) -> str:
    return (
        f"You are writing a two-host podcast-style 'deep dive' script that discusses the "
        f"source material the user provides. The hosts are named {host_a_name} (speaker "
        f"'host_a') and {host_b_name} (speaker 'host_b') — write them as real people with "
        f"those names, not generic roles: have them greet each other and/or address each "
        f"other by name naturally at least once each (the way real podcast co-hosts do), "
        f"without forcing a name into every line. Write genuine back-and-forth banter — one "
        f"host explains a point, the other reacts, asks a follow-up question, paraphrases, "
        f"or adds a related detail. Do not have the two hosts simply take turns reading a "
        f"summary in sequence. Produce between 12 and 60 lines total, alternating speakers "
        f"naturally (not necessarily strictly every line). Each line is conversational "
        f"spoken language — a sentence or two, not a paragraph. No markdown, no stage "
        f"directions."
    )


async def run_audio_pipeline(output_id: str, grounding_text: str, voice_a_key: str, voice_b_key: str) -> None:
    """Runs the Audio Overview pipeline for one qstudio_outputs doc, writing status
    transitions back to MongoDB as it progresses — same set_status pattern
    pipeline.py's run_pipeline already uses for video_overviews."""
    db = get_db()
    log_prefix = f"[qstudio-audio {output_id}]"

    async def set_status(status: str, **fields):
        print(f"{log_prefix} -> {status}", flush=True)
        update = {"status": status, "updated_at": datetime.now(timezone.utc), **fields}
        await db.qstudio_outputs.update_one({"_id": ObjectId(output_id)}, {"$set": update})

    # Resolve to a known catalog key *before* deriving the display name, so an unknown/
    # unset key falls back to the default voice's own name rather than capitalizing
    # whatever bogus key was passed in.
    resolved_voice_a_key = voice_a_key if voice_a_key in VOICE_CATALOG else DEFAULT_VOICE_A
    resolved_voice_b_key = voice_b_key if voice_b_key in VOICE_CATALOG else DEFAULT_VOICE_B
    voice_a_id = VOICE_CATALOG[resolved_voice_a_key]
    voice_b_id = VOICE_CATALOG[resolved_voice_b_key]

    try:
        script = await _generate_dialogue(
            grounding_text, _display_name(resolved_voice_a_key), _display_name(resolved_voice_b_key)
        )
        print(f"{log_prefix} generated {len(script.lines)} dialogue lines", flush=True)

        with tempfile.TemporaryDirectory(prefix="qstudio_audio_") as tmp:
            tmp_path = Path(tmp)
            clip_paths: List[Path] = []
            for i, line in enumerate(script.lines):
                voice_id = voice_a_id if line.speaker == "host_a" else voice_b_id
                clip_path = tmp_path / f"line_{i}.mp3"
                await edge_tts.Communicate(line.line, voice_id).save(str(clip_path))
                clip_paths.append(clip_path)
            print(f"{log_prefix} synthesized {len(clip_paths)} narration clips", flush=True)

            final_path = await asyncio.to_thread(_concat_clips, clip_paths, tmp_path, log_prefix)
            duration_seconds = await asyncio.to_thread(_probe_duration, final_path)

            b2_key = f"qstudio/audio/{output_id}.mp3"
            await asyncio.to_thread(upload_file, str(final_path), b2_key, "audio/mpeg")
            print(f"{log_prefix} uploaded to B2: {b2_key}", flush=True)

        await set_status(
            "ready",
            result={
                "b2_key": b2_key,
                "duration_seconds": duration_seconds,
                "voice_a": resolved_voice_a_key,
                "voice_b": resolved_voice_b_key,
            },
        )
    except Exception as e:
        print(f"{log_prefix} FAILED: {type(e).__name__}: {e}", flush=True)
        await set_status("failed", error=str(e))


async def _generate_dialogue(grounding_text: str, host_a_name: str, host_b_name: str) -> AudioOverviewScript:
    messages = [
        ChatMessage(role="system", content=_build_system_prompt(host_a_name, host_b_name)),
        ChatMessage(role="user", content=f"Source material:\n{grounding_text}"),
    ]
    response = await ai_gateway.chat(messages=messages, task=AITask.AUDIO_SCRIPT, response_model=AudioOverviewScript)
    return response.parsed


def _concat_clips(clip_paths: List[Path], tmp_path: Path, log_prefix: str) -> Path:
    """Same ffmpeg concat-demuxer pattern pipeline.py's _assemble_video uses for
    video clips — here audio-only, no -c:v/-tune/pix_fmt, since every clip is
    already the same mp3 codec/bitrate straight out of edge_tts."""
    concat_list_path = tmp_path / "concat.txt"
    concat_list_path.write_text("\n".join(f"file '{p.name}'" for p in clip_paths))
    final_path = tmp_path / "final.mp3"
    print(f"{log_prefix} ffmpeg: concatenating {len(clip_paths)} clips", flush=True)
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_list_path), "-c", "copy", str(final_path)],
            check=True, capture_output=True, cwd=str(tmp_path), timeout=FFMPEG_TIMEOUT_SECONDS,
        )
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"ffmpeg failed concatenating audio clips: {e.stderr.decode(errors='replace')[-2000:]}") from e
    except subprocess.TimeoutExpired as e:
        raise RuntimeError(f"ffmpeg timed out after {FFMPEG_TIMEOUT_SECONDS}s concatenating audio clips") from e
    return final_path


def _probe_duration(path: Path) -> float:
    """ffprobe ships alongside ffmpeg (already a required system binary) — one less
    pip dependency than adding mutagen just to read an mp3's duration."""
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        check=True, capture_output=True, timeout=FFPROBE_TIMEOUT_SECONDS,
    )
    return round(float(result.stdout.decode().strip()), 1)
