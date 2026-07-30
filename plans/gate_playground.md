# Qrious - Quantum Gates Playground Architecture Report

> A comprehensive technical reference detailing the Quantum Playground, its underlying tech stack, data models, rendering engine, and full execution flow using Qiskit.

---

## Table of Contents

1. [What Is the Quantum Playground?](#1-what-is-the-quantum-playground)
2. [Tech Stack at a Glance](#2-tech-stack-at-a-glance)
3. [File Structure](#3-file-structure)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Circuit Data Model](#6-circuit-data-model)
7. [Full Data Flow](#7-full-data-flow)
8. [Gate Library & Qiskit Compatibility](#8-gate-library--qiskit-compatibility)

---

## 1. What Is the Quantum Playground?

The **Quantum Gates Playground** is a core interactive workspace within Qrious. It allows users to visually construct, simulate, and analyze quantum circuits using an intuitive drag-and-drop interface. 

By bridging the gap between graphical representations and underlying Python/OpenQASM code, it acts as both an educational tool and a robust code generator. Users can add qubits, apply parameterized and controlled gates, and instantly execute these circuits against a Qiskit Aer backend to visualize probability distributions and statevectors.

---

## 2. Tech Stack at a Glance

| Layer | Library | Purpose |
|---|---|---|
| **UI Framework** | React 19 + TypeScript | Core component tree, hooks, and lifecycle management |
| **State Management** | Zustand / Redux Toolkit | Centralized circuit state, Undo/Redo history stack |
| **Canvas Engine** | HTML5 Canvas / SVG | High-performance, virtualized drag-and-drop circuit rendering |
| **Code Editor** | Monaco Editor | Side-by-side OpenQASM/Qiskit editor with syntax highlighting |
| **Styling** | Tailwind CSS | Utility-first styling, grid layouts, and responsive design |
| **Data Viz** | Recharts / Chart.js | Histogram rendering for measurement counts and probabilities |
| **Backend** | FastAPI (Python) | Async API handling, validation, and payload routing |
| **Quantum Engine** | Qiskit + Qiskit Aer | Circuit transpilation, statevector simulation, and execution |
| **Database** | MongoDB Atlas | Persisting user circuits, templates, and execution histories |
| **Auth** | Firebase Authentication | Securing heavy simulation endpoints with JWT |

---

## 3. File Structure

```text
frontend/src/
+-- modules/
    +-- gates-playground/
        +-- components/
           +-- Canvas/
              +-- CircuitGrid.tsx         # Virtualized grid and qubit wires
              +-- GateNode.tsx            # Draggable UI for individual gates
              +-- DragDropContext.tsx     # DnD event handlers
           +-- Editor/
              +-- MonacoCodeEditor.tsx    # Live OpenQASM/Python code view
           +-- Visualization/
              +-- HistogramViewer.tsx     # Shot distribution charts
              +-- StatevectorTable.tsx    # Raw amplitude readouts
           +-- GateTray.tsx                # Palette of available quantum gates
           +-- Toolbar.tsx                 # Undo, redo, execution controls
        +-- pages/
           +-- GatesPlaygroundPage.tsx     # Full standalone page (orchestrator)
        +-- store/
           +-- circuitStore.ts             # Zustand state for DAG and moments
        +-- utils/
            +-- qasmParser.ts               # Bidirectional UI <-> QASM conversion

backend/
+-- routers/
   +-- playground_router.py                # /api/v1/playground - execution endpoints
+-- models/
   +-- circuit_schema.py                   # Pydantic validation for circuit JSON
+-- services/
    +-- qiskit_executor.py                  # Translates JSON DAG -> Qiskit QuantumCircuit
```

---

## 4. Frontend Architecture

### 4.1 Visual Canvas & Rendering

The Playground leverages a highly optimized canvas engine to maintain 60fps even with 50+ qubits and 1000+ depth circuits.
- **Virtualization**: Only the visible viewport of the circuit grid is rendered into the DOM.
- **Drag & Drop**: Accessible event handlers support moving, deleting, snapping, and multi-selecting gates using lasso tools.
- **Real-Time Validation**: The frontend synchronously validates control-target pairs and parameter bounds as gates are placed.

### 4.2 State Management & Synchronization

State is strictly separated from UI logic. The circuit is modeled as a timeline of "moments" or a Directed Acyclic Graph (DAG).
- Changes made on the visual canvas automatically update the underlying JSON structure.
- The `qasmParser` utility converts this JSON into OpenQASM strings on-the-fly for the integrated **Monaco Editor**.
- **Bidirectional Sync**: Code edits instantly reflect back onto the visual canvas. If invalid code is entered, graceful degradation flattens the circuit or switches to a read-only code mode.

---

## 5. Backend Architecture

### 5.1 FastAPI Endpoints

The backend exposes secured, asynchronous routes:
- `POST /api/playground/execute`: Accepts circuit JSON, transpiles to Qiskit, and returns Job IDs.
- `GET /api/playground/jobs/{id}`: Polls execution status (QUEUED, RUNNING, COMPLETED, FAILED).

### 5.2 Transpilation and Execution (`qiskit_executor.py`)

1. **Validation**: The payload is strictly validated using Pydantic schemas.
2. **Translation**: The JSON representation is iterated to build a native `qiskit.QuantumCircuit` object.
3. **Execution**: Routed to `qiskit_aer.AerSimulator`. Depending on the parameters, it extracts either the `statevector` or the `counts` (measurement probabilities).

---

## 6. Circuit Data Model

### Type System (`store/circuitStore.ts`)

All internal data flowing through the Playground is strongly typed:

```typescript
// A single quantum instruction/gate
export interface GateInstance {
  id: string;               // UUID for drag-drop tracking
  type: GateType;           // 'H', 'X', 'CX', 'RZ', etc.
  targets: number[];        // Target qubit indices
  controls: number[];       // Control qubit indices (for CX, CCX)
  params?: Record<string, number>; // Rotation angles (e.g., { theta: Math.PI / 2 })
}

// A specific slice of time in the circuit
export interface CircuitMoment {
  momentIndex: number;
  operations: GateInstance[];
}

// Full Schema sent to the backend
export interface CircuitPayload {
  numQubits: number;
  numClassicalBits: number;
  moments: CircuitMoment[];
  executionParams: {
    shots: number;
    simulator: 'aer_simulator' | 'statevector_simulator';
  };
}
```

---

## 7. Full Data Flow

1. **User Interaction**: User drags an 'H' gate onto Qubit 0 in the React frontend.
2. **State Update**: Zustand store appends a `GateInstance` to the appropriate `CircuitMoment`.
3. **Synchronization**: `MonacoCodeEditor` receives the updated state and generates `h q[0];` in OpenQASM.
4. **Execution Dispatch**: User clicks "Run". The frontend POSTs the `CircuitPayload` to the FastAPI backend.
5. **Backend Processing**: `playground_router.py` validates the payload and passes it to `qiskit_executor.py`.
6. **Simulation**: A `QuantumCircuit` is instantiated. `circuit.h(0)` is applied. The circuit is run on `AerSimulator`.
7. **Result Delivery**: Statevector and histogram data are saved to MongoDB and returned to the frontend.
8. **Visualization**: Recharts components render the probability distribution, and the Bloch Sphere visualizer updates to reflect the new state.

---

## 8. Gate Library & Qiskit Compatibility

The frontend gate library strictly mirrors **Qiskit's standard library** to guarantee zero-fidelity-loss translation.

| Category | Gates Supported | Qiskit Equivalent |
|---|---|---|
| **Single-Qubit** | X, Y, Z, H, S, Sdg, T, Tdg | `circuit.x()`, `circuit.h()`, etc. |
| **Parameterized**| RX, RY, RZ, U | `circuit.rx(theta, q)`, `circuit.u(theta, phi, lam, q)` |
| **Multi-Qubit**  | CX (CNOT), CY, CZ, SWAP, CCX (Toffoli) | `circuit.cx(c, t)`, `circuit.ccx(c1, c2, t)` |
| **Classical**    | Measure, Reset | `circuit.measure(q, c)`, `circuit.reset(q)` |

**Debugging via Stepping**: Because of strict Qiskit compatibility, the Playground supports a **Quantum Debugger**. By injecting snapshot instructions (`circuit.save_statevector()`) at each moment, the backend streams step-by-step state changes, allowing users to "play" the circuit layer by layer.
