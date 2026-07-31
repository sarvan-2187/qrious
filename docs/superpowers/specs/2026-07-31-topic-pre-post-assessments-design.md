# Per-Topic Pre/Post Assessments (AI-Generated), Mapped Into Analytics

## Problem

Pre/post assessments today (`backend/routers/analytics.py::start_assessment`) are **domain-wide**:
they sample random questions from the entire `quiz_questions` collection, with no topic scoping and
no difficulty enforcement (the `difficulty` query param is optional and unused by the frontend). The
analytics dashboard shows one aggregate pre/post delta card for the whole account.

The request: pre/post tests scoped to **each topic** inside the roadmap domain the user has selected
(e.g. Quantum Computing's 30 topics). Pre-test = easy-only questions, capped at 10. Post-test =
medium/hard questions, capped at 10. Never exceed 10. The analytics dashboard, when a domain is
selected, shows a detailed pre/post analysis **per topic** in that domain, not just one global card.

The existing `quiz_questions` seed bank has 63 questions total across ~93 topics (only 15 easy) — far
short of the 10-easy + 10-medium/hard every topic needs. Per user decision, questions are **generated
live** via the existing multi-provider `ai_gateway` (`backend/ai/gateway.py`) instead of hand-written,
using a new `AITask.QUIZ` system prompt (that enum value already exists, unused).

## Non-goals

- Not touching the existing per-topic practice quiz (`/quiz/:slug`, `TopicDetailModal`'s Quiz tab,
  static `quiz_seed.py` pool) — that keeps working as-is.
- Not touching the domain-unlock gate (`DomainSelector`'s `requiredPretestScore`) — unrelated,
  hardcoded display concern, out of scope.
- Not generating non-MCQ question types (match/arrange_steps/bloch_sphere) — the `AssessmentPage` UI
  only renders MCQ-style options today; scoped simplification (see below).
- Not backfilling the static `quiz_questions` seed collection — generation replaces that need for
  topic-scoped tests.

## Architecture

```
AnalyticsPage (roadmap_id already selected)
   │
   ▼
GET /api/v1/learning/analytics/dashboard?roadmap_id=quantum-computing
   │  adds: topic_assessment_breakdown[] (one entry per topic in that domain)
   ▼
TopicPrePostBreakdown.tsx  (new) — renders per-topic pre/post cards + "Start Pre/Post-Test" buttons
   │
   ▼
navigate(/analytics/assessment/pre?topic=<slug>)
   │
   ▼
AssessmentPage.tsx (existing, extended to read ?topic=)
   │
   ▼
POST /api/v1/learning/assessments/pre/start?topic_slug=<slug>
   │  topic_slug present → generate via ai_gateway (NEW)
   │  topic_slug absent  → legacy domain-wide random sample (UNCHANGED)
   ▼
topic_assessment_service.generate_topic_assessment_questions()
   │  ai_gateway.chat(task=AITask.QUIZ, response_model=TopicQuizGenerationResult)
   ▼
assessments collection: doc stores topic_slug + full question objects (incl. correct_answer)
   │
   ▼
POST /api/v1/learning/assessments/{id}/submit
   │  questions_full present on doc → grade from stored doc (NEW path)
   │  absent → legacy db.quiz_questions lookup (UNCHANGED)
   ▼
quiz_grading_service.grade_question()  — UNCHANGED, same dict shape reused
```

## Backend changes

### 1. New Pydantic schema — `backend/models/quiz_generation.py`

```python
class GeneratedQuizOption(BaseModel):
    id: str          # "opt_a" / "opt_b" / "opt_c" / "opt_d"
    text: str

class GeneratedQuizQuestion(BaseModel):
    concept: str
    difficulty: Literal["easy", "medium", "hard"]
    prompt: str
    options: List[GeneratedQuizOption] = Field(min_length=4, max_length=4)
    correct_option_id: str
    explanation: str

class TopicQuizGenerationResult(BaseModel):
    questions: List[GeneratedQuizQuestion] = Field(min_length=1, max_length=10)
```

Mirrors `FlashcardsResult`/`MindMapResult` in `backend/models/qstudio.py`. Kept in its own file since
it's a quiz-domain concept, not qstudio.

### 2. New service — `backend/services/topic_assessment_service.py`

```python
async def generate_topic_assessment_questions(topic: dict, test_type: Literal["pre","post"], uid: str) -> list[dict]:
    ...
```

- Builds a system prompt (function, not a constant — parameterized per call, unlike
  `FLASHCARDS_SYSTEM_PROMPT`):
  - `pre`: "Write up to 10 EASY multiple-choice questions testing foundational recall of
    {topic.title}. {topic.description} ... every question's difficulty MUST be 'easy'."
  - `post`: "Write up to 10 MEDIUM/HARD multiple-choice questions testing applied understanding of
    {topic.title}. {topic.description} ... roughly half 'medium' and half 'hard', NONE 'easy'."
  - Both explicitly instruct: exactly 4 options, one `correct_option_id`, a one-sentence
    `explanation`, and a `concept` label per question (mirrors existing seed data shape).
- Calls `ai_gateway.chat(messages=[...], task=AITask.QUIZ, response_model=TopicQuizGenerationResult, identity=uid)`.
- Maps `GeneratedQuizQuestion` → the dict shape `quiz_grading_service.grade_question` already expects:
  `{"_id": uuid4, "type": "mcq", "topic_slug", "concept", "difficulty", "prompt", "options": [{"id","text"}], "correct_answer": correct_option_id, "explanation", "xp_reward": <10/15/20 by difficulty>, "time_limit_seconds": 60}`.
- Post-generation guard: filter out any question whose `difficulty` doesn't match the requested band
  (defends against the model ignoring the instruction), then `[:10]`. If the model returns fewer than
  10 after filtering, use what's left — never pad, never exceed 10 (per user decision).

### 3. `backend/routers/analytics.py::start_assessment` — extend, don't replace

Add optional query param `topic_slug: Optional[str] = Query(None)`.

- **When `topic_slug` given:** the existing `count` and `difficulty` query params are ignored —
  topic-scoped generation always targets 10 and the difficulty band is fixed by `type` (`pre` = easy,
  `post` = medium/hard), not caller-supplied. This keeps the "10 and 10, never more" rule from being
  overridable by a stray query param.
  - Resolve the topic the same way `roadmap.py` does (`db.roadmap_topics.find_one` → fallback to
    `SEED_TOPICS`), 404 if not found.
  - `test_type` must be `pre` or `post` (existing validation).
  - `questions = await generate_topic_assessment_questions(topic, type, uid)`.
  - `assessment_doc` gains `topic_slug` and `questions_full: questions` (full dicts, correct answers
    included — never sent to the client). `question_ids` becomes the list of the generated `_id`
    uuids (still populated, for shape consistency with the legacy path).
  - Response uses `strip_sensitive_answers` exactly as today.
- **When absent:** existing random-sample-from-DB behavior, byte-for-byte unchanged.

### 4. `backend/routers/analytics.py::submit_assessment` — extend, don't replace

- If `assessment.get("questions_full")` is present, build `questions_map` from it directly (keyed by
  each question's `_id` cast to str) instead of querying `db.quiz_questions`. Everything downstream
  (`quiz_grading_service.grade_question`, XP award, streak, badges) is unchanged — it already only
  needs a dict shaped like a question.
- If absent, existing `db.quiz_questions.find({"_id": {"$in": question_ids}})` path, unchanged.

### 5. `backend/routers/analytics.py::get_analytics_dashboard` — add topic breakdown

- Only computed when `roadmap_id` is a specific domain (not `None`/`"all"`) — the topic-slug
  resolution block already exists (`topic_slugs = [t.get("slug") for t in roadmap_topics ...]`); reuse it.
- For each topic in that domain (sorted by `order_index`), find the most recent **completed**
  `assessments` doc with that `topic_slug` and `type == "pre"`, and the most recent with `type ==
  "post"`.
- Reuse `compute_pre_post_delta_info(pre_score, post_score, total_evaluations=1)` per topic — it's
  already a pure function taking just scores, no changes needed.
- Emit `topic_assessment_breakdown: List[dict]`, each:
  ```python
  {
    "topic_slug": ..., "topic_title": ..., "order_index": ...,
    "pre": {"taken": bool, "score_pct": float|None, "total_correct": int, "total_questions": int, "taken_at": iso_str|None},
    "post": {...same shape...},
    "delta_pct": float|None,
    "performance_classification": str,
    "academic_recommendation": str,
  }
  ```
- Cache key already includes `roadmap_id` (`f"{firebase_uid}_{roadmap_id or 'all'}_{tz_offset}"`), so
  the existing 30s TTL cache covers this without changes; `invalidate_analytics_cache` already fires
  on every `submit_assessment` call.

## Frontend changes

### 1. `frontend/src/features/analytics/types/analytics.types.ts`

Add:
```ts
export interface TopicAssessmentSide {
  taken: boolean;
  score_pct: number | null;
  total_correct: number;
  total_questions: number;
  taken_at: string | null;
}
export interface TopicAssessmentEntry {
  topic_slug: string;
  topic_title: string;
  order_index: number;
  pre: TopicAssessmentSide;
  post: TopicAssessmentSide;
  delta_pct: number | null;
  performance_classification: string;
  academic_recommendation: string;
}
```
Add `topic_assessment_breakdown: TopicAssessmentEntry[]` to `AnalyticsDashboardData`.

### 2. `frontend/src/features/analytics/api.ts`

`startAssessment` gains an optional `topicSlug?: string` param, appended as `topic_slug` to the
querystring when present.

### 3. `frontend/src/features/analytics/pages/AssessmentPage.tsx`

Read `topic` from `useSearchParams()`; pass through to `startAssessment(type, 10, undefined, topic)`.
Everything else (question rendering, submit, results screen) is unchanged — it already renders MCQ
options generically by `_id`/`options`/`prompt`, which the generated shape matches.

### 4. New `frontend/src/features/analytics/components/TopicPrePostBreakdown.tsx`

Renders only when `selectedRoadmap !== 'all'` (mirrors how the domain filter already gates data).
One row per topic: title, Pre-Test mini-card (score or "Not taken" + Start button), Post-Test
mini-card (same), delta badge, and the per-topic `academic_recommendation` text — same visual
language as the existing `PrePostDeltaCard` component (reuse its card styling, don't reinvent it).
Buttons navigate to `/analytics/assessment/pre?topic=<slug>` / `.../post?topic=<slug>`.

### 5. `frontend/src/features/analytics/pages/AnalyticsPage.tsx`

Insert `<TopicPrePostBreakdown entries={data.topic_assessment_breakdown} roadmapId={selectedRoadmap} />`
right after the existing `<PrePostDeltaCard />`, only rendered when `selectedRoadmap !== 'all'`.

## Error handling

- Gateway failure (all providers down / circuit open) on generation: `AIGatewayError` propagates as a
  500 from `start_assessment`; `AssessmentPage`'s existing `catch` + `toast.error` already handles
  this ("Failed to initialize assessment session.") — no new frontend error path needed.
- Model returns malformed JSON: handled by the gateway's existing structured-output repair retry
  (`AIGateway._attempt_with_repair`) — nothing new to write.
- Model returns fewer than 10 valid questions after the difficulty-filter guard: use what's left
  (never block, never pad) — matches the user's explicit fallback decision.
- Topic not found for `topic_slug`: 404, same pattern as `roadmap.py`.

## Testing

`backend/tests/test_topic_assessment_service.py` (new, mirrors existing gateway test patterns in
`backend/tests/test_ai_gateway.py`):
- Mock `ai_gateway.chat` to return a canned `TopicQuizGenerationResult`.
- Assert `generate_topic_assessment_questions(topic, "pre", uid)` — every returned question has
  `difficulty == "easy"`, `len(questions) <= 10`.
- Assert `generate_topic_assessment_questions(topic, "post", uid)` — no question has
  `difficulty == "easy"`, `len(questions) <= 10`.
- Assert a generated question dict round-trips correctly through
  `quiz_grading_service.grade_question()` (correct selection → `is_correct=True`; wrong → `False`).
- Assert the difficulty-filter guard drops a question the mock deliberately mis-tags (e.g. an "easy"
  question smuggled into a "post" response).

Manual verification: run the dev server, select a domain in Analytics, start a topic pre-test, confirm
10-or-fewer easy questions, submit, confirm the topic breakdown card updates with the score; repeat
for post-test; confirm `roadmap_id=all` hides the breakdown entirely.
