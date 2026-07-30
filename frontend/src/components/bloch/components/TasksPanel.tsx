import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Circle, BookOpen, FlaskConical } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/apiClient';
import { toast } from 'sonner';

// ─── Introduction content ─────────────────────────────────────────────────────
const INTRO = {
  overview: `The Bloch sphere is a unit sphere in 3D space used to represent the pure quantum state of a single qubit. Unlike a classical bit which can only be 0 or 1, a qubit can exist in a superposition of both states simultaneously. Every point on the surface of the Bloch sphere corresponds to a unique, valid qubit state.

The north pole (top, z = +1) represents the computational basis state |0⟩, and the south pole (bottom, z = −1) represents |1⟩. All other points on the surface are superpositions. The equatorial plane (z = 0) contains all equal-weight superpositions that differ only in phase.

Quantum operations (gates) are represented as rotations of this sphere — a consequence of the mathematical isomorphism between SU(2) (unitary operations on a qubit) and SO(3) (rotations in 3D space). This makes the Bloch sphere an extraordinarily powerful visual tool for building intuition about quantum gates and algorithms.`,

  math: [
    {
      title: 'Qubit State Parameterization',
      formula: '|ψ⟩ = cos(θ/2)|0⟩ + e^{iφ} · sin(θ/2)|1⟩',
      desc: 'Any pure qubit state is described by two angles: θ (polar, 0 to π) and φ (azimuthal, 0 to 2π). This gives us the full surface of the Bloch sphere with no redundancy.'
    },
    {
      title: 'Bloch Vector Components',
      formula: 'u = −2Re(αβ*)   v = 2Im(αβ*)   w = |α|² − |β|²',
      desc: 'Given state |ψ⟩ = α|0⟩ + β|1⟩, the Bloch vector is computed from the density matrix. u, v, w are the expectation values of the Pauli X, Y, Z operators respectively.'
    },
    {
      title: 'Rotation Operators (Matrix Form)',
      formula: 'R_x(φ): [[cos φ/2, −i sin φ/2], [−i sin φ/2, cos φ/2]]    R_y(φ): [[cos φ/2, −sin φ/2], [sin φ/2, cos φ/2]]    R_z(φ): [[e^{−iφ/2}, 0], [0, e^{iφ/2}]]',
      desc: 'Each rotation gate is a 2×2 unitary matrix. Applying the matrix to the state vector and recomputing the Bloch coordinates shows the resulting rotation on the sphere.'
    },
    {
      title: 'Gate Definitions',
      formula: 'X = R_x(π)   Y = R_y(π)   Z = R_z(π)   H = R_y(π/2)·R_z(π)   S = R_z(π/2)   T = R_z(π/4)',
      desc: 'All standard single-qubit gates are specific rotation angles. This unification is what makes the Bloch sphere such a powerful conceptual tool.'
    }
  ],

  howToUse: [
    { label: 'INIT', desc: 'Resets the qubit to the ground state |0⟩ (north pole, z=+1).' },
    { label: 'UNDO', desc: 'Steps back one operation at a time through your gate history.' },
    { label: 'DOWNLOAD', desc: 'Saves a PNG screenshot of the current 3D Bloch sphere view.' },
    { label: 'Rotations → Default Axes', desc: 'Rotate by R_x, R_y, or R_z at preset angles (90°, 180°) or a custom angle you enter.' },
    { label: 'Rotations → Custom Axis', desc: 'Define an arbitrary rotation axis n̂ by entering polar angle θ and azimuthal angle φ, then rotate by angle γ.' },
    { label: 'Quantum Gates', desc: 'Apply standard gates: Pauli X/Y/Z, Hadamard H, Phase S, T, and their daggers S†/T†.' },
    { label: 'Pulses', desc: 'Simulate RF pulse dynamics (Rabi oscillations) in the rotating frame. Amplitude=1 + Length=0.5 = π-pulse (full flip).' },
    { label: 'Settings', desc: 'Customize arrow color, trace color, state labels, trace length, and export resolution.' }
  ]
};

// ─── Gate Reference ───────────────────────────────────────────────────────────
const GATE_REFERENCE = [
  { name: 'Pauli X', symbol: 'X', prefix: '', matrix: [['0', '1'], ['1', '0']], desc: 'Bit flip (180° around X)' },
  { name: 'Pauli Y', symbol: 'Y', prefix: '', matrix: [['0', '−i'], ['i', '0']], desc: 'Bit & phase flip (180° around Y)' },
  { name: 'Pauli Z', symbol: 'Z', prefix: '', matrix: [['1', '0'], ['0', '−1']], desc: 'Phase flip (180° around Z)' },
  { name: 'Hadamard', symbol: 'H', prefix: '1/√2', matrix: [['1', '1'], ['1', '−1']], desc: 'Creates equal superposition' },
  { name: 'Phase (S)', symbol: 'S', prefix: '', matrix: [['1', '0'], ['0', 'i']], desc: '90° rotation around Z (π/2)' },
  { name: 'Phase Dagger (S†)', symbol: 'S†', prefix: '', matrix: [['1', '0'], ['0', '−i']], desc: '−90° rotation around Z (−π/2)' },
  { name: 'T Gate (T)', symbol: 'T', prefix: '', matrix: [['1', '0'], ['0', 'e^{iπ/4}']], desc: '45° rotation around Z (π/4)' },
  { name: 'T Dagger (T†)', symbol: 'T†', prefix: '', matrix: [['1', '0'], ['0', 'e^{−iπ/4}']], desc: '−45° rotation around Z (−π/4)' },
  { name: 'Rotation Rx(θ)', symbol: 'Rx', prefix: '', matrix: [['cos(θ/2)', '−i sin(θ/2)'], ['−i sin(θ/2)', 'cos(θ/2)']], desc: 'Arbitrary rotation around X-axis' },
  { name: 'Rotation Ry(θ)', symbol: 'Ry', prefix: '', matrix: [['cos(θ/2)', '−sin(θ/2)'], ['sin(θ/2)', 'cos(θ/2)']], desc: 'Arbitrary rotation around Y-axis' },
  { name: 'Rotation Rz(θ)', symbol: 'Rz', prefix: '', matrix: [['e^{−iθ/2}', '0'], ['0', 'e^{iθ/2}']], desc: 'Arbitrary rotation around Z-axis' },
  { name: 'Universal (U)', symbol: 'U', prefix: '', matrix: [['cos(θ/2)', '−e^{iλ}sin(θ/2)'], ['e^{iφ}sin(θ/2)', 'e^{i(φ+λ)}cos(θ/2)']], desc: 'Arbitrary 3-parameter rotation U(θ, φ, λ)' }
];

// ─── 21 Guided Tasks ──────────────────────────────────────────────────────────
export interface Task {
  id: number;
  title: string;
  focus: string;
  concept: string;   // brief conceptual explanation
  goal: string;
  steps: string[];
  expectedResult: string;
  insight: string;
}

export const TASKS: Task[] = [
  {
    id: 1,
    title: 'Start at the North Pole',
    focus: 'INIT — getInitialState()',
    concept: 'The ground state |0⟩ is the starting point for almost every quantum computation. On the Bloch sphere it sits at the very top (north pole). Its Bloch vector is (0, 0, 1) — pointing straight up along the z-axis.',
    goal: 'Familiarise yourself with the |0⟩ state and the Bloch sphere coordinate system.',
    steps: [
      'Click the Init button at the top-left.',
      'Observe the blue arrow pointing straight up to the north pole.',
      'Read the coordinates at the bottom: x=0.000, y=0.000, z=1.000.',
      'Try dragging the sphere to rotate the view and appreciate the 3D geometry.'
    ],
    expectedResult: 'Arrow at north pole. Coordinates: x=0, y=0, z=1. State = |ψ⟩ = |0⟩.',
    insight: 'Classical bits are permanently 0 or 1. A qubit at |0⟩ is still just "classical zero" — but we will soon move it away from this pole into truly quantum territory.'
  },
  {
    id: 2,
    title: 'The Quantum NOT Gate — Pauli X',
    focus: 'Gate: X = R_x(π)',
    concept: 'The Pauli X gate is the quantum equivalent of the classical NOT gate. Geometrically it is a 180° rotation around the x-axis of the Bloch sphere, which flips the state from the north pole to the south pole — from |0⟩ to |1⟩.',
    goal: 'Apply the X gate and verify it flips |0⟩ to |1⟩, and that applying it twice returns to |0⟩.',
    steps: [
      'Start at |0⟩ (click Init).',
      'Open "Quantum gates" in the right panel.',
      'Click the X button.',
      'Observe the arrow sweeping to the south pole. Read z=−1.',
      'Click X again. Arrow returns to north pole — X² = Identity.'
    ],
    expectedResult: 'After one X: arrow at south pole, z=−1, state = |1⟩. After two X gates: back to |0⟩.',
    insight: 'Unlike classical NOT, the quantum X gate can also act on superpositions — it flips the entire Bloch sphere upside down, swapping the roles of |0⟩ and |1⟩ everywhere at once.'
  },
  {
    id: 3,
    title: 'Create Equal Superposition — Hadamard Gate',
    focus: 'Gate: H = R_y(π/2) · R_z(π)',
    concept: 'The Hadamard gate is the most important gate for creating superpositions. It maps |0⟩ to the |+⟩ state = (|0⟩ + |1⟩)/√2 — a state with exactly 50% probability of measuring either |0⟩ or |1⟩. On the Bloch sphere this moves the arrow from the north pole to the equator.',
    goal: 'Use H to enter a superposition and observe what the equator of the Bloch sphere represents.',
    steps: [
      'Start at |0⟩ (Init).',
      'Click H in "Quantum gates".',
      'Observe the arrow at the equator — z=0 now.',
      'Note the coordinates: the arrow lies in the xz-plane at z=0.',
      'Click Init, then apply H twice — you return to |0⟩ (H² = Identity).'
    ],
    expectedResult: 'H|0⟩ → arrow on equator at z=0. Applying H twice restores |0⟩.',
    insight: 'The equatorial plane of the Bloch sphere is the "superposition plane". Every point on the equator is an equal-weight superposition of |0⟩ and |1⟩ — only the phase φ differs.'
  },
  {
    id: 4,
    title: 'The Phase Flip — Pauli Z Gate',
    focus: 'Gate: Z = R_z(π)',
    concept: 'The Z gate introduces a phase flip: it maps |1⟩ → −|1⟩ but leaves |0⟩ unchanged. In terms of the Bloch sphere, it is a 180° rotation around the z-axis. This means poles stay fixed, but equatorial states flip across the z-axis.',
    goal: 'Discover that Z has no visible effect at the poles but dramatically changes equatorial states.',
    steps: [
      'Start at |0⟩, apply Z. Nothing changes — z-axis rotations leave the north/south pole fixed.',
      'Click Init, apply H (go to equator), then apply Z.',
      'Observe: the arrow flips to the opposite side of the equator.',
      'Apply H again. Now you are at |1⟩ — not |0⟩! This is H·Z·H = X.'
    ],
    expectedResult: 'Z is invisible at the poles. On the equator it flips the azimuthal angle by 180°. H·Z·H = X confirms the Hadamard basis change.',
    insight: 'Phase is invisible when measuring in the Z basis (|0⟩/|1⟩), but it has real physical consequences when you subsequently apply more gates. This is the essence of quantum interference.'
  },
  {
    id: 5,
    title: 'Rotate 90° Around the X-Axis',
    focus: 'Rotation: R_x(90°)',
    concept: 'R_x(90°) is a 90° rotation around the x-axis. Starting from |0⟩ at the north pole, this sweeps the state toward the equator, landing at a state halfway between |0⟩ and |1⟩ — but with an imaginary phase coefficient. The resulting state is (|0⟩ − i|1⟩)/√2.',
    goal: 'Apply a 90° rotation around X and observe the resulting state on the sphere.',
    steps: [
      'Start at |0⟩ (Init).',
      'Open "Rotations around default axes".',
      'Click X +90°.',
      'Watch the traced arc as the arrow rotates in the y-z plane.',
      'Read the final coordinates: y ≈ 1, x ≈ 0, z ≈ 0.'
    ],
    expectedResult: 'Arrow at +Y equator. Vector ≈ (0, 1, 0). State = (|0⟩ − i|1⟩)/√2.',
    insight: 'Rotation traces on the Bloch sphere are great-circle arcs — the quantum equivalent of a geodesic. This is why the path curved rather than going in a straight line.'
  },
  {
    id: 6,
    title: 'Rotate 90° Around the Y-Axis',
    focus: 'Rotation: R_y(90°)',
    concept: 'R_y(90°) is special because it produces a superposition with only real coefficients. The state (|0⟩ − |1⟩)/√2 has no imaginary component — a consequence of the Y rotation matrix having only real entries when θ is a multiple of 90°.',
    goal: 'Compare R_y(90°) with R_x(90°) and understand why they produce different-phase superpositions.',
    steps: [
      'Start at |0⟩ (Init).',
      'Click Y +90° in the rotations panel.',
      'Observe the arc: the state sweeps in the x-z plane.',
      'Now start over (Init) and apply X +90°. Compare the coordinates.',
      'R_y lands at x-equator, R_x lands at y-equator — different axes, different phases.'
    ],
    expectedResult: 'R_y(90°)|0⟩ → arrow on equator with x≠0. State = (|0⟩ − |1⟩)/√2 = |−⟩.',
    insight: 'The Y rotation matrix contains only real entries, so it produces superpositions with real amplitudes. R_x uses imaginary entries (−i sin), creating superpositions with imaginary phase.'
  },
  {
    id: 7,
    title: 'Full 180° Rotation — Pauli Y Gate',
    focus: 'Gate: Y = R_y(π)',
    concept: 'The Y gate is a 180° rotation around the y-axis. It combines both a bit flip (like X) and a phase flip (like Z) simultaneously. Y|0⟩ = i|1⟩ — note the imaginary factor "i" which represents a 90° global phase. While global phase is physically irrelevant for a single gate, it matters in multi-qubit contexts.',
    goal: 'Apply the Y gate and verify it flips the qubit to the south pole, and that Y² = Identity.',
    steps: [
      'Start at |0⟩ (Init).',
      'Click Y in "Quantum gates".',
      'Arrow moves to south pole (z=−1), state becomes |1⟩ up to global phase.',
      'Click Y again — back to north pole.',
      'Try: apply H, then Y, then H. Observe the result differs from X.'
    ],
    expectedResult: 'Y|0⟩ → south pole, z=−1. Y² = Identity. H·Y·H ≠ X (the phase factor matters).',
    insight: 'While X, Y, and Z all look like 180° rotations around their respective axes, the imaginary phase in Y is what makes it distinct from a composition of X and Z in multi-qubit algorithms.'
  },
  {
    id: 8,
    title: 'Quarter-Phase Gate — S Gate',
    focus: 'Gate: S = R_z(π/2)',
    concept: 'The S gate (also called the phase gate P) performs a 90° rotation around the z-axis. It leaves |0⟩ unchanged and maps |1⟩ → i|1⟩, multiplying the |1⟩ amplitude by the imaginary unit i. On the Bloch sphere, it rotates the azimuthal angle by 90° without changing the polar angle.',
    goal: 'Apply S repeatedly from a superposition and observe 4-fold periodicity.',
    steps: [
      'Start at |0⟩, apply H to reach the equator.',
      'Apply S once — observe arrow rotates 90° around z-axis.',
      'Apply S three more times — total 4×90° = 360° = identity.',
      'Observe: S⁴ = Identity, S² = Z.'
    ],
    expectedResult: 'Each S rotates azimuthal angle by 90°. S⁴ = I, S² = Z. Polar angle (latitude) unchanged.',
    insight: 'The S gate is crucial in quantum error correction and the quantum Fourier transform. Its 4-fold periodicity means it has order 4 in the group of quantum gates.'
  },
  {
    id: 9,
    title: 'Eighth-Phase Gate — T Gate',
    focus: 'Gate: T = R_z(π/4)',
    concept: 'The T gate (π/8 gate) performs a 45° rotation around the z-axis. It is the finest-grained standard phase gate and is critical for universality: the set {H, T, CNOT} is a universal gate set for quantum computing, meaning any quantum algorithm can be approximated to arbitrary precision using only these three gates.',
    goal: 'Observe T gate periodicity and verify that 2 T gates = 1 S gate.',
    steps: [
      'Start at |0⟩, apply H.',
      'Apply T — observe 45° rotation of azimuthal angle.',
      'Apply T again (now 90° total) — this should match the state after one S gate.',
      'Apply T 6 more times — after 8 total T gates you are back to start.',
      'Verify: T² = S, T⁴ = Z, T⁸ = I.'
    ],
    expectedResult: 'T rotates by 45°. T² = S, T⁴ = Z, T⁸ = Identity.',
    insight: 'The T gate\'s importance in universality is counterintuitive — such a small rotation can approximate any single-qubit operation when composed with H gates. This is the Solovay-Kitaev theorem in action.'
  },
  {
    id: 10,
    title: 'Inverse Gates — S† and T†',
    focus: 'Gate: S† = R_z(−π/2),  T† = R_z(−π/4)',
    concept: 'Every quantum gate is unitary, which means it has a unique inverse (its conjugate transpose, denoted †). S† undoes exactly what S does — it rotates −90° around z. Physically, this is guaranteed by quantum mechanics: all quantum evolution is reversible.',
    goal: 'Demonstrate that S·S† = I and T·T† = I by performing and then undoing operations.',
    steps: [
      'Start at |0⟩, apply H, note the position.',
      'Apply S — arrow moves 90° around equator.',
      'Apply S† — arrow returns to exact previous position.',
      'Repeat with T and T†.',
      'Compare with using the UNDO button — same effect!'
    ],
    expectedResult: 'S then S† returns to the exact previous state. All inverse gates cancel their forward counterpart.',
    insight: 'Reversibility is a fundamental distinction from classical computing. Classical NAND gates are irreversible (you cannot determine inputs from outputs). All quantum gates preserve information.'
  },
  {
    id: 11,
    title: 'Custom Rotation Angle',
    focus: 'Rotations: R_x(θ), R_y(θ), R_z(θ) — custom input',
    concept: 'Real quantum hardware applies rotations at arbitrary angles — not just multiples of 90°. The continuous nature of the Bloch sphere shows that qubit states form a continuous manifold, unlike classical bits. Any angle between 0° and 360° is physically achievable.',
    goal: 'Perform a 30° rotation and appreciate that qubit states are continuous, not discrete.',
    steps: [
      'Start at |0⟩ (Init).',
      'In "Rotations around default axes", type 30 in the angle field.',
      'Click Z — observe a 30° rotation around z-axis (barely visible from this starting point).',
      'Now apply H first, then enter 30° and click Z repeatedly — each step is a 30° azimuthal shift.',
      'After 12 applications of Z(30°) you complete a full circle (360° = 12×30°).'
    ],
    expectedResult: 'Each Z(30°) moves the arrow 30° around the equator. 12 applications = identity.',
    insight: 'The continuous space of qubit states is what makes quantum computing so powerful — but also so hard to simulate classically. The Hilbert space grows exponentially with each additional qubit.'
  },
  {
    id: 12,
    title: 'Custom Axis Rotation',
    focus: 'Custom Axis: R_n̂(γ) = cos(γ/2)·I − i·sin(γ/2)·(n·σ)',
    concept: 'Any single-qubit unitary operation can be expressed as a rotation around some axis n̂ in 3D space by some angle γ. The custom axis rotation lets you specify this axis by its spherical coordinates: polar angle θ (from z-axis) and azimuthal angle φ (around z-axis), then rotate by γ.',
    goal: 'Perform a rotation around a diagonal axis and observe the resulting arc on the sphere.',
    steps: [
      'Open "Rotations around custom axis".',
      'Set θ = 45°, φ = 45°, γ = 90°.',
      'Click "Rotate around n̂(θ,φ)" and observe the path.',
      'Try θ=90°, φ=0°, γ=180° — this should behave like an X gate.',
      'Try θ=90°, φ=90°, γ=180° — this should behave like a Y gate.'
    ],
    expectedResult: 'Diagonal axis rotation produces a non-standard arc. θ=90°, φ=0°, γ=180° replicates X. θ=90°, φ=90°, γ=180° replicates Y.',
    insight: 'This demonstrates a key theorem: every SU(2) element (every qubit gate) is a rotation about some axis. The axis and angle uniquely characterize the gate, just as rotation matrices are uniquely described in SO(3).'
  },
  {
    id: 13,
    title: 'Gate Non-Commutativity',
    focus: 'Sequence comparison: H→X vs X→H',
    concept: 'Matrix multiplication is not commutative: A·B ≠ B·A in general. For quantum gates this means that the order in which you apply gates matters enormously. Applying H then X gives a very different result from applying X then H — even though both sequences use the same two gates.',
    goal: 'Verify that H·X ≠ X·H and understand why gate order is critical in quantum circuits.',
    steps: [
      'Path A: Init → H → X. Note the final position.',
      'Path B: Init → X → H. Note the final position.',
      'Compare: are they the same? (They should not be.)',
      'Use UNDO to go back and verify both paths step by step.',
      'Try H→Z vs Z→H as another example of non-commutativity.'
    ],
    expectedResult: 'H·X gives one equatorial state; X·H gives a different equatorial state. They are not equal.',
    insight: 'Non-commutativity is one of the deepest features of quantum mechanics. In classical Boolean logic, AND is commutative. In quantum computing, gate order determines the entire outcome of the computation.'
  },
  {
    id: 14,
    title: 'Build the |−⟩ State',
    focus: 'Sequence: Init → X → H',
    concept: 'The state |−⟩ = (|0⟩ − |1⟩)/√2 is the −1 eigenstate of the X gate — just as |1⟩ is the −1 eigenstate of Z. It is crucial in quantum algorithms like the Deutsch-Jozsa algorithm, where the oracle qubit is initialized in |−⟩ to cause phase kickback.',
    goal: 'Construct the |−⟩ state and see it sit on the opposite side of the equator from |+⟩.',
    steps: [
      'Init → X (arrow at south pole, state = |1⟩).',
      'Apply H (arrow moves to equator, but different side from H|0⟩).',
      'Compare with Init → H (|+⟩ state). The two equatorial states are on opposite sides.',
      'Apply Z to the |+⟩ state — it should become |−⟩ (Z flips the equator).'
    ],
    expectedResult: '|+⟩ and |−⟩ are at opposite points on the equator. They are the eigenstates of the X gate.',
    insight: '|+⟩ is used to create superposition for parallel quantum computation. |−⟩ is used as an "ancilla qubit" that absorbs phase information in quantum oracles — the heart of quantum speedup in many algorithms.'
  },
  {
    id: 15,
    title: 'Gate Sequence: H → S → H = Rotation',
    focus: 'Sequence: H → S → H  (basis change trick)',
    concept: 'In quantum computing, a common technique is to change basis (using H), apply an operation, then change back. The sequence H·Z·H = X demonstrates this: H maps between the Z-basis and X-basis, so a Z-rotation in one basis becomes an X-rotation in the other.',
    goal: 'Verify the identity H·S·H and understand basis-change as a fundamental circuit technique.',
    steps: [
      'Start at |0⟩ (Init).',
      'Apply H → arrive at equator.',
      'Apply S → rotate 90° around z on the equator.',
      'Apply H again → observe where you land.',
      'Now try Init → X (90°) (from Rotations panel, 90° around X) → compare with the H·S·H sequence.'
    ],
    expectedResult: 'H·S·H produces a rotation that is equivalent to a partial rotation around the X-axis. The two paths have the same endpoint.',
    insight: 'Basis change is ubiquitous in quantum algorithms. The quantum Fourier transform is essentially a series of Hadamard gates and phase rotations (S, T gates) with basis changes built in.'
  },
  {
    id: 16,
    title: 'Complete 360° Rotation = Identity',
    focus: 'Rotation: R_z(360°) — global phase',
    concept: 'A 360° rotation in 3D classical space clearly returns to the same orientation. In quantum mechanics, however, a 360° rotation of a spin-1/2 particle (qubit) returns the wavefunction to minus itself: |ψ⟩ → −|ψ⟩. This global minus sign is physically unobservable — making it identical to the identity on the Bloch sphere — but reveals the spinor nature of qubits.',
    goal: 'Perform a 360° rotation and confirm the Bloch sphere state is unchanged (global phase is unobservable).',
    steps: [
      'Start at |0⟩, apply H to go to the equator.',
      'In the custom angle field, enter 360 and click Z.',
      'Observe: arrow returns exactly to where it started.',
      'Try 360° for X and Y rotations too.',
      'Try entering 180° twice in succession — same result as 360°.'
    ],
    expectedResult: 'R(360°) = Identity on the Bloch sphere for all axes. The state appears identical to before.',
    insight: 'This "2π ambiguity" is why qubits are described by SU(2) (which has a double cover of SO(3)). Electrons actually require a 720° rotation to fully return to their initial state — measurable in neutron interferometry experiments.'
  },
  {
    id: 17,
    title: 'Rabi Oscillations — π-Pulse',
    focus: 'Pulses: applyRabiPulse() — amplitude=1, length=0.5',
    concept: 'In a real quantum device (trapped ion, superconducting qubit, NMR), qubits are controlled by resonant electromagnetic pulses. A "π-pulse" (duration such that the qubit flips completely from |0⟩ to |1⟩) is the physical implementation of an X gate. The Rabi frequency determines how fast the qubit oscillates between the two states.',
    goal: 'Apply a π-pulse and a π/2-pulse and observe the physical connection to X and H gates.',
    steps: [
      'Start at |0⟩ (Init).',
      'Open "Pulses". Set amplitude=1, length=0.5, detuning=0, phase=0.',
      'Click "X Pulse" — this is a π-pulse. Arrow should flip to south pole.',
      'Init again. Set length=0.25 (π/2-pulse). Click "X Pulse" — observe partial flip to equator.',
      'Compare: length=0.25 X-pulse ≈ R_x(90°).'
    ],
    expectedResult: 'Length=0.5: full flip to |1⟩ (π-pulse ≡ X gate). Length=0.25: partial flip to equator (π/2-pulse ≡ R_x(90°)).',
    insight: 'Real quantum gates are NOT instantaneous — they are pulses of microwave or laser light with precise duration and amplitude. The Bloch sphere makes this physical picture transparent: every pulse is a rotation, and its "angle" is determined by the pulse area (amplitude × time).'
  },
  {
    id: 18,
    title: 'Off-Resonance Pulse — Detuning',
    focus: 'Pulses: applyRabiPulse() — non-zero detuning',
    concept: 'When a pulse is not at the exact resonance frequency of the qubit (a condition called "detuning"), the rotation axis tilts away from the equatorial plane. Instead of cleanly flipping between |0⟩ and |1⟩, the qubit undergoes a more complex oscillation — it never fully reaches |1⟩ even with a long pulse. This is called an off-resonance Rabi oscillation.',
    goal: 'Observe how detuning changes the rotation axis and prevents a full qubit flip.',
    steps: [
      'Start at |0⟩ (Init).',
      'Open Pulses: set amplitude=1, length=0.5, detuning=0.5.',
      'Click "X Pulse" — observe the arrow does NOT reach the south pole.',
      'Set detuning=1.0 and try again — even less flip.',
      'Return to detuning=0 — confirms a π-pulse needs zero detuning to work perfectly.'
    ],
    expectedResult: 'With detuning≠0, the arrow traces an arc that does not reach the south pole. Larger detuning = smaller flip angle.',
    insight: 'Detuning is a fundamental source of gate error in real quantum hardware. Frequency calibration of qubits is one of the most critical engineering challenges in building a quantum computer.'
  },
  {
    id: 19,
    title: 'Trajectory Traces and Gate Paths',
    focus: 'History: trajectories[] — calculateOperatorTrajectory()',
    concept: 'When a gate is applied, the Bloch sphere visualiser draws the path the qubit state took through 3D space — a trajectory trace. For rotation gates, this is a perfect great-circle arc on the sphere. For composite gates (H, S, T), it is an arc in the appropriate plane. Trajectory traces are invaluable for understanding how gates "move" states.',
    goal: 'Apply a sequence of gates and read the trajectory traces to understand the geometric path.',
    steps: [
      'Init → H (trace from north pole to equator).',
      'Apply S (trace along equator — azimuthal rotation).',
      'Apply S again (another equatorial arc).',
      'Apply H again (trace from equator back toward pole).',
      'Observe how each gate\'s trace forms an arc on the sphere surface.',
      'Click UNDO multiple times and watch traces disappear in reverse order.'
    ],
    expectedResult: 'Each gate produces a visible arc on the sphere. H arcs sweep between poles and equator. S/T arcs circle the equator. UNDO removes one arc at a time.',
    insight: 'The trajectory traces reveal the "shape" of a quantum operation. A gate that looks simple in matrix form (one button click) can trace a complex path in state space — this is why visualisation tools like this Bloch sphere are so valuable for building intuition.'
  },
  {
    id: 20,
    title: 'Full Quantum Circuit: Grover-Step',
    focus: 'Sequence: Init → H → Z → H (implements a "phase oracle" + diffusion step)',
    concept: 'Grover\'s algorithm is the optimal quantum search algorithm. Its core structure alternates between an "oracle" (which flips the phase of a target state) and a "diffusion operator" (which amplifies the target). The diffusion operator is implemented as H·Z·H = X, followed by a global phase. This task has you manually construct one step of Grover\'s algorithm.',
    goal: 'Build the diffusion operator H·Z·H and verify it equals an X gate on the Bloch sphere.',
    steps: [
      'Start at |0⟩ (Init) — this is our "initial uniform superposition" starting point.',
      'Apply H → equatorial state (uniform superposition created).',
      'Apply Z → the phase of |1⟩ component is flipped (oracle step).',
      'Apply H → observe the final position.',
      'Compare: the H·Z·H sequence should move the arrow to the south pole = |1⟩.',
      'This is identical to just applying X — confirming H·Z·H = X.'
    ],
    expectedResult: 'H·Z·H|0⟩ → |1⟩ (south pole). The sequence is mathematically equivalent to the Pauli X gate.',
    insight: 'Grover\'s algorithm achieves a quadratic speedup: searching N items classically takes O(N) steps, but Grover finds the answer in O(√N) steps. The Bloch sphere shows why: each step rotates the state closer to the target by a fixed angle, and √N steps are enough to reach it.'
  },
  {
    id: 21,
    title: 'U(θ, φ, λ) — The Master Key',
    focus: 'Gate: U(θ, φ, λ)',
    concept: 'The U gate is the most general single-qubit gate. It allows rotation to any point on the Bloch sphere by defining two angles for the polar and azimuthal final position (plus a global phase λ). Any quantum operation can be built from sequences of U gates.',
    goal: 'Create an arbitrary state using the Universal U Gate.',
    steps: [
      'Click INIT to reset to |0⟩.',
      'Open the "Universal U Gate" accordion in the control panel.',
      'Set Theta (θ) to 90, Phi (φ) to 45, and Lambda (λ) to 0.',
      'Click "Apply U(θ, φ, λ)".'
    ],
    expectedResult: 'The state vector will move to the equator (θ=90) and point halfway between X and Y (φ=45).',
    insight: 'Every single-qubit gate (X, Y, Z, H, S, T) is just a specific case of the U gate! By tweaking θ, φ, and λ, you can reach any point on the Bloch sphere in a single step.'
  }
];

// ─── TasksPanel Component ─────────────────────────────────────────────────────
export const TasksPanel: React.FC = () => {
  const { theme } = useTheme();
  const { currentUser } = useAuth();
  
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  const [showGates, setShowGates] = useState(false);

  // Load progress from backend on mount/user change
  useEffect(() => {
    async function loadProgress() {
      if (currentUser) {
        // First try local cache so it loads instantly
        const saved = localStorage.getItem(`qrious_bloch_progress_${currentUser.uid}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              setCompleted(new Set(parsed));
            }
          } catch (e) {
            console.error("Failed to parse saved bloch progress", e);
          }
        }

        try {
          const response = await apiClient.get<{ data: { completed_tasks: number[] } }>('/api/v1/bloch/progress');
          if (response.data && response.data.data && Array.isArray(response.data.data.completed_tasks)) {
            const tasksList = response.data.data.completed_tasks;
            setCompleted(new Set(tasksList));
            localStorage.setItem(
              `qrious_bloch_progress_${currentUser.uid}`,
              JSON.stringify(tasksList)
            );
          }
        } catch (err) {
          console.error("Failed to fetch bloch progress from backend", err);
        }
      } else {
        setCompleted(new Set());
      }
    }
    loadProgress();
  }, [currentUser]);

  const toggleComplete = async (id: number) => {
    const isCompleting = !completed.has(id);
    const nextSet = new Set(completed);
    if (isCompleting) {
      nextSet.add(id);
    } else {
      nextSet.delete(id);
    }
    const nextList = Array.from(nextSet);

    setCompleted(nextSet);

    if (currentUser) {
      localStorage.setItem(
        `qrious_bloch_progress_${currentUser.uid}`,
        JSON.stringify(nextList)
      );
      try {
        await apiClient.post('/api/v1/bloch/progress', { completed_tasks: nextList });
        if (isCompleting) {
          toast.success("Task completed! +10 XP awarded.");
          window.dispatchEvent(new CustomEvent('xp_updated'));
        }
      } catch (err) {
        console.error("Failed to save bloch progress to backend", err);
      }
    }
  };

  const toggleExpand = (id: number) => {
    setExpanded(prev => prev === id ? null : id);
  };

  const pct = Math.round((completed.size / TASKS.length) * 100);

  return (
    <div className="w-full font-sans space-y-5">

      {/* ── Introduction accordion ── */}
      <div className={cn(
        "border rounded-[2rem] overflow-hidden transition-all duration-300",
        theme === 'dark'
          ? "bg-zinc-950/50 border-white/10 hover:border-emerald-500/50"
          : "bg-white border-zinc-200 hover:border-emerald-500/30"
      )}>
        <button
          onClick={() => setShowIntro(v => !v)}
          className={cn(
            "w-full flex items-center justify-between px-6 py-5 transition-colors text-left",
            theme === 'dark' ? "hover:bg-white/5" : "hover:bg-zinc-50"
          )}
        >
          <div className="flex items-center gap-3">
            <BookOpen className="w-[18px] h-[18px] text-emerald-500 shrink-0" />
            <div>
              <p className="font-semibold text-sm text-foreground">Introduction &amp; Mathematical Background</p>
              <p className="text-xs text-muted-foreground mt-0.5">Bloch sphere theory, rotation operators, gate definitions &amp; usage guide</p>
            </div>
          </div>
          {showIntro
            ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
        </button>

        {showIntro && (
          <div className={cn(
            "border-t px-6 pb-6 pt-4 space-y-5",
            theme === 'dark' ? "border-white/10 bg-black/20" : "border-zinc-200 bg-zinc-50/10"
          )}>
            {/* Overview text */}
            <div className="space-y-2">
              {INTRO.overview.split('\n\n').map((para, i) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed">{para}</p>
              ))}
            </div>

            {/* Math reference cards */}
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-widest mb-3">Mathematical Background</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {INTRO.math.map(m => (
                  <div key={m.title} className={cn(
                    "rounded-xl border p-4 space-y-2",
                    theme === 'dark' ? "border-white/10 bg-white/5" : "border-zinc-200 bg-zinc-50/50"
                  )}>
                    <p className="text-xs font-semibold text-foreground">{m.title}</p>
                    <code className="block text-[11px] text-foreground font-mono bg-zinc-900/60 dark:bg-zinc-900/60 light:bg-zinc-100 border border-zinc-700/50 rounded px-2.5 py-1.5 leading-relaxed whitespace-pre-wrap">
                      {m.formula}
                    </code>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{m.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* How to use */}
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-widest mb-3">How to Use This Tool</p>
              <div className="space-y-2">
                {INTRO.howToUse.map(item => (
                  <div key={item.label} className="flex gap-3 text-sm">
                    <span className="shrink-0 font-semibold text-foreground w-44 text-xs pt-0.5">{item.label}</span>
                    <span className="text-muted-foreground text-xs leading-relaxed">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Gate Matrix Reference accordion ── */}
      <div className={cn(
        "border rounded-[2rem] overflow-hidden transition-all duration-300",
        theme === 'dark'
          ? "bg-zinc-950/50 border-white/10 hover:border-emerald-500/50"
          : "bg-white border-zinc-200 hover:border-emerald-500/30"
      )}>
        <button
          onClick={() => setShowGates(v => !v)}
          className={cn(
            "w-full flex items-center justify-between px-6 py-5 transition-colors text-left",
            theme === 'dark' ? "hover:bg-white/5" : "hover:bg-zinc-50"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-[18px] h-[18px] flex items-center justify-center shrink-0 border border-emerald-500/50 text-emerald-500 font-mono text-[10px] rounded font-bold">U</div>
            <div>
              <p className="font-semibold text-sm text-foreground">Gate Matrix Reference</p>
              <p className="text-xs text-muted-foreground mt-0.5">Quick lookup for standard quantum gate matrices</p>
            </div>
          </div>
          {showGates
            ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
        </button>

        {showGates && (
          <div className={cn(
            "border-t px-6 pb-6 pt-4",
            theme === 'dark' ? "border-white/10 bg-black/20" : "border-zinc-200 bg-zinc-50/10"
          )}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {GATE_REFERENCE.map(gate => (
                <div key={gate.symbol} className={cn(
                  "rounded-xl border p-4 flex flex-col justify-between",
                  theme === 'dark' ? "border-white/10 bg-white/5" : "border-zinc-200 bg-zinc-50/50"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-foreground">{gate.name}</p>
                    <span className="text-[10px] font-mono bg-secondary text-foreground px-1.5 py-0.5 rounded font-bold border border-border/40">{gate.symbol}</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center my-3">
                    <div className="flex items-center gap-2 text-foreground font-mono text-[13px]">
                      {gate.prefix && <span className="font-semibold">{gate.prefix}</span>}
                      <div className="flex gap-1 relative px-2 py-1">
                        {/* Matrix brackets — crisp primary white/black */}
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 border-l-2 border-t-2 border-b-2 border-foreground/50 rounded-l-sm" />
                        <div className="absolute right-0 top-0 bottom-0 w-1.5 border-r-2 border-t-2 border-b-2 border-foreground/50 rounded-r-sm" />
                        
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-center px-1">
                          {gate.matrix.map((row, rIdx) => (
                            <React.Fragment key={rIdx}>
                              <span className="font-semibold text-foreground">{row[0]}</span>
                              <span className="font-semibold text-foreground">{row[1]}</span>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug">{gate.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Tasks header + progress ── */}
      <div className="flex items-center justify-between gap-4 px-1">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-foreground">21 Guided Exploration Tasks</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 ml-6">
            {completed.size} of {TASKS.length} completed ({pct}%) — one gate or concept per task
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-28 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-mono text-muted-foreground w-8 text-right">{pct}%</span>
        </div>
      </div>

      {/* ── Task cards ── */}
      <div className="space-y-2.5">
        {TASKS.map(task => {
          const done = completed.has(task.id);
          const open = expanded === task.id;

          return (
            <div
              key={task.id}
              className={cn(
                "border rounded-2xl overflow-hidden transition-all duration-300",
                done
                  ? theme === 'dark' ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-emerald-500/20 bg-emerald-500/[0.02]"
                  : theme === 'dark' ? "border-white/10 bg-zinc-950/30 hover:border-emerald-500/30" : "border-zinc-200 bg-white hover:border-emerald-500/20"
              )}
            >
              {/* Header row */}
              <div className="flex items-center gap-3 px-5 py-4">
                <button
                  onClick={() => toggleComplete(task.id)}
                  className="shrink-0 hover:scale-110 transition-transform"
                  title={done ? 'Mark incomplete' : 'Mark complete'}
                >
                  {done
                    ? <CheckCircle2 className="w-[18px] h-[18px] text-emerald-500" />
                    : <Circle className="w-[18px] h-[18px] text-muted-foreground/40" />}
                </button>

                <button className="flex-1 text-left min-w-0" onClick={() => toggleExpand(task.id)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono text-muted-foreground">Task {task.id}</span>
                    <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-500 rounded px-1.5 py-0.5 truncate max-w-[200px] font-semibold">
                      {task.focus}
                    </span>
                  </div>
                  <p className={cn(
                    "text-sm font-semibold mt-1 leading-snug",
                    done ? "opacity-60" : "text-foreground"
                  )}>
                    {task.title}
                  </p>
                </button>

                <button onClick={() => toggleExpand(task.id)} className="shrink-0 p-0.5">
                  {open
                    ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>

              {/* Expanded body */}
              {open && (
                <div className={cn(
                  "border-t px-5 pb-5 pt-4 space-y-4",
                  theme === 'dark' ? "border-white/10 bg-black/20" : "border-zinc-200 bg-zinc-50/10"
                )}>

                  {/* Concept explanation */}
                  <div className={cn(
                    "rounded-xl border px-4 py-3",
                    theme === 'dark' ? "bg-white/5 border-white/10" : "bg-zinc-50/50 border-zinc-200"
                  )}>
                    <p className="text-[10px] font-semibold text-foreground uppercase tracking-widest mb-1.5">Concept</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{task.concept}</p>
                  </div>

                  {/* Goal */}
                  <div>
                    <p className="text-[10px] font-semibold text-foreground uppercase tracking-widest mb-1">Goal</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{task.goal}</p>
                  </div>

                  {/* Steps */}
                  <div>
                    <p className="text-[10px] font-semibold text-foreground uppercase tracking-widest mb-2">Steps</p>
                    <ol className="space-y-2">
                      {task.steps.map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm">
                          <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-muted-foreground leading-relaxed text-xs">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Expected result */}
                  <div className={cn(
                    "rounded-xl border px-4 py-3",
                    theme === 'dark' ? "bg-zinc-900/60 border-zinc-700/60" : "bg-zinc-100/80 border-zinc-300"
                  )}>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Expected Result</p>
                    <p className="text-xs font-mono text-foreground leading-relaxed">{task.expectedResult}</p>
                  </div>

                  {/* Insight */}
                  <div className={cn(
                    "rounded-xl border px-4 py-3",
                    theme === 'dark' ? "bg-violet-950/20 border-violet-500/25" : "bg-violet-50/50 border-violet-200"
                  )}>
                    <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest mb-1">Insight</p>
                    <p className="text-xs text-violet-600 dark:text-violet-300/75 leading-relaxed">{task.insight}</p>
                  </div>

                  {/* Complete button */}
                  <button
                    onClick={() => { toggleComplete(task.id); if (!done) setExpanded(null); }}
                    className={cn(
                      "w-full py-2.5 rounded-xl text-xs font-semibold transition-all duration-300",
                      done
                        ? "bg-secondary text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        : "bg-emerald-500 text-white hover:bg-emerald-600 shadow hover:shadow-emerald-500/20 active:scale-95"
                    )}
                  >
                    {done ? '↩ Mark as Incomplete' : '✓ Mark as Complete'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
