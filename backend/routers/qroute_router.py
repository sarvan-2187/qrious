import asyncio
import os
import time
from datetime import datetime, timedelta, timezone

import httpx
from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from database import get_db
from routers.video_overview_router import QSTUDIO_SERVICE_SECRET, QSTUDIO_SERVICE_URL
from services import qcompare_service
from services.qiskit_service import ensure_measurements
from services.qroute.resource_optimizer import DEFAULT_WEIGHTS, rank_devices
from services.quantum_providers import InsufficientCreditsError, PROVIDER_REGISTRY, get_adapter

router = APIRouter(prefix="/api/v1/qroute", tags=["QRoute — Multi-Provider Quantum Jobs"])

# Deliberately the SAME env var qbraid_router.py already reads, not a
# separate QROUTE_* knob. Both routers write into the same quantum_hw_jobs
# collection (see _serialize_job below) and this count query doesn't filter
# by provider, so reusing one var gives one shared daily cap across BOTH
# entry points for free — a user can't dodge the limit by switching which
# endpoint they call. See PLANS/qroute.md §3.4/§6 for the reasoning.
QROUTE_DAILY_JOB_LIMIT = int(os.getenv("QBRAID_DAILY_JOB_LIMIT", "5"))

# Same in-process, no-cross-instance-sharing cache tradeoff qbraid_router.py
# already accepts for its device list — kept per-provider here.
_device_cache: dict = {}
_DEVICE_CACHE_TTL_SECONDS = 600

# Listing devices must never outlast the edge proxy in front of this API.
# Cloudflare gives up at 100s with a 524, and that error page carries NO CORS
# headers, so the browser discards it and axios reports a bare "Network Error"
# — no status, no detail, nothing the UI can explain. That's what took QRoute
# down in production: cold SDK imports plus per-backend status calls across
# three providers (~18-27s locally, worse on a smaller/colder host) ran past
# the limit. This endpoint now always answers well inside that window.
_DEVICE_FETCH_BUDGET_SECONDS = 25

# One in-flight refresh per provider, so a page that polls (or several users at
# once) can't stack up duplicate IBM/qBraid fetches on top of each other.
_refresh_tasks: dict[str, asyncio.Task] = {}


def _refresh_devices(adapter) -> asyncio.Task:
    """Starts (or joins) a background refresh of one provider's device list.

    Deliberately NOT cancelled when the request that started it stops waiting:
    a slow provider keeps loading and populates the cache, so the next request
    gets it for free instead of timing out on the same cold start again."""
    task = _refresh_tasks.get(adapter.provider_id)
    if task is not None and not task.done():
        return task

    async def _run():
        try:
            # adapter.list_devices() is a blocking network call — offloaded
            # to a thread (like _refresh_job_status/_is_simulator_device
            # already are) so it doesn't stall the event loop, and every
            # provider refreshes concurrently rather than one after another.
            devices = await asyncio.to_thread(adapter.list_devices)
        except Exception as e:
            # One misbehaving provider shouldn't blank out every other
            # provider's devices in an aggregated list.
            print(f"[qroute_router] skipping devices for {adapter.provider_id}: {e}", flush=True)
            return
        _device_cache[adapter.provider_id] = {"data": devices, "fetched_at": time.monotonic()}

    task = asyncio.create_task(_run())
    _refresh_tasks[adapter.provider_id] = task
    return task


async def warm_device_cache():
    """Fills the cache once at startup (main.py's lifespan) so the first user to
    open QRoute doesn't pay for every provider's cold SDK import and network
    round trips inside their own request."""
    tasks = [_refresh_devices(a) for a in PROVIDER_REGISTRY.values() if a.is_configured()]
    if tasks:
        await asyncio.gather(*tasks)  # _run swallows its own errors
    print(f"[qroute_router] device cache warmed for {sorted(_device_cache)}", flush=True)


class QasmJobRequest(BaseModel):
    provider: str
    qasm: str
    device_id: str
    shots: int = 1024


def _serialize_job(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        # Old qbraid_router.py-only docs predate the `provider` field —
        # they were always qBraid, so that's the correct default, not an
        # unknown/error state.
        "provider": doc.get("provider", "qbraid"),
        "device_id": doc["device_id"],
        "shots": doc["shots"],
        "qasm": doc.get("qasm"),
        "status": doc["status"],
        "result": doc.get("result"),
        "cost": doc.get("cost"),
        "estimated_cost": doc.get("estimated_cost"),
        "error_message": doc.get("error_message"),
        "status_detail": doc.get("status_detail"),
        # Absent on jobs submitted before the resource optimizer shipped.
        "predicted_fidelity": doc.get("predicted_fidelity"),
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"],
    }


@router.get("/providers")
async def list_providers(current_user: dict = Depends(get_current_user)):
    return [
        {
            "id": adapter.provider_id,
            "display_name": adapter.display_name,
            "is_configured": adapter.is_configured(),
        }
        for adapter in PROVIDER_REGISTRY.values()
    ]


@router.get("/devices")
async def list_devices(provider: str | None = None, current_user: dict = Depends(get_current_user)):
    adapters = [a for a in ([get_adapter(provider)] if provider else PROVIDER_REGISTRY.values())
                if a.is_configured()]

    now = time.monotonic()
    pending = []
    for adapter in adapters:
        cached = _device_cache.get(adapter.provider_id)
        if cached is not None and (now - cached["fetched_at"]) < _DEVICE_CACHE_TTL_SECONDS:
            continue
        task = _refresh_devices(adapter)
        # Only worth blocking on providers we have nothing at all to show for.
        # A merely stale list serves immediately while it refreshes behind the
        # request — a 10-minute-old device roster beats an empty panel.
        if cached is None:
            pending.append(task)

    if pending:
        # asyncio.wait (not gather/wait_for) on purpose: it returns when the
        # budget runs out WITHOUT cancelling the stragglers, which is what
        # lets a slow provider finish into the cache for the next request.
        await asyncio.wait(pending, timeout=_DEVICE_FETCH_BUDGET_SECONDS)

    return [d for a in adapters for d in _device_cache.get(a.provider_id, {}).get("data", [])]


class RecommendRequest(BaseModel):
    qasm: str
    shots: int = 1024
    # Optional per-request override so the UI can offer "prioritise accuracy"
    # vs "prioritise speed" without a second endpoint.
    weights: dict[str, float] | None = None


def _serialize_recommendation(rec) -> dict:
    est = rec.estimate
    return {
        "device_key": est.device_key,
        "provider": est.provider,
        "device_id": est.device_id,
        "device_name": est.device_name,
        "score": rec.score,
        "rationale": rec.rationale,
        "factors": rec.factors,
        "fits": est.fits,
        "circuit_qubits": est.circuit_qubits,
        "transpiled_depth": est.transpiled_depth,
        "one_qubit_gates": est.one_qubit_gates,
        "two_qubit_gates": est.two_qubit_gates,
        "routing_overhead_2q": est.routing_overhead_2q,
        "expected_fidelity": est.expected_fidelity,
        "estimated_cost": est.estimated_cost,
        "cost_unit": est.cost_unit,
        "cost_basis": est.cost_basis,
        "pending_jobs": est.pending_jobs,
        "calibration_age_days": est.calibration_age_days,
        "confidence": est.confidence,
    }


def _predict_fidelity(qasm: str, provider: str, device_id: str) -> float | None:
    """The fidelity this circuit is predicted to achieve on this device.

    Recorded at submission so it can later be compared against qCompare's
    MEASURED divergence — that comparison is what turns the model from an
    assertion into something with a known error bar. Returns None rather than
    raising: a failed prediction must never block a student's submission."""
    try:
        ranked, _ = rank_devices(qasm, 1, [{"id": device_id, "name": device_id, "provider": provider}])
    except Exception:
        return None
    if not ranked or not ranked[0].estimate.fits:
        return None
    return ranked[0].estimate.expected_fidelity


def _calibration_points(jobs: list[dict], tvd_by_job: dict[str, float]):
    """Pairs each job's predicted fidelity with the fidelity actually measured.

    Measured fidelity is defined as 1 - TVD, where TVD is qCompare's total
    variation distance between the hardware counts and an ideal Aer simulation
    of the same circuit. Returns (points, metrics).

    `metrics` reports MAE, RMSE, bias and Pearson r — the set a paper would
    report, not just MAE. Each answers a different question: MAE is typical
    error size, RMSE punishes large misses, BIAS shows the model is
    systematically optimistic (it should be — the fidelity product is an upper
    bound), and Pearson r shows whether the model at least RANKS devices
    correctly even when its absolute values are off. Ranking correctly is what
    the optimizer actually needs.

    Deliberately no R^2: on a predicted-vs-measured comparison there are two
    different R^2s (about the parity line, and about a fitted line) and
    reporting an undefined one invites a fair challenge. RMSE plus r carries
    the same information unambiguously."""
    points = []
    for job in jobs:
        predicted = job.get("predicted_fidelity")
        tvd = tvd_by_job.get(str(job["_id"]))
        if predicted is None or tvd is None:
            continue
        points.append({
            "job_id": str(job["_id"]),
            "provider": job.get("provider", "qbraid"),
            "device_id": job["device_id"],
            "predicted_fidelity": predicted,
            "measured_fidelity": 1.0 - tvd,
            "created_at": job["created_at"],
        })

    if not points:
        return [], None

    n = len(points)
    errors = [p["predicted_fidelity"] - p["measured_fidelity"] for p in points]
    metrics = {
        "n": n,
        "mae": sum(abs(e) for e in errors) / n,
        "rmse": (sum(e * e for e in errors) / n) ** 0.5,
        # Positive bias = model optimistic, which is the expected direction.
        "bias": sum(errors) / n,
        "pearson_r": _pearson(
            [p["predicted_fidelity"] for p in points],
            [p["measured_fidelity"] for p in points],
        ),
    }
    return points, metrics


def _pearson(xs: list[float], ys: list[float]) -> float | None:
    """Pearson correlation, or None when it is undefined (fewer than 2 points,
    or no variance in either axis — e.g. every run on the same device)."""
    n = len(xs)
    if n < 2:
        return None
    mx, my = sum(xs) / n, sum(ys) / n
    dx = [x - mx for x in xs]
    dy = [y - my for y in ys]
    denom = (sum(v * v for v in dx) ** 0.5) * (sum(v * v for v in dy) ** 0.5)
    if denom == 0:
        return None
    return sum(a * b for a, b in zip(dx, dy)) / denom


@router.post("/recommend")
async def recommend_devices(
    request: RecommendRequest, current_user: dict = Depends(get_current_user)
):
    """Ranks every available backend for THIS circuit.

    Reuses list_devices() above rather than re-fetching, so it inherits the
    same cache, the same per-provider refresh de-duplication, and the same
    25s budget. Scoring itself is pure local transpilation — no provider calls
    — so this endpoint adds negligible time on top of the device listing."""
    devices = await list_devices(current_user=current_user)

    try:
        ranked, unrated = rank_devices(
            request.qasm, request.shots, devices, request.weights
        )
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Could not analyse this circuit's OpenQASM: {e}"
        )

    return {
        "ranked": [_serialize_recommendation(r) for r in ranked],
        "unrated": unrated,
        "weights": request.weights or DEFAULT_WEIGHTS,
    }


@router.post("/jobs")
async def submit_job(request: QasmJobRequest, current_user: dict = Depends(get_current_user)):
    try:
        adapter = get_adapter(request.provider)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))

    if not adapter.is_configured():
        raise HTTPException(status_code=500, detail=f"Provider '{request.provider}' is not configured.")

    db = get_db()
    user_id = current_user.get("_id") or current_user.get("firebase_uid")

    since = datetime.now(timezone.utc) - timedelta(hours=24)
    recent_count = await db.quantum_hw_jobs.count_documents({
        "user_id": user_id,
        "created_at": {"$gte": since},
    })
    if recent_count >= QROUTE_DAILY_JOB_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Daily real-hardware run limit reached ({QROUTE_DAILY_JOB_LIMIT}/day). Try again tomorrow.",
        )

    try:
        qasm = ensure_measurements(request.qasm)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse this circuit's OpenQASM: {e}")

    try:
        provider_job_id = adapter.submit_job(qasm, request.device_id, request.shots)
    except InsufficientCreditsError as e:
        raise HTTPException(status_code=402, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"{adapter.display_name} job submission failed: {str(e)}")

    now = datetime.now(timezone.utc)
    doc = {
        "user_id": user_id,
        "provider": request.provider,
        "device_id": request.device_id,
        "shots": request.shots,
        "qasm": qasm,  # normalized, i.e. exactly what the provider ran — qCompare
                       # reconstructs the circuit from this field.
        "qbraid_job_qrn": provider_job_id,  # field name kept from the qbraid-only schema —
        "status": "queued",                  # it's a generic "provider job id" slot now, and
        "result": None,                       # renaming it would be a migration for zero benefit.
        "cost": None,
        "estimated_cost": None,
        "error_message": None,
        "status_detail": None,
        "predicted_fidelity": _predict_fidelity(qasm, request.provider, request.device_id),
        "created_at": now,
        "updated_at": now,
    }
    result = await db.quantum_hw_jobs.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize_job(doc)


async def _refresh_job_status(db, doc: dict) -> dict:
    """Refreshes one job's live status from its provider if not already
    terminal, writes the update back to Mongo, and returns the (possibly
    mutated) doc. Shared by GET /jobs/{job_id}'s on-view refresh below and
    qroute_notifier.py's background poller (PLANS/
    qroute-email-notifications.md §3) — same logic, one place."""
    if doc["status"] in ("completed", "failed"):
        return doc
    try:
        adapter = get_adapter(doc.get("provider", "qbraid"))
        # Blocking provider SDK call — offloaded so it doesn't stall the
        # shared event loop (this runs once per in-flight job, every poll
        # cycle, on top of any concurrent request handling).
        live = await asyncio.to_thread(adapter.get_job_result, doc["qbraid_job_qrn"], doc["device_id"])
        update = {
            "status": live["status"],
            "result": live["counts"],
            "cost": live["cost"],
            "estimated_cost": live["estimated_cost"],
            "error_message": live.get("error_message"),
            "status_detail": live.get("status_detail"),
            "updated_at": datetime.now(timezone.utc),
        }
        await db.quantum_hw_jobs.update_one({"_id": doc["_id"]}, {"$set": update})
        doc.update(update)
    except Exception as e:
        print(f"[qroute_router] failed to refresh job {doc['_id']}: {e}", flush=True)
    return doc


@router.get("/jobs/{job_id}")
async def get_job(job_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    doc = await db.quantum_hw_jobs.find_one({"_id": ObjectId(job_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    user_id = current_user.get("_id") or current_user.get("firebase_uid")
    if doc["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="You can only view your own jobs")

    doc = await _refresh_job_status(db, doc)

    # Whichever path observes a job go terminal first "wins": this on-view
    # refresh, or qroute_notifier.py's background poller. _maybe_notify's
    # own guards (non-terminal skip, email_sent flag) make it safe/cheap to
    # call from both — so a job that finishes fast enough for an open tab's
    # poll to beat the poller still gets emailed. Local import breaks the
    # cycle: qroute_notifier already imports from this module at its own
    # load time (main.py loads both at startup, well before any request).
    from services.qroute_notifier import _maybe_notify
    await _maybe_notify(db, doc)

    return _serialize_job(doc)


@router.get("/jobs")
async def list_my_jobs(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = current_user.get("_id") or current_user.get("firebase_uid")
    cursor = db.quantum_hw_jobs.find({"user_id": user_id}).sort("created_at", -1)
    docs = await cursor.to_list(length=50)
    return [_serialize_job(d) for d in docs]


async def _is_simulator_device(provider: str, device_id: str) -> bool:
    """Reuses the same device-list cache list_devices() already populates.
    A device_id not found in the live/cached list is treated as
    not-confirmed-real, so qCompare refuses it rather than guessing."""
    adapter = get_adapter(provider)
    now = time.monotonic()
    cached = _device_cache.get(adapter.provider_id)
    if cached is None or (now - cached["fetched_at"]) >= _DEVICE_CACHE_TTL_SECONDS:
        # Blocking provider SDK call — offloaded so it doesn't stall the
        # shared event loop (see get_job_result above for the same reasoning).
        devices = await asyncio.to_thread(adapter.list_devices)
        _device_cache[adapter.provider_id] = {"data": devices, "fetched_at": now}
    else:
        devices = cached["data"]
    device = next((d for d in devices if d["id"] == device_id), None)
    return device is None or device["is_simulator"]


def _serialize_qcompare(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "job_id": doc["job_id"],
        "provider": doc["provider"],
        "device_id": doc["device_id"],
        "shots": doc["shots"],
        # Absent on reports generated before this shipped.
        "circuit_summary": doc.get("circuit_summary", ""),
        "ideal_counts": doc["ideal_counts"],
        "real_counts": doc["real_counts"],
        "total_variation_distance": doc["total_variation_distance"],
        "top_divergences": doc["top_divergences"],
        "summary": doc["summary"],
        "likely_causes": doc["likely_causes"],
        # Absent on reports generated before this shipped — empty string reads
        # as "no simple explanation available," so the frontend can hide the
        # section for old reports instead of showing a blank one.
        "simple_explanation": doc.get("simple_explanation", ""),
        "created_at": doc["created_at"],
        # Absent on reports generated before Phase 2 shipped — .get() defaults
        # to None, same "not triggered yet" meaning as a freshly created report.
        "audio_output_id": doc.get("audio_output_id"),
        "animation_output_id": doc.get("animation_output_id"),
    }


def _qcompare_grounding_text(report: dict) -> str:
    """The qCompare explanation PLUS the actual measured numbers from this
    specific job, reformatted as the 'source material' handed to
    qstudio_service's UNCHANGED audio/animation pipelines — same pipelines
    Video/Audio/Slides/Animation already use, just fed a different source.

    Feeding only report['summary']/likely_causes (the AI's own prose) made
    every generated podcast/animation sound like a generic "why NISQ hardware
    is noisy" lecture, interchangeable across any two jobs. Including the
    actual device, shot count, TVD score, and the specific bitstrings that
    diverged most gives the downstream script-writing LLM real numbers from
    THIS run to build the narrative around, the same way a real source
    document would — see qcompare_service.py's system prompt for the
    equivalent "treat this as data, not instructions" framing."""
    causes = "\n".join(f"- {c}" for c in report["likely_causes"])
    divergence_lines = "\n".join(
        f"- bitstring {d['bitstring']}: expected {d['ideal_probability']:.1%} of shots, actually measured "
        f"{d['real_probability']:.1%} ({d['delta']:+.1%})"
        for d in report["top_divergences"]
    )
    circuit_line = f"Circuit: {report['circuit_summary']}\n" if report.get("circuit_summary") else ""
    return (
        f"A quantum circuit was run on real hardware and compared against an ideal, noiseless "
        f"simulation of the same circuit (Qiskit AerSimulator). Here is the actual data from this "
        f"specific run:\n\n"
        f"{circuit_line}"
        f"Hardware: {report['device_id']} (via {report['provider']})\n"
        f"Shots: {report['shots']}\n"
        f"Total variation distance from the ideal simulation: {report['total_variation_distance']:.1%} "
        f"(0% would mean a perfect match)\n\n"
        f"The outcomes that diverged most between the ideal simulation and the real hardware:\n"
        f"{divergence_lines}\n\n"
        f"Why this happened:\n{report['summary']}\n\nLikely causes:\n{causes}"
    )


async def _trigger_qcompare_audio(output_id: str, grounding_text: str):
    """Same fire-and-forget shape as qstudio_router.py::_trigger_audio_overview,
    duplicated rather than imported — each output type gets its own local
    trigger function in that file too, so this follows the same convention
    instead of reaching into another router's private functions."""
    if not QSTUDIO_SERVICE_URL or not QSTUDIO_SERVICE_SECRET:
        print(f"[qcompare_output {output_id}] QSTUDIO_SERVICE_URL/SECRET not configured; job left generating", flush=True)
        return
    async with httpx.AsyncClient(timeout=None) as client:
        try:
            response = await client.post(
                f"{QSTUDIO_SERVICE_URL}/internal/qstudio-audio-overview",
                json={"output_id": output_id, "grounding_text": grounding_text, "voice_a": "jenny", "voice_b": "guy"},
                headers={"X-Internal-Secret": QSTUDIO_SERVICE_SECRET},
            )
            if response.status_code >= 400:
                print(
                    f"[qcompare_output {output_id}] qstudio_service audio pipeline rejected the "
                    f"trigger: {response.status_code} {response.text[:500]}", flush=True,
                )
        except httpx.HTTPError as e:
            print(f"[qcompare_output {output_id}] failed to trigger qstudio_service audio pipeline: {e}", flush=True)


async def _trigger_qcompare_animation(output_id: str, grounding_text: str, theme: str = "minimal_dark"):
    """Same shape as _trigger_qcompare_audio — see qstudio_router.py::_trigger_animation_overview."""
    if not QSTUDIO_SERVICE_URL or not QSTUDIO_SERVICE_SECRET:
        print(f"[qcompare_output {output_id}] QSTUDIO_SERVICE_URL/SECRET not configured; job left generating", flush=True)
        return
    async with httpx.AsyncClient(timeout=None) as client:
        try:
            response = await client.post(
                f"{QSTUDIO_SERVICE_URL}/internal/qstudio-animation",
                json={"output_id": output_id, "grounding_text": grounding_text, "voice": "female", "theme": theme},
                headers={"X-Internal-Secret": QSTUDIO_SERVICE_SECRET},
            )
            if response.status_code >= 400:
                print(
                    f"[qcompare_output {output_id}] qstudio_service animation pipeline rejected the "
                    f"trigger: {response.status_code} {response.text[:500]}", flush=True,
                )
        except httpx.HTTPError as e:
            print(f"[qcompare_output {output_id}] failed to trigger qstudio_service animation pipeline: {e}", flush=True)


async def _get_owned_qcompare_report(db, job_id: str, user_id) -> dict:
    """Returns the report doc after verifying the job belongs to user_id
    (quantum_hw_jobs.user_id — the same field/value compare_job/get_compare
    already check, NOT the firebase_uid used for qstudio_outputs.owner_uid)
    and that a Phase 1 report already exists. Both trigger endpoints below
    need the same two lookups, so this is shared instead of duplicated."""
    if not ObjectId.is_valid(job_id):
        raise HTTPException(status_code=404, detail="Job not found")
    job_doc = await db.quantum_hw_jobs.find_one({"_id": ObjectId(job_id)})
    if not job_doc:
        raise HTTPException(status_code=404, detail="Job not found")
    if job_doc["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="You can only act on your own jobs")

    report = await db.qcompare_reports.find_one({"job_id": job_id})
    if not report:
        raise HTTPException(
            status_code=400,
            detail="Generate the qCompare explanation first (POST /compare) before turning it into audio or animation.",
        )
    return report


@router.post("/jobs/{job_id}/compare")
async def compare_job(job_id: str, current_user: dict = Depends(get_current_user)):
    """qCompare — Phase 1: synchronous, no BackgroundTasks. A local
    AerSimulator run plus one AI Gateway call is fast enough to run inline,
    same tier as Mind Map/Flashcards/Briefing in qstudio_router.py, not the
    BackgroundTasks-polled tier Video/Audio/Slides/Animation use."""
    db = get_db()
    doc = await db.quantum_hw_jobs.find_one({"_id": ObjectId(job_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    if doc["user_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="You can only compare your own jobs")
    if doc["status"] != "completed" or not doc.get("result"):
        raise HTTPException(status_code=400, detail="Job must be completed with results before it can be compared")
    if not doc.get("qasm"):
        raise HTTPException(status_code=400, detail="This job has no recorded circuit — qCompare isn't available for it")

    provider = doc.get("provider", "qbraid")
    device_id = doc["device_id"]
    if await _is_simulator_device(provider, device_id):
        raise HTTPException(
            status_code=400,
            detail="qCompare only applies to real hardware runs — this device is a simulator/mock endpoint.",
        )

    try:
        qc = qcompare_service.reconstruct_circuit(doc["qasm"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not reconstruct this job's circuit: {e}")

    shots = doc["shots"]
    ideal_counts = qcompare_service.run_ideal(qc, shots)
    real_counts = doc["result"]
    tvd, top_divergences = qcompare_service.compute_divergence(ideal_counts, real_counts)
    circuit_summary = qcompare_service.summarize_circuit(qc)

    explanation = await qcompare_service.generate_explanation(
        circuit_summary, device_id, shots, tvd, top_divergences, uid=current_user["firebase_uid"],
    )

    now = datetime.now(timezone.utc)
    report_doc = {
        "job_id": job_id,
        "provider": provider,
        "device_id": device_id,
        "shots": shots,
        "circuit_summary": circuit_summary,
        "ideal_counts": ideal_counts,
        "real_counts": real_counts,
        "total_variation_distance": tvd,
        "top_divergences": [d.model_dump() for d in top_divergences],
        "summary": explanation.summary,
        "likely_causes": explanation.likely_causes,
        "simple_explanation": explanation.simple_explanation,
        "created_at": now,
    }
    # Regenerating replaces the previous report outright rather than
    # accumulating one row per click — there's only ever one current
    # explanation per job.
    await db.qcompare_reports.delete_many({"job_id": job_id})
    insert_result = await db.qcompare_reports.insert_one(report_doc)
    report_doc["_id"] = insert_result.inserted_id
    return _serialize_qcompare(report_doc)


@router.get("/jobs/{job_id}/compare")
async def get_compare(job_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    job_doc = await db.quantum_hw_jobs.find_one({"_id": ObjectId(job_id)})
    if not job_doc:
        raise HTTPException(status_code=404, detail="Job not found")
    if job_doc["user_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="You can only view your own jobs")

    report = await db.qcompare_reports.find_one({"job_id": job_id})
    if not report:
        raise HTTPException(status_code=404, detail="No qCompare report yet for this job")
    return _serialize_qcompare(report)


async def _create_qcompare_narration_output(db, job_id: str, uid: str, output_type: str) -> str:
    """Creates the qstudio_outputs doc the trigger functions above write status/
    result back into — same shape create_output builds, minus study_space_id
    (qCompare narrations aren't scoped to any study space) plus qcompare_job_id
    for traceability. Existing GET /outputs/{id}, /audio-url, /animation-url all
    already only check owner_uid (see _get_owned_output), so this reuses that
    entire pipeline unmodified."""
    now = datetime.now(timezone.utc)
    doc = {
        "study_space_id": None,
        "owner_uid": uid,
        "type": output_type,
        "params": {},
        "status": "generating",
        "error": None,
        "result": {},
        "created_at": now,
        "updated_at": now,
        "qcompare_job_id": job_id,
    }
    result = await db.qstudio_outputs.insert_one(doc)
    return str(result.inserted_id)


@router.post("/jobs/{job_id}/compare/audio")
async def compare_to_audio(job_id: str, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Phase 2 — turns the Phase 1 explanation into a two-host podcast, by
    calling qstudio_service's Audio Overview pipeline completely unchanged
    (see qstudio_service/pipeline_audio.py::run_audio_pipeline), just fed the
    qCompare explanation as grounding text instead of study-space sources."""
    db = get_db()
    report = await _get_owned_qcompare_report(db, job_id, current_user["_id"])

    output_id = await _create_qcompare_narration_output(db, job_id, current_user["firebase_uid"], "audio")
    background_tasks.add_task(_trigger_qcompare_audio, output_id, _qcompare_grounding_text(report))

    await db.qcompare_reports.update_one({"job_id": job_id}, {"$set": {"audio_output_id": output_id}})
    report["audio_output_id"] = output_id
    return _serialize_qcompare(report)


class QCompareAnimationRequest(BaseModel):
    # Same three theme names Slides/Video Overview already use — see
    # manim_scenes.py's THEME_PALETTES.
    theme: str = "minimal_dark"


@router.post("/jobs/{job_id}/compare/animation")
async def compare_to_animation(
    job_id: str,
    background_tasks: BackgroundTasks,
    payload: QCompareAnimationRequest = QCompareAnimationRequest(),
    current_user: dict = Depends(get_current_user),
):
    """Phase 2 — turns the Phase 1 explanation into a narrated Manim animation,
    by calling qstudio_service's Animation pipeline completely unchanged (see
    qstudio_service/pipeline_manim.py::run_animation_pipeline)."""
    db = get_db()
    report = await _get_owned_qcompare_report(db, job_id, current_user["_id"])

    output_id = await _create_qcompare_narration_output(db, job_id, current_user["firebase_uid"], "animation")
    background_tasks.add_task(_trigger_qcompare_animation, output_id, _qcompare_grounding_text(report), payload.theme)

    await db.qcompare_reports.update_one({"job_id": job_id}, {"$set": {"animation_output_id": output_id}})
    report["animation_output_id"] = output_id
    return _serialize_qcompare(report)

@router.get("/calibration")
async def get_calibration(current_user: dict = Depends(get_current_user)):
    """Predicted vs measured fidelity across this user's completed jobs."""
    db = get_db()
    user_id = current_user.get("_id") or current_user.get("firebase_uid")
    jobs = await db.quantum_hw_jobs.find(
        {"user_id": user_id, "predicted_fidelity": {"$ne": None}}
    ).sort("created_at", -1).to_list(length=200)
    job_ids = [str(job["_id"]) for job in jobs]
    reports = await db.qcompare_reports.find({"job_id": {"$in": job_ids}}).to_list(length=200)
    tvd_by_job = {
        report["job_id"]: report["total_variation_distance"]
        for report in reports
    }
    points, metrics = _calibration_points(jobs, tvd_by_job)
    return {"points": points, "metrics": metrics}
