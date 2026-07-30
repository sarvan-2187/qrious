# Quantum Roadmap — Implementation Blueprint & Feature Roadmap

> **Document Type**: Future Milestone Specification & Implementation Plan  
> **Status**: Planned for Future Implementation  
> **Target System**: Qrious Quantum Learning Platform  
> **Scope**: Core Structured Curriculum, SVG River Path UI, Live Circuit Simulation, Portion Assessments, Notes Sync. (Gamification features like XP, streaks, badges are deferred).

---

## 1. Project Vision & Future Objectives

The **Quantum Roadmap** is planned as the core interactive curriculum engine for Qrious. It will translate complex quantum mechanics, quantum computing algorithms, quantum communication protocols, quantum machine learning, and physical hardware architectures into a structured, visual learning path.

When implemented in a future sprint, learners will navigate through curriculum nodes along an adaptive SVG "River Path", unlocking sequential and branching modules. Each topic will offer an immersive, multi-tab learning modal featuring theoretical deep-dives, live OpenQASM 2.0 quantum circuit simulations powered by Qiskit Aer, flashcard review decks, portion-aligned quizzes, and synced personal note-taking.

---

## 2. Planned Curriculum Architecture (56 Total Topics across 4 Domains)

The future curriculum will be organized into four domain paths:

```
                  ┌─────────────────────────────────────────┐
                  │       PLANNED QUANTUM ROADMAP PATHS     │
                  └────────────────────┬────────────────────┘
                                       │
      ┌────────────────────┬───────────┴───────────┬────────────────────┐
      ▼                    ▼                       ▼                    ▼
Quantum Computing   Quantum Comm.               QML                 Hardware
  (30 Lessons)       (10 Lessons)            (8 Lessons)           (8 Lessons)
```

### Domain 1: Quantum Computing (30 Planned Lessons)
Focuses on gate-based quantum computation, linear algebra primitives, single & multi-qubit transformations, quantum algorithms, and variational methods.

1. **qc-01: Introduction to Qubits & Superposition** — Quantum vs classical bits, Bloch Sphere representation, statevectors.
2. **qc-02: Single-Qubit Gates (X, Y, Z, H)** — Pauli operators, Hadamard gate, matrix transformations, state rotation.
3. **qc-03: Phase Gates & Rotations (S, T, Rx, Ry, Rz)** — Phase shifts, arbitrary rotations, Euler angle decomposition.
4. **qc-04: Measurement & Collapse** — Born's rule, measurement operators, statevector projection, basis changes.
5. **qc-05: Two-Qubit Systems & Entanglement** — Tensor products, multi-qubit statevectors, Bell states, CNOT gate.
6. **qc-06: Controlled Gates (CZ, SWAP, Toffoli)** — Multi-qubit control operations, universal gate sets.
7. **qc-07: Quantum Circuits & OpenQASM** — Circuit diagrams, gate depth, OpenQASM 2.0 syntax, circuit composition.
8. **qc-08: Quantum Teleportation** — Protocol flow, Bell measurement, classical communication channel, state reconstruction.
9. **qc-09: Superdense Coding** — Transmitting two classical bits via one qubit, entangled pair resource.
10. **qc-10: Deutsch's Algorithm** — Black-box oracle, evaluating global function properties in a single query.
11. **qc-11: Deutsch-Jozsa Algorithm** — Determining constant vs balanced functions for $n$-bit inputs.
12. **qc-12: Bernstein-Vazirani Algorithm** — Finding hidden secret bitstrings $s$ in $O(1)$ quantum queries.
13. **qc-13: Simon's Algorithm** — Uncovering hidden periodicities, exponential speedup over classical algorithms.
14. **qc-14: Quantum Fourier Transform (QFT)** — Discrete Fourier transform on quantum registers, phase shift gates.
15. **qc-15: Quantum Phase Estimation (QPE)** — Estimating unitary operator eigenvalues, precision registers.
16. **qc-16: Order Finding & Shor's Algorithm** — Period finding via QPE, prime factorization, RSA cryptographic impact.
17. **qc-17: Grover's Search Algorithm** — Oracle construction, phase inversion, amplitude amplification, $O(\sqrt{N})$ speedup.
18. **qc-18: Quantum Counting** — Combining Grover search with QPE to count marked items.
19. **qc-19: Amplitude Amplification** — Generalized Grover operator, structured search applications.
20. **qc-20: Quantum Random Walk** — Discrete vs continuous quantum walks, spatial search algorithms.
21. **qc-21: Quantum Linear Systems (HHL Algorithm)** — Solving $Ax = b$ matrix equations with exponential speedup.
22. **qc-22: Variational Quantum Eigensolver (VQE)** — Hybrid classical-quantum algorithm, ansatz preparation, molecular energy minimization.
23. **qc-23: Quantum Approximate Optimization Algorithm (QAOA)** — Combinatorial optimization (Max-Cut), mixer & cost Hamiltonians.
24. **qc-24: Quantum Simulation of Hamiltonians** — Trotterization, time-evolution operators $e^{-iHt}$, material science modeling.
25. **qc-25: Quantum Phase Transitions** — Ising model simulation, order parameters, ground state degeneracies.
26. **qc-26: Quantum Error Mitigation** — Zero-noise extrapolation, probabilistic error cancellation, NISQ noise management.
27. **qc-27: Quantum Decoherence & Noise Models** — T1 relaxation, T2 dephasing, depolarizing channels, Kraus operators.
28. **qc-28: Quantum State Tomography** — Reconstructing density matrices $\rho$ from Pauli basis measurements.
29. **qc-29: Quantum Process Tomography** — Characterizing quantum gates, process fidelity calculations.
30. **qc-30: Fault-Tolerant Quantum Architecture Capstone** — Combining algorithms, error correction, and physical hardware constraints into end-to-end applications.

### Domain 2: Quantum Communication & Cryptography (10 Planned Lessons)
1. **qcomm-01: Fundamentals of Quantum Information** — No-cloning theorem, no-deleting theorem, quantum entropy.
2. **qcomm-02: BB84 Quantum Key Distribution** — Polarization bases, eavesdropping detection, error rate analysis.
3. **qcomm-03: E91 Entanglement-Based QKD** — Bell inequality test (CHSH inequality), security proofs against eavesdropping.
4. **qcomm-04: B92 Protocol & Decoy State QKD** — Single-state basis protocol, mitigating photon-number splitting attacks.
5. **qcomm-05: Quantum Secret Sharing** — GHZ state distribution, threshold secret reconstruction.
6. **qcomm-06: Quantum Repeater Networks** — Entanglement swapping, purification, long-distance quantum channels.
7. **qcomm-07: Quantum Memories** — Storing photon states, atomic ensembles, rare-earth crystal storage.
8. **qcomm-08: Quantum Direct Communication (QSDC)** — Transmitting secret messages directly without key generation.
9. **qcomm-09: Post-Quantum Cryptography Comparison** — Lattice-based (LWE) vs quantum key distribution trade-offs.
10. **qcomm-10: Quantum Internet Architecture Capstone** — Layered stack model, entanglement routing, global quantum network design.

### Domain 3: Quantum Machine Learning - QML (8 Planned Lessons)
1. **qml-01: Introduction to QML & Quantum Embeddings** — Angle encoding, amplitude encoding, basis encoding.
2. **qml-02: Parameterized Quantum Circuits (PQCs)** — Rotation gates with trainable classical parameters $\theta$, expressibility.
3. **qml-03: Quantum Classifiers & Variational Circuits** — Cost functions, parameter optimization via Adam / SPSA.
4. **qml-04: Quantum Support Vector Machines (QSVM)** — Feature maps, calculating quantum kernel matrices $K(x, y) = |\langle\phi(x)|\phi(y)\rangle|^2$.
5. **qml-05: Quantum Neural Networks (QNN)** — Layered quantum operations, measurement-driven hidden layers.
6. **qml-06: Barren Plateaus in QML** — Vanishing gradients in high-dimensional Hilbert spaces, mitigation techniques.
7. **qml-07: Quantum Generative Adversarial Networks (QGAN)** — Quantum generators and discriminators, learning quantum distributions.
8. **qml-08: Quantum Machine Learning Capstone** — Building a hybrid classical-quantum classifier for real-world datasets.

### Domain 4: Hardware & Fault Tolerance (8 Planned Lessons)
1. **hw-01: Physical Qubit Modalities Overview** — DiVincenzo criteria, coherence times, gate fidelities.
2. **hw-02: Superconducting Transmon Qubits** — Josephson junctions, LC circuits, microwave pulses, dispersive readout.
3. **hw-03: Trapped Ion Qubits** — Paul traps, laser cooling, motional bus gates (Mølmer-Sørensen gate).
4. **hw-04: Neutral Atom & Photonic Modalities** — Optical tweezers, Rydberg states, linear optical quantum computing (LOQC).
5. **hw-05: Classical-Quantum Control Interfaces** — Cryogenic CMOS, arbitrary waveform generators (AWG), pulse scheduling.
6. **hw-06: Quantum Error Detection & Bit-Flip Codes** — 3-qubit bit-flip and phase-flip error detection circuits.
7. **hw-07: Stabilizer Codes & Surface Codes** — 9-qubit Shor code, 2D lattice surface codes, syndrome measurement.
8. **hw-08: Fault-Tolerant Quantum Thresholds Capstone** — Logical vs physical qubits, magic state distillation, fault tolerance thresholds.

---

## 3. Planned Prerequisite DAG & Unlock State Machine

When implemented, each topic node will adhere to a strict lifecycle state:

```
[ Locked ] ──(All Prerequisites Completed)──► [ Unlocked ] ──(User Opens Lesson)──► [ In Progress ] ──(Completes Quiz)──► [ Completed ]
```

### Planned State Behaviors
- **`locked`**: One or more prerequisite topic slugs are incomplete. The node will render dimmed with a lock icon badge. Hovering will show a tooltip listing missing prerequisite lessons.
- **`unlocked`**: Prerequisites met; ready for the learner to begin. Renders highlighted with an "Available" pulse ring.
- **`in_progress`**: Learner has opened the lesson or executed OpenQASM code snippets. Displays a progress ring indicator.
- **`completed`**: Learner has completed the portion assessment quiz / marked the lesson finished. Node turns solid emerald/green with a checkmark badge.

---

## 4. Planned Visual River Path UI & Dynamic Rendering Engine

The Roadmap page will feature a custom dynamic River Path canvas rendered with SVG bezier curves:

```
   (Node 1) ─── Bezier Curve ───► (Node 2) ─── Bezier Curve ───► (Node 3)
      │                                                              │
      └─── Branching Curve ───► (Node 2B) ─── Merge Curve ───────────┘
```

### Key UI Features To Be Implemented
1. **Domain Switcher Navigation**:
   - Filter tabs: `Quantum Computing`, `Quantum Communication`, `Quantum Machine Learning`, `Hardware & Fault Tolerance`.
   - Switching domains will update the River Path smoothly without page reloads.
2. **Dynamic Bezier Path Calculation**:
   - SVG cubic curves (`<path d="M x1 y1 C cx1 cy1, cx2 cy2, x2 y2" />`) will dynamically connect node pairs based on calculated $(X, Y)$ grid positions.
   - Active connectors between completed/unlocked nodes will glow with subtle animated gradient strokes (`stroke-emerald-500/80`).
3. **Interactive Topic Node (`RoadmapNode.tsx`)**:
   - Icons tailored to topic category (Atom, Gate, Lock, Brain, Chip, Math, Algorithm).
   - Node metadata: Lesson title, estimated completion time (e.g. `15 min`), difficulty tag (`beginner`, `intermediate`, `advanced`).
4. **Header Controls**:
   - **Search Bar**: Live keyword filter across topic titles.
   - **Filter Buttons**: Toggle view between `All Topics`, `Unlocked`, `In Progress`, `Completed`.
   - **Overall Progress Indicator**: Percentage completion bar showing total progress in selected domain.

---

## 5. Planned Topic Detail Modal (5 Core Modules)

Clicking an unlocked node will launch the `TopicDetailModal.tsx` containing five dedicated tabs:

### Module 1: 📘 Overview & Theory
- High-resolution markdown rendering styled with Geist Sans (`font-sans`).
- Mathematical equations rendered via LaTeX formatting ($\langle \psi | \phi \rangle$, $H = \frac{1}{\sqrt{2}}\begin{pmatrix} 1 & 1 \\ 1 & -1 \end{pmatrix}$).
- Bulleted learning objectives list summarizing core concepts.

### Module 2: ⚡ Live OpenQASM Quantum Playground
- Embedded OpenQASM 2.0 code editor pre-loaded with topic snippet (e.g., Bell state circuit for Entanglement topic).
- **"Run Circuit"** button sending OpenQASM payload to backend simulator (`/api/v1/qstudio/execute` or `/api/v1/learning/roadmap/{slug}/simulate`).
- Visualizations: Statevector probabilities bar chart, measurement histogram, and Bloch sphere coordinates.

### Module 3: 🎴 Flashcard Review Deck
- Interactive 3D flip cards to test concept retention.
- Controls: Previous / Next navigation, Flip on click, Card counter (`3 / 6`).

### Module 4: 📝 Portion-Aligned Quiz Assessment
- 3-question quick check mapped specifically to topic concepts (Multiple choice, multi-correct, true/false, circuit prediction).
- Instant grading with detailed explanations for incorrect responses.

### Module 5: 📓 Synchronized Personal Notes
- Personal note editor synced automatically to the user's MongoDB `notes` collection keyed by `topic_slug` and `firebase_uid`.

---

## 6. Planned Backend Architecture & Data Schemas

### MongoDB Collections To Be Maintained
1. **`roadmap_topics`**: Stores topic metadata, domain, order index, prerequisites list, theory markdown, and OpenQASM demo snippets.
2. **`user_progress`**: Stores learner progress records (`firebase_uid`, `topic_slug`, `domain`, `status`, `progress_pct`, `started_at`, `completed_at`, `total_time_spent_seconds`).
3. **`topic_quizzes` & `topic_flashcards`**: Stores question banks and flashcard pairs indexed by `topic_slug`.

### Planned REST Endpoints (`backend/routers/roadmap.py`)
- `GET /api/v1/learning/roadmap`: Query topic tree with user progress.
- `GET /api/v1/learning/roadmap/{slug}`: Fetch single topic detail.
- `POST /api/v1/learning/roadmap/{slug}/start`: Mark topic `in_progress` (validating prerequisites).
- `POST /api/v1/learning/roadmap/{slug}/complete`: Mark topic `completed`.
- `GET /api/v1/learning/roadmap/{slug}/flashcards`: Retrieve flashcard deck.
- `GET /api/v1/learning/roadmap/{slug}/quiz`: Retrieve 3-question quiz.
- `POST /api/v1/learning/roadmap/{slug}/simulate`: Run OpenQASM circuit via Qiskit Aer backend.

---

## 7. Files To Be Created / Updated in Future Implementation

### Backend Files (`backend/`)
- `backend/routers/roadmap.py` — API router handling roadmap endpoints.
- `backend/services/roadmap_seed.py` — Seeding service for all 56 curriculum topics.
- `backend/services/quiz_seed.py` — Quiz questions catalog.
- `backend/services/flashcard_seed.py` — Flashcard catalog.
- `backend/routers/qstudio.py` — Qiskit Aer simulation endpoint.
- `backend/main.py` — Mount routers (`app.include_router(...)`).

### Frontend Files (`frontend/src/features/roadmap/`)
- `frontend/src/features/roadmap/types/roadmap.types.ts` — TypeScript interfaces.
- `frontend/src/features/roadmap/api.ts` — Axios API client functions.
- `frontend/src/features/roadmap/pages/RoadmapPage.tsx` — Main River Path page.
- `frontend/src/features/roadmap/components/RoadmapNode.tsx` — Visual topic node button.
- `frontend/src/features/roadmap/components/RoadmapConnector.tsx` — SVG bezier curve connector.
- `frontend/src/features/roadmap/components/TopicDetailModal.tsx` — 5-Tab lesson detail modal.
- `frontend/src/features/roadmap/components/TopicFlashcardsModal.tsx` — 3D flashcards deck viewer.
- `frontend/src/features/roadmap/components/VideoPlayerModal.tsx` — Video player popup.
- `frontend/src/App.tsx` — Route registration (`/roadmap`).

---
