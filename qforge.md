# QForge — Superconducting Quantum Computer Builder & Simulator (Implementation Plan v1)

**Scope:** a new learner-facing module, `frontend/src/modules/qforge/`, where a student assembles a
superconducting quantum computer stage-by-stage — cryostat → wiring tree → HEMT/TWPA chain →
mixing chamber/QPU → control electronics → calibration — and gets a physically-grounded score
(thermal, signal-integrity, power, calibration-readiness) instead of a pass/fail quiz. It sits
alongside Gates Playground and Code Playground on the Playground Hub, reuses the existing Explorer
design system verbatim, and reuses the existing gamification (XP/badges/streaks) and RAG-grounded
AI Tutor infrastructure rather than building parallel versions of either.

**This is a plan for review, not a locked spec — Section 9 lists the decisions that need your
sign-off before implementation starts.** Per your brief, no implementation code is written here.

---

## 0. Reading the brief honestly

Your brief (and the reference material) describes something close to a professional cryostat CAD
tool: dozens of configurable subsystems, a live thermal/electrical/RF solver, a full connection-rules
engine with physical validation, a QEC teaching module, and cinematic bolt-by-bolt assembly
animation. Built exhaustively, that is a multi-year systems-engineering product, not a student
capstone module. Two things make a version of it real and shippable inside Qrious:

1. **The technical article you attached is an unusually good spec.** It gives concrete, citable
   numbers — the 62 dB staged attenuation budget (20+6+6+10+20 dB across 300 K→50 K→4 K→still→cold
   plate→MXC), TWPA gain (~20 dB, 4–8 GHz), HEMT noise temperature (2–4 K), T1/T2 targets, cryostat
   cooling-power classes (LD450sl vs XLD1000sl vs KIDE) — so the "simulation" doesn't have to be
   invented; it can be a simplified, transparent model built directly from these published figures,
   with every number traceable to a source line the student can read.
2. **Scope this the way QRoute and QStudio were scoped**: one narrow, fully-real vertical slice
   first (Phase 1 below), not all subsystems at once. The brief's full feature list becomes the
   *backlog* (Phase 2/3), not the MVP definition.

Recommendation: build **one signal chain, one cryostat class, one QPU, done well** — matching
Figure 1 in your PDF exactly — rather than a shallow version of everything. That is what makes the
"I am assembling a real superconducting quantum computer" feeling land, per the brief's own
stated goal.

---

## 1. Codebase fit (what already exists, what's new)

| Concern | Existing precedent | Reused as-is | New for QForge |
|---|---|---|---|
| Page shell / hero / cards / motion | `DESIGN_SYSTEM.md` §1, reference impl `AlgorithmExplorerLandingPage.tsx` | Yes, verbatim — zinc/emerald, `useTheme()`, `framer-motion` | — |
| 3D rendering | `gates-playground/components/BlochSphereViewer.tsx` (`@react-three/fiber` + `drei`, `Canvas`, `OrbitControls`, custom meshes) | Yes — same libraries, same "wireframe + emissive accent" visual language | The cryostat/wiring-tree scene itself |
| Module folder shape | `modules/<name>/{components,hooks,pages,utils,constants}` (gates-playground, qroute) | Yes | `modules/qforge/{components,hooks,pages,utils,constants,data}` |
| Backend adapter-per-concern pattern | `qroute`'s `PROVIDER_REGISTRY` + one router dispatching to per-vendor adapters | Same shape, applied to per-subsystem "solvers" instead of per-vendor adapters | `backend/services/qforge/` |
| Gamification | `features/gamification` (XPBar, BadgeGrid, StreakCalendar, BadgeUnlockModal), `backend/services/badge_engine.py`, `xp_engine.py` | Yes — new badges registered into `SEED_BADGES`, XP events fired through the existing `xp_engine` | New badge entries only, no new XP system |
| AI Tutor / RAG | `ai_tutor_router.py`, `langchain_service.py`, ChromaDB | Yes — QForge's "why is this wrong" explanations route through the same RAG pipeline with the QForge PDF added as a source document, per `AGENTS.md` §4 ("AI Tutor responses must remain grounded... to prevent hallucinations") | New source-doc ingestion only |
| Puzzle-style step gating | `modules/quantum-puzzles/hooks/usePuzzleEngine.ts` (sequential unlock pattern) | Pattern reused for stage-gating (install cryostat → install wiring → install QPU → …) | New hook, same shape |
| Routing / hub registration | `PlaygroundHubPage.tsx` array of `{title, desc, href, icon}`; `App.tsx` route list | Yes | Add one entry + one route |

Nothing here requires a new design language, a new animation library, a new state-management
approach, or a new backend framework — this is the strongest constraint from `AGENTS.md` §1–2 and
it's fully satisfiable.

---

## 2. Feature list, phased (this replaces the brief's flat list)

### Phase 1 — MVP: one real, correct signal chain
Matches Figure 1 of the attached PDF exactly, single channel, single QPU, single cryostat class.

- Interactive cryostat cross-section (six stages: 300 K / 50 K / 4 K / still ~700 mK / cold plate
  ~100 mK / MXC ~10–20 mK), rendered as a stacked-plate R3F scene matching the reference image's
  visual language (gold/silver plates, copper MXC).
- Assemble, in order, with each step unlocking the next (mirrors `usePuzzleEngine.ts`):
  install cryostat → install radiation shields → install wiring tree (drive, readout, flux lines)
  → install HEMT at 4 K → install TWPA + circulators at MXC → install QPU → install room-temp
  control electronics → power on → calibrate → run experiment.
- **Drive line builder**: place the 5 real attenuation stages (20/6/6/10/20 dB) at the correct
  thermal stage. Wrong-stage placement is rejected with an explanation citing the actual physics
  (e.g. "a 300 K photon needs staged attenuation before MXC or it dephases the qubit," from the
  PDF's drive-line section).
- **Readout chain builder**: place Purcell filter → TWPA → circulator → circulator → HEMT → digitizer
  in the correct order and stage.
- **One QPU choice** (QuantWare Contralto-A, 17 qubits — the PDF's own recommended spec for a
  first serious build) and **one cryostat choice** (Bluefors LD450sl — fastest lead time, PDF's own
  "budget-constrained first system" recommendation) to keep Phase 1's config space small and correct.
- **Build score v1**: three categories only — Thermal (attenuation budget matches 62 dB ± margin),
  Signal integrity (component order correct), Power (electronics within a simple power budget) —
  not all 13 categories the brief lists.
- Component click → engineering config panel (purpose, spec sheet numbers pulled straight from the
  PDF's per-component data, "what happens if removed").
- Simulation output: a single build report (temperature-per-stage table, attenuation total, pass/fail
  per rule, estimated T1 given correct/incorrect IR filtering) — grounded in the PDF's own troubleshooting
  section ("T1 below vendor spec after transfer" etc.) rather than an invented physics engine.

### Phase 2 — Advanced simulation (backlog, not MVP)
- Second QPU (Rigetti Novera) and second cryostat class (XLD1000sl) to make component choice
  actually matter (cooling-power vs. qubit-count tradeoffs from the PDF's cryostat table).
  Also unlocks Cri/oFlex vs. discrete-coax wiring as a real Phase-2 decision, per the PDF.
  the PDF's own "why Cri/oFlex changes the integration calculus" section.
- Full connection-rules engine (port compatibility, frequency compatibility, magnetic/mechanical
  compatibility) generalized beyond the drive/readout ordering checks in Phase 1.
- Calibration mini-games: qubit spectroscopy, Rabi, T1/T2 measurement sliders, matching the PDF's
  Phase 5 sequence — framed as interactive plots (recharts, already a dependency via Gates Playground's
  `HistogramChart.tsx`) rather than new game mechanics.
- Fault injection: contaminated He-3 mixture, blocked pulse tube, un-torqued connector — each tied to
  one entry in the PDF's "what goes wrong" catalog, so every failure mode is real and sourced.

### Phase 3 — Production polish (backlog)
- Error-correction teaching module (bit-flip/phase-flip/surface code) — this is a distinct enough
  topic that it likely deserves its own module (`quantum-error-correction`) reusing QForge's QPU
  visuals rather than being bolted onto the builder; flagged here as a scoping decision, not decided.
- Full electrical system simulation (UPS, breakers, grounding) beyond the Phase-1 power budget.
- Exploded-view / rotate / zoom camera modes, keyboard shortcuts, full accessibility pass.

Everything in the brief not listed above (e.g. per-component noise-figure tuning UI, a from-scratch
electrical fault simulator) is real but explicitly deferred — call it out if any of it needs to move
into Phase 1.

---

## 3. Frontend architecture

```
frontend/src/modules/qforge/
├── pages/
│   └── QForgeLandingPage.tsx        # Explorer-style hero + "continue build" card, per DESIGN_SYSTEM §1.1–1.2
│   └── QForgeBuilderPage.tsx        # main assembly workspace
├── components/
│   ├── CryostatScene.tsx            # R3F canvas: six stacked stage-plates, camera orbit
│   ├── StagePlate.tsx               # one thermal stage (300K/50K/4K/still/coldplate/MXC), reacts to config
│   ├── SignalChainRail.tsx          # 2D schematic rail (drive/readout), mirrors PDF Figure 1 layout
│   ├── ComponentTray.tsx            # draggable component palette, same interaction shape as GateTray.tsx
│   ├── ComponentConfigPanel.tsx     # click-to-open spec/config panel (mirrors GateInspectorPopup.tsx)
│   ├── BuildScoreCard.tsx           # category breakdown, Explorer card pattern
│   ├── AssemblyStepper.tsx          # sequential stage gating UI, mirrors PuzzleHeader.tsx progress bar
│   └── BuildReportPanel.tsx         # final report (temps, attenuation, pass/fail)
├── hooks/
│   ├── useBuildState.ts             # assembly graph, placed components, current stage (mirrors useCircuitState.ts)
│   ├── useQForgeApi.ts              # calls backend validate/score endpoints (mirrors useCircuitApi.ts)
│   └── useAssemblyStepGate.ts       # sequential unlock logic, mirrors usePuzzleEngine.ts
├── constants/
│   ├── stages.ts                    # 6 thermal stages, target temps, from PDF
│   └── components.ts                # component catalog (attenuators, TWPA, HEMT, filters) w/ real specs
├── data/
│   └── qpuCatalog.ts, cryostatCatalog.ts   # Phase-1: one entry each; Phase-2: expand
└── utils/
    └── validateSignalChain.ts       # client-side pre-check before backend call (fast feedback)
```

State management: local component state + `useBuildState` (React state/reducer, matching
`useCircuitState.ts`'s shape) is sufficient for Phase 1 — no new global store (Redux/Zustand) needed,
consistent with how Gates Playground manages a comparably complex circuit graph today.

Rendering strategy: **React Three Fiber for the cryostat**, same as `BlochSphereViewer.tsx` (already
a project dependency, already understood by whoever maintains that file) — not a new WebGL library.
The signal-chain rail (drive/readout path) is simpler and better as 2D SVG/HTML matching
`CircuitDiagram.tsx`'s approach, not forced into 3D.

Design system compliance: `QForgeLandingPage` uses the Explorer shell/hero/card pattern verbatim
(§1.1–1.5 of `DESIGN_SYSTEM.md`); the in-builder config panels use the same card/icon-badge
components as `AlgorithmCard.tsx`; motion timings match §1.6. No shadcn `Card`/admin tokens — this is
entirely learner-facing.

---

## 4. Backend architecture

```
backend/services/qforge/
├── __init__.py               # component + rule registry
├── models.py                  # ComponentSpec, StageConfig, BuildGraph, ScoreBreakdown (pydantic)
├── thermal_rules.py           # attenuation-budget check (62 dB target ± tolerance), per-stage temp targets
├── signal_chain_rules.py      # drive/readout component ORDER validation (Purcell→TWPA→circulator→...)
├── power_budget.py            # Phase-1 simple power sum vs. budget
└── report_builder.py          # assembles BuildReportPanel's payload

backend/routers/qforge_router.py   # one router, mounted at /api/v1/qforge, same shape as qroute_router.py
```

Endpoints (Phase 1):
- `GET /api/v1/qforge/catalog` — components, QPU, cryostat (static data, seeded once like
  `algorithm_catalog`/`flashcard_seed.py` pattern)
- `POST /api/v1/qforge/validate` — given current `BuildGraph`, return per-rule pass/fail + explanation
  strings (these strings are what the AI Tutor RAG pipeline can also draw from)
- `POST /api/v1/qforge/score` — full `ScoreBreakdown` + `BuildReportPanel` payload
- `POST /api/v1/qforge/builds` (auth required) — persist a save (mirrors `saved_circuits` in
  `algorithm_service.py`'s pattern) into a new `qforge_builds` MongoDB collection

No new microservice needed — this is pure Python/pydantic rule evaluation against static physical
constants from the PDF, not a numerical PDE solver, so it belongs in the FastAPI monolith next to
`circuit_service.py`, not in a Dockerized satellite like `qstudio_service`.

---

## 5. Data model (Phase 1)

```python
class StageConfig(BaseModel):
    stage_id: Literal["300K","50K","4K","still","coldplate","mxc"]
    target_temp_k: float          # from PDF's stage table
    installed_components: list[str]

class ComponentSpec(BaseModel):
    component_id: str
    kind: Literal["attenuator","filter","hemt","twpa","circulator","dc_block","qpu"]
    valid_stages: list[str]       # which stages this component may legally sit at
    attenuation_db: float | None
    gain_db: float | None
    noise_temp_k: float | None
    spec_source: str              # citation back to PDF section, shown in the config panel

class BuildGraph(BaseModel):
    drive_line: list[str]         # ordered component_ids, room temp -> qubit
    readout_line: list[str]       # ordered component_ids, qubit -> room temp
    qpu_id: str
    cryostat_id: str

class ScoreBreakdown(BaseModel):
    thermal: float
    signal_integrity: float
    power: float
    overall: float
    warnings: list[str]
    failures: list[str]
```

---

## 6. Validation rules (Phase 1, all traceable to the attached PDF)

| Rule | Source | Pass condition |
|---|---|---|
| Total drive-line attenuation | "Total attenuation budget = 62 dB (20+6+6+10+20)" | Sum of placed attenuators = 62 dB ± 3 dB |
| Attenuator stage placement | Per-stage breakdown in "The drive line" | 20 dB@300K→50K, 6 dB@4K, 6 dB@still, 10 dB@coldplate, 20 dB@MXC |
| IR filter presence | "IR filters are critical: they absorb infrared photons... degrading T1" | ≥1 IR filter at cold plate AND MXC |
| Readout order | "Purcell filter... TWPA... circulator... circulator... HEMT... digitizer" | Components appear in that order along the readout line |
| TWPA placement | "At the mixing chamber... TWPA" | TWPA only valid at `mxc` stage |
| HEMT placement | "At 4 K, a HEMT... provides the first high-gain amplification" | HEMT only valid at `4K` stage |
| QPU/cryostat compatibility | Rigetti Novera needs "≥290mm MXC diameter and ≥14 µW at 20mK" | Simple lookup table, Phase 2 (only 1 QPU/cryostat pair in Phase 1, so trivially satisfied) |

Every failure message cites the rule's source line so a student who gets it wrong is taught the real
constraint, per the brief's "explain WHY" requirement — without needing an invented physics engine.

---

## 7. Gamification & AI Tutor integration

- New badges in `SEED_BADGES` (`badge_engine.py`): e.g. `qforge_first_cooldown` ("Reached base
  temperature on your first build"), `qforge_signal_master` ("Zero signal-integrity warnings"),
  `qforge_calibrated` ("Completed calibration"). Same shape as existing roadmap badges — no new
  reward system.
- XP events fired through the existing `xp_engine` on stage completion, matching how other modules
  award XP.
- AI Tutor: ingest the attached PDF (or a cleaned excerpt of it) as a ChromaDB source document
  scoped to QForge, so "why is this wrong?" answers are RAG-grounded per `AGENTS.md` §4, not
  freeform LLM physics explanations.

---

## 8. Non-functional

- **Accessibility**: keyboard-operable drag-and-drop is the one genuinely hard accessibility item
  here (3D scenes are supplementary visualization, not the only way to build — the 2D
  `SignalChainRail` list view is the accessible primary interaction surface; the R3F scene is
  progressive enhancement, matching how `BlochSphereViewer` is supplementary to the numeric readout
  in Gates Playground).
- **Performance**: single R3F canvas with ~6 static stage meshes is far lighter than Gates
  Playground's per-qubit Bloch spheres already in production; no new performance risk expected at
  Phase 1 scope.
- **Mobile**: builder workspace (drag-and-drop + 3D) is desktop-first for Phase 1, same as Gates
  Playground's circuit canvas; landing/read-only report views are responsive.

---

## 9. Decisions needing your sign-off before implementation starts

1. **Module name** — "QForge" used throughout this doc as a placeholder consistent with QBook/QRoute/QStudio naming; confirm or replace.
2. **Phase 1 QPU/cryostat lock-in** — Contralto-A + LD450sl, per the PDF's own "first serious system" recommendation. Confirm, or pick different ones from the PDF's tables.
3. **Where error correction (bit-flip/surface code) lives** — folded into QForge Phase 3, or a separate module reusing QForge's QPU component? Recommend deciding this now since it affects `modules/` folder planning.
4. **Source-document reuse for the AI Tutor** — confirm the attached PDF can be ingested into ChromaDB as a QForge source doc (check its licensing/attribution terms with Applied Quantum before ingesting, since it's an external third-party playbook, not an Anthropic or Qrious-authored source).
5. **Save/persistence scope** — is a "save my build and resume later" feature (new `qforge_builds` Mongo collection) in Phase 1, or is a single ephemeral session enough for MVP?

---

## 10. What Phase 1 deliberately does not attempt

No live thermal/electrical PDE solver, no full connection-rules engine, no second QPU/cryostat,
no calibration mini-games, no error-correction module, no exploded-view camera mode, no keyboard
shortcut system. These are real, sourced, and listed under Phase 2/3 above — not dropped, just
sequenced — so the first shipped version is a small, correct, well-integrated feature rather than a
large one built against invented physics.