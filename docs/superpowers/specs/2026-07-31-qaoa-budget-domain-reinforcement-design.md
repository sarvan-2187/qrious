# QAOA Learning Path: Budget Guarantee, Domain Scoping, Reinforcement Time

## Problem

Three issues with the existing QAOA learning-path optimizer
(`backend/services/topic_prefilter.py` + `backend/services/learning_qaoa.py`, exposed via
`POST /api/v1/quantum-optimizer/recommend-path`):

1. **Budget violated.** `learning_qaoa.py`'s QUBO only *softly* penalizes deviating from
   `max_session_minutes` in either direction (`PENALTY_LAMBDA * (Σ time·x − budget)²`) — it never
   forbids exceeding it. The classical greedy fallback (`greedy_knapsack_selection`) already always
   respects the budget by construction, but that path only runs today on a simulator/optimizer
   *exception* — not when QAOA "succeeds" with an over-budget answer. Reported case: a 45-minute
   budget returned a 60-minute selection.
2. **No domain scoping.** Stage 1 (`topic_prefilter.build_candidates`) ranks candidates across the
   *entire* topic pool (all domains). `RoadmapPage.tsx` already has a `selectedDomain` the user is
   currently viewing, but recommend-path never sees it — by design today (`RoadmapPage.tsx` has an
   explicit comment that a recommendation can jump the user to any domain). The user wants an option
   to stay confined to their current domain instead (e.g. Quantum ML's ~41 topics).
3. **No use of slack time.** If the selected topic(s) don't fully consume the budget (e.g. one 30-min
   video against a 45-min budget), the leftover minutes are simply reported as unused. The user wants
   that leftover time surfaced as suggestions to reinforce the same topic(s) — quiz prep, flashcard
   review, slides — using content the topic already has via `content_refs` in `roadmap_seed.py`.

## Non-goals

- Not replacing cross-domain recommendation as the default — domain scoping is an **opt-in toggle**,
  off by default, so today's behavior (a recommendation can point at any domain) is unchanged unless
  the user checks the box.
- Not estimating per-activity durations for quizzes/flashcards/slides. `roadmap_seed.py`'s
  `content_refs` has no duration field for these, and none is invented — reinforcement suggestions are
  presented as-is, not scheduled minute-by-minute.
- Not adding new routes for quiz/flashcards deep-linking. Reinforcement suggestions open the existing
  `TopicDetailModal` (same modal already used elsewhere on the roadmap page), which already has
  quiz/flashcard/slide tabs for a topic.
- Not touching the QUBO formulation, Ising conversion, or the QAOA circuit itself — the budget fix is
  a post-selection check, not a change to the optimization math.

## Architecture

```
RoadmapPage (selectedDomain already known)
   │
   ▼
RecommendPathModal — new "Stay in {domain label}" checkbox, unchecked by default
   │
   ▼
POST /api/v1/quantum-optimizer/recommend-path { max_time_minutes, domain? }
   │
   ▼
topic_prefilter.get_weak_topic_candidates(db, uid, budget, domain=domain)
   │  Stage 1 (unchanged filters) + NEW: domain match when domain is given
   │  candidates gain: quiz_topic_tag, flashcard_category, has_slides
   ▼
learning_qaoa.optimize_learning_path(candidates, budget)
   │  Stage 2 (unchanged QUBO/Ising/circuit/COBYLA)
   │  NEW: selection with total_time > budget → discard, use greedy fallback instead
   │  NEW: leftover = budget − total_time; if > 0, build reinforcement_suggestions
   ▼
{ ...existing response fields..., reinforcement_minutes, reinforcement_suggestions }
   │
   ▼
RecommendPathModal — "Reinforce with your remaining ~N min" block
   │  each suggestion button → opens TopicDetailModal (existing open-topic flow)
```

## Backend changes

### 1. `backend/services/topic_prefilter.py`

- `build_candidates(topics, completed_slugs, mastery_map, max_session_minutes, domain=None)` — new
  optional `domain` param. Add one filter alongside the existing unlocked/time/mastery checks:
  ```python
  if domain is not None and (topic.get("domain") or "quantum-computing") != domain:
      continue
  ```
  (Mirrors `routers/roadmap.py`'s existing default-domain handling for topics predating the `domain`
  field, so filtering by `domain="quantum-computing"` matches what the roadmap page itself would show
  for that domain.)
- Candidate dict gains three flat fields, read from the topic's existing `content_refs` (no new data
  modeling):
  ```python
  refs = topic.get("content_refs") or {}
  candidates.append({
      ...existing fields...,
      "quiz_topic_tag": refs.get("quiz_topic_tag"),
      "flashcard_category": refs.get("flashcard_category"),
      "has_slides": bool(refs.get("slides")),
  })
  ```
- `get_weak_topic_candidates(db, firebase_uid, max_session_minutes, topics_override=None, domain=None)`
  — passes `domain` through to `build_candidates`.

### 2. `backend/services/learning_qaoa.py`

- New helper, independently unit-testable (pure function, no simulator/DB dependency):
  ```python
  def _reinforcement(selected: List[Dict[str, Any]], max_session_minutes: int, total_time: int) -> Tuple[int, List[Dict[str, Any]]]:
      leftover = max_session_minutes - total_time
      if leftover <= 0:
          return 0, []
      suggestions = [
          {
              "slug": c["slug"], "title": c["title"],
              "quiz_topic_tag": c.get("quiz_topic_tag"),
              "flashcard_category": c.get("flashcard_category"),
              "has_slides": c.get("has_slides", False),
          }
          for c in selected
          if c.get("quiz_topic_tag") or c.get("flashcard_category") or c.get("has_slides")
      ]
      return leftover, suggestions
  ```
- `_fallback_result` and the QAOA success branch in `optimize_learning_path` both call `_reinforcement`
  and add `"reinforcement_minutes"` / `"reinforcement_suggestions"` to their returned dict.
- **Budget guarantee**, inside `optimize_learning_path`'s try block, right after computing
  `total_time`/`total_value` for the QAOA-selected bitstring:
  ```python
  if total_time > max_session_minutes:
      return _fallback_result(candidates, max_session_minutes)
  ```
  This reuses the existing fallback path and its `fallback_used: true` flag — no new response field
  needed to signal "QAOA's answer was rejected," the existing flag already communicates it.

### 3. `backend/routers/quantum_optimizer.py`

- `RecommendPathRequest` gains `domain: Optional[str] = None`.
- `recommend_path` passes `domain` to `get_weak_topic_candidates`.
- The `stage1_candidate_count < 2` (`no_optimization_needed`) branch also calls `_reinforcement` (on
  whatever 0-or-1 candidates it has, against `payload.max_time_minutes`) so the response shape —
  `reinforcement_minutes` / `reinforcement_suggestions` always present — is identical across both
  branches. The frontend never needs to special-case a missing field.

## Frontend changes

### 1. `frontend/src/features/roadmap/types/roadmap.types.ts`

```ts
export interface ReinforcementSuggestion {
  slug: string;
  title: string;
  quiz_topic_tag: string | null;
  flashcard_category: string | null;
  has_slides: boolean;
}
```
Add to `RecommendPathResult`: `reinforcement_minutes: number; reinforcement_suggestions: ReinforcementSuggestion[];`

### 2. `frontend/src/features/roadmap/api.ts`

`recommendPath(maxTimeMinutes: number, domain?: string)` — includes `domain` in the POST body only
when provided (`{ max_time_minutes: maxTimeMinutes, ...(domain ? { domain } : {}) }`).

### 3. `frontend/src/features/roadmap/components/RecommendPathModal.tsx`

- New prop `currentDomain?: string`. When present, render a checkbox "Stay in {CATEGORY_LABELS[currentDomain]}"
  above the existing time input, unchecked by default. `handleOptimize` passes
  `stayInDomain ? currentDomain : undefined` to `recommendPath`.
- New block, rendered when `result.reinforcement_minutes > 0`, placed after the selected-topics list:
  "Reinforce with your remaining ~{reinforcement_minutes} min" — one row per
  `reinforcement_suggestions` entry, showing which of quiz/flashcards/slides are available (only the
  ones present), with a button that calls the same `onStartTopic(slug, ...)` flow already used for
  selected topics (opens `TopicDetailModal` via `RoadmapPage`'s existing mechanism — no new modal, no
  new routing).

### 4. `frontend/src/features/roadmap/pages/RoadmapPage.tsx`

Pass `currentDomain={selectedDomain}` to `<RecommendPathModal />`.

## Error handling

- Domain filter producing zero matches (typo, stale domain) falls straight into the existing
  `stage1_candidate_count < 2` → `no_optimization_needed` branch — already handled, no new error path.
- Budget-guarantee fallback reuses the existing exception-fallback code path and flag — no new error
  states introduced.
- Reinforcement suggestions with no quiz/flashcard/slide refs at all are simply omitted from the list
  (never a dangling/empty suggestion row).

## Testing

`backend/tests/test_learning_qaoa.py`:
- `_reinforcement` unit tests: leftover > 0 with mixed content refs (only fields that exist produce a
  suggestion entry); leftover == 0 returns `(0, [])`; a selected topic with none of the three refs is
  excluded from suggestions.
- Budget-guarantee test: construct candidates and monkeypatch/force a QAOA bitstring whose total_time
  exceeds the budget (patch `qiskit_service.run_simulation`'s returned probabilities so the argmax
  bitstring is a known over-budget one, rather than relying on real QAOA's stochastic convergence to
  overshoot) — assert `fallback_used is True` and `total_estimated_time <= max_session_minutes`.

`backend/tests/test_topic_prefilter.py`:
- `build_candidates(..., domain="quantum-machine-learning")` only returns topics from that domain.
- `domain=None` (default) behaves exactly as before — existing tests must still pass unchanged.
- A topic with a missing `domain` key is treated as `"quantum-computing"` when filtering for that
  domain (matches `roadmap.py`'s existing legacy-topic handling).

Manual verification: run the dev server, open the roadmap optimizer modal in Quantum ML, check "Stay
in Quantum Machine Learning," confirm all recommended topics belong to that domain; set a small time
budget that leaves slack, confirm the reinforcement block appears and its "open" buttons launch the
topic detail modal.
