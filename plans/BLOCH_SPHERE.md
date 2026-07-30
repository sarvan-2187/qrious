# Qrious — 3D Bloch Sphere Visualizer

> A complete technical reference covering what it is, every library used, how the frontend and backend are built, and where it appears across the application.

---

## Table of Contents

1. [What Is the Bloch Sphere?](#1-what-is-the-bloch-sphere)
2. [Tech Stack at a Glance](#2-tech-stack-at-a-glance)
3. [File Structure](#3-file-structure)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Full Data Flow](#6-full-data-flow)
7. [Where It Appears in the App](#7-where-it-appears-in-the-app)

---

## 1. What Is the Bloch Sphere?

The **Bloch Sphere** is a unit sphere in 3D space that represents the pure quantum state of a single qubit.
Unlike a classical bit (0 or 1), a qubit can exist in a superposition described by two complex amplitudes:

```
|?? = a|0? + ß|1?      where |a|² + |ß|² = 1
```

Re-parameterised using two angles to produce a point on the sphere surface:

```
|?? = cos(?/2)|0? + e^{if} · sin(?/2)|1?

  ? ? [0, p]    — polar angle    (latitude)
  f ? [0, 2p)   — azimuthal angle (longitude)
```

Key landmarks on the sphere:

| Point | Coordinates | State |
|---|---|---|
| North pole | z = +1 | `\|0?` — ground state |
| South pole | z = -1 | `\|1?` — excited state |
| Equatorial plane | z = 0 | Equal-weight superpositions (differ only in phase) |
| Any surface point | (u, v, w) | A valid pure qubit state |

Every quantum gate = a **rotation of this sphere**. This is a consequence of the mathematical isomorphism between SU(2) (qubit unitaries) and SO(3) (3D rotations).

---

## 2. Tech Stack at a Glance

| Layer | Library | Purpose |
|---|---|---|
| **3D Renderer** | `@react-three/fiber` | React renderer for Three.js — mounts a WebGL `<Canvas>` |
| **3D Helpers** | `@react-three/drei` | `OrbitControls`, `Html`, `Line`, `Sphere`, `Text`, `arrowHelper` |
| **3D Engine** | `three` (Three.js) | Geometry, quaternions, `Vector3`, materials, coordinate math |
| **Quantum Math** | `mathjs` | Complex numbers, 2×2 matrix ops, `math.expm()` for Hamiltonian evolution |
| **UI Framework** | React 19 + TypeScript | Component tree, hooks, state management |
| **Styling** | Tailwind CSS | Theme-aware (`data-theme`), dark/light mode, spacing |
| **Icons** | `lucide-react` | `RotateCw`, `Zap`, `Radio`, `Sliders`, `CheckCircle2` |
| **Toasts** | `sonner` | Gate/rotation feedback notifications |
| **Backend** | FastAPI (Python) | Progress persistence + Qiskit Bloch vector computation |
| **Quantum Simulator** | Qiskit + Qiskit Aer | Density matrix evolution; per-qubit Bloch vector extraction |
| **Database** | MongoDB Atlas | `bloch_progress` collection — completed task IDs per user |
| **Auth** | Firebase Authentication | Firebase JWT verified on every API call |

---

## 3. File Structure

```
frontend/src/
+-- components/
¦   +-- bloch/
¦   ¦   +-- BlochSphereVisualizer.tsx       ? Full standalone page (orchestrator)
¦   ¦   +-- types/
¦   ¦   ¦   +-- quantum.ts                  ? Core TypeScript type definitions
¦   ¦   +-- utils/
¦   ¦   ¦   +-- quantumMath.ts              ? All quantum math (100% browser-side)
¦   ¦   +-- components/
¦   ¦       +-- BlochSphere3D.tsx           ? WebGL 3D sphere (main render)
¦   ¦       +-- ControlPanels.tsx           ? Accordion gate / rotation controls
¦   ¦       +-- RabiChart.tsx               ? RF Pulse oscillation chart
¦   ¦       +-- StateInspector.tsx          ? Live qubit state readout
¦   ¦       +-- TasksPanel.tsx              ? 21 guided tasks + gate reference
¦   +-- landing/
¦       +-- BlochSphereCanvas.tsx           ? Decorative sphere (landing page)
¦
+-- modules/
    +-- gates-playground/
        +-- components/
            +-- BlochSphereViewer.tsx        ? Per-qubit sphere in debugger panel
            +-- GateInspectorPopup.tsx       ? Inline sphere in gate inspector

backend/
+-- routers/
¦   +-- bloch_router.py                     ? /api/v1/bloch — progress GET/POST
+-- models/
¦   +-- simulation_model.py                 ? BlochVector, DebugStep Pydantic models
+-- services/
    +-- qiskit_service.py                   ? _compute_bloch_vectors() + run_stepwise()
```

---

## 4. Frontend Architecture

### 4.1 Type System — `types/quantum.ts`

All data flowing through the system is strictly typed:

```typescript
// Raw qubit state — two complex amplitudes [a, ß]
export interface ComplexNumber { re: number; im: number; }
export type QubitState = [ComplexNumber, ComplexNumber];

// 3D coordinates on the sphere surface
export interface BlochVector {
  u: number;  // x-axis expectation value  ? [-1, 1]
  v: number;  // y-axis expectation value  ? [-1, 1]
  w: number;  // z-axis expectation value  ? [-1, 1]
}

// A sequence of 3D points — drawn as an arc trace after a gate
export interface TrajectoryPoint {
  x: number[];   // x coords for each trace step
  y: number[];   // y coords
  z: number[];   // z coords
  color: string;
}

// RF Pulse simulation parameters
export interface PulseParams {
  detuning: number;     // ? — frequency detuning
  phase: number;        // f° — carrier phase
  amplitude: number;    // ?1 — Rabi frequency
  pulseLength: number;  // t — pulse duration
}

// Axis + angle for the custom rotation panel
export interface RotationParams {
  axis: 'x' | 'y' | 'z' | 'custom';
  angle: number;           // degrees
  polarAngle?: number;     // ? in spherical coords
  azimuthalAngle?: number; // f in spherical coords
}
```

---

### 4.2 Quantum Math Engine — `utils/quantumMath.ts`

The simulation brain. Runs **100% in the browser** using `mathjs`. No backend call needed for the standalone page.

#### State ? Bloch Coordinates

Uses the **density matrix formula** to convert complex amplitudes into the 3D Bloch vector:

```typescript
export function stateToBlochVector(state: QubitState): BlochVector {
  // ? elements from |????|:
  const r01 = a · ß*       // off-diagonal
  const r00 = a · a* = |a|²
  const r11 = ß · ß* = |ß|²

  const u =  2 * Re(r01)   // ?X? = Tr(? sx)
  const v = -2 * Im(r01)   // ?Y? = Tr(? sy)
  const w = r00 - r11      // ?Z? = Tr(? sz)  =  |a|² - |ß|²

  return { u, v, w };
}
```

#### Gate Operators (2×2 Unitary Matrices)

| Function | What It Builds |
|---|---|
| `createRotationOperator(axis, ?)` | R?(?), R?(?), R?(?) — Pauli rotation matrices |
| `createCustomAxisRotationOperator(?, f, ?)` | Arbitrary axis rotation: `R_n^(?) = cos(?/2)I - i·sin(?/2)(n?X + n?Y + n?Z)` |
| `createU3Operator(?, f, ?)` | IBM Universal gate — 3-parameter SU(2) |
| `getGateOperator(gate)` | H, X, Y, Z, S, S†, T, T† standard matrices |

#### Applying a Gate

```typescript
export function applyUnitary(operator: math.Matrix, state: QubitState): QubitState {
  const newState = math.multiply(operator, stateVec);  // |?'? = U|??

  // Re-normalize to keep |a'|² + |ß'|² = 1  (guards float drift)
  const norm = Math.sqrt(a'² + ß'²);
  return [
    { re: a'.re / norm, im: a'.im / norm },
    { re: ß'.re / norm, im: ß'.im / norm }
  ];
}
```

#### Trajectory Calculation — The Arc Trace Effect

Every gate application leaves a glowing arc trace on the sphere surface. Two strategies:

**Standard axis rotations** — interpolates angle 0 ? final in 25 steps:
```typescript
for step = 1 to 25:
    stepAngle = (angleRad / 25) * step
    rotOp     = createRotationOperator(axis, stepAngle)
    stepState = applyUnitary(rotOp, initialState)
    vec       = stateToBlochVector(stepState)
    push (vec.u, vec.v, vec.w)
```

**Arbitrary gates** — uses **matrix eigendecomposition** for the true geodesic:
```typescript
// Find eigenvalues ?1, ?2 of U (via Cayley–Hamilton characteristic polynomial)
// Build projectors P1, P2 from spectral decomposition
// Interpolate: U(t) = ?1? · P1 + ?2? · P2     (t goes 0 ? 1)
// Apply U(t) to initial state at each of 25 steps ? trace the geodesic
```

Falls back to spherical-linear interpolation if eigendecomposition fails numerically.

#### Rabi Pulse Simulation (RF Physics)

Simulates a resonant RF drive using the full rotating-frame Hamiltonian:

```
H_total = ? · sz/2  +  O · (e^{if}s? + e^{-if}s?)

U = exp(-i · H_total · t)    via math.expm()
```

A **p-pulse** (Amplitude=1, Length=0.5) flips `|0?` ? `|1?`. Detuning ? tilts the rotation axis, simulating off-resonance drive.

---

### 4.3 3D WebGL Sphere — `components/BlochSphere3D.tsx`

The rendered 3D object. Built with React Three Fiber — a React renderer mapping JSX to Three.js scene objects.

#### Props

```typescript
interface BlochSphere3DProps {
  blochVec: BlochVector;           // current state arrow
  targetBlochVec?: BlochVector;    // target state arrow (puzzle mode only)
  trajectories: TrajectoryPoint[]; // arc traces to draw
  spinColor?: string;              // arrow color (default: #3b82f6)
  traceColor?: string;             // trace color (default: #1d4ed8)
  topStateText?: string;           // top pole label  (default: |0?)
  bottomStateText?: string;        // bottom pole label (default: |1?)
  historyLength?: number;          // max traces shown (default: 10)
  className?: string;
}
```

#### Canvas Setup

```tsx
<Canvas
  camera={{ position: [2.1, 1.55, 2.1], fov: 40 }}
  style={{ background: 'transparent' }}            // theme shows through
  gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
  // preserveDrawingBuffer: true  ? enables PNG export via canvas.toDataURL()
>
```

#### What Is Rendered Inside (`SphereScene`)

| Element | Geometry / Primitive | Material | Notes |
|---|---|---|---|
| Sphere shell | `SphereGeometry(1, 72, 72)` | `MeshPhysicalMaterial` — glass, 11% opacity, clearcoat=1 | Transparent — interior visible |
| Latitude rings | 97-pt ring arrays at -60°, -30°, 0°, 30°, 60° | `<Line>` — equator brighter/thicker | Computed via `r·cos(t), sin(latRad), r·sin(t)` |
| Meridians | 97-pt arrays, 6 great circles at 30° spacing | `<Line>` — dim (0.42 opacity) | Computed via `sin(t)·cos(f), cos(t), sin(t)·sin(f)` |
| XYZ axes | Three `<Line>` segments ±1.22 | `#64748b` | |
| Pole labels | `<Html>` overlay at Y = ±1.46 | `text-foreground font-sans text-sm` | Tailwind — theme-aware dark/light |
| Axis labels x, y | `<Html>` at ±1.38 X / Z | `text-muted-foreground text-xs` | |
| State arrow | `StateArrow` — cylinder + cone tip | `MeshStandardMaterial` + emissive glow | Smoothly animated via `useFrame` lerp |
| Target arrow | Same `StateArrow` | Same + `opacity: 0.4` | Green `#10b981` — puzzle mode only |
| Trajectory arcs | `<Line>` per `TrajectoryPoint` | `lineWidth: 3, opacity: 0.88` | Phosphor trace effect |
| Lighting | Ambient + Directional + Point | Purple point `#a5b4fc` at (-5, 4, -5) | Creates subtle 3D depth |
| Camera controls | `<OrbitControls>` | pan=off, zoom=[1.8, 4.5], rotateSpeed=0.72 | User can orbit and zoom freely |

#### State Arrow — Smooth `useFrame` Animation

The `StateArrow` sub-component animates smoothly using **lerp** inside React Three Fiber's `useFrame` hook:

```typescript
useFrame((_, dt) => {
  // Move target to new Bloch vector every frame
  targetRef.current.set(blochVec.u, blochVec.w, blochVec.v);

  // Lerp toward target at 9× speed — snappy but not instant
  smoothed.current.lerp(targetRef.current, Math.min(1, dt * 9));

  const dir = smoothed.current.clone().normalize();

  // Shaft: cylinder — position at midpoint, scale Y to shaft length,
  //        quaternion aligned from Y-up ? dir using setFromUnitVectors
  shaftRef.current.quaternion.setFromUnitVectors(Y_UP, dir);
  shaftRef.current.scale.set(1, shaftLen, 1);

  // Cone: positioned at tip, aligned to dir
  coneRef.current.position.copy(tip.sub(dir.multiplyScalar(CONE_H * 0.5)));
  coneRef.current.quaternion.setFromUnitVectors(Y_UP, dir);
});
```

The arrow uses **two separate meshes** (cylinder shaft + cone tip) rather than Three.js's built-in `ArrowHelper` to allow full material control — metalness, emissive glow, and per-mesh transparency for the target arrow.

#### Coordinate Axis Mapping

Three.js and the standard Bloch sphere use different handedness:

```
Bloch u (x-axis) ? Three.js X
Bloch v (y-axis) ? Three.js Z   (depth)
Bloch w (z-axis) ? Three.js Y   (up / height)

Code: new THREE.Vector3(blochVec.u, blochVec.w, blochVec.v)
```

---

### 4.4 Control Panels — `components/ControlPanels.tsx`

A collapsible accordion on the right side of the visualizer. Six sections using `AccordionRow` wrappers (icons from `lucide-react`):

| Section | Icon | Controls |
|---|---|---|
| Rotations — Default Axes | `RotateCw` | Quick buttons R?/R?/R? at +90° and 180°; custom angle number input + apply buttons |
| Rotations — Custom Axis | `RotateCw` | Three number inputs: polar ?°, azimuthal f°, rotation ?° ? builds `R_n^(?)` |
| Quantum Gates | `Zap` | One-click buttons: H, X, Y, Z, S, S†, T, T† |
| Universal U Gate | `RotateCw` | Three inputs: ?, f, ? ? applies `U(?, f, ?)` |
| Pulses | `Radio` | Detuning ?, Amplitude ?1, Phase f°, Length t ? X-Pulse or Y-Pulse buttons |
| Settings | `Sliders` | Color pickers (spin + trace), trace history length (1–50), export size (px) |

```typescript
export interface BlochSettings {
  spinColor: string;       // arrow color   (default '#3b82f6')
  traceColor: string;      // trace color   (default '#1d4ed8')
  topStateText: string;    // top label     (default '|0?')
  bottomStateText: string; // bottom label  (default '|1?')
  historyLength: number;   // max arc traces shown (default 10)
  exportSize: number;      // PNG export px (default 800)
}
```

---

### 4.5 Tasks Panel — `components/TasksPanel.tsx`

A large educational component (~790 lines) rendered below the sphere. Three collapsible sections:

#### Introduction + Math Reference

Explains the Bloch sphere and displays four key formulas:

| Formula | Covers |
|---|---|
| `\|?? = cos(?/2)\|0? + e^{if}sin(?/2)\|1?` | Qubit state parameterization |
| `u = 2Re(aß*)   v = -2Im(aß*)   w = \|a\|²-\|ß\|²` | Bloch vector from density matrix |
| R?, R?, R? matrix forms | Rotation gate matrices |
| X=R?(p), H=R?(p/2)·R?(p), etc. | Gate definitions as rotations |

#### Gate Reference — 12-Gate Card Grid

```typescript
const GATE_REFERENCE = [
  { name: 'Pauli X',   symbol: 'X',  matrix: [['0','1'],['1','0']],          desc: 'Bit flip (180° around X)' },
  { name: 'Pauli Y',   symbol: 'Y',  matrix: [['0','-i'],['i','0']],         desc: 'Bit & phase flip (180° around Y)' },
  { name: 'Pauli Z',   symbol: 'Z',  matrix: [['1','0'],['0','-1']],         desc: 'Phase flip (180° around Z)' },
  { name: 'Hadamard',  symbol: 'H',  matrix: [['1','1'],['1','-1']],         desc: 'Creates equal superposition' },
  { name: 'Phase S',   symbol: 'S',  matrix: [['1','0'],['0','i']],          desc: '90° rotation around Z' },
  { name: 'S†',        symbol: 'S†', matrix: [['1','0'],['0','-i']],         desc: '-90° rotation around Z' },
  { name: 'T Gate',    symbol: 'T',  matrix: [['1','0'],['0','e^{ip/4}']],   desc: '45° rotation around Z' },
  { name: 'T†',        symbol: 'T†', matrix: [['1','0'],['0','e^{-ip/4}']], desc: '-45° rotation around Z' },
  { name: 'Rx(?)',     symbol: 'Rx', matrix: [['cos(?/2)','-i sin(?/2)'], ...], desc: 'Arbitrary rotation around X' },
  { name: 'Ry(?)',     symbol: 'Ry', matrix: [['cos(?/2)','-sin(?/2)'], ...],  desc: 'Arbitrary rotation around Y' },
  { name: 'Rz(?)',     symbol: 'Rz', matrix: [['e^{-i?/2}','0'], ...],         desc: 'Arbitrary rotation around Z' },
  { name: 'Universal', symbol: 'U',  matrix: [['cos(?/2)','-e^{i?}sin(?/2)'], ...], desc: 'U(?, f, ?) — 3-parameter' }
];
```

#### 21 Guided Tasks (with Backend Progress Persistence)

```typescript
export interface Task {
  id: number;
  title: string;
  focus: string;           // e.g. "Basic state navigation"
  concept: string;         // brief conceptual explanation
  goal: string;            // what the user should achieve
  steps: string[];         // ordered instruction steps
  expectedResult: string;  // what they should see on the sphere
  insight: string;         // what this teaches them
}
```

Topics covered: X gate bit-flip, Hadamard superposition, equatorial states, S/T phase gates, Rabi p-pulses, custom axis rotations, U gate construction, teleportation prerequisites, and phase exploration.

**Progress is persisted to MongoDB via the backend:**

```typescript
// On component mount — load existing progress
const { data } = await apiClient.get('/api/v1/bloch/progress');
setCompleted(new Set(data.completed_tasks));

// On task completion — save to backend
await apiClient.post('/api/v1/bloch/progress', {
  completed_tasks: [...completedIds]
});
```

---

### 4.6 Page Orchestrator — `BlochSphereVisualizer.tsx`

Top-level page component at the `/bloch-sphere` route. Wires everything together.

#### State Managed

```typescript
const [history, setHistory]         = useState<QubitState[]>([getInitialState()]);
// Full undo stack — every gate push appends to this array

const [trajectories, setTrajectories] = useState<TrajectoryPoint[]>([]);
// Arc traces — one per gate application, rendered as phosphor traces

const [settings, setSettings]       = useState<BlochSettings>({ ... });
// Colors, labels, trace length — passed down to BlochSphere3D

const [pulse, setPulse]             = useState<PulseParams>({ detuning:0, phase:0, amplitude:1.0, pulseLength:0.5 });
// RF pulse parameters for Rabi simulation
```

#### Event Handlers

| Handler | Operation | Math Called |
|---|---|---|
| `handleRotate(axis, angleDeg)` | Rotate around X/Y/Z | `createRotationOperator` + `calculateRotationTrajectory` |
| `handleGate(gate)` | Apply H/X/Y/Z/S/T/S†/T† | `getGateOperator` + `calculateOperatorTrajectory` |
| `handleCustomRotate(?, f, ?)` | Rotate around arbitrary n^ | `createCustomAxisRotationOperator` + `calculateOperatorTrajectory` |
| `handleUGate(?, f, ?)` | Apply Universal U gate | `createU3Operator` + `calculateOperatorTrajectory` |
| `handlePulse(axis)` | Rabi RF pulse | `applyRabiPulse` — Hamiltonian + `math.expm()` |
| `handleUndo()` | Step back one gate | `history.slice(0, -1)` |
| `handleReset()` | Return to `\|0?` | `getInitialState()` |
| `handleDownload()` | Export PNG | `canvas.toDataURL('image/png')` |

#### AI Copilot Integration

The Schrödinger AI Copilot receives the current qubit state as context:

```typescript
const currentCircuitContext: CircuitContext = {
  qasm: `// 3D Bloch Sphere Visualizer State
// Qubit state: |?? = (${a.re}+${a.im}i)|0? + (${ß.re}+${ß.im}i)|1?
// Bloch Vector: x=${u}, y=${v}, z=${w}`,
  qubits: 1,
  cbits: 0,
  gateCount: history.length - 1,
};
```

---

### 4.7 Lightweight Variants

#### `BlochSphereCanvas.tsx` — Landing Page Decorative Sphere

Auto-rotating decorative sphere on the Hero section and Feature Grid card.
- Simple wireframe + spin arrow
- Auto-rotation, no user controls, no labels
- Props: `color`, `wireframeOpacity`
- Used purely for visual impact, zero quantum logic

#### `BlochSphereViewer.tsx` — Gates Playground Debugger

Compact 256px-tall sphere per qubit inside the step-by-step debugger.

Key differences from `BlochSphere3D`:
- Receives `BlochVector { x, y, z }` from the **Qiskit backend** (not in-browser math)
- Uses Three.js built-in `<arrowHelper>` (simpler, no custom animation)
- Wireframe sphere via `<Sphere>` + `meshBasicMaterial wireframe`
- Coloured axis lines with `<Text>` labels (+X red, +Y green, |0?/|1? blue)
- Coordinate mapping: `new THREE.Vector3(vector.x, vector.z, -vector.y)` (Qiskit ? Three.js)
- No orbit zoom, no trace, no labels — compact display only

#### Inline `BlochSphere` in `GateInspectorPopup.tsx`

Minimal canvas embedded in the gate detail popup. Renders a single `<arrowHelper>` for the gate's output Bloch vector with no surrounding chrome.

---

## 5. Backend Architecture

### 5.1 Bloch Progress Router — `routers/bloch_router.py`

**Base path:** `/api/v1/bloch`  
**Auth:** Firebase JWT verified on every request via `get_verified_firebase_user` dependency

#### `GET /api/v1/bloch/progress`

Fetches the authenticated user's completed Bloch task IDs from MongoDB.

```python
@router.get("/progress", summary="Get user's 3D Bloch sphere task progress")
async def get_bloch_progress(decoded_token: dict = Depends(get_verified_firebase_user)):
    firebase_uid = decoded_token.get("uid")
    progress_doc = await db.bloch_progress.find_one({"firebase_uid": firebase_uid})

    return {
        "data": {
            "firebase_uid": firebase_uid,
            # Returns empty list [] for new users who have no record yet
            "completed_tasks": progress_doc.get("completed_tasks", [])
        },
        "error": None
    }
```

#### `POST /api/v1/bloch/progress`

Saves updated task progress and awards XP for newly completed tasks.

```python
@router.post("/progress")
async def save_bloch_progress(progress_input: BlochProgressUpdate, ...):

    # Load existing progress
    existing_completed = set(existing_progress.get("completed_tasks", []))

    # Diff: only newly completed tasks get XP (prevents re-awarding)
    newly_completed = set(progress_input.completed_tasks) - existing_completed

    # Award 10 XP per newly completed task — idempotent key prevents double-award
    for task_id in newly_completed:
        idempotent_key = f"bloch_task_{firebase_uid}_{task_id}"
        await xp_engine.award_xp(
            db=db,
            firebase_uid=firebase_uid,
            source="bloch_task",
            amount=10,                    # 10 XP per task
            source_ref_id=str(task_id),
            idempotent_key=idempotent_key
        )

    # Upsert — creates document if user has no record yet
    await db.bloch_progress.update_one(
        {"firebase_uid": firebase_uid},
        {"$set": {"completed_tasks": [...], "updated_at": datetime.utcnow()}},
        upsert=True
    )
```

**Request body:**
```python
class BlochProgressUpdate(BaseModel):
    completed_tasks: List[int]   # list of completed task IDs (0-indexed)
```

---

### 5.2 Simulation Models — `models/simulation_model.py`

Pydantic models defining the Bloch vector data shape flowing from Qiskit to the frontend:

```python
class BlochVector(BaseModel):
    x: float    # ?X? = Tr(? sx)
    y: float    # ?Y? = Tr(? sy)
    z: float    # ?Z? = Tr(? sz)

class DebugStep(BaseModel):
    step_index: int
    gate_applied: Optional[dict]                        # gate that was just applied
    statevector: List[ComplexNumber]                    # full state vector
    density_matrix: List[List[ComplexNumber]]           # full density matrix ?
    per_qubit_bloch_vectors: Dict[str, BlochVector]     # "0" ? {x,y,z}, "1" ? {x,y,z}, ...
    probabilities: Dict[str, float]                     # "00" ? 0.5, "11" ? 0.5, ...
```

Each `DebugStep` is one gate worth of simulation. The `per_qubit_bloch_vectors` maps each qubit index (as string key) to its individual Bloch vector, computed from the reduced single-qubit density matrix.

---

### 5.3 Qiskit Stepwise Engine — `services/qiskit_service.py`

#### `_compute_bloch_vectors(rho_flat, num_qubits)` — Core Extraction

Computes the Bloch vector for **every qubit** by:
1. Computing the **partial trace** of the full density matrix ? single-qubit reduced density matrix per qubit
2. Extracting Pauli expectation values from the resulting 2×2 matrix

```python
def _compute_bloch_vectors(rho_flat, num_qubits):
    result = {}
    for q in range(num_qubits):
        # Partial trace: trace out all qubits EXCEPT qubit q
        # Uses numpy einsum contraction — O(4^n) but allocation-light
        reduced = _fast_reduced_single_qubit_dm(rho_flat, num_qubits, q)

        # Bloch vector from 2×2 reduced density matrix ?_q:
        x = 2.0 * reduced[0, 1].real    # Tr(? sx)
        y = 2.0 * reduced[1, 0].imag    # Tr(? sy)
        z = reduced[0, 0].real - reduced[1, 1].real  # Tr(? sz) = ?[0,0] - ?[1,1]

        result[str(q)] = {"x": float(x), "y": float(y), "z": float(z)}
    return result
```

The partial trace uses an optimized **numpy einsum subscript** contraction:
```python
def _fast_reduced_single_qubit_dm(rho_flat, num_qubits, keep_qubit):
    if num_qubits == 1:
        return rho_flat
    subscript = _einsum_subscript(num_qubits, keep_qubit)
    tensor = rho_flat.reshape((2,) * (2 * num_qubits))
    return np.einsum(subscript, tensor, optimize=True)
```

#### `run_stepwise(gates, num_qubits, ...)` — Per-Gate Density Matrix Evolution

```python
def run_stepwise(self, gates, num_qubits, include_bloch_vectors=True, ...):
    # Start with ground state |0...0? density matrix
    dm = qi.DensityMatrix.from_instruction(qc_init)   # ?0 = |0??0|

    steps = [extract_state(dm, 0, None)]   # step 0: initial state before any gate

    for i, gate in enumerate(gates):
        # Evolve density matrix: ?' = U ? U†
        instruction, qargs = _instruction_and_qargs_for_gate(gate, num_qubits)
        dm = dm.evolve(instruction, qargs=qargs)

        step = {
            "step_index": i + 1,
            "gate_applied": gate,
            "statevector": _complex_vector_to_dicts(dm.to_statevector()),
            "density_matrix": _complex_matrix_to_dicts(dm.data),
            "per_qubit_bloch_vectors": _compute_bloch_vectors(dm.data, num_qubits),
            "probabilities": _probabilities_from_diagonal(diag_real, num_qubits),
        }
        steps.append(step)

    return steps   # List[DebugStep] — one entry per gate
```

The `include_bloch_vectors` flag lets callers skip Bloch computation (e.g. the Algorithm Explorer sets it to `False` to save compute time for large circuits).

---

### 5.4 MongoDB Collection

**Collection name:** `bloch_progress`  
**Unique index:** `firebase_uid` (created at startup in `database.py`)

```json
{
  "_id": "ObjectId(...)",
  "firebase_uid": "abc123xyz",
  "completed_tasks": [0, 1, 3, 5, 7, 12],
  "updated_at": "2026-07-30T06:55:00Z"
}
```

- `upsert=True` — creates document if user has no record
- `completed_tasks` — array of integer task IDs
- No task content stored — just IDs (content lives in `TasksPanel.tsx`)

---

### 5.5 XP Reward Integration

Each newly completed Bloch task earns **10 XP**, routed through the shared `xp_engine` service:

```python
await xp_engine.award_xp(
    db=db,
    firebase_uid=firebase_uid,
    source="bloch_task",
    amount=10,
    source_ref_id=str(task_id),
    idempotent_key=f"bloch_task_{firebase_uid}_{task_id}"
    # ? Prevents double-awarding even if the same list is re-submitted
)
```

---

## 6. Full Data Flow

### Standalone Visualizer — 100% Client-Side

```
User clicks "Apply H Gate"
        ¦
        ?
getGateOperator('H')
  +-? 2×2 Hadamard matrix (built with mathjs)
        ¦
        ?
applyUnitary(H, currentState)
  +-? new QubitState [a', ß']   (matrix multiply + normalize)
        ¦
        +-----------------------------------------------------+
        ?                                                     ?
calculateOperatorTrajectory(H, initialState)        setHistory([...prev, newState])
  +-? TrajectoryPoint — 25-step arc via             setTrajectories([...prev, traj])
      eigendecomposition (true geodesic)
        ¦
        ?
stateToBlochVector(newState)
  +-? BlochVector { u, v, w }
        ¦
        ?
BlochSphere3D re-renders with new props
  +-? StateArrow lerps to {u, w, v} (smooth via useFrame)
  +-? <Line> renders trajectory arc (phosphor trace)
  +-? Live x/y/z readout updates in the bottom bar
```

### Gates Playground — Backend-Powered Bloch Vectors

```
User clicks "Step" in Quantum Gates Playground
        ¦
        ?
POST /api/v1/simulation/debug
  Body: { gates: [...], num_qubits: N }
        ¦
        ?  (FastAPI ? qiskit_service)
run_stepwise(gates, num_qubits, include_bloch_vectors=True)
  +-? evolve density matrix gate by gate: ?' = U·?·U†
  +-? _compute_bloch_vectors(?, num_qubits) at each step
        ¦
        ?
Returns List[DebugStep]:
  { "per_qubit_bloch_vectors": { "0": {x,y,z}, "1": {x,y,z} } }
        ¦
        ?
Frontend DebuggerPanel renders BlochSphereViewer per qubit
  +-? arrowHelper points to new THREE.Vector3(x, z, -y)
      (Qiskit ? Three.js coordinate mapping)
```

### Task Completion — Progress + XP

```
User checks off Task #5 in TasksPanel
        ¦
        ?
POST /api/v1/bloch/progress
  Body: { completed_tasks: [0, 1, 3, 5] }
        ¦
        ?  (FastAPI)
Diff new vs existing completed sets
For each newly completed task:
  +-? xp_engine.award_xp(amount=10, idempotent_key=...)
        ¦
        ?
db.bloch_progress.update_one(upsert=True)
        ¦
        ?
Returns { completed_tasks: [0, 1, 3, 5] }
  +-? Frontend updates progress ring UI
```

---

## 7. Where It Appears in the App

| Route / Location | Component | Role | Backend Involved? |
|---|---|---|---|
| `/bloch-sphere` | `BlochSphereVisualizer` | Full interactive standalone page — all gates, controls, tasks | Progress only (`/api/v1/bloch/progress`) |
| Landing hero | `BlochSphereCanvas` | Auto-rotating decorative sphere | No |
| Landing feature grid | `BlochSphereCanvas` | Feature card visual | No |
| `/quantum-puzzles` | `BlochSphere3D` (direct) | Current qubit state + target state arrows side by side | No |
| `/gates-playground` step debugger | `BlochSphereViewer` | One sphere per qubit — vectors from Qiskit | Yes — `/api/v1/simulation/debug` |
| Gate Inspector Popup | Inline `BlochSphere` | Shows output Bloch vector for a selected gate | Partial (from existing debug step data) |
| Quiz questions | `BlochSphereQuestion` | Renders sphere as an answer option in assessments | No |
| Login / Signup / Onboarding / ForgotPassword | Static `bloch_sphere.png` | Decorative image only | No |

---

> **Key Design Decision:**
> The standalone `/bloch-sphere` page runs **100% client-side** — no backend calls for gate simulation.
> `mathjs` handles all complex matrix operations in the browser.
> The backend is only involved for:
> 1. Persisting task progress to MongoDB (`/api/v1/bloch/progress`)
> 2. Computing Qiskit-based Bloch vectors in the Gates Playground debugger (`/api/v1/simulation/debug`) where multi-qubit circuits require proper density matrix partial-trace extraction.
