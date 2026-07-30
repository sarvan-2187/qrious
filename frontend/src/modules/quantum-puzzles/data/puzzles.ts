export type PuzzleFormat = 'reach_target' | 'match_gate';
export type PuzzleTier = 'Beginner' | 'Intermediate' | 'Advanced';

export interface GateMatchTask {
  question: string;
  gateName?: string;
  options: string[]; // Names of the gates or answers to display as choices
  correctAnswer?: string; // Optional if you want string-based answers instead of gate names
}

export interface Puzzle {
  id: string;
  tier: PuzzleTier;
  level: number;
  format: PuzzleFormat;
  prompt: string;
  topicsToLearn: string[];
  wrongFeedback: string;
  qubitCount: number;
  intuition?: string[];
  
  // For 'reach_target' format
  startState?: { x: number; y: number; z: number };
  targetState?: { x: number; y: number; z: number };
  allowedGates?: string[];
  gateLimit?: number;
  
  // For 'match_gate' format
  matchTasks?: GateMatchTask[];
  
  timeLimitSec?: number | null;
  hint?: string;
}

export const puzzles: Puzzle[] = [
  // BEGINNER (10 Puzzles) - 1 Qubit basics
  {
    id: "beg-1", tier: "Beginner", level: 1, format: "reach_target",
    prompt: "Flip |0⟩ to |1⟩ using one gate", topicsToLearn: ["Pauli-X Gate", "Bit-Flip"],
    wrongFeedback: "Remember, the X gate acts like a classical NOT gate, flipping the state.", qubitCount: 1,
    startState: { x: 0, y: 0, z: 1 }, targetState: { x: 0, y: 0, z: -1 }, allowedGates: ["H", "X", "Y", "Z"], gateLimit: 1,
    hint: "Use the X gate.",
    intuition: [
      "The X gate rotates the state by 180 degrees around the X-axis.",
      "This maps the top of the Bloch sphere (|0⟩) to the bottom (|1⟩), acting as a bit-flip."
    ]
  },
  {
    id: "beg-2", tier: "Beginner", level: 2, format: "reach_target",
    prompt: "Return to |0⟩ after passing through |1⟩", topicsToLearn: ["Pauli-X Reversibility"],
    wrongFeedback: "Two X gates cancel each other out. Try applying it twice.", qubitCount: 1,
    startState: { x: 0, y: 0, z: 1 }, targetState: { x: 0, y: 0, z: 1 }, allowedGates: ["X"], gateLimit: 2,
    hint: "Two of the same Pauli gate cancel each other out.",
    intuition: [
      "Two consecutive 180-degree rotations around the same axis return the qubit to its starting position.",
      "The Pauli-X gate is its own self-inverse."
    ]
  },
  {
    id: "beg-3", tier: "Beginner", level: 3, format: "reach_target",
    prompt: "Reach the +X axis (|+⟩ state)", topicsToLearn: ["Hadamard Gate", "Superposition"],
    wrongFeedback: "The Hadamard (H) gate creates an equal superposition.", qubitCount: 1,
    startState: { x: 0, y: 0, z: 1 }, targetState: { x: 1, y: 0, z: 0 }, allowedGates: ["H", "X", "Y", "Z"], gateLimit: 1,
    hint: "Which single gate maps |0⟩ to the +X axis?",
    intuition: [
      "The Hadamard (H) gate creates an equal superposition by mapping Z-basis states to X-basis states.",
      "Applying H to |0⟩ projects it directly onto the positive X-axis (|+⟩)."
    ]
  },
  {
    id: "beg-4", tier: "Beginner", level: 4, format: "reach_target",
    prompt: "Reach the -X axis (|-⟩ state) from |0⟩", topicsToLearn: ["Hadamard and Phase", "Superposition"],
    wrongFeedback: "You can reach |+> first, then flip it around Z, or flip to |1> first, then apply H.", qubitCount: 1,
    startState: { x: 0, y: 0, z: 1 }, targetState: { x: -1, y: 0, z: 0 }, allowedGates: ["H", "X", "Z"], gateLimit: 2,
    hint: "Apply X then H, or H then Z.",
    intuition: [
      "To reach the negative X-axis (|-⟩), you need both a superposition and a phase shift.",
      "You can combine a bit-flip (X) and a basis change (H), or create superposition (H) and rotate phase (Z)."
    ]
  },
  {
    id: "beg-5", tier: "Beginner", level: 5, format: "reach_target",
    prompt: "Return from |+⟩ to |0⟩", topicsToLearn: ["Hadamard Reversibility"],
    wrongFeedback: "The Hadamard gate is its own inverse. Applying it twice returns to the original state.", qubitCount: 1,
    startState: { x: 1, y: 0, z: 0 }, targetState: { x: 0, y: 0, z: 1 }, allowedGates: ["H", "X", "Z"], gateLimit: 1,
    hint: "The H gate is reversible.",
    intuition: [
      "Since H is self-reversible, applying H again will return the equator state back to the Z-axis.",
      "Applying H to the superposition state |+⟩ restores the state |0⟩."
    ]
  },
  {
    id: "beg-6", tier: "Beginner", level: 6, format: "reach_target",
    prompt: "Reach the +Y axis from |0⟩", topicsToLearn: ["Phase Gate (S)", "Complex Superposition"],
    wrongFeedback: "First reach the equator (+X), then rotate 90 degrees around Z with the S gate.", qubitCount: 1,
    startState: { x: 0, y: 0, z: 1 }, targetState: { x: 0, y: 1, z: 0 }, allowedGates: ["H", "S", "X"], gateLimit: 2,
    hint: "Hadamard followed by Phase (S).",
    intuition: [
      "The Y-axis corresponds to complex amplitudes.",
      "Start by mapping the Z-axis to the X-axis with H, then use the S gate to rotate 90 degrees around the Z-axis."
    ]
  },
  {
    id: "beg-7", tier: "Beginner", level: 7, format: "reach_target",
    prompt: "Reach the -Y axis from |0⟩", topicsToLearn: ["S-dagger Gate", "Negative Phase"],
    wrongFeedback: "The Sdag gate rotates -90 degrees around Z.", qubitCount: 1,
    startState: { x: 0, y: 0, z: 1 }, targetState: { x: 0, y: -1, z: 0 }, allowedGates: ["H", "S", "Sdag"], gateLimit: 2,
    hint: "Hadamard followed by Sdag.",
    intuition: [
      "The S-dagger (Sdag) gate rotates the state by -90 degrees around the Z-axis.",
      "First create superposition using H, then rotate in the negative phase direction."
    ]
  },
  {
    id: "beg-8", tier: "Beginner", level: 8, format: "reach_target",
    prompt: "Flip from |+⟩ to |-⟩ using Z", topicsToLearn: ["Pauli-Z Gate", "Phase-Flip"],
    wrongFeedback: "The Z gate flips the phase, turning |+⟩ into |-⟩ without affecting the Z axis probabilities.", qubitCount: 1,
    startState: { x: 1, y: 0, z: 0 }, targetState: { x: -1, y: 0, z: 0 }, allowedGates: ["H", "Z"], gateLimit: 1,
    hint: "Z gate acts as a phase flip.",
    intuition: [
      "The Pauli-Z gate acts as a phase-flip.",
      "Z rotates the equator state by 180 degrees around the Z-axis, transforming |+⟩ directly to |-⟩."
    ]
  },
  {
    id: "beg-9", tier: "Beginner", level: 9, format: "reach_target",
    prompt: "Flip |0⟩ to |1⟩ using Y", topicsToLearn: ["Pauli-Y Gate"],
    wrongFeedback: "The Y gate acts as a bit-flip and a phase-flip (with a complex factor).", qubitCount: 1,
    startState: { x: 0, y: 0, z: 1 }, targetState: { x: 0, y: 0, z: -1 }, allowedGates: ["H", "Y"], gateLimit: 1,
    hint: "The Y gate flips the state across the Y axis.",
    intuition: [
      "The Y gate rotates the state by 180 degrees around the Y-axis.",
      "This maps the positive Z-axis to the negative Z-axis while adding a relative complex phase."
    ]
  },
  {
    id: "beg-10", tier: "Beginner", level: 10, format: "reach_target",
    prompt: "Apply a Hadamard and a Pauli-Z to reach the -X axis from |0⟩", topicsToLearn: ["H and Z superposition"],
    wrongFeedback: "Recall that H creates superposition, and Z flips the phase on the equator.", qubitCount: 1,
    startState: { x: 0, y: 0, z: 1 }, targetState: { x: -1, y: 0, z: 0 }, allowedGates: ["H", "Z"], gateLimit: 2,
    hint: "H maps Z to X. Z flips the phase.",
    intuition: [
      "Hadamard creates superposition on the X-axis.",
      "Z flips the phase from +X to -X."
    ]
  },

  // INTERMEDIATE (10 Puzzles)
  {
    id: "int-1", tier: "Intermediate", level: 1, format: "reach_target",
    prompt: "Create the state H Z H |0⟩", topicsToLearn: ["Basis Transformation"],
    wrongFeedback: "HZH is equivalent to another fundamental gate. Think about how Z acts in the X basis.", qubitCount: 1,
    startState: { x: 0, y: 0, z: 1 }, targetState: { x: 0, y: 0, z: -1 }, allowedGates: ["H", "Z"], gateLimit: 3,
    hint: "Apply H, then Z, then H. What gate does this equal?",
    intuition: [
      "Think about basis transformations: wrapping a Z-gate with Hadamard gates changes its axis of rotation.",
      "A phase rotation in the X basis behaves exactly like a bit-flip (X gate) in the computational basis."
    ]
  },
  {
    id: "int-2", tier: "Intermediate", level: 2, format: "reach_target",
    prompt: "Create the state H X H |0⟩", topicsToLearn: ["Basis Transformation"],
    wrongFeedback: "HXH is equivalent to Z. Since Z|0⟩ = |0⟩, the state doesn't change.", qubitCount: 1,
    startState: { x: 0, y: 0, z: 1 }, targetState: { x: 0, y: 0, z: 1 }, allowedGates: ["H", "X"], gateLimit: 3,
    hint: "Apply H, then X, then H.",
    intuition: [
      "Basis transformation: wrapping X with Hadamards converts it to a Z action.",
      "Determine how a Z operation affects the starting state |0⟩."
    ]
  },
  {
    id: "int-3", tier: "Intermediate", level: 3, format: "reach_target",
    prompt: "Reach +Z from +Y", topicsToLearn: ["Complex rotations"],
    wrongFeedback: "You need to undo the phase and then undo the superposition.", qubitCount: 1,
    startState: { x: 0, y: 1, z: 0 }, targetState: { x: 0, y: 0, z: 1 }, allowedGates: ["H", "S", "Sdag"], gateLimit: 2,
    hint: "Sdag then H.",
    intuition: [
      "You need to rotate the state from the Y-axis back to the Z-axis.",
      "Undo the 90-degree phase rotation first (moving from Y to X), then use Hadamard to return to the Z-axis."
    ]
  },
  {
    id: "int-4", tier: "Intermediate", level: 4, format: "reach_target",
    prompt: "Find a sequence to flip the state to |1⟩ and rotate phase to -Y", topicsToLearn: ["State Preparation"],
    wrongFeedback: "Use X to flip to |1⟩ first, then H to transition, and Sdag to rotate.", qubitCount: 1,
    startState: { x: 0, y: 0, z: 1 }, targetState: { x: 0, y: -1, z: 0 }, allowedGates: ["H", "X", "Sdag"], gateLimit: 3,
    hint: "Try X then H then Sdag.",
    intuition: [
      "Use X to flip to |1⟩ first.",
      "Use H to transition, and Sdag to rotate the state to the negative Y-axis."
    ]
  },
  {
    id: "int-5", tier: "Intermediate", level: 5, format: "reach_target",
    prompt: "Reach the +Y axis from |1⟩ using X, H, and S", topicsToLearn: ["Superposition from |1⟩", "Phase"],
    wrongFeedback: "H on |1⟩ gives |-⟩. Then S on |-⟩ rotates to -Y — not +Y. First flip with X to |0⟩, then H, then S to reach +Y.", qubitCount: 1,
    startState: { x: 0, y: 0, z: -1 }, targetState: { x: 0, y: 1, z: 0 }, allowedGates: ["H", "S", "X"], gateLimit: 3,
    hint: "Flip to |0⟩ first, then use H and S.",
    intuition: [
      "H on |1⟩ gives |-⟩ (the -X axis state).",
      "To reach +Y, first flip back with X to |0⟩, then H creates |+⟩, and S rotates to +Y."
    ]
  },
  {
    id: "int-6", tier: "Intermediate", level: 6, format: "reach_target",
    prompt: "Use T gates to reach +Y", topicsToLearn: ["T Gate", "pi/4 phase"],
    wrongFeedback: "The T gate is a pi/4 rotation around Z. Two T gates equal one S gate.", qubitCount: 1,
    startState: { x: 0, y: 0, z: 1 }, targetState: { x: 0, y: 1, z: 0 }, allowedGates: ["H", "T"], gateLimit: 3,
    hint: "Apply H, then T, then T.",
    intuition: [
      "The T gate rotates the state by 45 degrees (pi/4) around the Z-axis.",
      "Two T gate rotations are equivalent to one S gate rotation (90 degrees)."
    ]
  },
  {
    id: "int-7", tier: "Intermediate", level: 7, format: "reach_target",
    prompt: "Use Tdag to reach -Y", topicsToLearn: ["T-dagger Gate"],
    wrongFeedback: "Two Tdag gates equal one Sdag gate.", qubitCount: 1,
    startState: { x: 0, y: 0, z: 1 }, targetState: { x: 0, y: -1, z: 0 }, allowedGates: ["H", "Tdag"], gateLimit: 3,
    hint: "Apply H, then Tdag, then Tdag.",
    intuition: [
      "T-dagger (Tdag) rotates the state by -45 degrees around the Z-axis.",
      "Apply H to get to the X-axis, and then rotate by -90 degrees using two Tdags."
    ]
  },
  {
    id: "int-8", tier: "Intermediate", level: 8, format: "reach_target",
    prompt: "Reach -Y axis from |1⟩ using H and S", topicsToLearn: ["Superposition Phase Shift"],
    wrongFeedback: "Apply H to reach |-⟩, then apply S to rotate to -Y.", qubitCount: 1,
    startState: { x: 0, y: 0, z: -1 }, targetState: { x: 0, y: -1, z: 0 }, allowedGates: ["H", "S"], gateLimit: 2,
    hint: "Apply H then S.",
    intuition: [
      "H maps |1⟩ to |-⟩.",
      "S rotates 90 degrees around the Z axis, mapping |-⟩ to the negative Y-axis."
    ]
  },
  {
    id: "int-9", tier: "Intermediate", level: 9, format: "reach_target",
    prompt: "From |+⟩, reach |1⟩ using H then X", topicsToLearn: ["Basis change + bit-flip"],
    wrongFeedback: "H maps |+⟩ back to |0⟩, then X flips to |1⟩.", qubitCount: 1,
    startState: { x: 1, y: 0, z: 0 }, targetState: { x: 0, y: 0, z: -1 }, allowedGates: ["H", "X", "Z"], gateLimit: 2,
    hint: "Apply H to return to |0⟩, then X to flip to |1⟩.",
    intuition: [
      "The Hadamard gate maps the |+⟩ equator state back to the computational |0⟩ state.",
      "The X gate then acts as a classical bit-flip, taking |0⟩ to |1⟩ at the bottom of the Bloch sphere."
    ]
  },
  {
    id: "int-10", tier: "Intermediate", level: 10, format: "reach_target",
    prompt: "Undo a T rotation", topicsToLearn: ["Gate Inverses"],
    wrongFeedback: "You can undo a T gate with a Tdag gate.", qubitCount: 1,
    startState: { x: 0.707, y: 0.707, z: 0 }, targetState: { x: 1, y: 0, z: 0 }, allowedGates: ["T", "Tdag"], gateLimit: 1,
    hint: "Use Tdag.",
    intuition: [
      "The starting state has been rotated by 45 degrees around Z.",
      "Use the inverse operation to subtract 45 degrees and align it back with the X-axis."
    ]
  },

  // ADVANCED (10 Puzzles)
  {
    id: "adv-1", tier: "Advanced", level: 1, format: "reach_target",
    prompt: "Map |0⟩ to -Z using Y rotation", topicsToLearn: ["State Flipping"],
    wrongFeedback: "The Y gate rotates by 180 degrees around the Y-axis.", qubitCount: 1,
    startState: { x: 0, y: 0, z: 1 }, targetState: { x: 0, y: 0, z: -1 }, allowedGates: ["Y"], gateLimit: 1,
    hint: "Use Y gate.",
    intuition: [
      "The Y gate rotates by 180 degrees around the Y-axis.",
      "This changes Z-state from |0⟩ to |1⟩."
    ]
  },
  {
    id: "adv-2", tier: "Advanced", level: 2, format: "reach_target",
    prompt: "Rotate Z-state by 45 degrees, then flip phase to reach the equator", topicsToLearn: ["Phase manipulation"],
    wrongFeedback: "Use H then Tdag to perform the negative 45 degree phase shift.", qubitCount: 1,
    startState: { x: 0, y: 0, z: 1 }, targetState: { x: 0.707, y: -0.707, z: 0 }, allowedGates: ["H", "Tdag"], gateLimit: 2,
    hint: "Use H then Tdag.",
    intuition: [
      "H maps to X-axis.",
      "Tdag rotates -45 degrees around Z, moving to the positive X, negative Y quadrant."
    ]
  },
  {
    id: "adv-3", tier: "Advanced", level: 3, format: "reach_target",
    prompt: "Construct Z from H and X", topicsToLearn: ["Gate Synthesis"],
    wrongFeedback: "Z = H X H.", qubitCount: 1,
    startState: { x: 1, y: 0, z: 0 }, targetState: { x: -1, y: 0, z: 0 }, allowedGates: ["H", "X"], gateLimit: 3,
    hint: "Wrap X with H gates.",
    intuition: [
      "Basis transformation: you can construct a Z operation by changing to the X basis, applying X, and changing back.",
      "The Hadamard gate acts as the basis transformer between Z and X."
    ]
  },
  {
    id: "adv-4", tier: "Advanced", level: 4, format: "reach_target",
    prompt: "Reach +Y from |1⟩ in 3 gates using only T and H", topicsToLearn: ["State Preparation from |1⟩", "T Gate"],
    wrongFeedback: "H maps |1⟩ to |-⟩ on the -X axis. Two T gates rotate 90° CCW around Z from |-⟩ to reach +Y.", qubitCount: 1,
    startState: { x: 0, y: 0, z: -1 }, targetState: { x: 0, y: 1, z: 0 }, allowedGates: ["H", "T"], gateLimit: 3,
    hint: "Apply H to get |-⟩, then apply T twice.",
    intuition: [
      "H maps |1⟩ to |-⟩ on the -X axis.",
      "Two T gates rotate 90° counter-clockwise around Z, moving from |-⟩ to the +Y axis."
    ]
  },
  {
    id: "adv-5", tier: "Advanced", level: 5, format: "reach_target",
    prompt: "Reach |-⟩ from |0⟩ using only H and Z", topicsToLearn: ["Phase Kickback", "Advanced Synthesis"],
    wrongFeedback: "Apply H to reach |+⟩ on the equator, then Z flips the phase to |-⟩. Only 2 gates needed.", qubitCount: 1,
    startState: { x: 0, y: 0, z: 1 }, targetState: { x: -1, y: 0, z: 0 }, allowedGates: ["H", "Z"], gateLimit: 2,
    hint: "H maps |0⟩ to |+⟩, then Z flips |+⟩ to |-⟩.",
    intuition: [
      "H maps the |0⟩ state to the |+⟩ superposition on the equator.",
      "Z performs a 180° rotation around the Z-axis, flipping |+⟩ directly to |-⟩."
    ]
  },
  {
    id: "adv-6", tier: "Advanced", level: 6, format: "reach_target",
    prompt: "Reach the +Y axis from |-⟩ using one gate", topicsToLearn: ["Phase Rotation from |-⟩"],
    wrongFeedback: "The S gate rotates 90° CCW around Z. From |-⟩ at {x:-1}, S moves to the +Y axis.", qubitCount: 1,
    startState: { x: -1, y: 0, z: 0 }, targetState: { x: 0, y: 1, z: 0 }, allowedGates: ["S", "Sdag", "Z"], gateLimit: 1,
    hint: "S rotates CCW around Z by 90°.",
    intuition: [
      "|-⟩ sits at the -X axis of the Bloch sphere.",
      "The S gate rotates the state by 90° counter-clockwise around the Z-axis, moving |-⟩ to the +Y axis."
    ]
  },
  {
    id: "adv-7", tier: "Advanced", level: 7, format: "reach_target",
    prompt: "Prepare the first step of QFT: map |0⟩ to |+⟩", topicsToLearn: ["Fourier Basics"],
    wrongFeedback: "Apply H to create the initial equal superposition state.", qubitCount: 1,
    startState: { x: 0, y: 0, z: 1 }, targetState: { x: 1, y: 0, z: 0 }, allowedGates: ["H"], gateLimit: 1,
    hint: "Apply H.",
    intuition: [
      "QFT of state |0⟩ produces an equal superposition.",
      "This is implemented by the Hadamard gate."
    ]
  },
  {
    id: "adv-8", tier: "Advanced", level: 8, format: "reach_target",
    prompt: "Reversing S", topicsToLearn: ["S and Sdag"],
    wrongFeedback: "Sdag undoes an S gate. Using S again adds more phase.", qubitCount: 1,
    startState: { x: 0, y: 1, z: 0 }, targetState: { x: 1, y: 0, z: 0 }, allowedGates: ["Sdag", "S"], gateLimit: 1,
    hint: "Use Sdag.",
    intuition: [
      "The state has been rotated by 90 degrees around Z.",
      "To return to the X-axis, apply a rotation of -90 degrees around Z."
    ]
  },
  {
    id: "adv-9", tier: "Advanced", level: 9, format: "reach_target",
    prompt: "Apply three T gates to reach the diagonal equator state", topicsToLearn: ["Angle synthesis"],
    wrongFeedback: "Apply H then T, T, T to rotate the state by 135 degrees around Z.", qubitCount: 1,
    startState: { x: 0, y: 0, z: 1 }, targetState: { x: -0.707, y: 0.707, z: 0 }, allowedGates: ["H", "T"], gateLimit: 4,
    hint: "Apply H then T, T, T.",
    intuition: [
      "H maps Z-basis to the equator.",
      "Three T gates rotate the state by 135 degrees (3 * 45) around the Z-axis."
    ]
  },
  {
    id: "adv-10", tier: "Advanced", level: 10, format: "reach_target",
    prompt: "Return the state from |-⟩ back to |0⟩", topicsToLearn: ["State Restoration"],
    wrongFeedback: "Apply Z to move from |-⟩ to |+⟩, then H to return to |0⟩.", qubitCount: 1,
    startState: { x: -1, y: 0, z: 0 }, targetState: { x: 0, y: 0, z: 1 }, allowedGates: ["Z", "H"], gateLimit: 2,
    hint: "Apply Z to move from |-⟩ to |+⟩, then H to return to |0⟩.",
    intuition: [
      "Z rotates |-⟩ to |+⟩ on the equator.",
      "H maps the superposition |+⟩ back to the computational state |0⟩."
    ]
  }
];
