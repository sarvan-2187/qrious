# QRoute — Email the Job Submitter on Completion (Implementation Plan v1)

**Scope:** when a real-hardware QRoute job finishes (completed or failed), email the submitter a simple status notice instead of requiring them to keep the job's detail page open and polling.

**Decisions locked — see §6.** Sections below are updated to match; this is now ready to move to an implementation plan.

---

## 1. Why this needs a real design, not just "call an email API"

I read `qroute_router.py` end to end before writing this. The important finding: **a QRoute job's status only ever changes from `queued`/`running` to `completed`/`failed` inside `GET /jobs/{job_id}`** (`qroute_router.py:154-183`) — when that handler runs, it asks the provider adapter for the live status and writes the result back to Mongo. Nothing else touches job status. `GET /jobs` (the list endpoint) does **not** refresh live status; it just reads whatever's cached.

That single-job GET is only ever called by `QRouteJobDetailPage.tsx`'s 3-second poll (`POLL_INTERVAL_MS`) while a user has that specific job's page open (`useEffect` in `QRouteJobDetailPage.tsx:58-91`). So today, **a job sitting in a real hardware queue only "completes" from the backend's point of view while someone's browser tab is open and polling it.** If the whole point of emailing the result is "so I don't have to keep the tab open," the current architecture defeats that purpose — closing the tab means the status never flips, so no email would ever fire.

**This means the real prerequisite for this feature is a server-side poller**, independent of any browser tab, that periodically checks every user's in-flight jobs against their provider and advances status itself. Good news: this backend already has exactly the right primitive for that, unused for anything QRoute-related today — see §3.

---

## 2. What the email says (v1: status only)

**Decided:** v1 sends a simple status notice, not the detailed result table — just enough that the submitter knows to go look: provider, device, and **whether it completed or failed**, plus a link back to `/qroute/jobs/{job_id}` for the full histogram/counts/cost. No qCompare content and no second email — that stays a manual "Explain the gap" click on the detail page, unchanged.

This also simplifies §3/§4: the notification path only ever needs the four fields already on `quantum_hw_jobs` (`provider`, `device_id`, `status`, `job_id`) — no dependency on `_serialize_job()`'s full result shape, and no coupling to `POST /jobs/{job_id}/compare` at all.

---

## 3. Server-side completion detection — reusing what's already there

`backend/main.py:5,46-59` already runs an `AsyncIOScheduler` (APScheduler) inside the FastAPI process, today only for a 6-hour quantum-news refresh job. This is the exact shape needed here: add a second scheduled job, e.g. every **60–120 seconds**, that:

1. Queries `quantum_hw_jobs` for `{"status": {"$in": ["queued", "running"]}}` across **all users** (not just whoever has a tab open).
2. For each, calls `adapter.get_job_result(...)` — the identical call `GET /jobs/{job_id}` already makes (`qroute_router.py:166`) — and writes the same status/result/cost update back to Mongo.
3. If the new status is terminal (`completed` **or** `failed`) **and** the device isn't a simulator (same `_is_simulator_device` check qCompare already gates on, §qroute_router.py:194-207 — simulator/mock jobs finish almost instantly, no queue wait to solve for) **and** the doc doesn't already have `email_sent: true`, look up the submitter's email (§5) and send the notification (§4) — completed and failed both get an email, different subject/tone — then set `email_sent: true` on the doc so a later poll (or the user's own open tab hitting `GET /jobs/{job_id}` first) never double-sends.

This is additive — the existing lazy-refresh-on-GET behavior in `get_job` stays exactly as is (a user with the tab open still sees instant-feeling updates); the new poller just guarantees completion is *also* detected when nobody's watching. Refactor note: the live-refresh block inside `get_job` (`qroute_router.py:163-181`) and the new poller's per-job refresh are the same four lines of logic — worth factoring into one shared `_refresh_job_status(db, doc)` helper used by both, rather than duplicating it.

**Cost/safety of polling all providers every 60-120s:** this hits each configured adapter's API once per in-flight job per cycle — negligible for a handful of students' jobs, but worth capping (e.g. skip the cycle entirely if there are zero non-terminal jobs, which will be true most of the time) so it isn't burning provider API quota for nothing.

---

## 4. Sending the email — raw SMTP via `smtplib`

**Decided:** Option C — Python's stdlib `smtplib`/`email.mime`, no new dependency, no domain to verify. Since there's no domain, this sends through an existing SMTP account (e.g. Gmail/Workspace SMTP with an app password) — the "from" address is that mailbox's own address, not a branded `notifications@...` sender. New config in `backend/.env`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM` (defaults to `SMTP_USERNAME` if unset).

New file: `backend/services/email_service.py` — one function, `send_email(to: str, subject: str, text_body: str)`, opening an `smtplib.SMTP(...)` connection with `starttls()` and `login()` per call (no persistent connection needed at this volume), building a plain `EmailMessage`. Runs inside the poller's async job via `asyncio.to_thread(...)` since `smtplib` is blocking. Every call site goes through this one function so swapping to a transactional API later is a one-file change if a domain gets set up.

Note this is the one piece of the design that runs client-visible infrastructure risk worth naming: shared hosts sometimes block outbound port 587/465, and a personal Gmail account has Google's per-day sending caps (500/day on a regular account) — fine at "a handful of students' jobs" scale, worth revisiting if usage grows.

---

## 5. Resolving the submitter's email

Simpler than it might look — `auth.py:50-76`'s `get_current_user` already proves every authenticated request has `current_user["email"]` available (from the Mongo `users` doc, falling back to the Firebase ID token's own `email` claim if no `users` doc exists yet). The poller runs outside a request context, so it needs the equivalent lookup by stored id:

```python
job_doc["user_id"]  # this is a Mongo ObjectId — see qroute_router.py:112, current_user["_id"]
user_doc = await db.users.find_one({"_id": job_doc["user_id"]})
email = user_doc.get("email") if user_doc else None
```

If `user_doc` is missing or has no email (matches the same "MongoDB unavailable/still initializing" fallback path `auth.py` already codes defensively around), fall back to `firebase_admin.auth.get_user(uid).email` — but that needs the user's `firebase_uid`, not just their Mongo `_id`, so the `users` doc's own `firebase_uid` field would need to be read first. Practically, if the `users` doc doesn't exist at all, there's likely no reliable Firebase UID to use either strictly from a job doc alone (`quantum_hw_jobs.user_id` is a Mongo ObjectId, not the firebase_uid qStudio's collections use). **Decided:** if email lookup fails, log-and-skip that one job (matching this codebase's existing "don't fail the whole operation over a best-effort side channel" pattern, e.g. `_trigger_qcompare_audio`'s swallow-and-log approach) rather than erroring the whole poll cycle — the poll continues to the next job either way.

---

## 6. Decisions

1. **Delivery mechanism (§4):** Python `smtplib` with SMTP credentials, **not** a transactional API and **not** Nodemailer — Nodemailer is JS-only and can't run anywhere in this stack (Python backend, static-SPA frontend with no Node/serverless layer). Triggered by the backend poller (§3), so it works even with the tab closed — the thing this whole feature exists for.
2. **Scope (§2):** v1 email is a simple completed-or-failed status notice with a link back to the job page — not the full detailed-result table, and no qCompare email.
3. **Always-on, real-hardware only:** every real-hardware job gets emailed automatically, no opt-in toggle. Simulator/mock jobs are excluded (§3 step 3) — they finish instantly, no queue wait to solve for.
4. **Failed jobs:** yes, email on `failed` too, not just `completed`.
5. **Poll interval / infra:** 60–120s in-process APScheduler cycle, single backend instance — no multi-instance concern raised, and the `email_sent` flag still protects against double-sends regardless.
6. **Sending domain:** none — confirmed no custom domain, which is why §4 is SMTP-through-an-existing-mailbox rather than a transactional API (those need a verified domain).

**Still needed from you before implementation starts:** the actual SMTP credentials to put in `backend/.env` (`SMTP_HOST`/`PORT`/`USERNAME`/`PASSWORD`, and which mailbox — Gmail app password is the simplest route if you don't already have another SMTP account in mind).