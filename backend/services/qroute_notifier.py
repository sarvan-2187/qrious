import os
from datetime import datetime, timedelta, timezone

from bson import ObjectId

from database import get_db
from routers.qroute_router import _refresh_job_status, _is_simulator_device, get_adapter
from services import email_service

FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")


def _job_email_content(doc: dict) -> tuple[str, str]:
    """Builds (subject, body) for a newly-terminal job's notification
    email. Pure/no I/O so it's testable on its own."""
    provider_name = get_adapter(doc.get("provider", "qbraid")).display_name
    job_url = f"{FRONTEND_BASE_URL}/qroute/jobs/{doc['_id']}"

    if doc["status"] == "completed":
        subject = f"Your QRoute job on {doc['device_id']} has completed"
        body = (
            f"Your quantum circuit finished running on {provider_name}'s {doc['device_id']}.\n\n"
            f"View the full results (histogram, counts, cost): {job_url}\n\n"
            "— Qrious"
        )
    else:
        subject = f"Your QRoute job on {doc['device_id']} failed"
        error = doc.get("error_message") or "No error details were returned by the provider."
        body = (
            f"Your quantum circuit did not complete on {provider_name}'s {doc['device_id']}.\n\n"
            f"Reason: {error}\n\n"
            f"View job details: {job_url}\n\n"
            "— Qrious"
        )
    return subject, body


async def _maybe_notify(db, doc: dict) -> None:
    """Given a job doc _refresh_job_status just refreshed, emails the
    submitter if (and only if) it just went terminal on real hardware and
    hasn't already been emailed. Split out from poll_and_notify_jobs so
    each condition is unit-testable without a poll loop or real DB."""
    if doc["status"] not in ("completed", "failed"):
        return
    if doc.get("email_sent"):
        return
    if await _is_simulator_device(doc.get("provider", "qbraid"), doc["device_id"]):
        return

    user_doc = await db.users.find_one({"_id": ObjectId(doc["user_id"])})
    email = user_doc.get("email") if user_doc else None
    if not email:
        print(f"[qroute_notifier] no email on file for user_id={doc['user_id']}, job={doc['_id']} — skipping", flush=True)
        return

    subject, body = _job_email_content(doc)
    try:
        await email_service.send_email(email, subject, body)
    except Exception as e:
        print(f"[qroute_notifier] failed to send completion email for job {doc['_id']}: {e}", flush=True)
        return

    await db.quantum_hw_jobs.update_one({"_id": doc["_id"]}, {"$set": {"email_sent": True}})
    print(f"[qroute_notifier] sent {doc['status']} email to {email} for job {doc['_id']}", flush=True)


async def poll_and_notify_jobs() -> None:
    """APScheduler job (registered in main.py) — advances every in-flight
    QRoute job's status against its real provider and emails the submitter
    the moment a real-hardware job goes terminal, independent of whether
    anyone has that job's page open. See
    PLANS/qroute-email-notifications.md §3/§1 for why this exists."""
    db = get_db()
    if db is None:
        return

    in_flight_filter = {
        "status": {"$in": ["queued", "running"]},
        # Bounds the sweep to recent jobs only. Without this, a first deploy
        # would sweep every stale queued/running job ever created (job status
        # previously only advanced while a user had the detail page open) and
        # email submitters who closed their tab days/weeks ago, and a
        # permanently zombie job (one the provider no longer recognizes)
        # would get re-polled — and burn a provider API call — every cycle
        # forever, defeating the count_documents == 0 short-circuit below.
        "created_at": {"$gte": datetime.now(timezone.utc) - timedelta(days=2)},
    }
    in_flight_count = await db.quantum_hw_jobs.count_documents(in_flight_filter)
    if in_flight_count == 0:
        return

    cursor = db.quantum_hw_jobs.find(in_flight_filter)
    async for doc in cursor:
        try:
            doc = await _refresh_job_status(db, doc)
            await _maybe_notify(db, doc)
        except Exception as e:
            # One bad job (unknown provider, malformed doc, transient Mongo
            # error) must not abort the cursor — cursor order is stable, so
            # an uncaught exception here would permanently starve every job
            # positioned after it, on every future cycle too.
            print(f"[qroute_notifier] skipping job {doc.get('_id')}: {e}", flush=True)
