# Quantathon — Software Implementation Document
### Modules in Scope: Gates Playground · Code Playground · Quantum Algorithm Explorer
### Status: Architecture Locked (Final) — Phased Implementation Plan

---

## 1. Architecture Reference (Locked — Do Not Modify)

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Tailwind CSS, Shadcn UI, React Three Fiber |
| Authentication | Firebase Authentication |
| Storage | Firebase Storage |
| Backend | FastAPI (Python) — REST APIs, Business Logic, API Orchestration |
| Quantum Engine | Qiskit, Qiskit Aer, OpenQASM Import/Export, Circuit Simulation, Real-time Execution, Measurement Probabilities |
| AI Processing | Groq → LangChain → ChromaDB (RAG Chatbot, Embeddings, Document Retrieval, Notes Generator) |
| Animation | Manim  (Quantum/Gate/Algorithm Animations) |
| Database | MongoDB Atlas (Users, Notes, Quiz Results, Flashcards, Progress, Saved Circuits, Puzzle Progress) |
| Outputs | Interactive Visualizations, AI Explanations, Simulation Results, Notes Download, OpenQASM Export |

**Canonical Data Flow Patterns (never deviate):**

```
Simulation Flow:
React UI → FastAPI → Qiskit Aer → JSON → React UI

AI Flow:
React UI → FastAPI → Groq → LangChain → ChromaDB → FastAPI → React UI

Animation Flow:
React UI → FastAPI → Manim → Rendered Asset (Firebase Storage) → React UI

Persistence Flow:
React UI → FastAPI → MongoDB Atlas → FastAPI → React UI
```

Every task below is explicitly tagged with the architecture block it belongs to. Only the three in-scope modules (Gates Playground, Code Playground, Quantum Algorithm Explorer) are newly implemented — Authentication, Dashboard, RBAC, User Management, Database provisioning, and Firebase setup are treated as **existing systems to integrate with, not rebuild**.

---

## 2. Global Folder Structure (Applies Across All Phases)

```
quantathon/
├── frontend/                                  # Frontend — React
│   ├── src/
│   │   ├── modules/
│   │   │   ├── gates-playground/
│   │   │   │   ├── pages/
│   │   │   │   │   └── GatesPlaygroundPage.tsx
│   │   │   │   ├── components/
│   │   │   │   │   ├── CircuitCanvas.tsx
│   │   │   │   │   ├── GateTray.tsx
│   │   │   │   │   ├── QubitRail.tsx
│   │   │   │   │   ├── HistogramChart.tsx
│   │   │   │   │   ├── BlochSphereViewer.tsx      # React Three Fiber
│   │   │   │   │   └── CircuitDiagram.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useCircuitState.ts
│   │   │   │   │   └── useSimulationApi.ts
│   │   │   │   └── types/circuit.types.ts
│   │   │   ├── code-playground/
│   │   │   │   ├── pages/CodePlaygroundPage.tsx
│   │   │   │   ├── components/
│   │   │   │   │   ├── MonacoEditorPanel.tsx
│   │   │   │   │   ├── ExecutionConsole.tsx
│   │   │   │   │   └── ResultViewer.tsx
│   │   │   │   └── hooks/useCodeExecutionApi.ts
│   │   │   └── algorithm-explorer/
│   │   │       ├── pages/
│   │   │       │   ├── AlgorithmExplorerLandingPage.tsx
│   │   │       │   └── AlgorithmDetailPage.tsx
│   │   │       ├── components/
│   │   │       │   ├── AlgorithmCard.tsx
│   │   │       │   ├── TheoryPanel.tsx
│   │   │       │   ├── ComplexityTable.tsx
│   │   │       │   └── InteractiveDemo.tsx
│   │   │       └── hooks/useAlgorithmApi.ts
│   │   ├── shared/
│   │   │   ├── components/ (shadcn/ui wrappers, Navbar, Sidebar)
│   │   │   ├── lib/firebaseClient.ts
│   │   │   ├── lib/apiClient.ts               # axios/fetch wrapper → FastAPI
│   │   │   └── router/AppRouter.tsx
│   │   └── App.tsx
│   └── tailwind.config.ts
│
├── backend/                                    # Backend — FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   │   ├── gates_playground_router.py
│   │   │   ├── code_playground_router.py
│   │   │   ├── algorithm_explorer_router.py
│   │   │   ├── simulation_router.py
│   │   │   ├── ai_tutor_router.py
│   │   │   └── animation_router.py
│   │   ├── services/
│   │   │   ├── qiskit_service.py               # Quantum Engine
│   │   │   ├── qasm_service.py                 # Quantum Engine
│   │   │   ├── code_execution_service.py       # Backend business logic
│   │   │   ├── groq_service.py                 # Processing
│   │   │   ├── langchain_service.py            # Processing
│   │   │   ├── chroma_service.py               # Processing
│   │   │   └── manim_service.py                # Animation
│   │   ├── models/
│   │   │   ├── circuit_model.py
│   │   │   ├── simulation_model.py
│   │   │   ├── algorithm_model.py
│   │   │   └── code_execution_model.py
│   │   ├── db/
│   │   │   └── mongo_client.py                 # Database
│   │   └── core/
│   │       ├── firebase_auth_middleware.py     # integrates existing Firebase Auth
│   │       └── config.py
│   └── requirements.txt
│
└── docs/
    └── quantathon_implementation_document.md
```

---

## Phase 1 — Foundation

**1. Phase Name:** Foundation & Integration Scaffolding

**2. Objective:** Establish navigation, routing, and API skeletons so the three in-scope modules exist as first-class citizens inside the existing platform (Dashboard, Auth, RBAC) without altering those systems.

**3. User Story:** *As a logged-in student, I can see Gates Playground, Code Playground, and Algorithm Explorer in the platform navigation and open a landing page for each, so I know these tools exist and are ready to use.*

**4. Features Included:**
- Navigation entries for the 3 modules
- Landing page for Playground hub (Gates + Code)
- Landing page for Algorithm Explorer
- Client-side routing
- Empty/skeleton FastAPI routers wired into `main.py`

**5. Frontend Tasks** *(Frontend block)*
| Task | Detail |
|---|---|
| Pages | `PlaygroundHubPage.tsx`, `AlgorithmExplorerLandingPage.tsx` |
| Components | `ModuleCard.tsx`, `NavItem.tsx` (extends existing Sidebar, does not replace it) |
| Routing | Add routes in `AppRouter.tsx`: `/playground`, `/playground/gates`, `/playground/code`, `/algorithms` |
| API Integration | `apiClient.ts` base instance pointed at FastAPI base URL; auth token attached from existing Firebase Auth session |
| UI | Shadcn `Card`, `Tabs` used for hub; Tailwind grid layout |

**6. Backend Tasks** *(Backend block)*
| Task | Detail |
|---|---|
| Routers | `gates_playground_router.py`, `code_playground_router.py`, `algorithm_explorer_router.py` registered with `APIRouter(prefix=...)` in `main.py` |
| Services | Stub service files created (no logic yet) |
| Models | Pydantic base schemas: `CircuitBase`, `AlgorithmBase` |
| Business Logic | Dependency injection for the existing Firebase Auth middleware (`get_current_user`) reused, not rebuilt |

**7. Database Changes** *(Database block — MongoDB Atlas)*
| Collection | Purpose | Notes |
|---|---|---|
| `saved_circuits` | Created empty, schema only | Indexed on `user_id`, `updated_at` |
| `algorithm_catalog` | Created empty, schema only | Indexed on `slug` (unique) |

**8. API Endpoints**
| Method | URL | Input | Output | Auth |
|---|---|---|---|---|
| GET | `/api/v1/health` | none | `{status:"ok"}` | none |
| GET | `/api/v1/algorithms` | none | `[]` (empty until Phase 6) | Firebase ID token |

**9. Data Flow:**
```
React (Sidebar click) → React Router → Page Component → apiClient.get('/health') → FastAPI → JSON → React
```

**10. UI Screens:** Playground Hub, Algorithm Explorer Landing Page.

**11. Folder Structure:** As per Section 2 (skeleton files only, logic added in later phases).

**12. Deliverables:** Working navigation, empty pages rendering without console errors, health-check endpoint returning 200 with a valid Firebase-authenticated request.

**13. Testing Checklist:**
- [ ] Nav links route correctly
- [ ] Unauthenticated user redirected by existing Auth guard
- [ ] `/health` returns 200
- [ ] No RBAC regressions on existing routes

**14. Acceptance Criteria:** All 3 module entry points are reachable from navigation; existing Auth/RBAC/Dashboard behavior is unchanged (regression-free).

---

## Phase 2 — Gate Playground (Circuit Builder)

**1. Phase Name:** Gate Playground — Circuit Builder

**2. Objective:** Let students visually construct multi-qubit quantum circuits via drag-and-drop, and persist circuits to MongoDB.

**3. User Story:** *As a student, I can drag gates onto qubit lines, build a circuit, and save/load it later.*

**4. Features Included:** Circuit builder canvas, drag-and-drop gate placement, multi-qubit support, save circuit, load circuit.

**5. Frontend Tasks** *(Frontend block)*
| Task | Detail |
|---|---|
| Components | `CircuitCanvas.tsx` (grid of qubit rails × time steps), `GateTray.tsx` (draggable H, X, Y, Z, CNOT, CZ, S, T, RX, RY, RZ, SWAP, Toffoli), `QubitRail.tsx` |
| Drag & Drop | HTML5 DnD or `@dnd-kit/core` inside React (no new backend framework — frontend-only dependency) |
| State | `useCircuitState.ts` — holds `{qubits: number, gates: GateInstance[]}` |
| API Integration | `POST /api/v1/circuits`, `GET /api/v1/circuits/:id`, `GET /api/v1/circuits` (list mine) |
| UI | Shadcn `Toolbar`, `Dialog` for save-as-name prompt |

**6. Backend Tasks** *(Backend block)*
| Task | Detail |
|---|---|
| Router | `gates_playground_router.py`: `create_circuit`, `get_circuit`, `list_circuits`, `update_circuit`, `delete_circuit` |
| Service | `circuit_service.py` — validation (qubit count bounds, valid gate names, gate target/control indices in range) |
| Model | `circuit_model.py`: `Circuit(user_id, name, num_qubits, gates: List[GateInstance], created_at, updated_at)` |

**7. Database Changes**
| Collection | Fields | Indexes |
|---|---|---|
| `saved_circuits` | `_id, user_id, name, num_qubits, gates[], created_at, updated_at` | `user_id`, compound `(user_id, updated_at)` |

**8. API Endpoints**
| Method | URL | Input | Output | Auth |
|---|---|---|---|---|
| POST | `/api/v1/circuits` | `{name, num_qubits, gates[]}` | `{circuit_id}` | Firebase token |
| GET | `/api/v1/circuits` | query `?limit&offset` | `[CircuitSummary]` | Firebase token |
| GET | `/api/v1/circuits/{id}` | path id | `Circuit` | Firebase token |
| PUT | `/api/v1/circuits/{id}` | `{name?, gates?}` | `Circuit` | Firebase token |
| DELETE | `/api/v1/circuits/{id}` | path id | `{deleted:true}` | Firebase token |

**9. Data Flow:**
```
React (drag gate) → local circuit state → "Save" → FastAPI (validate) → MongoDB Atlas → FastAPI → React (confirmation)
Load: React → FastAPI → MongoDB Atlas → JSON → React (render onto CircuitCanvas)
```

**10. UI Screens:** Gates Playground — Builder View, "My Circuits" list/modal.

**11. Folder Structure:** As Section 2 — `gates-playground/` frontend module, `gates_playground_router.py` + `circuit_service.py` backend.

**12. Deliverables:** Fully working drag-and-drop builder with persistence.

**13. Testing Checklist:**
- [ ] Invalid gate index rejected with 422
- [ ] Save → reload reproduces identical circuit
- [ ] Multi-qubit (up to defined max, e.g. 8) renders correctly
- [ ] Ownership enforced (user A cannot load user B's circuit)

**14. Acceptance Criteria:** A circuit built visually can be saved, reloaded, and edited without data loss, scoped to the authenticated user.

---

## Phase 3 — Simulation Engine

**1. Phase Name:** Simulation Engine Integration

**2. Objective:** Execute saved/in-progress circuits against Qiskit Aer and return statevector, measurement histogram, and circuit diagram data.

**3. User Story:** *As a student, I can click "Run" on my circuit and see the resulting probabilities and statevector.*

**4. Features Included:** Qiskit circuit construction from JSON, Qiskit Aer statevector + qasm simulation, measurement probability histogram, circuit diagram rendering data.

**5. Frontend Tasks**
| Task | Detail |
|---|---|
| Components | `HistogramChart.tsx` (recharts), `CircuitDiagram.tsx`, `RunButton` in toolbar |
| Hook | `useSimulationApi.ts` → `POST /api/v1/simulate` |
| UI | Loading state, error state (e.g., unsupported gate) |

**6. Backend Tasks** *(Quantum Engine block)*
| Task | Detail |
|---|---|
| Service | `qiskit_service.py`: `build_qiskit_circuit(gates, num_qubits)` maps internal `GateInstance[]` → `qiskit.QuantumCircuit`; `run_statevector(circuit)`; `run_measurement(circuit, shots)` via `AerSimulator` |
| Router | `simulation_router.py`: `POST /simulate` (accepts inline circuit OR `circuit_id`) |
| Model | `simulation_model.py`: `SimulationResult(statevector, probabilities, counts, circuit_diagram_text)` |

**7. Database Changes**
| Collection | Fields | Indexes |
|---|---|---|
| `saved_circuits` | add `last_simulation_result` (optional cache) | none new |

**8. API Endpoints**
| Method | URL | Input | Output | Auth |
|---|---|---|---|---|
| POST | `/api/v1/simulate` | `{circuit_id?} or {num_qubits, gates[]}, shots` | `{statevector, probabilities, counts, diagram}` | Firebase token |

**9. Data Flow:**
```
React (Run) → FastAPI /simulate → Qiskit (build circuit) → Qiskit Aer (AerSimulator) → JSON (statevector, counts) → React (Histogram + Diagram)
```

**10. UI Screens:** Simulation Results panel embedded in Gates Playground builder view.

**11. Folder Structure:** `qiskit_service.py` under `backend/app/services/`.

**12. Deliverables:** End-to-end run producing a correct measurement histogram for a Bell-state test circuit.

**13. Testing Checklist:**
- [ ] Bell state (H, CNOT) → ~50/50 `00`/`11` distribution over 1024 shots
- [ ] Statevector normalized (sum of |amp|² = 1)
- [ ] Unsupported gate name → 400 with descriptive error
- [ ] Circuit with 0 gates → identity result

**14. Acceptance Criteria:** Simulation results match Qiskit reference output for at least 5 canonical test circuits (Bell, GHZ, superposition, X-gate flip, identity).

---

## Phase 4 — Code Playground

**1. Phase Name:** Code Playground

**2. Objective:** Let students write Qiskit Python code directly and execute it safely on the backend, viewing simulation output inline.

**3. User Story:** *As a student, I can write Python/Qiskit code in an editor, run it, and see printed output plus any generated circuit's simulation results.*

**4. Features Included:** Monaco Editor, Python execution (Qiskit-scoped), run code, simulation output, error handling.

**5. Frontend Tasks**
| Task | Detail |
|---|---|
| Components | `MonacoEditorPanel.tsx` (`@monaco-editor/react`), `ExecutionConsole.tsx` (stdout/stderr), `ResultViewer.tsx` (reuses `HistogramChart`) |
| Hook | `useCodeExecutionApi.ts` → `POST /api/v1/code/execute` |
| UI | Run/Stop buttons, syntax highlighting for Python, Shadcn `Tabs` for Code / Output / Visualization |

**6. Backend Tasks** *(Backend + Quantum Engine blocks)*
| Task | Detail |
|---|---|
| Router | `code_playground_router.py`: `POST /execute` |
| Service | `code_execution_service.py`: runs user code in a restricted subprocess/sandbox with only `qiskit`, `qiskit_aer`, `numpy` importable; captures stdout/stderr; enforces execution timeout (e.g. 8s) and memory cap |
| Model | `code_execution_model.py`: `CodeExecutionRequest(source_code)`, `CodeExecutionResult(stdout, stderr, exit_code, simulation_result?)` |

**7. Database Changes**
| Collection | Fields | Indexes |
|---|---|---|
| `code_snippets` (new) | `_id, user_id, title, source_code, created_at` | `user_id` |

**8. API Endpoints**
| Method | URL | Input | Output | Auth |
|---|---|---|---|---|
| POST | `/api/v1/code/execute` | `{source_code}` | `{stdout, stderr, exit_code, simulation_result?}` | Firebase token |
| POST | `/api/v1/code/snippets` | `{title, source_code}` | `{snippet_id}` | Firebase token |
| GET | `/api/v1/code/snippets` | none | `[SnippetSummary]` | Firebase token |

**9. Data Flow:**
```
React (Run) → FastAPI /code/execute → sandboxed Python subprocess (Qiskit + Qiskit Aer available) → captured stdout/JSON result → FastAPI → React (Console + Result Viewer)
```

**10. UI Screens:** Code Playground editor view, "My Snippets" list.

**11. Folder Structure:** `code-playground/` frontend module; `code_playground_router.py` + `code_execution_service.py` backend.

**12. Deliverables:** Working sandboxed code execution with visible output and (if code builds a circuit) histogram rendering.

**13. Testing Checklist:**
- [ ] Infinite loop / long-running code times out gracefully
- [ ] Disallowed imports (e.g. `os`, `subprocess`) blocked
- [ ] Valid Qiskit script returns correct histogram
- [ ] Syntax errors surfaced clearly in console

**14. Acceptance Criteria:** Arbitrary but restricted Qiskit-only Python snippets execute safely within resource/time limits and results render correctly.

---

## Phase 5 — Quantum Debugger

**1. Phase Name:** Quantum Debugger

**2. Objective:** Provide step-by-step circuit execution with visual state inspection (Bloch Sphere, probabilities, density matrix, statevector) after each gate.

**3. User Story:** *As a student, I can step through my circuit gate-by-gate and see how the quantum state evolves.*

**4. Features Included:** Step execution, timeline scrubber, Bloch Sphere (single-qubit view), probability viewer, density matrix viewer, statevector viewer.

**5. Frontend Tasks**
| Task | Detail |
|---|---|
| Components | `BlochSphereViewer.tsx` (React Three Fiber — 3D sphere with state vector arrow), `TimelineScrubber.tsx`, `DensityMatrixTable.tsx`, `StatevectorTable.tsx` |
| Hook | `useDebugStepApi.ts` → `POST /api/v1/debug/steps` |
| UI | Play/pause/step-forward/step-back controls |

**6. Backend Tasks** *(Quantum Engine block)*
| Task | Detail |
|---|---|
| Service | `qiskit_service.py` extended with `run_stepwise(circuit)`: builds intermediate circuits (prefix at each gate index), computes `Statevector` and `DensityMatrix` per step using `qiskit.quantum_info` |
| Router | `simulation_router.py`: `POST /debug/steps` |
| Model | `DebugStep(step_index, gate_applied, statevector, density_matrix, per_qubit_bloch_vectors, probabilities)` |

**7. Database Changes:** None new (stateless computation; optionally cache in `saved_circuits.debug_cache`).

**8. API Endpoints**
| Method | URL | Input | Output | Auth |
|---|---|---|---|---|
| POST | `/api/v1/debug/steps` | `{circuit_id? / gates[], num_qubits}` | `[DebugStep]` (one per gate) | Firebase token |

**9. Data Flow:**
```
React (Step) → FastAPI /debug/steps → Qiskit (prefix circuits) → Statevector/DensityMatrix per step → JSON array → React (Bloch Sphere + tables update per step)
```

**10. UI Screens:** Debugger view (accessible from Gates Playground toolbar).

**11. Folder Structure:** Debugger components live under `gates-playground/components/` (shared module, not a separate top-level route per architecture).

**12. Deliverables:** Working stepper with accurate Bloch sphere rendering for single-qubit states.

**13. Testing Checklist:**
- [ ] Bloch vector for |0⟩ points +Z, for |1⟩ points −Z, for |+⟩ points +X
- [ ] Density matrix trace = 1 at every step
- [ ] Step count equals gate count
- [ ] Multi-qubit density matrix reduces correctly to single-qubit view (partial trace)

**14. Acceptance Criteria:** Stepwise state evolution matches Qiskit `quantum_info` reference values for test circuits at every intermediate step.

---

## Phase 6 — Quantum Algorithm Explorer

**1. Phase Name:** Quantum Algorithm Explorer

**2. Objective:** Provide a catalog of canonical quantum algorithms with theory, interactive simulation, applications, and complexity data.

**3. User Story:** *As a student, I can browse algorithms (Deutsch-Jozsa, Grover, Shor, QFT, Teleportation), read theory, run an interactive demo, and see complexity comparisons.*

**4. Features Included:** Algorithm cards, theory panel, interactive simulation (reuses Simulation Engine), applications, complexity table, example circuits.

**5. Frontend Tasks**
| Task | Detail |
|---|---|
| Pages | `AlgorithmExplorerLandingPage.tsx` (grid of cards), `AlgorithmDetailPage.tsx` |
| Components | `AlgorithmCard.tsx`, `TheoryPanel.tsx` (markdown render), `ComplexityTable.tsx`, `InteractiveDemo.tsx` (embeds `CircuitCanvas` pre-loaded with example gates + calls `/simulate`) |
| Hook | `useAlgorithmApi.ts` → `GET /api/v1/algorithms`, `GET /api/v1/algorithms/:slug` |

**6. Backend Tasks**
| Task | Detail |
|---|---|
| Router | `algorithm_explorer_router.py`: `list_algorithms`, `get_algorithm` |
| Service | `algorithm_service.py`: reads/seeds `algorithm_catalog` collection; each entry references an example `gates[]` payload reused by the existing `qiskit_service` for the interactive demo |
| Model | `Algorithm(slug, name, theory_markdown, applications[], complexity: {classical, quantum}, example_circuit: {num_qubits, gates[]})` |

**7. Database Changes**
| Collection | Fields | Indexes |
|---|---|---|
| `algorithm_catalog` | `_id, slug, name, theory_markdown, applications[], complexity, example_circuit` | `slug` (unique) |

Seed data (5 initial algorithms): Deutsch–Jozsa, Grover's Search, Quantum Fourier Transform, Quantum Teleportation, Shor's (simplified period-finding demo).

**8. API Endpoints**
| Method | URL | Input | Output | Auth |
|---|---|---|---|---|
| GET | `/api/v1/algorithms` | none | `[AlgorithmSummary]` | Firebase token |
| GET | `/api/v1/algorithms/{slug}` | path slug | `Algorithm` | Firebase token |
| POST | `/api/v1/algorithms/{slug}/run` | `{shots}` | `SimulationResult` (delegates to `qiskit_service`) | Firebase token |

**9. Data Flow:**
```
React (open algorithm) → FastAPI /algorithms/{slug} → MongoDB Atlas → JSON → React (Theory + Complexity)
React (Run Demo) → FastAPI /algorithms/{slug}/run → Qiskit Aer → JSON → React (Histogram)
```

**10. UI Screens:** Algorithm Explorer Landing (cards grid), Algorithm Detail (theory/demo/complexity/applications tabs).

**11. Folder Structure:** `algorithm-explorer/` frontend module; `algorithm_explorer_router.py` + `algorithm_service.py` backend.

**12. Deliverables:** 5 seeded algorithms, each with working interactive demo.

**13. Testing Checklist:**
- [ ] Grover demo amplifies correct marked state
- [ ] QFT demo produces expected frequency-domain distribution
- [ ] Teleportation demo reproduces input state at output qubit
- [ ] All 5 catalog entries load without missing fields

**14. Acceptance Criteria:** Every catalog algorithm's interactive demo produces a physically correct result validated against Qiskit textbook references.

---

## Phase 7 — AI Tutor (Groq → LangChain → ChromaDB)

**1. Phase Name:** AI Tutor Integration

**2. Objective:** Add contextual AI assistance for gates/circuits using only Groq (LLM inference), LangChain (orchestration), and ChromaDB (retrieval).

**3. User Story:** *As a student, I can ask "explain this gate" or "why is my circuit producing this result" and get an AI-generated explanation grounded in course material.*

**4. Features Included:** Explain Gate, Explain Circuit, Ask the Circuit (chat), Circuit Optimization suggestions, Mistake Detection.

**5. Frontend Tasks**
| Task | Detail |
|---|---|
| Components | `AiTutorPanel.tsx` (chat UI, Shadcn `ScrollArea` + `Input`), context-aware buttons ("Explain this gate" on gate click) |
| Hook | `useAiTutorApi.ts` → `POST /api/v1/ai/ask`, `POST /api/v1/ai/explain-circuit`, `POST /api/v1/ai/optimize` |

**6. Backend Tasks** *(Processing block: Groq → LangChain → ChromaDB)*
| Task | Detail |
|---|---|
| Router | `ai_tutor_router.py`: `/ask`, `/explain-gate`, `/explain-circuit`, `/optimize`, `/detect-mistakes` |
| Service `groq_service.py` | Wraps Groq chat-completion client for final response generation |
| Service `langchain_service.py` | LangChain `RetrievalQA`/agent chain: retrieves relevant docs from ChromaDB, constructs prompt with circuit context, invokes Groq as the LLM backend |
| Service `chroma_service.py` | ChromaDB collection `quantum_docs` — embeddings of course notes/theory text (embedding model choice documented separately per LangChain embedding integration); similarity search on user query |
| Model | `AiTutorRequest(question, circuit_context?)`, `AiTutorResponse(answer, sources[])` |

**7. Database Changes**
| Store | Purpose |
|---|---|
| ChromaDB collection `quantum_docs` | Embedded theory/course documents for RAG (not MongoDB — per architecture, retrieval lives in ChromaDB) |
| MongoDB `ai_chat_history` (new) | `_id, user_id, circuit_id?, messages[], created_at` — chat logs for progress tracking |

**8. API Endpoints**
| Method | URL | Input | Output | Auth |
|---|---|---|---|---|
| POST | `/api/v1/ai/ask` | `{question, circuit_id?}` | `{answer, sources[]}` | Firebase token |
| POST | `/api/v1/ai/explain-circuit` | `{circuit_id}` | `{explanation}` | Firebase token |
| POST | `/api/v1/ai/optimize` | `{circuit_id}` | `{suggestions[]}` | Firebase token |
| POST | `/api/v1/ai/detect-mistakes` | `{circuit_id}` | `{issues[]}` | Firebase token |

**9. Data Flow:**
```
React (ask question) → FastAPI /ai/ask → LangChain (build retrieval chain) → ChromaDB (similarity search on quantum_docs) → LangChain (assemble grounded prompt) → Groq (LLM completion) → FastAPI → MongoDB (log to ai_chat_history) → React
```

**10. UI Screens:** AI Tutor side panel (embedded in Gates Playground and Code Playground), chat history view.

**11. Folder Structure:** `ai_tutor_router.py`, `groq_service.py`, `langchain_service.py`, `chroma_service.py` under `backend/app/services/` and `routers/`.

**12. Deliverables:** Working RAG-grounded chat with circuit-context awareness.

**13. Testing Checklist:**
- [ ] Answers cite retrieved sources
- [ ] Circuit-context question references the actual gates present
- [ ] Empty/irrelevant ChromaDB match falls back gracefully (no hallucinated citation)
- [ ] Chat history persists per user

**14. Acceptance Criteria:** AI responses are grounded in retrieved course content (traceable to ChromaDB source docs) and correctly reference the active circuit when context is supplied.

---

## Phase 8 — Notes, Flashcards, Quiz

**1. Phase Name:** Notes / Flashcards / Quiz Integration

**2. Objective:** Auto-generate study notes and flashcards from circuits/algorithms via the AI Processing pipeline, and support quiz-taking with scoring.

**3. User Story:** *As a student, I can generate notes from a lesson/circuit, review flashcards, and take a quiz to check my understanding.*

**4. Features Included:** Notes Generator, Flashcards, Quiz.

**5. Frontend Tasks**
| Task | Detail |
|---|---|
| Pages/Components | `NotesPanel.tsx`, `FlashcardDeck.tsx` (flip-card UI), `QuizRunner.tsx` |
| Hook | `useNotesApi.ts`, `useQuizApi.ts` |

**6. Backend Tasks** *(Processing + Backend blocks)*
| Task | Detail |
|---|---|
| Router | `notes_router.py`: `/notes/generate`, `/flashcards/generate`, `/quiz/generate`, `/quiz/submit` |
| Service | `langchain_service.py` extended: notes/flashcard/quiz generation chains using Groq for generation, ChromaDB for grounding |

**7. Database Changes**
| Collection | Fields | Indexes |
|---|---|---|
| `notes` | `_id, user_id, topic, content_markdown, created_at` | `user_id` |
| `flashcards` | `_id, user_id, topic, cards:[{front,back}], created_at` | `user_id` |
| `quiz_results` | `_id, user_id, quiz_topic, score, answers[], taken_at` | `user_id`, `(user_id, taken_at)` |

**8. API Endpoints**
| Method | URL | Input | Output | Auth |
|---|---|---|---|---|
| POST | `/api/v1/notes/generate` | `{topic/circuit_id}` | `{note_id, content_markdown}` | Firebase token |
| POST | `/api/v1/flashcards/generate` | `{topic}` | `{deck_id, cards[]}` | Firebase token |
| POST | `/api/v1/quiz/generate` | `{topic}` | `{quiz_id, questions[]}` | Firebase token |
| POST | `/api/v1/quiz/submit` | `{quiz_id, answers[]}` | `{score, review[]}` | Firebase token |

**9. Data Flow:**
```
React (Generate Notes) → FastAPI → LangChain → ChromaDB (retrieve) → Groq (generate) → MongoDB (save notes) → React
Quiz Submit: React → FastAPI (grade) → MongoDB (quiz_results) → Dashboard Progress (existing module reads from same collection)
```

**10. UI Screens:** Notes viewer/download, Flashcard deck viewer, Quiz runner + results screen.

**11. Folder Structure:** `notes_router.py` under `backend/app/routers/`; frontend components under a shared `study-tools/` directory referenced by all 3 in-scope modules.

**12. Deliverables:** End-to-end generate → review → quiz → score loop.

**13. Testing Checklist:**
- [ ] Notes downloadable as file (Outputs block: "Notes Download")
- [ ] Flashcards render both sides correctly
- [ ] Quiz scoring matches expected correct-answer count
- [ ] Progress Dashboard (existing) reflects new quiz_results entries

**14. Acceptance Criteria:** Generated study material is grounded and quiz scores persist correctly to feed the existing Progress Dashboard.

---

## Phase 9 — Animations (Manim)

**1. Phase Name:** Quantum Animation Rendering

**2. Objective:** Generate and serve Manim-rendered animations for gates and algorithms.

**3. User Story:** *As a student, I can watch an animation of how a gate transforms a qubit state or how an algorithm executes step-by-step.*

**4. Features Included:** Quantum animations, gate animations, algorithm animations.

**5. Frontend Tasks**
| Task | Detail |
|---|---|
| Components | `AnimationPlayer.tsx` (HTML5 video player, sourced from Firebase Storage URL) |
| Integration | Embedded in Gate Playground (per-gate) and Algorithm Explorer (per-algorithm) |

**6. Backend Tasks** *(Animation block)*
| Task | Detail |
|---|---|
| Router | `animation_router.py`: `/animations/gate/{gate_name}`, `/animations/algorithm/{slug}` |
| Service | `manim_service.py`: triggers a Manim render job for a given gate/algorithm scene script, outputs `.mp4`, uploads to Firebase Storage, returns public/signed URL |

**7. Database Changes**
| Collection | Fields |
|---|---|
| `animation_cache` (new) | `_id, key (gate_name/slug), storage_url, rendered_at` — avoids re-rendering identical animations |

**8. API Endpoints**
| Method | URL | Input | Output | Auth |
|---|---|---|---|---|
| GET | `/api/v1/animations/gate/{gate_name}` | path | `{storage_url}` (cached or newly rendered) | Firebase token |
| GET | `/api/v1/animations/algorithm/{slug}` | path | `{storage_url}` | Firebase token |

**9. Data Flow:**
```
React (open animation) → FastAPI → check MongoDB animation_cache → (miss) Manim render → Firebase Storage upload → MongoDB cache write → signed URL → React (video playback)
```

**10. UI Screens:** Embedded animation player within Gate Playground gate-detail popover and Algorithm Detail page.

**11. Folder Structure:** `manim_service.py` + `scenes/` (Manim scene scripts, one per gate/algorithm) under `backend/app/animation/`.

**12. Deliverables:** At least one working rendered animation end-to-end (e.g., Hadamard gate Bloch-sphere rotation).

**13. Testing Checklist:**
- [ ] First request triggers render + cache write
- [ ] Second request for same key serves cached URL (no re-render)
- [ ] Firebase Storage URL is playable in `<video>` tag
- [ ] Render failure returns clear error, not a silent blank player

**14. Acceptance Criteria:** Gate and algorithm animations render correctly once and are served from cache thereafter.

---

## Phase 10 — Educator Features

**1. Phase Name:** Educator Features

**2. Objective:** Provide teacher-specific tools layered on top of the same 3 modules (no new modules, only role-gated views using existing RBAC).

**3. User Story:** *As an educator, I can build assignments and lessons using existing circuits/algorithms and preview them as a student would see them.*

**4. Features Included:** Assignment Builder, Example Library, Lesson Builder, Student Preview.

**5. Frontend Tasks**
| Task | Detail |
|---|---|
| Pages | `AssignmentBuilderPage.tsx`, `LessonBuilderPage.tsx` — gated by existing RBAC role check (`role === 'educator'`) |
| Components | `ExampleLibraryBrowser.tsx` (reuses `AlgorithmCard`/`CircuitCard`), `StudentPreviewFrame.tsx` |

**6. Backend Tasks**
| Task | Detail |
|---|---|
| Router | `educator_router.py`: `/assignments`, `/lessons` (CRUD), reuses existing RBAC middleware for role enforcement |
| Service | `educator_service.py`: assembles assignment/lesson documents referencing existing `saved_circuits`/`algorithm_catalog` IDs |

**7. Database Changes**
| Collection | Fields | Indexes |
|---|---|---|
| `assignments` (new) | `_id, educator_id, title, circuit_ids[], due_date, instructions` | `educator_id` |
| `lessons` (new) | `_id, educator_id, title, sections[], linked_algorithm_slugs[]` | `educator_id` |

**8. API Endpoints**
| Method | URL | Input | Output | Auth |
|---|---|---|---|---|
| POST | `/api/v1/assignments` | `{title, circuit_ids[], due_date, instructions}` | `{assignment_id}` | Firebase token + educator role (existing RBAC) |
| GET | `/api/v1/assignments` | none | `[Assignment]` | educator role |
| POST | `/api/v1/lessons` | `{title, sections[]}` | `{lesson_id}` | educator role |

**9. Data Flow:**
```
React (Educator builds assignment) → FastAPI (RBAC check via existing middleware) → MongoDB Atlas → confirmation → React
Student Preview: React renders assignment using the SAME Gates Playground/Algorithm Explorer components in read-simulated mode
```

**10. UI Screens:** Assignment Builder, Lesson Builder, Example Library, Student Preview overlay.

**11. Folder Structure:** `educator_router.py` + `educator_service.py` in backend; `educator/` frontend directory reusing existing module components.

**12. Deliverables:** Educators can compose assignments/lessons from existing circuits and algorithms and preview the student-facing rendering.

**13. Testing Checklist:**
- [ ] Non-educator role blocked (403) from these endpoints
- [ ] Assignment references valid, existing circuit IDs only
- [ ] Student Preview renders identically to actual student view
- [ ] Existing RBAC roles/permissions unaffected

**14. Acceptance Criteria:** Educator tooling works entirely on top of existing RBAC/Auth with zero changes to those systems.

---

## Phase 11 — Testing, Optimization, Deployment

**1. Phase Name:** Testing, Optimization & Deployment

**2. Objective:** Harden the 3 modules for production: automated tests, performance tuning, and deployment readiness within the fixed architecture.

**3. User Story:** *As a platform owner, I need confidence the new modules are correct, performant, and safe to release.*

**4. Features Included:** Unit/integration test suites, load testing of simulation endpoints, sandbox hardening review, deployment checklist.

**5. Frontend Tasks**
| Task | Detail |
|---|---|
| Testing | React Testing Library component tests for `CircuitCanvas`, `MonacoEditorPanel`, `AlgorithmCard` |
| Optimization | Memoize expensive re-renders (Bloch Sphere, Histogram) with `React.memo`/`useMemo` |

**6. Backend Tasks**
| Task | Detail |
|---|---|
| Testing | `pytest` suites per service: `qiskit_service`, `code_execution_service`, `groq_service`/`langchain_service` (mocked), `manim_service` (mocked render) |
| Optimization | Cache repeated simulation requests (identical circuit hash) at the FastAPI layer; connection pooling for MongoDB Atlas client |
| Security | Re-audit `code_execution_service` sandbox (import allow-list, timeout, memory cap) |

**7. Database Changes:** Add indexes review pass across all new collections (confirm all listed indexes from Phases 1–10 are created in Atlas).

**8. API Endpoints:** No new endpoints — validation/regression pass across all endpoints defined in Phases 1–10.

**9. Data Flow:** No change — verification that all flows in Phases 1–10 hold under load (e.g., concurrent `/simulate` calls) and failure conditions (Groq timeout, ChromaDB miss, Manim render failure) degrade gracefully.

**10. UI Screens:** No new screens — regression pass on all screens from Phases 1–10.

**11. Folder Structure:** `backend/tests/`, `frontend/src/__tests__/` added.

**12. Deliverables:** Passing test suite, documented performance benchmarks, deployment runbook.

**13. Testing Checklist:**
- [ ] All Phase 1–10 acceptance criteria re-verified
- [ ] Load test: 50 concurrent `/simulate` requests complete under target latency
- [ ] Sandbox escape attempts (in `code_execution_service`) fail safely
- [ ] Groq/ChromaDB timeouts return graceful fallback message, not a 500

**14. Acceptance Criteria:** All modules pass their respective test suites, degrade gracefully under third-party service failure, and meet defined latency targets for simulation and AI endpoints.

---

## 3. Cross-Phase Milestones & Sprint Mapping

| Sprint | Phases Covered | Milestone |
|---|---|---|
| Sprint 1 | Phase 1–2 | Navigation live + circuit builder with persistence |
| Sprint 2 | Phase 3–4 | Simulation working in both Gate & Code Playground |
| Sprint 3 | Phase 5–6 | Debugger + Algorithm Explorer catalog live |
| Sprint 4 | Phase 7–8 | AI Tutor + Notes/Flashcards/Quiz live |
| Sprint 5 | Phase 9–10 | Animations + Educator tooling live |
| Sprint 6 | Phase 11 | Hardening, testing, deployment sign-off |

## 4. Global Testing & Acceptance Summary

Every phase's checklist must pass before the next phase's backend service is allowed to depend on it (e.g., Phase 6's `/algorithms/{slug}/run` depends on Phase 3's `qiskit_service`, which must already be fully validated).

## 5. Architecture Compliance Statement

Every task in this document maps to exactly one locked architecture block:
- **Frontend** → React/TypeScript/Tailwind/Shadcn/React Three Fiber components only
- **Backend** → FastAPI routers/services only
- **Quantum Engine** → Qiskit/Qiskit Aer only, no alternate simulators
- **Processing** → Groq → LangChain → ChromaDB only, no alternate LLM providers
- **Animation** → Manim only
- **Database** → MongoDB Atlas only
- **Auth/Storage** → existing Firebase Authentication/Storage, integrated not rebuilt

No phase introduces Node.js, Docker orchestration, microservices, OpenAI APIs, or any technology outside the table in Section 1.
