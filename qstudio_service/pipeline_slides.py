import asyncio
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import List

from bson import ObjectId
from jinja2 import Environment, FileSystemLoader
from playwright.async_api import async_playwright

from ai import ai_gateway, AITask, ChatMessage
from database import get_db
from models.qstudio import SlideDeck
from storage_service import upload_file

VIEWPORT = {"width": 1920, "height": 1080}

TEMPLATE_DIR = Path(__file__).parent / "templates" / "slides"
FONT_BASE_URI = (Path(__file__).parent / "templates" / "fonts").resolve().as_uri()
_jinja_env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))

# Same three visual themes Video Overview already offers (see pipeline.py's
# TEMPLATE_FILES) — Slides gets its own template files (six layouts each,
# per PLANS/qstudio.md §4) rather than reusing the video ones, but keeps the
# same theme names/labels so the choice is familiar across both output types.
THEME_FILES = {
    "minimal_dark": "minimal_dark.html",
    "bold_gradient": "bold_gradient.html",
    "academic_light": "academic_light.html",
}
DEFAULT_THEME = "minimal_dark"

SYSTEM_PROMPT = (
    "You are an instructional designer building a presentation deck (not a video) from the "
    "source material the user provides. Produce between 6 and 16 slides, each assigned one "
    "of six layouts:\n"
    "- 'title': the deck's opening slide (use this exactly once, always first). Fields: "
    "title (the deck's title, short), subtitle (one sentence).\n"
    "- 'section': a divider slide marking a transition to a new topic group. Fields: title only.\n"
    "- 'bullets': a standard content slide. Fields: title, bullets (2-5 short points).\n"
    "- 'quote': a single striking quote or key takeaway, presented large. Fields: quote, "
    "attribution (who said it, or the source topic if there's no real speaker).\n"
    "- 'comparison': two things placed side by side. Fields: title, left_label, left_points "
    "(1-4 short points), right_label, right_points (1-4 short points).\n"
    "- 'stat': one to three standout numbers. Fields: title, stats (1-3 items, each a short "
    "value like '10x' or '99.9%' plus a short label explaining it).\n\n"
    "Structure the deck like a real presentation: exactly one 'title' slide first, a 'section' "
    "divider before each new topic group, and a mix of 'bullets'/'comparison'/'stat'/'quote' "
    "slides covering the material in between. Only fill in the fields that belong to a slide's "
    "own layout — leave every other field empty. Keep all text concise; this is read on a "
    "screen, not a document."
)


async def run_slides_pipeline(output_id: str, grounding_text: str, theme: str) -> None:
    """Runs the Slides pipeline for one qstudio_outputs doc, writing status transitions
    back to MongoDB — same set_status pattern pipeline.py/pipeline_audio.py already use."""
    db = get_db()
    log_prefix = f"[qstudio-slides {output_id}]"

    async def set_status(status: str, **fields):
        print(f"{log_prefix} -> {status}", flush=True)
        update = {"status": status, "updated_at": datetime.now(timezone.utc), **fields}
        await db.qstudio_outputs.update_one({"_id": ObjectId(output_id)}, {"$set": update})

    theme_key = theme if theme in THEME_FILES else DEFAULT_THEME

    try:
        await set_status("scripting")
        deck = await _generate_deck(grounding_text)
        print(f"{log_prefix} generated {len(deck.slides)} slides", flush=True)

        await set_status("rendering")
        image_b2_keys = await _render_slide_images(output_id, deck, theme_key)
        print(f"{log_prefix} rendered {len(image_b2_keys)} slide images", flush=True)

        await set_status("rendering", result={"slides": [s.model_dump() for s in deck.slides]})
        pdf_b2_key = await _render_deck_pdf(output_id, deck, theme_key)
        print(f"{log_prefix} rendered deck PDF: {pdf_b2_key}", flush=True)

        await set_status(
            "ready",
            result={
                "slides": [s.model_dump() for s in deck.slides],
                "slide_images": image_b2_keys,
                "pdf_b2_key": pdf_b2_key,
                "theme": theme_key,
            },
        )
    except Exception as e:
        print(f"{log_prefix} FAILED: {type(e).__name__}: {e}", flush=True)
        await set_status("failed", error=str(e))


async def _generate_deck(grounding_text: str) -> SlideDeck:
    # A 16-slide, ~15-field-per-slide flat schema needs more headroom than the
    # gateway's default (see models/qstudio.py's SlideDeck / PLANS/qstudio.md §8.9).
    messages = [
        ChatMessage(role="system", content=SYSTEM_PROMPT),
        ChatMessage(role="user", content=f"Source material:\n{grounding_text}"),
    ]
    response = await ai_gateway.chat(messages=messages, task=AITask.SLIDES, response_model=SlideDeck, max_tokens=8192)
    return response.parsed


async def _render_slide_images(output_id: str, deck: SlideDeck, theme_key: str) -> List[str]:
    template = _jinja_env.get_template(THEME_FILES[theme_key])
    total_slides = len(deck.slides)
    b2_keys = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        try:
            page = await browser.new_page(viewport=VIEWPORT)
            for i, slide in enumerate(deck.slides):
                html = template.render(
                    mode="single",
                    slide=slide.model_dump(),
                    slide_number=i + 1,
                    total_slides=total_slides,
                    font_base=FONT_BASE_URI,
                )
                await page.set_content(html, wait_until="networkidle")
                png_bytes = await page.screenshot()
                key = f"qstudio/slides/{output_id}/slide_{i}.png"
                await asyncio.to_thread(_upload_bytes, png_bytes, key, "image/png")
                b2_keys.append(key)
        finally:
            await browser.close()
    return b2_keys


async def _render_deck_pdf(output_id: str, deck: SlideDeck, theme_key: str) -> str:
    template = _jinja_env.get_template(THEME_FILES[theme_key])
    html = template.render(
        mode="deck",
        slides=[s.model_dump() for s in deck.slides],
        font_base=FONT_BASE_URI,
    )
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        try:
            page = await browser.new_page(viewport=VIEWPORT)
            await page.set_content(html, wait_until="networkidle")
            pdf_bytes = await page.pdf(
                width="1920px",
                height="1080px",
                print_background=True,
                margin={"top": "0px", "bottom": "0px", "left": "0px", "right": "0px"},
            )
        finally:
            await browser.close()
    key = f"qstudio/slides/{output_id}/deck.pdf"
    await asyncio.to_thread(_upload_bytes, pdf_bytes, key, "application/pdf")
    return key


def _upload_bytes(data: bytes, key: str, content_type: str) -> None:
    """upload_file() (storage_service.py) takes a local path, not raw bytes — screenshot()
    and page.pdf() both hand back in-memory bytes, so write a temp file first rather than
    adding a second B2 upload helper for this one difference."""
    suffix = Path(key).suffix
    fd, tmp_path = tempfile.mkstemp(suffix=suffix)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(data)
        upload_file(tmp_path, key, content_type)
    finally:
        os.remove(tmp_path)
