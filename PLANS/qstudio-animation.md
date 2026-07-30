# qStudio — Manim Animation Overview (v1 plan)

**Scope:** a 7th qStudio output type — `"animation"` — alongside the existing
`video`/`audio`/`mindmap`/`flashcards`/`briefing`/`slides` (`backend/models/qstudio.py:8`,
`backend/routers/qstudio_router.py:52`). Given a study space's grounding text, it produces a
short narrated **Manim** animation (concepts, comparisons, simple diagrams/graphs — not a
talking-head slideshow like Video Overview, actual *motion*).

This is the least reused of the seven output types: Video/Audio/Slides all compose tools
already proven together in this repo (edge-tts, ffmpeg, Playwright+Jinja). Manim is new to the
codebase, so this plan is deliberately conservative about *how* content is generated — see §1.

**Since this plan was first written, the Multi-AI Gateway shipped** (`backend/ai/` +
`qstudio_service/ai/`, see [`docs/AI_GATEWAY.md`](../docs/AI_GATEWAY.md) and
[`PLANS/ai-provider-resilience.md`](./ai-provider-resilience.md)) — every existing
`qstudio_service` pipeline (`pipeline.py`, `pipeline_audio.py`, `pipeline_slides.py`) now calls
`ai_gateway.chat(...)` instead of Groq directly, with automatic multi-provider fallback, retry,
and a circuit breaker. §0 below is rewritten accordingly — the "which Groq model" problem this
section used to describe is resolved platform-wide, not specific to this feature anymore.

Decisions locked in during scoping (recorded here so the "why" survives, not just the "what"):

| Question | Decision |
|---|---|
| Who decides animation structure? | **Nobody at request time writes/executes LLM-authored code.** A fixed, hand-written library of Manim "block" builders lives in this repo; the model only picks a *sequence* of blocks and fills in their text fields (structured JSON), never Python. See §1. |
| Which LLM? | **Not a single provider** — goes through the existing Multi-AI Gateway (`ai_gateway.chat(..., task=AITask.MANIM, response_model=AnimationStoryboard)`), which already fails over across 6 providers. See §0. |
| Where does it live? | 7th `qstudio_outputs` type, same `study_space` grounding + trigger pattern as Audio/Slides. See §2-§4. |
| Narration? | Synced voiceover, single narrator (like Video Overview — an explainer, not a two-host podcast like Audio Overview). See §3. |
| Math rendering? | Plain text/shapes only via Manim's Pango `Text` — **no LaTeX/`MathTex`**. No `texlive` in the Docker image. See §5. |

---

## 0. Generation goes through the existing Multi-AI Gateway — not a direct Groq call

This section originally flagged that every pipeline was hardcoded to a Groq model Groq was about
to deprecate, and proposed picking a better Groq model just for this feature. That's now moot:
**the whole platform's Groq dependency was replaced with a provider-agnostic gateway** before this
feature was built (`backend/ai/`, duplicated into `qstudio_service/ai/` per that service's
existing self-containment convention — see `docs/AI_GATEWAY.md §1`). `pipeline_slides.py`'s
`_generate_deck` shows the pattern this plan's `_generate_storyboard` should copy exactly:

```python
from ai import ai_gateway, AITask, ChatMessage

async def _generate_storyboard(grounding_text: str) -> AnimationStoryboard:
    messages = [
        ChatMessage(role="system", content=SYSTEM_PROMPT),
        ChatMessage(role="user", content=f"Source material:\n{grounding_text}"),
    ]
    response = await ai_gateway.chat(messages=messages, task=AITask.MANIM, response_model=AnimationStoryboard)
    return response.parsed
```

`AITask.MANIM` already exists in `ai/models.py`'s `AITask` enum, and it and the gateway's retry /
circuit breaker / structured-output repair retry all apply to this feature for free. Its routing
**was** Kimi-first (added anticipating this feature, before it was built, on the theory that
Kimi's coding-tuned models fit "MANIM" best) — this has since been tested for real against a
schema shaped like §1's, and changed. Findings, live against real accounts, all four
non-Groq providers in the chain, using the exact `AnimationStoryboard` schema from §1:

| Provider | Result |
|---|---|
| **Kimi** | Every attempt failed before generating anything: `"org ... is suspended due to insufficient balance"`. An account/billing problem, not a capability finding — Kimi's actual quality on this task is **untested**, not confirmed bad. |
| **Groq** (`gpt-oss-120b`) | Worked in 3 of 4 live attempts. The one failure was real and worth knowing about: the model occasionally emits a malformed tool call, nesting fields under a key named after the chosen block (`{"title_card": {"title": ...}}`) instead of the flat shape requested (`{"block": "title_card", "title": ...}`). Groq's own server-side validation rejects this with a 400. |
| **Gemini** (`gemini-2.5-flash`) | Blocked by its free tier's request cap — `limit: 5, model: gemini-2.5-flash` requests/minute. A quota ceiling, not a capability finding. |
| **NVIDIA NIM** | Timed out on this schema with both the configured default (`meta/llama-3.3-70b-instruct`) and `deepseek-ai/deepseek-v4-pro` (suggested directly from NVIDIA's own sample code) — the latter answered a *simple* schema in ~5s but never returned on the full 7-block/13-field `AnimationStoryboard` shape even with a 120s timeout. Likely cause: deepseek's reasoning ("thinking") mode is on by default and NVIDIA's own sample explicitly disables it (`extra_body={"chat_template_kwargs":{"thinking":False}}`) — `ai/providers/openai_compatible.py` doesn't support passing `extra_body` today, so this isn't fixable without a small adapter change. Flagged as a real gap, not fixed in this pass (§8 Q7). |

**Decision made from this data:** `AITask.MANIM` no longer has its own `TASK_PROVIDER_ORDER`
entry in `ai/config.py` — it falls through to `DEFAULT_PROVIDER_PRIORITY`
(`groq -> gemini -> mistral -> nvidia -> kimi -> zai`), the same as `SLIDES`/`BRIEFING`, matching
what the call actually is (JSON block-sequencing, not code generation). This is a real code
change already made (`backend/ai/config.py` and `qstudio_service/ai/config.py`, kept in sync),
not just a plan note. **A second real fix landed alongside it:** the Groq nesting failure above
is an `AIInvalidRequestError` raised by the *provider*, not by this codebase's own pydantic
validation — `AIGateway._attempt_with_repair`'s repair-retry used to only recognize its own
client-side validation message ("did not validate against ..."), so a provider-side rejection
like Groq's skipped the repair retry entirely. Broadened to treat any `AIInvalidRequestError`
while a `response_model` was requested as repair-eligible — this fixes the gap for every
structured-output task using the gateway, not just this one.

`AITask.CODE`'s Kimi-first routing is untouched — this test only exercised `MANIM`'s actual call
shape, and says nothing about Kimi's fit for genuine code-generation tasks.

---

## 1. Animation content schema — the block catalog

`qstudio_service/models/qstudio.py` gets a new set of models, same flat/optional-fields
philosophy as `Slide`/`SlideDeck` (`qstudio_service/models/qstudio.py:41-61`) and for the same
reason: this codebase's structured-output path (`ai_gateway.chat(..., response_model=...)`,
`ai/providers/openai_compatible.py`'s tool-calling extraction) is proven against flat schemas
across every provider it's been used with, not nested `anyOf` unions.

```python
class AnimationStep(BaseModel):
    block: Literal[
        "title_card",      # big centered title + subtitle, fades in/out
        "define_term",     # a term appears, then its definition writes in below/beside it
        "bullet_reveal",    # a title + up to 4 points, revealed one at a time
        "compare_two",      # two labeled columns, each with up to 4 points, revealed side by side
        "process_flow",     # up to 5 labeled boxes connected by arrows, appearing in sequence
        "timeline",         # up to 5 labeled events placed along a horizontal line, in order
        "graph_plot",       # a labeled axes + one plotted function/curve, drawn on screen
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
    graph_expression: Optional[str] = None  # e.g. "x**2", "sin(x)" — eval'd against a fixed safe namespace, see §5
    # Narration for this step. Same floor/rationale as SlideScript.narration
    # (qstudio_service/models/qstudio.py:14) — a strict minimum, not a suggestion.
    narration: str = Field(min_length=120)

class AnimationStoryboard(BaseModel):
    steps: List[AnimationStep] = Field(min_length=4, max_length=10)
```

System prompt (gateway structured output against `AnimationStoryboard`, via `AITask.MANIM` — see
§0) mirrors `pipeline_slides.py`'s `SYSTEM_PROMPT` shape: explains each block's purpose and which
fields belong to it, asks for `title_card` exactly once and first, instructs to only fill fields
belonging to the chosen `block`, and carries the same "narration must be 4-6 full sentences,
strict minimum" language. The gateway's own structured-output repair retry
(`AI_STRUCTURED_OUTPUT_REPAIR_RETRIES`, `ai/gateway.py`) already covers an under-length
generation the same way `pipeline.py::_generate_slide_script`'s hand-rolled one-retry-with-
correction used to — no per-pipeline retry code needed here, unlike when that pattern was first
written.

**Why 7 blocks and not "let the LLM describe any animation it wants":** this is the direct
consequence of the "no LLM-authored code execution" decision in the table above. Every block a
model can choose maps to a hand-written, deterministic Manim builder function (§2) — there is no
way for a generation to request an animation this repo doesn't already know how to render
safely. `graph_expression` is the one field that takes model-authored *content* rather than pure
text, so it gets its own narrow guard (§5), not general code execution.

---

## 2. Block builders — deterministic Manim code, not generated code

New file `qstudio_service/manim_scenes.py` — **static, hand-written, checked into the repo.**
Nothing in it is generated per-request. It contains:

1. One builder function per block, each `(scene: Scene, step: dict) -> None`, e.g.
   `def build_title_card(scene, step): ...`, `def build_define_term(scene, step): ...`. Each
   builder is responsible for its own `self.play(...)` animation calls *and* padding the
   remainder of `step["wait_seconds"]` (§3) with a final `self.wait(...)` so the step's on-screen
   duration matches its narration length.
2. A `BLOCK_BUILDERS: dict[str, Callable]` dispatch table mapping the `Literal` block names to
   the functions above.
3. One `Scene` subclass, `StoryboardScene`, whose `construct()` reads a storyboard JSON file
   (path from `STORYBOARD_PATH` env var — set by `pipeline_manim.py` per render, §3) and calls
   `BLOCK_BUILDERS[step["block"]](self, step)` for each step in order, clearing the scene
   (`self.clear()` or a `FadeOut` of the previous group) between steps.

This is the same relationship Slides has between `pipeline_slides.py` (data + orchestration) and
`templates/slides/*.html` (fixed, hand-written render logic per layout) — just Manim's Python
API standing in for Jinja/HTML. **The LLM's output only ever becomes data** (a JSON file
`StoryboardScene` reads), never source code that gets executed. This is what makes the "raw
Manim code from an LLM" risk (arbitrary code execution, sandboxing, prompt-injection-into-code)
a non-issue here — there's no `exec()`, no dynamically-written `.py` file, no code review step
needed for what a generation produces.

---

## 3. Narration + timing

Mirrors `pipeline_audio.py`'s per-line synthesis and `pipeline.py`'s per-slide narration, applied
per-step instead:

1. The gateway generates the `AnimationStoryboard` (§0/§1) — `ai_gateway.chat(..., task=AITask.MANIM, response_model=AnimationStoryboard)`.
2. For each step, synthesize `step.narration` with `edge_tts` (single voice — `params.voice`,
   reusing `pipeline.py`'s existing `VOICE_MAP`/`DEFAULT_VOICE`, §7) to `line_{i}.mp3`.
3. Probe each clip's duration with `ffprobe` — same pattern as `pipeline_audio.py::_probe_duration`
   (`qstudio_service/pipeline_audio.py:149-157`).
4. Write a `wait_seconds` field onto each step (`max(clip_duration, MIN_STEP_SECONDS)` — a floor,
   e.g. 3s, so a step never flashes by faster than its own entrance animation) and serialize the
   full storyboard (steps + `wait_seconds`) to a temp JSON file.
5. Invoke Manim as a subprocess against `manim_scenes.py`'s `StoryboardScene`, with
   `STORYBOARD_PATH` pointing at that JSON file — **same `subprocess.run(..., timeout=...)`
   pattern already used for every ffmpeg call in this codebase** (`pipeline.py:215-229`,
   `pipeline_audio.py:138-141`), for the same reason: a Manim render is exactly the kind of call
   that can hang, and this codebase has already been burned once by an unbounded `subprocess.run`
   leaving a job stuck with no error ever written to Mongo (`pipeline.py:206-209`'s comment).
   **Resolution: 1280x720 (not 1080p), timeout: 8 minutes (480s)** — decided (§8 Q5), not yet
   calibrated against a real render; revisit if 8 minutes proves too tight or too generous once
   `manim_scenes.py` actually exists.
6. Manim produces one silent `.mp4` whose total length equals the sum of `wait_seconds` (each
   builder pads to exactly that duration, per §2). Concatenate the narration clips into one
   continuous audio track (same ffmpeg concat-demuxer pattern as
   `pipeline_audio.py::_concat_clips`), then mux video+audio with one ffmpeg call
   (`-c:v copy -c:a aac`) — no re-encoding the video stream, since Manim already rendered it at
   final quality.
7. Upload the muxed final `.mp4` to B2, plus a thumbnail (first frame, `ffmpeg -ss 0 -frames:v 1`)
   for the study-space card preview.

---

## 4. Pipeline file, trigger, and Mongo wiring

New file `qstudio_service/pipeline_manim.py`, same `run_*_pipeline(output_id, grounding_text,
params) -> None` shape and `set_status()` helper pattern as `pipeline_audio.py`/
`pipeline_slides.py` (writing straight to `qstudio_outputs`, no separate collection).

```
POST /internal/qstudio-animation   (qstudio_service/main.py — same X-Internal-Secret auth
                                     as the other three internal endpoints)
```

New trigger model in `qstudio_service/models/qstudio.py`:
```python
class AnimationTrigger(BaseModel):
    output_id: str
    grounding_text: str
    voice: str = "female"
```

`qstudio_outputs.result` for this type:
```python
{"b2_key": ..., "thumbnail_b2_key": ..., "duration_seconds": ..., "voice": "female"}
```

Status lifecycle: `generating → ready|failed` at the `qstudio_outputs` level (matching
Audio/Slides — no finer-grained intermediate statuses are surfaced to the frontend today for
those two either, even though their pipelines internally have multiple phases; consistent to do
the same here rather than inventing new intermediate states this feature alone exposes).

**Backend wiring** (`backend/routers/qstudio_router.py`), following the exact shape
`_trigger_audio_overview`/`_trigger_slides_overview` already establish
(`backend/routers/qstudio_router.py:415-469`, shifted slightly since the Multi-AI Gateway
migration removed that file's old `groq_service` import):
- `backend/models/qstudio.py:8` — `OutputType` gains `"animation"`.
- `IMPLEMENTED_OUTPUT_TYPES` (`qstudio_router.py:52`) gains `"animation"`.
- New `_trigger_animation_overview(output_id, grounding_text, voice)` — identical structure to
  `_trigger_slides_overview`, posting to `/internal/qstudio-animation`.
- `create_output`'s type dispatch (`qstudio_router.py:~518-538`) gets an `elif request.type ==
  "animation":` branch reading `params.get("voice", "female")` and calling
  `background_tasks.add_task(_trigger_animation_overview, ...)` — left `status="generating"` for
  polling, same as audio/slides.
- New `GET /outputs/{output_id}/animation-url`, copy of `get_audio_output_url`
  (`qstudio_router.py:651-664`): checks `doc["type"] == "animation"`, signs `result.b2_key` (and
  `result.thumbnail_b2_key`) via `generate_download_url`.

---

## 5. `graph_expression` — the one field that isn't pure text

`graph_plot` lets a generation request a plotted function (e.g. "x**2", "sin(x)") — the only
block field that isn't just a text/list. This must **not** become a general `eval()` of
model-authored strings. Handling in `manim_scenes.py::build_graph_plot`:
- Parse `graph_expression` with `ast.parse(..., mode="eval")` and walk the AST, allowing only a
  fixed whitelist of node types (`BinOp`, `UnaryOp`, `Call`, `Name`, `Constant`) and a fixed
  whitelist of names (`x`, and a handful of `math`-module functions: `sin`, `cos`, `exp`, `sqrt`,
  `log`, `abs`). Anything outside that whitelist → reject the step (fall back to rendering it as
  a `bullet_reveal` of the step's narration text instead of failing the whole job).
- Only after passing the whitelist check is it evaluated (still no `eval()` of raw text — compile
  the vetted AST, or reconstruct a lambda from the whitelisted node types) and handed to Manim's
  `Axes.plot(...)`.
This is a narrow, auditable allowlist — not a sandboxing story, because there's no general code
execution to sandbox in the first place; it's the same category of guard as validating any other
untrusted structured input before it reaches a rendering call.

---

## 6. Docker / dependencies

`qstudio_service/requirements.txt` gains `manim` (Manim Community Edition), on top of `openai`
(already added there for the Multi-AI Gateway migration — see §0). No LaTeX per the decision in
the summary table — Manim's `Text` (Pango-backed) covers every block in §1; only `MathTex`/`Tex`
need a LaTeX distribution, and this plan avoids those entirely, keeping the image close to its
current size instead of the `+1-2GB` a `texlive` install would add.

`qstudio_service/Dockerfile` needs Manim's native deps alongside the existing `ffmpeg` apt
install (`Dockerfile:17-19`) — `pycairo`/`manimpango` typically resolve to prebuilt manylinux
wheels on `python:3.11-slim`/linux-amd64, but this should be verified at implementation time
rather than assumed; if wheels aren't available for the base image, `libcairo2-dev
libpango1.0-dev pkg-config` need adding to the `apt-get install` list (build-time only — the
runtime `libcairo2`/`libpango-1.0-0` shared libs are needed either way). **Flagged as a real
"verify when you get there" item, not a known quantity**, unlike ffmpeg/Playwright which this
repo already has working Docker installs for.

---

## 7. Frontend (brief — backend/pipeline is the bulk of the new work)

Following `PLANS/qstudio.md §6`'s existing pattern:
- Studio card: "Animation" as a 7th generate option next to the other six, `Select` for voice
  (reusing `VOICE_MAP`'s female/male choice, same as Video Overview's picker — not
  `VOICE_CATALOG`'s 6-voice podcast catalog, since this is single-narrator).
- New `AnimationOverviewPlayer.tsx` — thin wrapper, same shape as `AudioOverviewPlayer.tsx` but
  a `<video>` element instead of `<audio>`, fetching from the new `animation-url` endpoint.
- Thumbnail (`thumbnail_b2_key`) used for the study-space card preview before playback.

---

## 8. Open questions for review

1. **~~Groq model deprecation~~ / ~~routing choice~~ — resolved with a live test, see §0.**
   Tested Kimi, Groq, Gemini, and NVIDIA NIM directly against the real `AnimationStoryboard`
   schema. Result: `AITask.MANIM` now falls through to `DEFAULT_PROVIDER_PRIORITY` (Groq-first)
   instead of a Kimi-first override — code change already made, not just noted here. Two things
   fell out of this worth remembering: Kimi's account is currently unbilled (blocks every call,
   unrelated to model quality) and NVIDIA NIM needs an `extra_body` passthrough this codebase
   doesn't have yet to be usable with reasoning models (new §8 Q7).
2. **~~Single narrator vs. two-host~~ — confirmed: single narrator.** Matches the plan's original
   assumption (closer to Video Overview than Audio Overview's two-host podcast).
3. **~~Block catalog coverage~~ — confirmed as-is.** Ship with the 7 blocks in §1; treat gaps as
   additive follow-ups, not a redesign, per the original recommendation.
4. **~~`graph_expression` allowlist~~ — confirmed as-is.** `sin/cos/exp/sqrt/log/abs` accepted as
   sufficient for now.
5. **~~Render timeout / resolution~~ — decided: 1280x720, 8-minute (480s) subprocess timeout.**
   Replaces the earlier 1080p/5-minute proposal (§3 step 5). Still not calibrated against a real
   render — `manim_scenes.py` doesn't exist yet — revisit once it does.
6. **Docker build verification (§6)** — explicitly still unknown ("don't know," not guessed at).
   Whether `manimpango`/`pycairo` resolve to wheels cleanly on the current base image, or need
   the `-dev` apt packages, stays unresolved until someone actually runs the build. Not blocking
   for writing the code, but will block a working Docker image until checked.
7. **NEW — NVIDIA NIM needs `extra_body` support to be usable (surfaced by this test, §0).**
   `ai/providers/openai_compatible.py` has no way to pass provider-specific request fields today.
   NVIDIA-hosted reasoning models (tested: `deepseek-ai/deepseek-v4-pro`) default to a "thinking"
   mode that made a moderately complex structured-output call (this feature's own schema) never
   return within 120 seconds; NVIDIA's own sample code disables it via
   `extra_body={"chat_template_kwargs":{"thinking":False}}`. This is a Multi-AI Gateway gap, not
   specific to this feature — worth its own small follow-up in `ai/providers/openai_compatible.py`
   (e.g. an optional `extra_body` param threaded through `chat()`, with a per-provider default in
   `ai/config.py` for models known to need it) rather than being fixed inside this plan's scope.
