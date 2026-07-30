# qStudio — Implementation Plan (v1)

**Scope:** extend the existing AI Video Overview feature into **qStudio**, a NotebookLM-style
research/study companion. A user creates a **notebook**, adds **sources** (PDF or pasted text),
and generates six kinds of **studio outputs** grounded in those sources:

1. Video Overview *(already built — reframed under qStudio, grounding extended to notebooks)*
2. Audio Overview *(new — two-voice narrated "deep dive")*
3. Mind Map *(new)*
4. Flashcards *(new generation, reuses the existing SM-2 review engine)*
5. Briefing Doc *(new)*
6. Slides *(new — reuses the existing slide-render step, output is a viewable/downloadable deck, not a video)*

Not in scope for v1 (flagged again in §8): URL/YouTube sources, audio-file sources, a
source-grounded Q&A chat pane, output versioning/history. NotebookLM has these; this plan
covers only the six output types the brief asked for, on the smallest source surface that
supports them.

**Since v1**, three more output types were added, each documented where it landed rather than
by rewriting this doc's original "six" framing above: **Animation** (Manim-rendered narrated
animation — see `PLANS/qstudio-animation.md`), source-grounded **Q&A chat** (the one thing the
"not in scope" note above explicitly deferred — see `PLANS/qstudio-rag.md`), and two more
`backend/`-only single-call outputs slotted directly into §3 below: **Study Guide** (short-answer
quiz + suggested essay questions + glossary) and **Blog Post** (the source material's takeaways
distilled into a readable article) — see §3's "Study Guide" and "Blog Post" subsections.

**Status of prior scaffolding:** the Video Overview feature (`video_overviews` collection,
`backend/routers/video_overview_router.py`, `video_service/` — renamed `qstudio_service/`
under this plan, see §0a) is fully built and is reused as-is for output type 1. Nothing else
described below exists yet.

---

## 0. Design decisions carried over from the existing codebase

These aren't new choices — they're the same calls already made for Video Overview, applied
consistently so qStudio doesn't invent a second way to do something the repo already solved:

- **Heavy OS-level deps (ffmpeg, Chromium/Playwright) stay inside `qstudio_service`.** Anything
  needing them (Audio Overview, Slides) is a new pipeline *inside* `qstudio_service`, not a new
  microservice and not something FastAPI Cloud ever imports. See §5.
- **Pure-Python/LLM-only generation stays inside `backend/`.** Mind Map, Flashcards, and
  Briefing Doc only ever call Groq — no ffmpeg, no Playwright — so they're plain routers in
  `backend/`, following `ai_tutor_router.py`'s pattern of reusing `services/groq_service.py`.
- **Request-driven, not polling.** Same reasoning as `video-overview-generator.md` §5: no
  Celery/Redis exists anywhere in this repo, and there's no reason to introduce one here. The
  three `qstudio_service` outputs (video, audio, slides) use the same
  `BackgroundTasks.add_task(...)` → `POST /internal/...` → status-polled-via-Mongo pattern
  already proven for Video Overview. The three `backend/`-only outputs (mindmap, flashcards,
  briefing) are a single Groq call each — fast enough to not need the queued/polling dance at
  all; see §4 for why they can just await inline.
- **Same two-step presigned upload pattern** as `qbook_datasets_router.py` for source uploads
  (§2), but writing to the **existing primary B2 bucket** (`B2_BUCKET_NAME`), not a new bucket
  — see §2 for why the qBook-datasets isolation reasoning doesn't apply here.
- **Explorer-style design language**, per `DESIGN_SYSTEM.md`: hand-rolled `zinc`/`emerald`
  tokens branched with `useTheme()`, `framer-motion`, no shadcn `Card` wrapper as the page
  shell. This is the same system `VideoOverviewChatPage.tsx` and `QBookLibraryPage.tsx` already
  use — it is already fully `data-theme`-aware (light/dark), which directly satisfies "should be
  theme aware." See §6.

---

## 0a. Rename `video_service/` → `qstudio_service/`

Once this service also renders Audio Overview and Slides — neither of which is a video — the
name `video_service` stops describing what it does. This plan renames the directory to
`qstudio_service/` as part of building the two new pipelines, not as a separate cleanup pass:

**What moves:**
- Directory: `video_service/` → `qstudio_service/` (`git mv`, preserving history — same reason
  `video-overview-generator.md` treats the Dockerfile as host-agnostic: nothing about the
  service's *behavior* changes, only its name).
- Docker image/container name (`DEPLOYMENT.md`'s `docker build`/`docker run` commands and any
  compose file) updated to match.
- Shared-secret env vars, renamed for the same reason the directory is:
  `RENDER_SERVICE_URL`/`RENDER_SERVICE_SECRET` → `QSTUDIO_SERVICE_URL`/`QSTUDIO_SERVICE_SECRET`,
  in both `backend/.env` and the service's own `.env`. `backend/routers/video_overview_router.py`
  reads these today (`os.getenv("RENDER_SERVICE_URL")`, `os.getenv("RENDER_SERVICE_SECRET")`) —
  updated to the new names; `_trigger_render_service()` in that file is like renamed too
  (e.g. `_trigger_qstudio_service()`), for the same reason.
- Every `POST /internal/...` trigger call across the codebase (existing video trigger, plus the
  two new ones in §4) points at `QSTUDIO_SERVICE_URL` instead of `RENDER_SERVICE_URL`.
- Doc references: `DEPLOYMENT.md` and `PLANS/video-overview-generator.md`'s run instructions
  get a short pointer note ("this service is now `qstudio_service/`") rather than being rewritten
  wholesale — that doc's history stays intact as a record of *why* the service is shaped the way
  it is, it just needs to not go stale on the name.

**What doesn't change:** everything `video-overview-generator.md` §1a decided — full
self-containment (own trimmed `database.py`/`storage_service.py`/`services/groq_service.py`,
no shared imports with `backend/`), the flat non-`-r` `requirements.txt`, the request-driven
(not polling) execution model, the local-Docker-only deploy target. This is a rename in place,
not a redesign; §3/§4 below already describe the new pipeline files
(`pipeline_audio.py`, `pipeline_slides.py`) as living inside the renamed directory directly, so
there's no separate migration step for them — they're just added under the new name from the
start rather than added to `video_service/` and renamed later.

---

## 1. Data model

Four new collections, indexed and shaped to match `video_overviews`/`resources` conventions.

```python
# models/qstudio.py (new file)
from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from datetime import datetime
from models.lms import MongoBaseModel

OutputType = Literal["video", "audio", "mindmap", "flashcards", "briefing", "slides"]

class NotebookCreate(BaseModel):
    title: str = "Untitled Notebook"

class NotebookSummary(BaseModel):
    id: str
    title: str
    source_count: int
    output_count: int
    updated_at: datetime

class SourceCreate(BaseModel):
    kind: Literal["pdf", "text"]
    filename: Optional[str] = None       # required if kind == "pdf"
    content_type: Optional[str] = None   # required if kind == "pdf"
    size_bytes: Optional[int] = None     # required if kind == "pdf"
    text: Optional[str] = None           # required if kind == "text"

class OutputCreate(BaseModel):
    type: OutputType
    params: dict = Field(default_factory=dict)  # e.g. {"template": "minimal_dark", "voice": "female"}
```

Mongo shapes:

```python
# qstudio_notebooks
{
  "_id": ObjectId, "owner_uid": str, "title": str,
  "created_at": datetime, "updated_at": datetime,
}

# qstudio_sources
{
  "_id": ObjectId, "notebook_id": ObjectId, "owner_uid": str,
  "kind": "pdf" | "text",
  "filename": str | None, "b2_key": str | None,        # set when kind == "pdf"
  "text": str | None,                                   # set when kind == "text"
  "status": "pending" | "confirmed",                    # "pending" only applies to kind == "pdf"
  "created_at": datetime,
}

# qstudio_outputs — one doc per generated artifact
{
  "_id": ObjectId, "notebook_id": ObjectId, "owner_uid": str,
  "type": "video" | "audio" | "mindmap" | "flashcards" | "briefing" | "slides",
  "params": dict,
  "status": str,        # type-specific lifecycle, see §3-5
  "error": str | None,
  "result": dict,       # type-specific payload, see §3-5
  "created_at": datetime, "updated_at": datetime,
}

# qstudio_flashcard_reviews — mirrors flashcard_reviews exactly, scoped to an output's cards
{
  "output_id": ObjectId, "card_id": str, "owner_uid": str,
  "ease_factor": float, "interval_days": int, "repetitions": int,
  "last_reviewed_at": datetime, "next_review_date": datetime,
}
```

Indexes to add in `database.py::connect_to_mongo`, next to the existing ones:
```python
await db_instance.db.qstudio_notebooks.create_index("owner_uid")
await db_instance.db.qstudio_sources.create_index("notebook_id")
await db_instance.db.qstudio_outputs.create_index("notebook_id")
await db_instance.db.qstudio_flashcard_reviews.create_index([("output_id", 1), ("owner_uid", 1)])
```

**One asymmetry worth flagging:** unlike `qbook_datasets`, source PDFs don't need their own B2
bucket/credential. The qBook-datasets isolation (`PLANS/qbook-qml.md` §6.1) exists because the
*browser* relays dataset bytes into a third-party-adjacent kernel container over a WebSocket —
a genuinely different trust boundary. qStudio sources are only ever read server-side (by
`backend/` or `qstudio_service`, both already-trusted), exactly like `resources` PDFs today — so
they live in the same primary bucket, under a `qstudio/{notebook_id}/{source_id}_{filename}` key
prefix, using the storage helpers `backend/storage_service.py` already has
(`generate_upload_url`, `download_bytes`).

---

## 2. Sources: upload + text extraction

New router `backend/routers/qstudio_router.py`, prefix `/api/v1/qstudio`, following
`qbook_datasets_router.py`'s two-step upload shape:

```
POST   /notebooks                              create notebook
GET    /notebooks                               list my notebooks
GET    /notebooks/{id}                          notebook detail (sources + outputs)
DELETE /notebooks/{id}                          delete notebook + its sources/outputs (+ B2 objects)

POST   /notebooks/{id}/sources/upload-url       kind="pdf": returns presigned PUT url + source_id
POST   /notebooks/{id}/sources                  kind="text": pasted text, stored directly, status="confirmed"
POST   /sources/{id}/confirm                    kind="pdf" only, mirrors qbook_datasets' confirm step
GET    /notebooks/{id}/sources                  list sources
DELETE /sources/{id}                             delete one source (+ B2 object if pdf)
```

PDF-only for uploaded documents, same constraint `AGENTS.md` already enforces for course
resources (`PDF_ONLY_TYPES` in `educator.py`) — no new document-conversion pipeline needed.
10MB cap, matching the qBook dataset limit for consistency (not a hard technical ceiling, just
a sane default — open to revisiting).

**Text extraction** needs `pypdf` inside `backend/`. Today `pypdf` is a `qstudio_service`-only
dependency (currently named `video_service`, §1a of `video-overview-generator.md`; see §0a for
the rename). This plan adds it to `backend/requirements.txt` too — it's pure-Python/MIT, not a
heavy OS-level dependency like ffmpeg/Chromium, so it doesn't break the isolation principle in
§0. Extraction happens once, at confirm-time, and the result is cached on the source doc
(`extracted_text` field, not shown above for brevity) so every downstream generation reads
cached text instead of re-parsing the PDF on every output request. **Flagged for review in §8**
since it's a small deviation from "`qstudio_service` owns all Python-side PDF/media parsing."

A notebook's **combined grounding text** (used by every output type below) is just its
sources' `extracted_text`/`text` fields concatenated, truncated to a token-safe length exactly
like `qstudio_service/pipeline.py::_extract_pdf_text` (post-rename path) already truncates to
`PDF_GROUNDING_MAX_CHARS`.

---

## 3. Outputs generated entirely in `backend/` (Mind Map, Flashcards, Briefing Doc, Study Guide, Blog Post)

All five are a single Groq structured-output call against the notebook's combined grounding
text — no ffmpeg, no Playwright, no `qstudio_service` involvement at all. Given that, this plan
proposes **awaiting the Groq call inline** in the `POST /notebooks/{id}/outputs` handler rather
than the queued/BackgroundTasks/poll dance used for video — a structured-output call is
seconds, not minutes, and a synchronous response is simpler for the frontend to handle. If Groq
latency turns out to be inconsistent in practice, falling back to the same `status`-polling
pattern as video is a small, contained change (open question, §8).

**Mind Map**
```python
class MindMapNode(BaseModel):
    label: str
    children: List["MindMapNode"] = Field(default_factory=list, max_length=6)
MindMapNode.model_rebuild()

class MindMapResult(BaseModel):
    root: MindMapNode
```
Prompt caps depth at 3 levels and breadth at 6 children/node — same reasoning as Video
Overview's slide caps (§3 of `video-overview-generator.md`): bound the output so the frontend
renderer doesn't have to handle an unbounded graph. `result = {"root": {...}}`.

**Flashcards**
```python
class FlashcardItem(BaseModel):
    front: str
    back: str

class FlashcardsResult(BaseModel):
    cards: List[FlashcardItem] = Field(min_length=8, max_length=20)
```
Each card gets a stable `id` (uuid4) assigned when persisted, so reviews can reference
`{output_id}/{card_id}` — mirrors `flashcards.py`'s `card_id` exactly. `result = {"cards": [{id, front, back}]}`.

Review endpoint reuses the existing engine verbatim:
```python
POST /outputs/{output_id}/flashcards/{card_id}/review   # body: {"recall_rating": 1-4}
```
Same body as `flashcards.py::review_flashcard` — `calculate_sm2`, `xp_engine.award_xp(source="qstudio_flashcard", amount=5, ...)`,
`streak_engine.record_daily_activity`, `badge_engine.check_and_award_badges`, all imported and
called exactly as they are today, writing to `qstudio_flashcard_reviews` instead of
`flashcard_reviews`. This is the one output type that plugs directly into the existing
gamification layer with no new engine code.

**Briefing Doc**
```python
class BriefingTopic(BaseModel):
    title: str
    summary: str

class GlossaryTerm(BaseModel):
    term: str
    definition: str

class BriefingResult(BaseModel):
    overview: str
    key_topics: List[BriefingTopic] = Field(max_length=8)
    glossary: List[GlossaryTerm] = Field(max_length=12)
```
`result = {"overview": ..., "key_topics": [...], "glossary": [...]}`. Rendered client-side with
`react-markdown` (already a frontend dependency — no new markdown rendering code needed) by
formatting the sections into markdown, or as styled sections directly — a frontend detail, not
a backend one either way.

**Study Guide** *(added post-v1)*
```python
class StudyGuideQuestion(BaseModel):
    question: str
    answer: str

class StudyGuideResult(BaseModel):
    short_answer_questions: List[StudyGuideQuestion] = Field(max_length=10)
    essay_questions: List[str] = Field(max_length=6)      # prompts only, no model answers
    glossary: List[GlossaryTerm] = Field(max_length=12)    # reuses Briefing's GlossaryTerm as-is
```
`result = {"short_answer_questions": [...], "essay_questions": [...], "glossary": [...]}`. Essay
questions are deliberately answer-less — they're meant to prompt the student's own synthesis
across the material, not to be graded against a key.

**Blog Post** *(added post-v1)*
```python
class BlogSection(BaseModel):
    heading: str
    body: str

class BlogPostResult(BaseModel):
    title: str
    intro: str
    sections: List[BlogSection] = Field(max_length=6)
    conclusion: str
```
`result = {"title": ..., "intro": ..., "sections": [...], "conclusion": ...}`. The one output
type in this family whose system prompt explicitly asks for a different *tone* than the rest —
an engaging, conversational voice explaining why the material matters, not Briefing Doc's
neutral "get up to speed quickly" framing.

---

## 4. Outputs that reuse `qstudio_service` (Video Overview, Audio Overview, Slides)

*(`qstudio_service` is `video_service` renamed — see §0a. New code below is written against the
new name directly; nothing here needs a second migration once the rename lands.)*

**Video Overview** — no new pipeline. `POST /notebooks/{id}/outputs {"type": "video"}` calls the
*existing* standalone video-overview creation path, with one small addition needed to
`VideoOverviewCreate`/the `video_overviews` doc: a `source_text` field (raw grounding text)
used interchangeably with the existing `source_resource_id` (single-lesson-PDF lookup). qStudio
passes the notebook's combined grounding text via `source_text`; `qstudio_service/pipeline.py`'s
`if job.get("source_resource_id")` branch gets an `elif job.get("source_text")` alongside it.
Everything else — scripting, edge-tts narration, Playwright slide rendering, ffmpeg assembly,
B2 upload — is unchanged. `qstudio_outputs.result = {"video_overview_id": "..."}`, a thin
pointer; the frontend polls the *existing* `GET /api/video-overviews/{id}` for status exactly as
`VideoOverviewChatPage.tsx` does today.

**Audio Overview** — a genuine two-person podcast, not a single narrator reading a summary: two
hosts, two independently user-selectable voices. New pipeline inside `qstudio_service`
(`qstudio_service/pipeline_audio.py`), triggered via a new internal endpoint:
```
POST /internal/qstudio-audio-overview   (qstudio_service/main.py, same X-Internal-Secret auth)
```
```python
class DialogueLine(BaseModel):
    speaker: Literal["host_a", "host_b"]
    line: str

class AudioOverviewScript(BaseModel):
    lines: List[DialogueLine] = Field(min_length=12, max_length=60)
```
Groq generates a two-host "deep dive" style conversation script from the grounding text (same
`get_llm_for_structured_output()` call `qstudio_service/services/groq_service.py` already
exposes) — the system prompt asks explicitly for back-and-forth banter (one host explains, the
other asks follow-ups/reacts/paraphrases), not two people taking turns reading a summary in
sequence.

*Voice selection.* Today's `VOICE_MAP` (`{"female": "en-US-JennyNeural", "male":
"en-US-GuyNeural"}`) is a binary picked for the single-narrator Video Overview and isn't enough
for a podcast where the user should be able to pick *which* voice each host uses. This plan
expands it into a small curated catalog, still `edge_tts` only (no new dependency — every voice
below is a free Microsoft neural voice `edge_tts` already ships):

```python
VOICE_CATALOG = {
    "jenny":  "en-US-JennyNeural",    # US, female, warm/conversational
    "aria":   "en-US-AriaNeural",     # US, female, upbeat
    "guy":    "en-US-GuyNeural",      # US, male, warm/conversational
    "davis":  "en-US-DavisNeural",    # US, male, energetic
    "sonia":  "en-GB-SoniaNeural",    # UK, female
    "ryan":   "en-GB-RyanNeural",     # UK, male
}
DEFAULT_VOICE_A = "jenny"
DEFAULT_VOICE_B = "guy"
```
`OutputCreate.params` for `type="audio"` carries `{"voice_a": "jenny", "voice_b": "ryan"}` (any
two keys from the catalog, independently chosen — same key twice is allowed, not blocked, in
case a user genuinely wants both hosts sounding alike). Unset falls back to
`DEFAULT_VOICE_A`/`DEFAULT_VOICE_B` so generating with no configuration still works. The
existing single-narrator `VOICE_MAP` used by Video Overview is untouched — `VOICE_CATALOG` is
additive, specific to the podcast pipeline, not a replacement.

Each `DialogueLine` is synthesized individually with `edge_tts`, using `voice_a`'s or `voice_b`'s
resolved voice ID depending on `speaker`, then concatenated in script order via ffmpeg's concat
demuxer (audio-only; the same pattern `_assemble_video`'s concat step already uses, minus the
video track and `-c:v`/`-tune`/`pix_fmt` flags). No Playwright involved.
`qstudio_outputs.result = {"b2_key": ..., "duration_seconds": ..., "voice_a": "jenny", "voice_b": "ryan"}`
(the resolved choices are echoed back so the frontend can show "played back with Jenny & Ryan"
without re-deriving it). This is the least battle-tested of the six outputs — flagged in §8.

**Slides** — deliberately **does not** reuse Video Overview's slide template/schema. Those
three templates (`minimal_dark`/`bold_gradient`/`academic_light`) were built for one job only:
hold a title + up to 6 bullets on screen behind narration audio. A deck meant to be looked at
and presented on its own needs actual slide variety — this plan gives Slides its own schema and
its own template set, still inside `qstudio_service` (same Playwright/Jinja tools, new pipeline
file `qstudio_service/pipeline_slides.py`), triggered via:
```
POST /internal/qstudio-slides   (qstudio_service/main.py, same auth pattern)
```

*Schema — six layout types, not one:*
```python
class StatItem(BaseModel):
    value: str   # e.g. "1000x", "99.9%"
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
```
One flat model rather than a discriminated union — Groq's structured-output/tool-calling is
better proven in this codebase (`VideoOverviewScript`, etc.) against flat schemas than nested
`anyOf` unions, so this trades a slightly looser shape (irrelevant fields sit `None`/empty per
layout) for higher generation reliability. The system prompt is explicit about which fields
belong to which `layout` and enforces a deck shape: exactly one `title` slide first, `section`
dividers between topic groups, a mix of `bullets`/`comparison`/`stat`/`quote` in between —
mirroring how an actual presentation is structured, not just a flat list of bullet slides.

*Templates* — new files, `qstudio_service/templates/slides/{theme}.html` (one file per visual
theme, each containing Jinja branches for all six `layout` values, reusing the theme's own CSS
variables for color/type so a "dark" deck and a "light" deck both get all six layouts, not just
the ones the video templates happened to support). No new dependency for the visual richness:
accents (dividers, big pull-quote marks, stat-callout numerals, two-column comparison grids) are
plain CSS — gradients, borders, typography scale, layout via CSS grid/flexbox — not an icon
font or image library, keeping this consistent with "Browser-Based Portability" in `AGENTS.md`.

*Render:* same two-pass approach as originally planned — (a) per-slide Playwright screenshots
(now branching per `layout` instead of one fixed markup) for an in-app swipeable viewer, and
(b) one additional Playwright `page.pdf()` call against a single HTML document with CSS
`break-after: page` between slides, producing one downloadable PDF. No new dependency either
way — Playwright already renders the HTML for (a); asking it for a PDF instead of a second
screenshot pass for (b) is the smallest addition, and PPTX export is explicitly out of scope
for v1 (flagged in §8).

`qstudio_outputs.result = {"slide_images": [b2_key, ...], "pdf_b2_key": "...", "slides": [Slide, ...]}`
— the raw `Slide` list is kept alongside the rendered assets so the frontend viewer (§6) can
render its own in-app presentation mode from data rather than only displaying static images.

All three `qstudio_service`-backed outputs share the same status lifecycle shape as
`video_overviews` (`queued → ...type-specific steps... → ready/failed`), written with the same
`set_status()` helper pattern already in `pipeline.py`.

---

## 5. `backend/` endpoints, full surface

```
POST   /api/v1/qstudio/notebooks
GET    /api/v1/qstudio/notebooks
GET    /api/v1/qstudio/notebooks/{id}
DELETE /api/v1/qstudio/notebooks/{id}

POST   /api/v1/qstudio/notebooks/{id}/sources/upload-url
POST   /api/v1/qstudio/notebooks/{id}/sources          # text sources
POST   /api/v1/qstudio/sources/{id}/confirm
GET    /api/v1/qstudio/notebooks/{id}/sources
DELETE /api/v1/qstudio/sources/{id}

POST   /api/v1/qstudio/notebooks/{id}/outputs           # {"type": ..., "params": {...}}
GET    /api/v1/qstudio/outputs/{id}                     # poll status (video/audio/slides); returns immediately-ready result for mindmap/flashcards/briefing
GET    /api/v1/qstudio/notebooks/{id}/outputs           # list all outputs for a notebook
POST   /api/v1/qstudio/outputs/{id}/flashcards/{card_id}/review
```

Ownership checks throughout mirror `_get_owned_notebook`/`_get_owned_dataset`'s exact shape
(`owner_uid` equality check, 404-before-403 to avoid leaking existence) — no new authorization
pattern.

Register in `main.py` next to the other routers, same as every other feature router.

---

## 6. Frontend

New module `frontend/src/modules/qstudio/`, explorer-style throughout (per §0/DESIGN_SYSTEM.md
— this is what makes it theme-aware and NotebookLM-like at once: NotebookLM's own layout is
already close to this system's card-grid + panel conventions).

**Pages:**
- `QStudioLibraryPage.tsx` — grid of notebook cards, same card pattern as
  `QBookLibraryPage.tsx`/the "Video Library" grid in `VideoOverviewChatPage.tsx`.
- `QStudioNotebookPage.tsx` — two-panel layout: **Sources** (left, upload/paste/list, matches
  `DatasetManagerPanel.tsx`'s upload-list-delete pattern) and **Studio** (right, six output-type
  cards — Video Overview, Audio Overview, Mind Map, Flashcards, Briefing Doc, Slides — each with
  a "Generate"/"Regenerate" action and an inline viewer once ready). No Q&A chat pane in v1
  (§ scope note at top).

**New per-output viewer components** (all theme-aware via `useTheme()`, matching §1.3's token
table exactly):
- `VideoOverviewOutputCard.tsx` — thin wrapper around the *existing* `VideoResourcePlayer.tsx`, no new player code.
- `AudioOverviewPlayer.tsx` — `<audio>` element + progress bar, styled with the same
  zinc/emerald tokens as everything else on this page. The Audio Overview generate form (on the
  Studio card, before the job is submitted) gets two `Select` dropdowns — "Host A voice" /
  "Host B voice" — populated from `VOICE_CATALOG`, the same `Select`/`SelectTrigger`/
  `SelectItem` shadcn primitives `VideoOverviewChatPage.tsx` already uses for its template/voice
  pickers (§ pattern, not new component code), just two of them instead of one and backed by a
  6-entry catalog instead of a male/female binary. Once generated, the player surfaces which two
  voices were used (`result.voice_a`/`voice_b`) next to the playback controls.
- `MindMapViewer.tsx` — renders `MindMapResult.root` as a pan/zoom node graph.
- `FlashcardsReviewer.tsx` — flip-card + 4-button (Again/Hard/Good/Easy) rating UI, directly
  modeled on the existing `frontend/src/features/roadmap/components/TopicFlashcardsModal.tsx`
  (same flip state, same session-XP counter, same `toast` feedback) — just pointed at the new
  qStudio review endpoint instead of the roadmap's category-based one.
- `BriefingDocViewer.tsx` — renders `BriefingResult` via `react-markdown` (already a
  dependency), with a "Download PDF" button using `jspdf` (already a dependency) to print the
  rendered content client-side — no new backend PDF generation needed for this one.
- `SlidesViewer.tsx` — carousel/presentation-mode viewer. Default view pages through
  `slide_images` (presigned view URLs, same auto-retry-on-expiry fetch pattern as
  `VideoResourcePlayer`); since `result.slides` (the raw layout data) is also returned, a
  "Present" full-screen mode can render slides natively in React per `layout` type instead of
  as static images — crisper on a large display and no extra network round-trip per slide.
  Plus a "Download PDF" button linking the `pdf_b2_key` view-url.

**New frontend dependency needed:** a mind-map/node-graph renderer. Nothing suitable already
exists in `package.json` (checked — no `reactflow`/`@xyflow/react`/`mermaid`/`d3`). Proposing
**`@xyflow/react`** (React Flow) for the canvas/pan/zoom/node rendering plus **`d3-hierarchy`**
for computing a tree layout from `MindMapResult.root` before handing positions to React Flow —
both MIT-licensed, both scoped to this one component. Flagged in §8 as the one new dependency
this plan needs sign-off on.

**Navigation:** add a new top-level sidebar entry "qStudio" in `AppLayout.tsx`'s "Learning
Tools" group (`frontend/src/components/AppLayout.tsx:96`), next to the existing "AI Video
Overview" and "qBook" entries, routed at `/qstudio` and `/qstudio/:notebookId` in `App.tsx`
(same `import.meta.env.PROD` local-only-notice gate as `VideoOverviewChatPage`/
`VideoOverviewGenerator`, since qStudio's audio/slides pipelines inherit the same
local-Docker-only constraint as video — see §0 and `DEPLOYMENT.md`).

**Open question on the existing `/video-overview` page** (§8): once qStudio's own Video
Overview output type exists, there are two parallel "generate a video overview" UIs
(the standalone chat page and qStudio's notebook-scoped one). Recommend deprecating/redirecting
the standalone page into qStudio once this ships, rather than maintaining both.

---

## 7. Gamification tie-in (per `AGENTS.md` §2, "Gamification First")

Flashcards is the one output type with a built-in loop: reviewing a card already awards XP,
records a streak day, and checks badges, identically to the existing flashcards feature — this
is "free" because it reuses `xp_engine`/`streak_engine`/`badge_engine` verbatim (§3). Whether
*generating* a studio output (any of the six types, once per notebook) should also award a
small XP amount is an open product decision, not a technical one — flagged in §8 rather than
decided here.

---

## 8. Open questions for review

1. **Audio Overview reliability** — confirmed as a two-host podcast with user-selectable
   voices per host (§4), not a single-narrator summary. Reuses proven pieces individually
   (edge-tts synthesis, ffmpeg concat, Groq structured output) but no existing feature combines
   them into multi-voice dialogue today, so it's still the least battle-tested of the six —
   worth an early real-generation test, same as flagged for Slides in #9.
2. **`pypdf` moving into `backend/requirements.txt`** (§2) — currently `qstudio_service`-only
   (today still named `video_service`, see §0a); this plan adds it to the API image too so
   mindmap/flashcards/briefing can read PDF sources without a round-trip call into
   `qstudio_service`. Low-risk (pure-Python, MIT) but a real deviation from the existing split
   worth confirming.
3. **Mind Map library choice** (§6) — `@xyflow/react` + `d3-hierarchy` (new deps) vs. a
   dependency-free nested-list/CSS tree that looks far less like NotebookLM's actual mind map.
4. **Source types for v1** — PDF + pasted text only. No URL/YouTube/audio sources (NotebookLM's
   harder source types) — confirm this narrower source surface is acceptable for v1.
5. **Sync vs. queued for the three `backend/`-only outputs** (§3) — proposed as inline
   `await`, falling back to the queued/poll pattern only if Groq latency proves inconsistent.
6. **Regeneration/versioning** — v1 proposes one output per type per notebook, where
   "Regenerate" overwrites the existing `qstudio_outputs` doc. NotebookLM keeps history; this
   plan doesn't, to keep the data model and UI simpler for v1.
7. **The existing standalone `/video-overview` page** (§6) — deprecate/redirect into qStudio,
   or keep both indefinitely?
8. **Local-Docker-only constraint carries forward** — Audio Overview and Slides join Video
   Overview in only running locally via Docker for this MVP (same limitation
   `video-overview-generator.md` already documents); not a new gap, just inherited.
9. **Slides' flat multi-layout schema** (§4) — untested assumption that Groq's structured
   output stays reliable across a 6-layout, ~15-field flat schema the way it has for the
   simpler `VideoOverviewScript`/`SlideScript` shapes; worth a real generation test early rather
   than assuming it holds.
10. **PPTX export** — not in v1 (this plan is Playwright-rendered PNG/PDF only, per your
    "richer visual layouts" choice over the PPTX-export option). Worth a v2 revisit if users
    want to keep editing a generated deck outside qStudio.
11. **The `video_service` → `qstudio_service` rename** (§0a) — confirm the rename should land
    as part of this work rather than as a separate follow-up PR; it touches the Dockerfile,
    `DEPLOYMENT.md`, and both services' `.env` files (renamed shared-secret vars), on top of the
    directory move itself.

---

## Summary of new dependencies

| Package | Where | Purpose |
|---|---|---|
| `pypdf` | `backend/requirements.txt` (new — already in `qstudio_service/requirements.txt`, today still under the `video_service/` name) | source PDF text extraction inside the API service |
| `@xyflow/react` | `frontend/package.json` (new) | mind map canvas: pan/zoom/node rendering |
| `d3-hierarchy` | `frontend/package.json` (new) | mind map tree layout computation |

No new dependency needed in `qstudio_service/requirements.txt` — Audio Overview and Slides reuse
`edge_tts`, `playwright`, ffmpeg, and `langchain-groq`, all already present there.
