# QRoute — Multi-Provider Quantum Job Composer (Implementation Plan v1)

**Scope:** generalize the existing single-vendor qBraid integration (`backend/services/qbraid_service.py`, `backend/routers/qbraid_router.py`, the Gates Playground "Run on real hardware" panel) into **QRoute**: a provider-agnostic composer where a student builds a circuit once and submits it to any of five backends — **qBraid** (already wired), **IBM Quantum Cloud**, **Qniverse (QSDK)**, **IQM Resonance**, and **IonQ** — picked from a device list grouped by physical qubit modality (superconducting / trapped-ion / photonic / etc.), not just by vendor name.

**Status of prior scaffolding:** qBraid is the only provider live today (`git status` shows it mid-refactor on `main`). Its shape — a stateless `*_service.py` wrapping the vendor SDK, a thin `*_router.py` doing auth/rate-limit/Mongo bookkeeping, a `use*Api.ts` hook, and a panel embedded in `GatesPlaygroundPage.tsx` — is the pattern this plan extends to four more vendors, not a pattern this plan replaces. Nothing in `PLANS/` currently covers this; this is a new plan from zero for the other four adapters plus the unifying QRoute layer.

**This document is a plan for review, not a locked spec.** Section 6 lists the decisions that need your sign-off before implementation starts.

**Implementation status (updated after building against real credentials):**
| Provider | Status | Notes |
|---|---|---|
| qBraid | ✅ Live (pre-existing) | Wrapped in `qbraid_adapter.py`, unchanged underlying code. |
| IonQ | ✅ Live, verified against your real account | `ionq_adapter.py` built and tested — `ionq_simulator` + `ionq_qpu` both list correctly. |
| IBM Quantum Cloud | ✅ Live, verified against your real account | `ibm_adapter.py` built and tested — 3 real 156-qubit backends (`ibm_fez`, `ibm_marrakesh`, `ibm_kingston`) list correctly. |
| IQM Resonance | 🚫 Blocked, path chosen | `qiskit-iqm` hard-pins `qiskit<1.3`, directly conflicting with `qiskit-ibm-runtime` (`>=2.3.0`) and `qiskit-ionq` (`>=2.0.0`) already installed. Confirmed by trying it — it silently downgraded `qiskit` and broke both other adapters. The successor package `iqm-client[qiskit]` supports Qiskit 2.x but wants `~2.1.2` (still short of IBM's `>=2.3.0` floor) and drags in an unrelated, heavy dependency tree (`pandas`, `xarray`, `scipy-stubs`, `opentelemetry`, `iqm-pulse`, `iqm-station-control-client` — an internal instrument-control SDK, not a lightweight cloud-job client). **Decision: isolate it in its own Dockerized microservice**, mirroring `video_service`/`notebook_service` — full plan in [PLANS/iqm-service.md](./iqm-service.md), not built yet. |
| Qniverse (QSDK) | 🚫 Blocked | The public docs describe `pip install qniverse` — that package **does not exist on PyPI** (confirmed by trying it, and by trying `qsdk`, `qniverse-sdk`, `cdac-qsdk`). Everything else known about QSDK's API came from an automated doc-page fetch, which is not reliable enough to build against blind — see §2.5. Needs manual verification from inside your Qniverse account. |

For real-submission testing (not just device listing), note that **no job was actually submitted to any paid/shared real-hardware queue during this build** — listing devices is read-only and safe, but `submit_job` consumes real quota/shots on shared hardware, so that step needs your explicit go-ahead per provider before it's exercised end-to-end.

---

## 0. The modality question, answered directly

You asked which platform uses which underlying qubit technology — this matters because it's the actual axis QRoute's device picker should group by, not just "which company." Here's the real landscape for the five providers in scope:

| Provider | Underlying qubit tech | What it actually is | Notes |
|---|---|---|---|
| **IBM Quantum Cloud** | **Superconducting** (transmon qubits, Eagle/Heron-generation chips) | A direct hardware vendor | Access via `qiskit-ibm-runtime`; needs an IBM Cloud API key + an "instance" CRN (Cloud Resource Name), not just an API key. |
| **IQM Resonance** | **Superconducting** (transmon qubits, multiple chip topologies) | A direct hardware vendor | Access via `qiskit-on-iqm` (`IQMProvider`), pointed at `https://resonance.meetiqm.com/` with an API token from the Resonance dashboard. |
| **IonQ** | **Trapped-ion** (individually-trapped ytterbium ions, laser-manipulated) | A direct hardware vendor | Access via `qiskit-ionq` or IonQ's own REST API (`api.ionq.co`) with an `IONQ_API_KEY`. Notably, qBraid's *existing* curated device list already includes `openquantum:ionq:qpu:forte-1` — i.e. IonQ hardware is already reachable today, just proxied through qBraid rather than IonQ's own API. |
| **qBraid** | **N/A — it's an aggregator**, not a chip | A multi-vendor cloud broker | Already integrated. Routes to IonQ (trapped-ion), Rigetti (superconducting), OQC, and others under one API key/billing account. |
| **Qniverse (QSDK)** | **N/A — also an aggregator.** CDAC Bangalore's own platform description says it fronts **superconducting, trapped-ion, and photonic** backends (plus HPC-accelerated simulators) behind one hardware-agnostic SDK. | A second multi-vendor cloud broker, India-specific | This is the one genuinely new piece of information from research: Qniverse is architecturally *the same kind of thing QRoute itself is* — an aggregator over multiple chip types — not a single quantum computer. |

**Where does NMR fit?** You mentioned it as a category, correctly — NMR (nuclear magnetic resonance) was one of the earliest experimental qubit platforms (it ran a working 7-qubit Shor's-algorithm demo in 2001). But it doesn't scale past a handful of qubits because signal strength collapses exponentially with qubit count, and as a result **no vendor in this plan, or in commercial cloud quantum computing generally, offers NMR hardware over an API today.** It's included in the table below for a complete mental model, not because an adapter is planned for it.

Full modality reference (for the device-picker grouping UI in §5):

| Modality | How it works (one line) | Commercial cloud examples |
|---|---|---|
| Superconducting | Josephson-junction circuits cooled to ~15mK, gates via microwave pulses | IBM, IQM, Rigetti, OQC |
| Trapped-ion | Individual ions held in EM fields, gates via laser pulses | IonQ, Quantinuum |
| Photonic | Qubits encoded in light (path/polarization/squeezed states) | No public cloud job submission currently — Xanadu Quantum Cloud has been shut down; PsiQuantum publishes **PSIQDK** (`github.com/PsiQ/psiqdk`), but it's a local simulation + fault-tolerant resource-estimation toolkit for their not-yet-launched hardware (targeting ~2027), not a job-submission API. Photonic is listed here for the mental model only — no adapter is planned. |
| Neutral atom | Atoms held in optical tweezer arrays, gates via Rydberg excitation | **QuEra** (SDK: Bloqade) — real hardware (Aquila, Gemini-class) is reached **through Amazon Braket**, not a standalone QuEra API, so it'd need an AWS Braket adapter, not a QuEra-specific one. **Pasqal** — unlike QuEra, has its *own* direct cloud API: `pasqal-cloud` Python package, Auth0-based token auth, real QPU + emulator device selection, job polling — architecturally a real sixth-provider candidate, closer in shape to IonQ/IQM than to the Braket-mediated QuEra case. Neither is in this plan's five-provider scope, but Pasqal specifically is flagged here as the most plausible next addition if neutral-atom support is wanted later. |
| NMR | Nuclear spins in a molecule, manipulated via RF pulses | Research-only; no cloud API exists |

Two aggregators (qBraid, Qniverse) span multiple rows of this table themselves — the device picker needs a `modality` field surfaced *per device*, not per provider, since a single qBraid or Qniverse account can expose both a superconducting and a trapped-ion device.

**Honest caveat worth stating up front:** because qBraid and Qniverse are themselves aggregators, part of what QRoute is being asked to build — "pick a device, submit, poll status, normalize errors, across vendors" — is a capability those two platforms already sell. The reason to build QRoute anyway is (a) direct IBM/IQM/IonQ integration gets you primitives, pricing, and device types those aggregators may not expose (e.g. IBM's `EstimatorV2`, IQM's native gate set), (b) it removes a billing middleman for two of the five providers, and (c) it's the product you asked for — a single in-app composer, not five separate account dashboards. Worth knowing going in, not a reason not to build it.

---

## 1. Architecture: adapter pattern behind one router

Today, each vendor gets its own fully-duplicated stack (`qbraid_service.py` + `qbraid_router.py` + `useQbraidApi.ts`, mounted at `/api/v1/qbraid/*`). Repeating that 4 more times means 5 near-identical routers, 5 near-identical Mongo query shapes, and 5 frontend hooks the composer UI has to juggle. Instead:

```
backend/services/quantum_providers/
├── __init__.py          # PROVIDER_REGISTRY: dict[str, QuantumProviderAdapter]
├── base.py               # QuantumProviderAdapter ABC
├── qbraid_adapter.py      # thin wrapper around the EXISTING qbraid_service.py (unchanged)
├── ibm_adapter.py         # new: qiskit-ibm-runtime
├── ionq_adapter.py        # new: qiskit-ionq
├── iqm_adapter.py         # new: qiskit-on-iqm
└── qniverse_adapter.py    # new: QSDK

backend/routers/qroute_router.py   # ONE router, mounted at /api/v1/qroute
```

**`base.py`** — the contract every adapter implements, deliberately matching the three methods `qbraid_service.py` already has (so the qBraid wrapper is close to a no-op):

```python
class QuantumProviderAdapter(ABC):
    provider_id: str        # "ibm" | "ionq" | "iqm" | "qniverse" | "qbraid"
    display_name: str
    modality: Literal["superconducting", "trapped-ion", "photonic", "aggregator"]

    def is_configured(self) -> bool: ...          # required env var(s) present?
    def list_devices(self) -> list[DeviceInfo]: ...  # each DeviceInfo carries its OWN modality
                                                       # (aggregators return mixed modalities)
    def submit_job(self, qasm: str, device_id: str, shots: int) -> str: ...  # returns provider job id
    def get_job_result(self, provider_job_id: str, device_id: str) -> JobResult: ...
```

*(Updated from the original design during implementation: `get_job_result` gained a `device_id` param. IonQ's and IBM's SDKs both reconstruct a job through its backend object, not from a bare job id — `IonQJob` specifically can't be built without one. qBraid's adapter ignores the extra param; router already has `device_id` on the Mongo doc either way, so it's a free pass-through, not new state.)*

`DeviceInfo` and `JobResult` are small dataclasses/TypedDicts shared across all adapters — this is what lets the frontend render one unified device table and one unified job-status shape instead of five slightly different JSON contracts. `_STATUS_MAP`-style normalization (qBraid's `INITIALIZING/QUEUED/VALIDATING → queued` collapsing) moves into each adapter, same idea as today, just one per vendor instead of one, full stop.

**Why one router instead of five:** `qroute_router.py` owns exactly the cross-cutting concerns that are currently duplicated per-vendor anyway — auth (`Depends(get_current_user)`), the daily job-limit check, and Mongo bookkeeping — and simply dispatches to `PROVIDER_REGISTRY[provider_id]` for the vendor-specific part:

```
GET  /api/v1/qroute/providers          -> [{id, display_name, modality, is_configured}]
GET  /api/v1/qroute/devices            -> aggregated device list across all *configured* providers
                                              (query param ?provider=ibm to scope to one)
POST /api/v1/qroute/jobs               -> {provider, device_id, qasm, shots} -> unified job doc
GET  /api/v1/qroute/jobs/{id}
GET  /api/v1/qroute/jobs               -> this user's jobs across ALL providers, newest first
```

The existing `/api/v1/qbraid/*` routes can stay mounted as-is (nothing forces a breaking change on `GatesPlaygroundPage.tsx` today) — `qroute_router.py` is additive. Whether to later delete the standalone qBraid router in favor of routing qBraid exclusively through QRoute is a §9 decision, not something to force now.

---

## 2. Per-provider adapter details

### 2.1 `qbraid_adapter.py` (wraps existing code, ~15 lines)
No new SDK work — `qbraid_service.py` (`backend/services/qbraid_service.py:48`) already implements `list_devices`/`submit_job`/`get_job_result` against the real qBraid account. The adapter just adapts its return shape to `DeviceInfo`/`JobResult` and tags each curated device's `modality` (`ionq:ionq:sim:simulator` → trapped-ion-sim, `rigetti:rigetti:qpu:cepheus-1-108q` → superconducting, etc — the mapping already implicitly exists in `_CURATED_DEVICE_IDS`'s comments today).

### 2.2 `ibm_adapter.py` — IBM Quantum Cloud ✅ built and verified
- **SDK:** `qiskit-ibm-runtime` (installed `0.48.0`).
- **Auth:** `QIBM_API_KEY` + `QIBM_INSTANCE_CRN`, passed as `QiskitRuntimeService(channel="ibm_cloud", token=..., instance=...)` per-request (not `save_account()` to disk — this is a shared server process, not a personal notebook). **Confirmed working against your real IBM Cloud instance.**
- **Device listing:** `service.backends()` → live-verified result: `ibm_fez`, `ibm_marrakesh`, `ibm_kingston`, all real 156-qubit superconducting QPUs, all reporting operational.
- **Submit:** QASM → `QuantumCircuit` via `qiskit.qasm2.loads`, transpiled with `generate_preset_pass_manager(backend=backend, optimization_level=1).run(circuit)`, run through `SamplerV2(mode=backend).run([isa_circuit], shots=shots)` (counts-based, not `EstimatorV2`).
- **Result:** `job.result()[0].data` is a `DataBin` exposing one field per classical register — the adapter grabs the first via `next(iter(pub_result.data.items()))` rather than hardcoding a register name like `"meas"`, since that name depends on how the source QASM declared its `creg`.
- **Not yet exercised:** actual `submit_job` against real hardware (would consume real queue time/quota) — only `list_devices` has been live-tested so far.

### 2.3 `iqm_adapter.py` — IQM Resonance 🚫 blocked, deferred
- **What was tried:** `qiskit-iqm` (the SDK named in the original research pass) installed cleanly but hard-pins `qiskit<1.3` — installing it silently downgraded this venv's `qiskit` from 2.3.0 to 1.2.4, which broke the already-working `ibm_adapter.py`/`ionq_adapter.py` (both need `qiskit>=2.0`). Caught immediately, uninstalled, venv restored (also had to bump `qiskit-aer` 0.15.1→0.17.2 in the process, since 0.15.1 doesn't import cleanly against `qiskit` 2.3).
- **The successor package**, `iqm-client[qiskit]` (latest `35.0.0`), does target Qiskit 2.x, but: (a) its resolved `qiskit==2.1.2` still doesn't satisfy `qiskit-ibm-runtime`'s `>=2.3.0` floor — no single `qiskit` version currently satisfies IBM + IQM + IonQ together — and (b) a dry-run install showed it pulling in `pandas`, `xarray`, `scipy-stubs`, `opentelemetry-exporter-otlp*`, `iqm-pulse`, `iqm-station-control-client` — this is IQM's internal pulse-level instrument-control SDK repackaged, not a lightweight cloud-job client, and is exactly the class of dependency-weight risk `requirements.txt` already documents a real incident for (§3.3).
- **Two real paths forward, neither attempted yet:**
  1. **Raw REST against IQM Resonance directly** (`requests`, already a dependency), hand-building the QASM → IQM-native-gate-set transpile step that `qiskit-iqm` would otherwise do via Qiskit's transpiler. More work, avoids all dependency conflicts.
  2. **Isolate in its own microservice/venv**, mirroring how `video_service` in this repo is already split out from `backend/` specifically to avoid this class of dependency conflict — `qroute_router.py` would call it over HTTP like a sixth "provider," rather than importing `qiskit-iqm` into the shared backend process.
- Your call in §6 on which path (or whether to just leave IQM out of QRoute for now).

### 2.4 `ionq_adapter.py` — IonQ ✅ built and verified
- **SDK:** `qiskit-ionq` (installed `1.1.1`).
- **Auth:** single `IONQ_API_KEY` — simplest of all five providers. **Confirmed working against your real IonQ account.**
- **Device listing:** live-verified result: `ionq_simulator` (available), `ionq_qpu` (currently reporting `UNAVAILABLE` — a live queue/maintenance state, not a credentials problem).
- **Submit/result:** QASM → `QuantumCircuit` via `qiskit.qasm2.loads`, `backend.run(circuit, shots=shots)`. Job retrieval needed a real design decision: `IonQJob` can only be reconstructed **through its backend** (`backend.retrieve_job(job_id)`), not from a bare job id — so `QuantumProviderAdapter.get_job_result` was generalized to take `(provider_job_id, device_id)` instead of just the job id (see §1's `base.py` contract, updated below). qBraid's adapter ignores the extra `device_id` param; IonQ and IBM both need it.
- **Not yet exercised:** actual `submit_job` against real hardware.

### 2.5 `qniverse_adapter.py` — Qniverse (QSDK) 🚫 blocked
- **What was tried:** the spike this section originally called for. An automated fetch of the public QSDK docs (`qniverse.in/docs-category/qsdk/...`) described a plausible-looking API — `pip install qniverse`, `from Qniverse.backend import Backend`, `run(qc, backend, shots, token=token)` — but **`pip install qniverse` fails: no such package on PyPI**, and neither do `qsdk`, `qniverse-sdk`, or `cdac-qsdk`.
- **Why this matters beyond "wrong package name":** the doc-fetch tool summarizes pages through a smaller model, and this is now a *confirmed* case of it stating a specific, checkable technical detail (a pip-installable package name) that turned out to be false. That means the rest of what it reported — import paths, `Backend()`/`run()` signatures, the claim that `Backend.get_simulator(...)` only ever returns classical/HPC simulator names (`qasm_simulator`, `aer_simulator_statevector`, `cirq_simulator`) and never a real-hardware device — **is unverified, not confirmed-wrong, but also not safe to build against blindly.** Writing `qniverse_adapter.py` from these details risks code that looks complete but silently fails, or worse, misrepresents whether Qniverse actually offers real-hardware submission at all versus being simulator-only behind this particular SDK.
- **What's actually needed:** log into your Qniverse account dashboard directly (not the crawlable public docs) and get either (a) the real install source for the SDK — private package index, or a direct `.whl`/`.tar.gz` download — or (b) their raw REST API base URL and endpoint docs, so an adapter can be built against `requests` directly instead of a phantom SDK. Flagged in §6.

---

## 3. Backend changes

### 3.1 New/changed files
- `backend/services/quantum_providers/{__init__,base,qbraid_adapter,ibm_adapter,ionq_adapter,iqm_adapter,qniverse_adapter}.py` — new.
- `backend/routers/qroute_router.py` — new, mounted in `main.py` next to the existing router list (`backend/main.py:113`, `:138`).
- `backend/services/qbraid_service.py` — **unchanged**. It stays the vendor-specific implementation the adapter wraps; no reason to touch working, already-verified-against-real-hardware code.

### 3.2 Mongo collection strategy
`qbraid_router.py` writes to `quantum_hw_jobs` with no `provider` field (it's implicitly always qBraid today). Two real options:

- **(a) Extend in place:** add a `provider: str` field to new docs, default missing `provider` to `"qbraid"` when reading old docs (`doc.get("provider", "qbraid")`), no migration script needed. Cheapest, and consistent with how this codebase already handles schema drift elsewhere (`doc.get(...)` with defaults appears throughout `qbraid_router.py` itself, e.g. `doc.get("result")`).
- **(b) New collection** (`qroute_jobs`) written only by the new router, leaving `quantum_hw_jobs` frozen as qBraid-only history. Cleaner separation, but now "all of a user's real-hardware job history" is split across two collections/UIs.

**Recommendation: (a)** — matches this codebase's existing lightweight-migration style and keeps one job-history view. Needs your confirmation in §9.

### 3.3 `requirements.txt` — a real constraint, not a footnote
`backend/requirements.txt:1-10` documents a **build-OOM incident on FastAPI Cloud** caused by an unpinned heavy transitive dependency (`torch`/CUDA via `sentence-transformers`), and the `qbraid` line already has an explicit "base package ONLY, no extras" warning for exactly this reason.

**Done:** `qiskit-ionq` and `qiskit-ibm-runtime` are now in `requirements.txt`, each installed and verified individually in the dev venv against real credentials (§2.2, §2.4) — both lean on the `qiskit`/`qiskit-aer` already present rather than pulling in unrelated ML frameworks. Verification was against this existing venv, not a from-clean FastAPI Cloud build — recommend an actual deploy/build check before this ships, same caution the original `qbraid` OOM incident argues for.

**Not done, deliberately:** `qiskit-iqm` / `iqm-client[qiskit]` — see §2.3. Trying it live confirmed the exact risk this section warned about in the abstract: it silently downgraded `qiskit` and would have pulled in `pandas`/`xarray`/`opentelemetry`/`iqm-pulse` had the version conflict not blocked the install outright. Left out of `requirements.txt` with a comment explaining why, so a future "let's just add IQM" doesn't re-trigger the same problem blind.

### 3.4 Rate limiting and safety
`qbraid_router.py:15` has one global `QBRAID_DAILY_JOB_LIMIT` env var. With five providers, decide (§9) between:
- One shared daily cap across all providers combined (simplest; prevents a student burning through free-tier credits/quotas on all five at once).
- Per-provider caps (fairer if e.g. IonQ's free simulator tier is much larger than IBM's).
Recommend the shared cap to start — it's one line of code (`count_documents({"user_id": ..., "created_at": {"$gte": since}})` with no `provider` filter, which is what already exists) and can be split later if real usage data shows a need.

### 3.5 Error normalization
Each vendor fails differently under the same real-world condition ("no funded credits for real hardware") — qBraid raises a `402`-bearing exception today (`qbraid_service.py:91`), IBM Cloud Runtime returns its own error payload shape, IonQ/IQM likely differ again. Each adapter's `submit_job` should catch its vendor's specific "no credits/no access" signal and re-raise a shared `InsufficientCreditsError` (or similar) that `qroute_router.py` catches **once**, centrally, and turns into the same clear user-facing `402` message qBraid already returns — rather than duplicating that try/except shape five times.

---

## 4. Frontend: the QRoute Composer

### 4.1 Where it lives
New module: `frontend/src/modules/qroute/` (sibling to `gates-playground/`, `qbook/`, following the existing `modules/<feature>/{components,hooks,pages}` convention). The circuit-building surface itself (`CircuitCanvas`, `GateTray`, QASM export) **is not duplicated** — it's already reusable from `gates-playground/components` and `gates-playground/utils/qasmParser`; QRoute imports it rather than re-implementing a second circuit editor. What's new is everything past "I have a QASM string," which today only exists for qBraid inside `GatesPlaygroundPage.tsx:38-45` (`showHwPanel`, `hwDevices`, `hwState`, the polling `useRef`, etc).

### 4.2 New hook: `useQRouteApi.ts`
Same shape as `useQbraidApi.ts` today, generalized:
```ts
listProviders(): Promise<Provider[]>            // GET /api/v1/qroute/providers
listDevices(provider?: string): Promise<Device[]>  // GET /api/v1/qroute/devices
submitJob(provider, deviceId, qasm, shots): Promise<Job>
getJobStatus(jobId): Promise<Job>
listJobs(): Promise<Job[]>
```
`Device` and `Job` types carry the same fields `QbraidDevice`/`QbraidJob` have today (`frontend/src/modules/gates-playground/hooks/useQbraidApi.ts:4-24`) plus `provider: string` and `modality: string`.

### 4.3 Composer UI shape
1. **Provider/device picker**, grouped visually by modality first, provider second (answers your "which platform uses which kind of thing" ask directly in the UI, not just in this doc) — e.g.:
   ```
   ⚛ Superconducting
      IBM  · ibm_torino          [configured]
      IQM  · garnet               [configured]
      qBraid · rigetti:cepheus-1  [needs credits]
   ⚛ Trapped-ion
      IonQ · ionq_qpu             [configured]
      qBraid · ionq:simulator     [free]
   ⚛ Aggregator (mixed hardware)
      Qniverse · ...
   ```
   Providers missing their env-var credentials render greyed-out with "not configured" rather than being omitted, so the UI doubles as a live status page for which of the five you've actually wired up.
2. **Shots input + submit** — unchanged UX from today's HW panel.
3. **Unified job history table** — replaces the single-provider polling panel (`GatesPlaygroundPage.tsx` `hwPollTimerRef`/`HW_POLL_INTERVAL_MS`) with one that shows provider + modality per row, reusing the same 3s-poll-until-terminal-status pattern already proven out for qBraid.
4. **Entry point:** either (a) a new top-level page/route (`/qroute`) linked from wherever Gates Playground is linked today, or (b) replace the existing "Run on real hardware" button inside `GatesPlaygroundPage.tsx` so there's one composer, not two competing entry points once qBraid is folded into it. §9 decision.

---

## 5. Build order — actual progress

1. ✅ **Scaffolded the adapter layer around qBraid** — `base.py` + `qbraid_adapter.py` + `qroute_router.py`, mounted in `main.py` alongside the existing `/api/v1/qbraid/*` router. Verified: full app imports clean, all 5 routes register, `qbraid.is_configured() == True` against your real key.
2. ✅ **Added IonQ** — `ionq_adapter.py`, live-verified (§2.4).
3. ✅ **Added IBM Quantum Cloud** — `ibm_adapter.py`, live-verified (§2.2).
4. 🚫 **IQM Resonance** — blocked on a real dependency conflict (§2.3). Path chosen: isolated microservice — see [PLANS/iqm-service.md](./iqm-service.md) for the full build plan. Not built yet.
5. 🚫 **Qniverse** — blocked on an unverifiable SDK (§2.5). Needs real docs/credentials access before any code gets written.
6. **Not started: Composer UI** — `useQRouteApi.ts` hook + the modality-grouped device picker (§4). Backend has 3 of 5 providers live and ready to build the frontend against now; the other two can be added later without a frontend rewrite since they're just more entries in the same `PROVIDER_REGISTRY`.

---

## 6. Open questions for you

1. ~~**Mongo strategy**~~ — **resolved:** extended `quantum_hw_jobs` in place with a `provider` field, old docs default to `"qbraid"`. Implemented.
2. ~~**qBraid router fate**~~ — **resolved for now:** `/api/v1/qbraid/*` kept alive standalone alongside `/api/v1/qroute/*`. Revisit once the composer UI is built and qBraid usage naturally migrates to it.
3. ~~**Rate limiting**~~ — **resolved:** one shared daily cap, implemented by literally reusing `QBRAID_DAILY_JOB_LIMIT` as the same env var both routers read, against the same unfiltered collection count — a user can't dodge the limit by switching endpoints.
4. **Frontend entry point** — still open: new standalone `/qroute` page, or replace the existing HW panel inside Gates Playground (§4.3)? Not yet built.
5. ~~**Credentials**~~ — **resolved:** you provided all five. Three are live and verified (qBraid, IonQ, IBM); IQM and Qniverse credentials are saved in `.env` but unusable until the blockers below are resolved.
6. ~~**IQM path**~~ — **resolved:** isolated Dockerized microservice (`iqm_service/`), matching `video_service`/`notebook_service`'s existing precedent. Full plan: [PLANS/iqm-service.md](./iqm-service.md). Remaining opens are in that doc's own §5 (deploy target, credential migration, package choice re-confirmation now that isolation removes the original blocker).
7. **New — Qniverse access:** can you get the real SDK install source or REST API docs from inside your Qniverse account dashboard? The public docs' automated summary is confirmed unreliable (§2.5) — implementation is blocked without a verified source, not just a nice-to-have.
8. **New — real-hardware submission testing:** qBraid/IonQ/IBM adapters are verified for auth + device listing only. Actually calling `submit_job` against real hardware consumes real queue time/quota (and possibly billing, especially on the IBM Cloud instance) — say the word per-provider when you want that exercised end-to-end.
