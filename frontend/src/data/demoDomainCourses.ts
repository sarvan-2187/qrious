export interface DemoCourse {
  id: string;
  title: string;
  category: 'CS' | 'Civil' | 'Mechanical' | 'Electrical' | 'Hardware';
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  modulesCount: number;
  duration: string;
  tags: string[];
}

export const DEMO_COURSES: DemoCourse[] = [
  {
    id: 'qc-101',
    title: 'Quantum Computing 101',
    category: 'Hardware',
    level: 'Beginner',
    description: 'Master qubits, superposition, Bloch sphere representation, and fundamental logic gates.',
    modulesCount: 4,
    duration: '2 Hours',
    tags: ['Foundations', 'Qubits', 'Gates']
  },
  {
    id: 'qubit-tuning',
    title: 'Tuning a Qubit: Control & Calibration',
    category: 'Electrical',
    level: 'Intermediate',
    description: 'Learn microwave pulse shaping, Rabi oscillation fitting, and measuring T1/T2 relaxation times.',
    modulesCount: 5,
    duration: '3.5 Hours',
    tags: ['Pulse Control', 'Calibration', 'Qiskit Pulse']
  },
  {
    id: 'build-quantum-computer',
    title: 'Building a Quantum Computer',
    category: 'Hardware',
    level: 'Advanced',
    description: 'Explore dilution refrigeration (15mK), superconducting transmons, readout resonators, and wiring.',
    modulesCount: 6,
    duration: '5 Hours',
    tags: ['Cryogenics', 'Transmons', 'Hardware']
  },
  {
    id: 'quantum-civil',
    title: 'Quantum for Civil & Structural Engineering',
    category: 'Civil',
    level: 'Intermediate',
    description: 'Apply QAOA and QUBO to structural frame optimization and urban traffic network distribution.',
    modulesCount: 4,
    duration: '3 Hours',
    tags: ['Civil', 'QAOA', 'Structural Optimization']
  },
  {
    id: 'quantum-mech',
    title: 'Quantum CFD & Thermo-Fluid Dynamics',
    category: 'Mechanical',
    level: 'Advanced',
    description: 'Solve Navier-Stokes differential equations using VQLS and Quantum Phase Estimation.',
    modulesCount: 5,
    duration: '4 Hours',
    tags: ['Mechanical', 'CFD', 'VQLS']
  }
];
