# AI provider resilience — moving off single-vendor Groq dependency

**Trigger:** hackathon judges asking "you depend heavily on Groq — what happens when you hit
rate limits or run out of quota in production?" Researched to have both an honest answer and a
real plan, not just a talking point.

## 0. Current blast radius (verified in this codebase, not assumed)

Every AI call in this platform goes through Groq, and only Groq:

```
backend/services/groq_service.py           -> ChatGroq(model="llama-3.3-70b-versatile")
backend/services/langchain_service.py      -> (AI tutor chat)
backend/services/qbook_pdf.py              -> (uses groq_service)
backend/routers/qstudio_router.py           -> mindmap/flashcards/briefing generation
qstudio_service/services/groq_service.py   -> ChatGroq(model="llama-3.3-70b-versatile")
qstudio_service/pipeline.py                -> Video Overview slide scripting
qstudio_service/pipeline_audio.py          -> Audio Overview dialogue scripting
qstudio_service/pipeline_slides.py         -> Slides deck generation
```

Two independent `GroqService` classes (`backend/`, `qstudio_service/`), both hardcoded to the
same model, both reading the same `GROQ_API_KEY`, **zero retry/backoff logic anywhere** (grepped
for `retry|backoff` across every Groq call site — no matches). If the Groq key gets
rate-limited, hits a quota/spend cap, or Groq has an outage, every AI feature in the product
fails simultaneously: AI tutor chat, all six qStudio outputs, qBook PDF processing. There is
today no graceful degradation and no fallback path.

**Compounding, dated problem:** both `GroqService` classes are hardcoded to
`llama-3.3-70b-versatile`, which Groq is shutting down **2026-08-16** (confirmed via
`console.groq.com/docs/deprecations`, not a hallucinated date). This needs fixing regardless of
anything below — it's a ship-blocker on its own timeline.

## 1. Failure modes to actually defend against

1. **Rate limiting (429).** Groq's free tier is tight: ~30 RPM / 6,000-15,000 TPM / 1,000-14,400
   RPD depending on model. A live demo with a handful of concurrent users generating slides/mind
   maps can plausibly hit this. The paid "Developer" tier (add a card, still no per-token charge
   until you're on pay-as-you-go volume) gives roughly 10x the free-tier caps — cheapest lever
   available today, zero code change.
2. **Quota/spend cap exhaustion.** Same failure shape as rate limiting from the app's
   perspective (a 4xx from Groq), different cause (money/tokens ran out rather than
   requests-per-minute).
3. **Provider outage or latency spike.** Not hypothetical for any single-vendor API dependency.
4. **Model deprecation/shutdown** — the one already in motion, see §0.

## 2. Solutions, tiered by effort — this is the actual roadmap

### Tier 0 — same-day code fix, no new infra, do regardless of judges' questions

- Repoint both `GroqService` classes off `llama-3.3-70b-versatile` before 2026-08-16. Use
  `openai/gpt-oss-120b` for structured-output calls (larger max-output, explicit
  `structured_outputs` support — a strictly better fit for every `with_structured_output()` call
  in this codebase than the model it replaces) and consider `openai/gpt-oss-20b` for the AI
  tutor's short-reply chat instance (`get_llm()`, cheaper/faster, still tool-capable).
- Add retry-with-exponential-backoff around every Groq call for 429/5xx (e.g. `tenacity`, or a
  small hand-rolled wrapper) — today there is *none*, so a single transient rate-limit response
  currently fails the whole job outright.
- Upgrade to Groq's Developer tier — a payment method, not a redesign, for ~10x the rate-limit
  headroom.

### Tier 1 — multi-provider failover (1-2 days, still just API calls) — **the direct answer to "what if Groq runs out"**

The key fact: **Llama, Qwen, and GPT-OSS are open-weight models** — Groq isn't the only place
that hosts them. Cerebras, Together AI, Fireworks AI, DeepInfra, and aggregators like OpenRouter
all serve the same model families with independent rate limits, quotas, and infrastructure.
Being "dependent on Groq" today is a hardcoded-provider choice in `groq_service.py`, not a
technical lock-in to Groq specifically.

Two concrete implementation options:

- **LiteLLM** (open-source proxy or drop-in Python SDK). Define an ordered fallback list —
  e.g. Groq (primary, fastest+cheapest) → Cerebras → Fireworks/Together → OpenRouter (broad
  catch-all). LiteLLM's router automatically retries the next provider in the list on a 429/5xx/
  timeout, with per-deployment cooldowns so a rate-limited provider isn't hammered further. This
  replaces the current `ChatGroq(...)` instantiation in both `GroqService` classes with a
  provider-agnostic call — the rest of the pipeline code (all the `with_structured_output()`
  call sites) doesn't need to change.
- **OpenRouter** as the lower-effort alternative: one API key, 300+ models, provider-level
  failover **on by default** (no LiteLLM proxy to run/host yourself), billed at the underlying
  provider's price plus a 5.5% fee. Less control over fallback order than LiteLLM, but zero
  infra to operate — a good fit for a small team past hackathon stage but not yet at the scale
  where owning the routing logic pays for itself.

This tier is the actual talking point for judges: *"We're not locked into Groq — Groq hosts open
models that are also available elsewhere. The hardening step is a thin routing layer so a
rate-limit or outage on one provider fails over automatically, not a rewrite."*

### Tier 2 — self-hosted inference (scale-out path, days-to-weeks, only once volume justifies it)

Run the same open-weight models (Qwen3, GPT-OSS-20B, Llama 3.x) on rented GPUs via **vLLM** (the
standard production serving engine — supports Llama 3, Qwen3, Gemma, Phi-4, DeepSeek
distillations) on **RunPod serverless GPU** (scales to zero when idle; ~$0.59/hr A10G up to
~$2.69/hr H100, pay-as-you-go) or a dedicated endpoint on Together/Fireworks. This removes
third-party rate limits entirely for whatever volume runs on owned capacity, and gives
predictable unit economics once traffic is steady rather than spiky.

**Honest framing:** this is the *scale* answer, not the *hackathon* answer — it adds real
deployment/monitoring/autoscaling ops overhead. Worth naming as "our path once usage is
predictable," not something to actually build before there's traffic to justify it.

### Tier 3 — demand-side mitigations (cheap, cuts call volume regardless of provider)

- **Cache structured-output results.** Mindmap/flashcards/briefing/slides generation are
  deterministic-per-input calls (same sources + same output type → same reasonable output) —
  caching on `(study_space sources hash, output type, params)` avoids re-calling Groq on
  duplicate "Regenerate" clicks or repeated demos of the same notebook.
- **Token-bucket / request-coalescing limiter** inside `groq_service.py` itself, to smooth
  bursts under the per-minute cap without needing a second provider at all — the cheapest
  possible mitigation, no new dependency, complements Tier 1 rather than replacing it.

## 3. Recommended one-paragraph answer for judges

> "We're not hard-locked to Groq — Groq just happens to host open-weight models (Llama, Qwen,
> GPT-OSS) that are also served independently by Cerebras, Together AI, Fireworks, and
> aggregators like OpenRouter with automatic failover built in. Today we call Groq directly for
> speed/cost; the production-hardening step is a thin provider-routing layer (LiteLLM or
> OpenRouter) so a rate-limit or outage on one provider fails over to another automatically,
> plus response caching to cut redundant calls. Past a certain volume, the scale-out path is
> self-hosting the same open models on rented GPUs via vLLM, which removes third-party rate
> limits entirely for that traffic."

## 4. Immediate action items specific to this repo (not hypothetical)

1. Both `GroqService` classes (`backend/services/groq_service.py`,
   `qstudio_service/services/groq_service.py`) hardcode a model Groq shuts down 2026-08-16 —
   needs a fix landed before that date independent of any other work here.
2. Zero retry/backoff exists across all 8 files that call Groq — first concrete resilience gap,
   cheapest to close (Tier 0).
3. Single `GROQ_API_KEY`, single provider, no fallback configuration anywhere in either service
   — Tier 1 is the first time this stops being true.
