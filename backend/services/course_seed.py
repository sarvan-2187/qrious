import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import connect_to_mongo, get_db

DOMAIN_COURSES = [
    # -------------------------------------------------------------
    # COURSE 1: Quantum Computing 101
    # -------------------------------------------------------------
    {
        "slug": "qc-101",
        "title": "Quantum Computing 101",
        "description": "Master qubits, superposition, Bloch sphere representation, and fundamental logic gates.",
        "category": "Hardware",
        "level": "Beginner",
        "duration": "2 Hours",
        "tags": ["Foundations", "Qubits", "Gates"],
        "modules": [
            {
                "title": "Module 1: Foundations of Quantum Information",
                "order": 1,
                "lessons": [
                    {
                        "title": "Lesson 1: Introduction to Qubits & Superposition",
                        "order": 1,
                        "resources": [
                            {
                                "title": "1.1 What is a Qubit? Classical Bits vs Quantum Superposition",
                                "description": "Learn the fundamental differences between classical 0/1 bits and quantum two-state superposition states.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=g_IaVepNDT4",
                                "filename": "qubits_superposition_overview.mp4"
                            },
                            {
                                "title": "1.2 Quantum Probability Amplitudes & State Vector Math",
                                "description": "Mathematical derivation of quantum state vectors |ψ⟩ = α|0⟩ + β|1⟩ and Born's probability rule |α|² + |β|² = 1.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=F_Riqjdh2oM",
                                "filename": "probability_amplitudes.mp4"
                            },
                            {
                                "title": "1.3 Measurement & Superposition Collapse Walkthrough",
                                "description": "Understand how physical measurement forces a quantum state in superposition to collapse into a classical eigenstate.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=u1GG9N2q03k",
                                "filename": "measurement_collapse.mp4"
                            },
                            {
                                "title": "Quantum 101: Qubits & Superposition Study Notes.pdf",
                                "description": "Complete lecture note deck covering mathematical representations of qubits, inner products, and state vectors.",
                                "resource_type": "notes",
                                "url": "https://qrious-quantum.s3.amazonaws.com/materials/quantum-101-notes.pdf",
                                "filename": "quantum_101_notes.pdf"
                            }
                        ]
                    },
                    {
                        "title": "Lesson 2: The Bloch Sphere & Single-Qubit States",
                        "order": 2,
                        "resources": [
                            {
                                "title": "2.1 Visualizing Single Qubit States on the Bloch Sphere",
                                "description": "Geometric mapping of a qubit state onto the 3D unit Bloch sphere using spherical coordinates θ and φ.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=90za6mazNps",
                                "filename": "bloch_sphere_visualization.mp4"
                            },
                            {
                                "title": "2.2 Spherical Coordinates (Theta & Phi) & State Rotations",
                                "description": "In-depth derivation of latitude angle θ and azimuthal phase angle φ in state vector representations.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=JpW24saaSuE",
                                "filename": "spherical_coordinates_rotations.mp4"
                            },
                            {
                                "title": "2.3 Pure States vs Mixed States on the Bloch Sphere",
                                "description": "Differentiating pure quantum boundary states from interior mixed states using density matrices.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=kT8O__Fl54I",
                                "filename": "pure_vs_mixed_states.mp4"
                            },
                            {
                                "title": "Bloch Sphere Geometry Reference & Cheatsheet.pdf",
                                "description": "Diagrammatic cheatsheet with polar vector conversions, state mappings (|0⟩, |1⟩, |+⟩, |-⟩), and coordinate axes.",
                                "resource_type": "cheatsheet",
                                "url": "https://qrious-quantum.s3.amazonaws.com/materials/bloch-sphere-cheatsheet.pdf",
                                "filename": "bloch_sphere_cheatsheet.pdf"
                            }
                        ]
                    }
                ]
            },
            {
                "title": "Module 2: Fundamental Quantum Logic Gates",
                "order": 2,
                "lessons": [
                    {
                        "title": "Lesson 1: Single-Qubit Gates (Pauli X, Y, Z & Hadamard)",
                        "order": 1,
                        "resources": [
                            {
                                "title": "1.1 Pauli-X, Y, and Z Rotation Gates Explained",
                                "description": "Understanding Pauli quantum operators as 180-degree rotations about the X, Y, and Z axes on the Bloch Sphere.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=H9Fqt5gDijM",
                                "filename": "pauli_gates_overview.mp4"
                            },
                            {
                                "title": "1.2 The Hadamard Gate: Creating Equal Superposition",
                                "description": "Matrix algebra and circuit application of the Hadamard (H) gate to convert computational basis states into superposition states.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=MHYZgWmPhbI",
                                "filename": "hadamard_gate_superposition.mp4"
                            },
                            {
                                "title": "1.3 Phase Gates (S and T Gates) & Arbitrary Axis Rotations",
                                "description": "Exploring Z-axis phase shifts using S (π/2 phase) and T (π/4 phase) gates in quantum circuit designs.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=mmibUFIep_s",
                                "filename": "phase_gates_rotations.mp4"
                            },
                            {
                                "title": "Fundamental Quantum Gates Guide & Matrix Matrix Reference.pdf",
                                "description": "Handy matrix lookup table for single-qubit gates, matrix multiplication rules, and unitary properties.",
                                "resource_type": "notes",
                                "url": "https://qrious-quantum.s3.amazonaws.com/materials/quantum-gates-guide.pdf",
                                "filename": "quantum_gates_guide.pdf"
                            }
                        ]
                    },
                    {
                        "title": "Lesson 2: Two-Qubit Gates & Entanglement Basics",
                        "order": 2,
                        "resources": [
                            {
                                "title": "2.1 Controlled-NOT (CNOT) & Two-Qubit State Vectors",
                                "description": "Operations of conditional CNOT (CX) gates and building 4-dimensional two-qubit tensor product state spaces.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=85SoQ5f5dHk",
                                "filename": "cnot_two_qubit_states.mp4"
                            },
                            {
                                "title": "2.2 Creating & Measuring the 4 Maximally Entangled Bell States",
                                "description": "Step-by-step construction of |Φ⁺⟩, |Φ⁻⟩, |Ψ⁺⟩, and |Ψ⁻⟩ Bell states using Hadamard and CNOT gates.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=I0jH1_H3x1o",
                                "filename": "bell_states_entanglement.mp4"
                            },
                            {
                                "title": "2.3 Toffoli (CCX) & Multi-Control Quantum Gate Architectures",
                                "description": "Constructing 3-qubit Toffoli gates and universal quantum gate sets for arbitrary quantum computation.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=oaAjxcIFLtM",
                                "filename": "toffoli_multi_qubit_gates.mp4"
                            },
                            {
                                "title": "Entanglement & Bell States Study Guide.pdf",
                                "description": "Mathematical derivation of Bell states, reduced density matrices, and quantum correlation proofs.",
                                "resource_type": "notes",
                                "url": "https://qrious-quantum.s3.amazonaws.com/materials/entanglement-bell-states.pdf",
                                "filename": "entanglement_bell_states.pdf"
                            }
                        ]
                    }
                ]
            }
        ]
    },

    # -------------------------------------------------------------
    # COURSE 2: Tuning a Qubit: Control & Calibration
    # -------------------------------------------------------------
    {
        "slug": "qubit-tuning",
        "title": "Tuning a Qubit: Control & Calibration",
        "description": "Learn microwave pulse shaping, Rabi oscillation fitting, and measuring T1/T2 relaxation times.",
        "category": "Electrical",
        "level": "Intermediate",
        "duration": "3.5 Hours",
        "tags": ["Pulse Control", "Calibration", "Qiskit Pulse"],
        "modules": [
            {
                "title": "Module 1: Microwave Pulse Shaping & Qubit Control",
                "order": 1,
                "lessons": [
                    {
                        "title": "Lesson 1: Microwave Pulses & Rabi Oscillations",
                        "order": 1,
                        "resources": [
                            {
                                "title": "1.1 Physics of Transmon Qubit Control & Microwave Drive",
                                "description": "Introduction to driving superconducting qubits using resonant microwave pulses at GHz frequencies.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=dD-oYfhSKhg",
                                "filename": "microwave_qubit_control.mp4"
                            },
                            {
                                "title": "1.2 Rabi Oscillations: Fitting Drive Amplitude & Pulse Duration",
                                "description": "Experimental Rabi oscillation power sweeps to determine exact π-pulse drive amplitudes for state inversion.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=JpW24saaSuE",
                                "filename": "rabi_oscillations_fitting.mp4"
                            },
                            {
                                "title": "1.3 DRAG Pulses & Leakage Reduction to Higher Energy Levels",
                                "description": "Applying Derivative Removal by Adiabatic Gate (DRAG) pulse shaping to prevent leakage into higher transmon states.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=H9Fqt5gDijM",
                                "filename": "drag_pulses_leakage.mp4"
                            },
                            {
                                "title": "Microwave Pulse Shaping & Rabi Fitting Manual.pdf",
                                "description": "Step-by-step guide for microwave envelope calibration, Gaussian envelope parameters, and quadrature error correction.",
                                "resource_type": "notes",
                                "url": "https://qrious-quantum.s3.amazonaws.com/materials/rabi-pulse-shaping.pdf",
                                "filename": "rabi_pulse_shaping.pdf"
                            }
                        ]
                    },
                    {
                        "title": "Lesson 2: Qiskit Pulse & Low-Level Pulse Schedules",
                        "order": 2,
                        "resources": [
                            {
                                "title": "2.1 Introduction to Qiskit Pulse Control Framework",
                                "description": "Overview of building pulse schedules, drive channels, acquire channels, and waveforms in Python Qiskit.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=oaAjxcIFLtM",
                                "filename": "qiskit_pulse_introduction.mp4"
                            },
                            {
                                "title": "2.2 Building Custom Gaussian & Square Wave Waveforms",
                                "description": "Hands-on tutorial creating custom Gaussian, Drag, and Square pulse shapes for precise qubit rotations.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=MHYZgWmPhbI",
                                "filename": "custom_pulse_waveforms.mp4"
                            },
                            {
                                "title": "2.3 Calibrating pi and pi/2 Pulse Amplitudes in Qiskit Pulse",
                                "description": "Running pulse experiments on IBM Quantum backends to measure Rabi curves and tune gate parameters.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=85SoQ5f5dHk",
                                "filename": "pi_pulse_calibration.mp4"
                            },
                            {
                                "title": "Qiskit Pulse Calibration & Experiment Handbook.pdf",
                                "description": "Python notebook snippets for pulse schedule construction, backend channel mapping, and microwave pulse sweeps.",
                                "resource_type": "cheatsheet",
                                "url": "https://qrious-quantum.s3.amazonaws.com/materials/qiskit-pulse-handbook.pdf",
                                "filename": "qiskit_pulse_handbook.pdf"
                            }
                        ]
                    }
                ]
            },
            {
                "title": "Module 2: Qubit Coherence & Relaxation Measurements",
                "order": 2,
                "lessons": [
                    {
                        "title": "Lesson 1: Measuring T1 Energy Relaxation Time",
                        "order": 1,
                        "resources": [
                            {
                                "title": "1.1 Physics of Qubit Decoherence & T1 Relaxation",
                                "description": "Understanding energy relaxation processes where an excited |1⟩ qubit state decays to ground |0⟩ state.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=-66rprgwGNU",
                                "filename": "t1_relaxation_physics.mp4"
                            },
                            {
                                "title": "1.2 T1 Inversion Recovery Experiment Design & Execution",
                                "description": "Designing pulse sequences with varying delay times τ between state excitation and measurement.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=RyPQL8lccx4",
                                "filename": "t1_inversion_recovery.mp4"
                            },
                            {
                                "title": "1.3 Data Fitting & Lifetime Extraction from Decay Curves",
                                "description": "Exponential decay fitting e^(-t/T1) in Python scipy to extract physical T1 relaxation times.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=kT8O__Fl54I",
                                "filename": "t1_data_fitting.mp4"
                            },
                            {
                                "title": "T1 Relaxation Measurement & Data Analysis Guide.pdf",
                                "description": "Experimental protocol for measuring T1 relaxation, noise floor filtering, and exponential fitting code.",
                                "resource_type": "notes",
                                "url": "https://qrious-quantum.s3.amazonaws.com/materials/t1-measurement-guide.pdf",
                                "filename": "t1_measurement_guide.pdf"
                            }
                        ]
                    },
                    {
                        "title": "Lesson 2: Measuring T2 & T2* Dephasing Times",
                        "order": 2,
                        "resources": [
                            {
                                "title": "2.1 Ramsey Fringe Experiment for Measuring T2*",
                                "description": "Using two π/2 pulses separated by variable delay τ to measure dephasing caused by low-frequency magnetic noise.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=JpW24saaSuE",
                                "filename": "ramsey_fringe_t2_star.mp4"
                            },
                            {
                                "title": "2.2 Hahn Echo Pulses & Refocusing Inhomogeneous Dephasing",
                                "description": "Applying a refocusing π-pulse midway through the delay interval to extend coherence time to T2 Echo.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=dD-oYfhSKhg",
                                "filename": "hahn_echo_refocusing.mp4"
                            },
                            {
                                "title": "2.3 Spin Echo Data Analysis & Dynamical Decoupling (DD)",
                                "description": "Multi-pulse CPMG and XY4 dynamical decoupling sequences for suppression of high-frequency environmental noise.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=mmibUFIep_s",
                                "filename": "dynamical_decoupling_t2.mp4"
                            },
                            {
                                "title": "T2 Ramsey & Hahn Echo Measurement Manual.pdf",
                                "description": "Comprehensive reference covering Ramsey oscillation fitting, Hahn echo refocusing, and T2 vs T1 relationships.",
                                "resource_type": "notes",
                                "url": "https://qrious-quantum.s3.amazonaws.com/materials/t2-ramsey-manual.pdf",
                                "filename": "t2_ramsey_manual.pdf"
                            }
                        ]
                    }
                ]
            }
        ]
    },

    # -------------------------------------------------------------
    # COURSE 3: Building a Quantum Computer
    # -------------------------------------------------------------
    {
        "slug": "build-quantum-computer",
        "title": "Building a Quantum Computer",
        "description": "Explore dilution refrigeration (15mK), superconducting transmons, readout resonators, and wiring.",
        "category": "Hardware",
        "level": "Advanced",
        "duration": "5 Hours",
        "tags": ["Cryogenics", "Transmons", "Hardware"],
        "modules": [
            {
                "title": "Module 1: Superconducting Transmon Architecture & Cryogenics",
                "order": 1,
                "lessons": [
                    {
                        "title": "Lesson 1: Dilution Refrigeration & Ultra-Low Temperatures",
                        "order": 1,
                        "resources": [
                            {
                                "title": "1.1 Principles of Dilution Refrigeration down to 15 mK",
                                "description": "Thermodynamics of 3He-4He mixture phase separation and achieving millikelvin temperatures for quantum chips.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=-66rprgwGNU",
                                "filename": "dilution_refrigeration_physics.mp4"
                            },
                            {
                                "title": "1.2 Cryogenic Wiring, Attenuators & Thermal Isolation Flanges",
                                "description": "Engineering coaxial line attenuation, infra-red filters, and thermalization stages from 300K down to 15mK.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=dD-oYfhSKhg",
                                "filename": "cryogenic_wiring_attenuators.mp4"
                            },
                            {
                                "title": "1.3 Cold Electronics & Low-Noise Amplifiers (HEMT & TWPA)",
                                "description": "Operating High Electron Mobility Transistors (HEMT) and Traveling Wave Parametric Amplifiers (TWPA) at 4K and 15mK.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=RyPQL8lccx4",
                                "filename": "low_noise_amplifiers_twpa.mp4"
                            },
                            {
                                "title": "Dilution Refrigeration & Cryogenic Stack Architecture.pdf",
                                "description": "Detailed engineering schematics of cryostat temperature stages, thermal loads, attenuator budgets, and cabling.",
                                "resource_type": "notes",
                                "url": "https://qrious-quantum.s3.amazonaws.com/materials/cryogenic-stack-architecture.pdf",
                                "filename": "cryogenic_stack_architecture.pdf"
                            }
                        ]
                    },
                    {
                        "title": "Lesson 2: Superconducting Transmon Qubit Fabrication",
                        "order": 2,
                        "resources": [
                            {
                                "title": "2.1 Josephson Junctions & Non-Linear Inductance",
                                "description": "Physics of Al/AlOx/Al Josephson tunnel junctions creating non-linear LC oscillator energy levels.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=g_IaVepNDT4",
                                "filename": "josephson_junctions_physics.mp4"
                            },
                            {
                                "title": "2.2 Transmon Qubit Design: Anharmonicity & Noise Suppression",
                                "description": "Shunting Josephson junctions with large coplanar capacitors to suppress charge noise sensitivity.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=F_Riqjdh2oM",
                                "filename": "transmon_anharmonicity_design.mp4"
                            },
                            {
                                "title": "2.3 Cleanroom Fabrication Steps for Superconducting Qubit Chips",
                                "description": "Electron-beam lithography, shadow evaporation of aluminum junctions, and sapphire substrate etching.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=u1GG9N2q03k",
                                "filename": "cleanroom_fabrication_steps.mp4"
                            },
                            {
                                "title": "Transmon Physics & Cleanroom Fabrication Manual.pdf",
                                "description": "Cleanroom process flow diagram, junction resistance targeting, and dielectric loss tangent optimization.",
                                "resource_type": "notes",
                                "url": "https://qrious-quantum.s3.amazonaws.com/materials/transmon-fabrication-manual.pdf",
                                "filename": "transmon_fabrication_manual.pdf"
                            }
                        ]
                    }
                ]
            },
            {
                "title": "Module 2: Readout Resonators & System Control Wiring",
                "order": 2,
                "lessons": [
                    {
                        "title": "Lesson 1: Dispersive Readout & Cavity QED",
                        "order": 1,
                        "resources": [
                            {
                                "title": "1.1 Cavity Quantum Electrodynamics (cQED) & Readout Resonators",
                                "description": "Coupling transmon qubits to 2D coplanar waveguide (CPW) transmission line resonators.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=JpW24saaSuE",
                                "filename": "cqed_readout_resonators.mp4"
                            },
                            {
                                "title": "1.2 Dispersive Shift & Qubit State Discrimination in IQ Plane",
                                "description": "Demodulating microwave signals to measure state-dependent frequency shifts in IQ (In-phase / Quadrature) plane.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=90za6mazNps",
                                "filename": "dispersive_shift_iq_plane.mp4"
                            },
                            {
                                "title": "1.3 Purcell Filters & Protecting Qubit Lifetimes during Readout",
                                "description": "Designing Purcell filters to prevent spontaneous microwave photon emission from qubit into readout lines.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=kT8O__Fl54I",
                                "filename": "purcell_filters_readout.mp4"
                            },
                            {
                                "title": "Dispersive Readout & Cavity QED Engineering Notes.pdf",
                                "description": "Jaynes-Cummings Hamiltonian derivation, dispersive regime approximations, and IQ clustering algorithms.",
                                "resource_type": "notes",
                                "url": "https://qrious-quantum.s3.amazonaws.com/materials/dispersive-readout-notes.pdf",
                                "filename": "dispersive_readout_notes.pdf"
                            }
                        ]
                    },
                    {
                        "title": "Lesson 2: Control Electronics & Microwave Cabling",
                        "order": 2,
                        "resources": [
                            {
                                "title": "2.1 Room-Temperature Control Rack Architecture & AWGs",
                                "description": "FPGA-driven Arbitrary Waveform Generators (AWGs), upconversion mixers, and local oscillators (LO).",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=H9Fqt5gDijM",
                                "filename": "room_temp_control_racks.mp4"
                            },
                            {
                                "title": "2.2 Coaxial Cables, Circulators, and Cryogenic Shielding",
                                "description": "Selecting non-magnetic NbTi and CuNi coaxial cables, ferrite circulators, and mu-metal magnetic shields.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=MHYZgWmPhbI",
                                "filename": "coaxial_cables_circulators.mp4"
                            },
                            {
                                "title": "2.3 Crosstalk Mitigation & Multi-Qubit Chip Layouts",
                                "description": "Engineered package grounding, airbridges, and frequency allocation strategies for scaling to 50+ qubit processors.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=mmibUFIep_s",
                                "filename": "crosstalk_mitigation_scaling.mp4"
                            },
                            {
                                "title": "Hardware Wiring & Control System Wiring Schematics.pdf",
                                "description": "Complete rack-to-cryostat wiring diagrams, microwave component datasheets, and grounding guidelines.",
                                "resource_type": "notes",
                                "url": "https://qrious-quantum.s3.amazonaws.com/materials/hardware-wiring-diagrams.pdf",
                                "filename": "hardware_wiring_diagrams.pdf"
                            }
                        ]
                    }
                ]
            }
        ]
    },

    # -------------------------------------------------------------
    # COURSE 4: Quantum for Civil & Structural Engineering
    # -------------------------------------------------------------
    {
        "slug": "quantum-civil",
        "title": "Quantum for Civil & Structural Engineering",
        "description": "Apply QAOA and QUBO to structural frame optimization and urban traffic network distribution.",
        "category": "Civil",
        "level": "Intermediate",
        "duration": "3 Hours",
        "tags": ["Civil", "QAOA", "Structural Optimization"],
        "modules": [
            {
                "title": "Module 1: Structural Frame Optimization with QAOA",
                "order": 1,
                "lessons": [
                    {
                        "title": "Lesson 1: Formulating Structural Load Problems as QUBO",
                        "order": 1,
                        "resources": [
                            {
                                "title": "1.1 Introduction to Quadratic Unconstrained Binary Optimization (QUBO)",
                                "description": "Translating discrete structural optimization constraints (weight, deflection, stress) into binary QUBO matrices.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=hnpjC8WQVrQ",
                                "filename": "qubo_formulation_intro.mp4"
                            },
                            {
                                "title": "1.2 Mapping Truss & Frame Topology Constraints to QUBO Matrices",
                                "description": "Encoding member presence and cross-sectional sizing variables into diagonal and off-diagonal QUBO terms.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=pC2XRXInHnc",
                                "filename": "truss_topology_qubo_mapping.mp4"
                            },
                            {
                                "title": "1.3 Penalty Factors & Weight Optimization in Structural Design",
                                "description": "Balancing structural performance vs material weight penalties in energy Hamiltonians.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=xYvGvBIKMcI",
                                "filename": "penalty_factors_weight_optimization.mp4"
                            },
                            {
                                "title": "QUBO Formulation for Structural Frames Guide.pdf",
                                "description": "Step-by-step mathematical conversion of 2D truss load equations into matrix QUBO form for quantum solvers.",
                                "resource_type": "notes",
                                "url": "https://qrious-quantum.s3.amazonaws.com/materials/qubo-structural-frames.pdf",
                                "filename": "qubo_structural_frames.pdf"
                            }
                        ]
                    },
                    {
                        "title": "Lesson 2: Quantum Approximate Optimization Algorithm (QAOA)",
                        "order": 2,
                        "resources": [
                            {
                                "title": "2.1 QAOA Circuit Architecture & Cost/Mixer Hamiltonians",
                                "description": "Constructing parameterized QAOA ansatz circuits alternating between cost layer H_C and mixer layer H_M.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=W8QZ-yxebFA",
                                "filename": "qaoa_circuit_architecture.mp4"
                            },
                            {
                                "title": "2.2 Optimizing QAOA Variational Parameters (Gamma & Beta)",
                                "description": "Hybrid classical-quantum feedback loops using COBYLA and SPSA optimizers for parameter convergence.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=4nT0BTUxhJY",
                                "filename": "qaoa_parameter_optimization.mp4"
                            },
                            {
                                "title": "2.3 Solving Frame Truss Layouts on Quantum Simulators in Qiskit",
                                "description": "End-to-end Python tutorial executing QAOA structural optimization on Qiskit Aer simulators.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=dscRoTBPeso",
                                "filename": "qaoa_truss_qiskit_demo.mp4"
                            },
                            {
                                "title": "QAOA Structural Optimization & Qiskit Code Handbook.pdf",
                                "description": "Complete Python script templates for Qiskit Optimization module, docplex integration, and QAOA execution.",
                                "resource_type": "notes",
                                "url": "https://qrious-quantum.s3.amazonaws.com/materials/qaoa-structural-handbook.pdf",
                                "filename": "qaoa_structural_handbook.pdf"
                            }
                        ]
                    }
                ]
            },
            {
                "title": "Module 2: Urban Traffic Network & Resource Distribution",
                "order": 2,
                "lessons": [
                    {
                        "title": "Lesson 1: Traffic Flow Optimization & Route Selection",
                        "order": 1,
                        "resources": [
                            {
                                "title": "1.1 Urban Traffic Congestion as a Graph Combinatorial Problem",
                                "description": "Formulating urban vehicle routing and intersection signal timing as graph partitioning problems.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=OoQSdcKAIZc",
                                "filename": "traffic_flow_combinatorics.mp4"
                            },
                            {
                                "title": "1.2 Formulating Traffic Routing QUBO for Gate QPUs & Annealers",
                                "description": "Constructing objective functions to minimize total network travel time and overlap congestion.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=SyW1LkbFv6k",
                                "filename": "traffic_routing_qubo.mp4"
                            },
                            {
                                "title": "1.3 Evaluating Speedups in Real-Time Network Rerouting",
                                "description": "Benchmarking quantum algorithm response times vs classical Dijkstra and MILP solvers for large city grids.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=Kd8uJx-OLHg",
                                "filename": "traffic_quantum_speedups.mp4"
                            },
                            {
                                "title": "Quantum Traffic Flow Optimization Manual.pdf",
                                "description": "Mathematical framework for vehicle path QUBO encoding, capacity constraints, and network simulation results.",
                                "resource_type": "notes",
                                "url": "https://qrious-quantum.s3.amazonaws.com/materials/quantum-traffic-flow.pdf",
                                "filename": "quantum_traffic_flow.pdf"
                            }
                        ]
                    },
                    {
                        "title": "Lesson 2: Infrastructure Maintenance Scheduling",
                        "order": 2,
                        "resources": [
                            {
                                "title": "2.1 Constrained Resource Allocation in Civil Infrastructure",
                                "description": "Optimizing multi-year inspection schedules for bridges, roads, and water supply networks under budget limits.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=S8zSfxbgEhk",
                                "filename": "infrastructure_resource_allocation.mp4"
                            },
                            {
                                "title": "2.2 Quantum Integer Programming & Binary Mapping Strategies",
                                "description": "Converting integer variables into binary bit representations for maintenance schedule matrices.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=X4gegxIuh1o",
                                "filename": "quantum_integer_programming.mp4"
                            },
                            {
                                "title": "2.3 Benchmarking QAOA vs Classical Solvers for Inspection Crews",
                                "description": "Comparing QAOA approximation ratios with classical Gurobi and CPLEX solvers for schedule optimization.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=0EoysYeuDBk",
                                "filename": "benchmarking_qaoa_vs_classical.mp4"
                            },
                            {
                                "title": "Civil Infrastructure Scheduling & QUBO Reference.pdf",
                                "description": "Sample dataset and Python code for maintenance schedule optimization using quantum solvers.",
                                "resource_type": "notes",
                                "url": "https://qrious-quantum.s3.amazonaws.com/materials/infrastructure-scheduling-reference.pdf",
                                "filename": "infrastructure_scheduling_reference.pdf"
                            }
                        ]
                    }
                ]
            }
        ]
    },

    # -------------------------------------------------------------
    # COURSE 5: Quantum CFD & Thermo-Fluid Dynamics
    # -------------------------------------------------------------
    {
        "slug": "quantum-mech",
        "title": "Quantum CFD & Thermo-Fluid Dynamics",
        "description": "Solve Navier-Stokes differential equations using VQLS and Quantum Phase Estimation.",
        "category": "Mechanical",
        "level": "Advanced",
        "duration": "4 Hours",
        "tags": ["Mechanical", "CFD", "VQLS"],
        "modules": [
            {
                "title": "Module 1: Quantum Linear Systems Algorithm (VQLS) for Fluid Mechanics",
                "order": 1,
                "lessons": [
                    {
                        "title": "Lesson 1: Discretizing Differential Equations for Quantum Hardware",
                        "order": 1,
                        "resources": [
                            {
                                "title": "1.1 Navier-Stokes & Heat Equations in Fluid Dynamics",
                                "description": "Overview of partial differential equations (PDEs) governing fluid velocity fields and heat transfer.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=Kd8uJx-OLHg",
                                "filename": "navier_stokes_overview.mp4"
                            },
                            {
                                "title": "1.2 Finite Difference Discretization to Linear Systems Ax = b",
                                "description": "Converting continuous differential operators into sparse linear systems suitable for quantum state encoding.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=S8zSfxbgEhk",
                                "filename": "finite_difference_linear_systems.mp4"
                            },
                            {
                                "title": "1.3 Decomposing Sparse Linear Matrices into Linear Combinations of Unitaries (LCU)",
                                "description": "Expressing matrix A as a sum of Pauli tensor products A = ∑ c_i A_i for quantum circuit evaluation.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=X4gegxIuh1o",
                                "filename": "lcu_matrix_decomposition.mp4"
                            },
                            {
                                "title": "Fluid Dynamics Discretization for Quantum Computing.pdf",
                                "description": "Mathematical formulation of 2D poiseuille flow discretization, boundary conditions, and LCU decomposition.",
                                "resource_type": "notes",
                                "url": "https://qrious-quantum.s3.amazonaws.com/materials/fluid-dynamics-discretization.pdf",
                                "filename": "fluid_dynamics_discretization.pdf"
                            }
                        ]
                    },
                    {
                        "title": "Lesson 2: Variational Quantum Linear Solver (VQLS)",
                        "order": 2,
                        "resources": [
                            {
                                "title": "2.1 Variational Quantum Linear Solver (VQLS) Foundations",
                                "description": "Understanding VQLS as a NISQ-friendly alternative to HHL for solving linear systems Ax = b.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=0EoysYeuDBk",
                                "filename": "vqls_foundations.mp4"
                            },
                            {
                                "title": "2.2 Constructing the Hadamard Test & Overlap Cost Functions",
                                "description": "Evaluating overlap inner products |⟨b|A|x(θ)⟩|² using Hadamard test circuits.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=9g8rR9i_CeA",
                                "filename": "hadamard_test_overlap_vqls.mp4"
                            },
                            {
                                "title": "2.3 VQLS Convergence & Cost Function Optimization for Pipe Flow",
                                "description": "Optimizing ansatz parameters θ in Python to reconstruct velocity profiles in laminar pipe flow.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=hnpjC8WQVrQ",
                                "filename": "vqls_pipe_flow_optimization.mp4"
                            },
                            {
                                "title": "VQLS Algorithm & Quantum CFD Circuit Design Guide.pdf",
                                "description": "Complete derivation of local and global VQLS cost functions, Hadamard overlap test, and gradient calculations.",
                                "resource_type": "notes",
                                "url": "https://qrious-quantum.s3.amazonaws.com/materials/vqls-cfd-guide.pdf",
                                "filename": "vqls_cfd_guide.pdf"
                            }
                        ]
                    }
                ]
            },
            {
                "title": "Module 2: Quantum Phase Estimation & CFD Simulation",
                "order": 2,
                "lessons": [
                    {
                        "title": "Lesson 1: HHL Algorithm & Matrix Inversion",
                        "order": 1,
                        "resources": [
                            {
                                "title": "1.1 Harrow-Hassidim-Lloyd (HHL) Algorithm Overview",
                                "description": "Theoretical exponential speedup of HHL for linear systems Ax = b and condition number dependencies.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=W8QZ-yxebFA",
                                "filename": "hhl_algorithm_overview.mp4"
                            },
                            {
                                "title": "1.2 Quantum Phase Estimation of Fluid System Operators",
                                "description": "Estimating eigenvalues of matrix A using Hamiltonian simulation e^(iAt) and QFT registers.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=4nT0BTUxhJY",
                                "filename": "qpe_fluid_system_operators.mp4"
                            },
                            {
                                "title": "1.3 Controlled Rotations & Eigenvalue Inversion Circuits",
                                "description": "Executing ancilla qubit rotations by 1/λ_i for state preparation |x⟩ = A^(-1)|b⟩.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=dscRoTBPeso",
                                "filename": "eigenvalue_inversion_hhl.mp4"
                            },
                            {
                                "title": "HHL Algorithm for Linear Systems & Fluid PDEs Notes.pdf",
                                "description": "Detailed walk-through of HHL quantum registers, phase estimation precision, and ancilla measurement post-selection.",
                                "resource_type": "notes",
                                "url": "https://qrious-quantum.s3.amazonaws.com/materials/hhl-linear-systems.pdf",
                                "filename": "hhl_linear_systems.pdf"
                            }
                        ]
                    },
                    {
                        "title": "Lesson 2: Simulating Thermo-Fluid Dynamics & Turbulence",
                        "order": 2,
                        "resources": [
                            {
                                "title": "2.1 Quantum Lattice Boltzmann Method (QLBM) for CFD",
                                "description": "Formulating stream-collide fluid algorithms on quantum registers using quantum random walks.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=OoQSdcKAIZc",
                                "filename": "qlbm_quantum_lattice_boltzmann.mp4"
                            },
                            {
                                "title": "2.2 Simulating Turbulent Boundary Layers on Quantum Processors",
                                "description": "Modeling non-linear advection terms and high-Reynolds number turbulence using quantum non-linear solvers.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=SyW1LkbFv6k",
                                "filename": "turbulent_boundary_layers_quantum.mp4"
                            },
                            {
                                "title": "2.3 Scaling Quantum CFD to Industrial Airfoil & Turbine Blades",
                                "description": "Future hardware roadmap for quantum CFD, error mitigation, and industrial aerospace design workflows.",
                                "resource_type": "video",
                                "url": "https://www.youtube.com/watch?v=Kd8uJx-OLHg",
                                "filename": "scaling_quantum_cfd_industrial.mp4"
                            },
                            {
                                "title": "Quantum CFD & Turbulence Simulation Handbook.pdf",
                                "description": "Summary of quantum algorithms for CFD, complexity bounds vs classical solvers, and open research challenges.",
                                "resource_type": "notes",
                                "url": "https://qrious-quantum.s3.amazonaws.com/materials/quantum-cfd-handbook.pdf",
                                "filename": "quantum_cfd_handbook.pdf"
                            }
                        ]
                    }
                ]
            }
        ]
    }
]

async def seed_domain_courses(db: AsyncIOMotorDatabase) -> dict:
    if db is None:
        return {"status": "error", "message": "Database not connected"}
    
    SYSTEM_EDUCATOR_UID = "system_educator_qrious"
    
    created_courses = 0
    created_modules = 0
    created_lessons = 0
    created_resources = 0
    
    for c_data in DOMAIN_COURSES:
        # Check if course exists by title or slug
        existing_course = await db.courses.find_one({"title": c_data["title"]})
        
        course_doc = {
            "title": c_data["title"],
            "description": c_data["description"],
            "category": c_data["category"],
            "level": c_data["level"],
            "duration": c_data["duration"],
            "tags": c_data["tags"],
            "owner_uid": SYSTEM_EDUCATOR_UID,
            "status": "published",
            "format": "recorded",
            "updated_at": datetime.now(timezone.utc)
        }
        
        if existing_course:
            course_id = existing_course["_id"]
            await db.courses.update_one({"_id": course_id}, {"$set": course_doc})
        else:
            course_doc["created_at"] = datetime.now(timezone.utc)
            res = await db.courses.insert_one(course_doc)
            course_id = res.inserted_id
            created_courses += 1
            
        # Clean existing modules and lessons for this course to ensure clean state
        existing_mods = await db.modules.find({"course_id": course_id}).to_list(100)
        existing_mod_ids = [m["_id"] for m in existing_mods]
        existing_less = await db.lessons.find({"module_id": {"$in": existing_mod_ids}}).to_list(500)
        existing_les_ids = [l["_id"] for l in existing_less]
        
        await db.resources.delete_many({"lesson_id": {"$in": existing_les_ids}})
        await db.lessons.delete_many({"module_id": {"$in": existing_mod_ids}})
        await db.modules.delete_many({"course_id": course_id})
        
        # Insert Modules
        for m_data in c_data["modules"]:
            mod_doc = {
                "course_id": course_id,
                "title": m_data["title"],
                "order": m_data["order"]
            }
            mod_res = await db.modules.insert_one(mod_doc)
            module_id = mod_res.inserted_id
            created_modules += 1
            
            # Insert Lessons
            for l_data in m_data["lessons"]:
                les_doc = {
                    "module_id": module_id,
                    "title": l_data["title"],
                    "order": l_data["order"]
                }
                les_res = await db.lessons.insert_one(les_doc)
                lesson_id = les_res.inserted_id
                created_lessons += 1
                
                # Insert Resources
                for r_data in l_data["resources"]:
                    res_doc = {
                        "lesson_id": lesson_id,
                        "resource_type": r_data["resource_type"],
                        "title": r_data["title"],
                        "description": r_data["description"],
                        "filename": r_data["filename"],
                        "b2_key": r_data["url"],
                        "uploaded_by": SYSTEM_EDUCATOR_UID,
                        "uploaded_at": datetime.now(timezone.utc),
                        "status": "confirmed"
                    }
                    await db.resources.insert_one(res_doc)
                    created_resources += 1

    return {
        "status": "success",
        "courses_count": created_courses,
        "modules_count": created_modules,
        "lessons_count": created_lessons,
        "resources_count": created_resources
    }

async def main():
    await connect_to_mongo()
    db = get_db()
    res = await seed_domain_courses(db)
    print("Course Seed Result:", res)

if __name__ == '__main__':
    asyncio.run(main())
