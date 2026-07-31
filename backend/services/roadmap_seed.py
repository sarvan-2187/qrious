from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from collections import deque

SEED_TOPICS: List[Dict[str, Any]] = [
    # --- QUANTUM COMPUTING ROADMAP (30 LESSONS) ---
    {
        "slug": "quantum-computation-overview",
        "title": "Quantum Computation: History & Overview",
        "domain": "quantum-computing",
        "order_index": 1,
        "prerequisites": [],
        "estimated_minutes": 70,
        "description": "Trace the historical origin of quantum computing, key milestones, classical vs quantum paradigms, and future computing prospects.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "quantum-overview",
            "flashcard_category": "Quantum History",
            "videos": [
                {
                    "title": "Quantum Computation: History & Overview (Qrious Quantum Lecture 01)",
                    "url": "https://www.youtube.com/watch?v=L-vjihvQnd0",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ],
            "slides": [
                {
                    "title": "Quantum Computation: History & Overview (10 Slide Deck)",
                    "url": "/slides/quantum-computation-overview.pdf",
                    "slide_count": 10,
                    "description": "Complete 10-slide deck covering Planck's quantum theory, 1900-2019 milestones, classical vs quantum comparison, 4 pillars, hardware stack, hard problems, and road ahead."
                }
            ]
        }
    },
    {
        "slug": "review-linear-algebra",
        "title": "Review of Linear Algebra",
        "domain": "quantum-computing",
        "order_index": 2,
        "prerequisites": ["quantum-computation-overview"],
        "estimated_minutes": 85,
        "description": "Review foundational linear algebra concepts essential for quantum mechanics including vector spaces, linear independence, and basis vectors.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "linear-algebra-review",
            "flashcard_category": "Linear Algebra",
            "videos": [
                {
                    "title": "Review of Linear Algebra (Qrious Quantum Lecture 02)",
                    "url": "https://www.youtube.com/watch?v=mmibUFIep_s",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "dirac-notation",
        "title": "Dirac Notation & State Vectors",
        "domain": "quantum-computing",
        "order_index": 3,
        "prerequisites": ["review-linear-algebra"],
        "estimated_minutes": 75,
        "description": "Master Dirac bra-ket notation (|ψ⟩ and ⟨ψ|), state normalization, and probability amplitude vectors for quantum state representation.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "dirac-notation",
            "flashcard_category": "Dirac Notation",
            "videos": [
                {
                    "title": "Dirac Notation in Quantum Mechanics (Qrious Quantum Lecture 03)",
                    "url": "https://www.youtube.com/watch?v=RyPQL8lccx4",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "hilbert-spaces-inner-product",
        "title": "Hilbert Spaces & Inner Products",
        "domain": "quantum-computing",
        "order_index": 4,
        "prerequisites": ["dirac-notation"],
        "estimated_minutes": 80,
        "description": "Understand complex Hilbert spaces, inner products, orthogonality, norms, and Cauchy-Schwarz inequality in quantum mechanics.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "hilbert-spaces",
            "flashcard_category": "Hilbert Spaces",
            "videos": [
                {
                    "title": "Hilbert Spaces Explained (Qrious Quantum Lecture 04)",
                    "url": "https://www.youtube.com/watch?v=kT8O__Fl54I",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "unitary-hermitian-matrices",
        "title": "Unitary, Hermitian & Normal Matrices",
        "domain": "quantum-computing",
        "order_index": 5,
        "prerequisites": ["hilbert-spaces-inner-product"],
        "estimated_minutes": 85,
        "description": "Analyze matrix operations: Unitary operators (U†U = I) preserving norm, Hermitian operators (H = H†) representing physical observables, and Normal matrices.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "matrices-quantum",
            "flashcard_category": "Quantum Matrices",
            "videos": [
                {
                    "title": "Unitary Matrices & Reversible Quantum Evolution",
                    "url": "https://www.youtube.com/watch?v=dD-oYfhSKhg",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "outer-product-tensor-product",
        "title": "Outer Products & Tensor Products",
        "domain": "quantum-computing",
        "order_index": 6,
        "prerequisites": ["unitary-hermitian-matrices"],
        "estimated_minutes": 85,
        "description": "Master outer products (|ψ⟩⟨φ|), projection operators, completeness relation, and tensor products (V ⊗ W) for combining multi-qubit systems.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "tensor-products",
            "flashcard_category": "Tensor Products",
            "videos": [
                {
                    "title": "Tensor Products & Multi-Qubit Systems",
                    "url": "https://www.youtube.com/watch?v=85SoQ5f5dHk",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "postulates-quantum-mechanics",
        "title": "Postulates of Quantum Mechanics",
        "domain": "quantum-computing",
        "order_index": 7,
        "prerequisites": ["outer-product-tensor-product"],
        "estimated_minutes": 90,
        "description": "Examine the 4 fundamental postulates governing quantum state spaces, unitary time evolution, Born rule measurement, and composite systems.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "quantum-postulates",
            "flashcard_category": "Postulates",
            "videos": [
                {
                    "title": "Postulates of Quantum Mechanics",
                    "url": "https://www.youtube.com/watch?v=JpW24saaSuE",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "stern-gerlach-experiment",
        "title": "Stern-Gerlach Experiment & Quantum Spin",
        "domain": "quantum-computing",
        "order_index": 8,
        "prerequisites": ["postulates-quantum-mechanics"],
        "estimated_minutes": 80,
        "description": "Explore the landmark 1922 Stern-Gerlach experiment demonstrating spatial quantization of angular momentum and electron spin-1/2.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "stern-gerlach",
            "flashcard_category": "Stern-Gerlach",
            "videos": [
                {
                    "title": "Stern-Gerlach Experiment & Quantum Spin",
                    "url": "https://www.youtube.com/watch?v=-66rprgwGNU",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "qubits-bloch-sphere",
        "title": "Qubits & Bloch Sphere Geometry",
        "domain": "quantum-computing",
        "order_index": 9,
        "prerequisites": ["stern-gerlach-experiment"],
        "estimated_minutes": 85,
        "description": "Visualize single-qubit states on the 3D unit Bloch sphere (|ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩) with spherical coordinates.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "bloch-sphere",
            "flashcard_category": "Bloch Sphere",
            "videos": [
                {
                    "title": "Qubit Representation & Bloch Sphere",
                    "url": "https://www.youtube.com/watch?v=90za6mazNps",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "circuit-model-quantum-computing",
        "title": "Circuit Model of Quantum Computing",
        "domain": "quantum-computing",
        "order_index": 10,
        "prerequisites": ["qubits-bloch-sphere"],
        "estimated_minutes": 80,
        "description": "Introduction to the circuit model: quantum wires, initialization, gate operations, measurement, and reversible quantum computation.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "circuit-model",
            "flashcard_category": "Circuit Model",
            "videos": [
                {
                    "title": "Circuit Model of Quantum Computing",
                    "url": "https://www.youtube.com/watch?v=MHYZgWmPhbI",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "quantum-gates-circuits",
        "title": "Quantum Gates & Circuit Architecture",
        "domain": "quantum-computing",
        "order_index": 11,
        "prerequisites": ["circuit-model-quantum-computing"],
        "estimated_minutes": 90,
        "description": "Master single & multi-qubit gates: Pauli X, Y, Z, Hadamard (H), Phase (S, T), CNOT (CX), Toffoli (CCX), and universal gate sets.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "quantum-gates",
            "flashcard_category": "Quantum Gates",
            "videos": [
                {
                    "title": "Quantum Gates & Circuit Design",
                    "url": "https://www.youtube.com/watch?v=H9Fqt5gDijM",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "qiskit-programming",
        "title": "Qiskit Programming & IBM Quantum Hands-on",
        "domain": "quantum-computing",
        "order_index": 12,
        "prerequisites": ["quantum-gates-circuits"],
        "estimated_minutes": 60,
        "description": "Write and simulate quantum circuits using Python & IBM Qiskit SDK: QuantumCircuit, transpilation, AerSimulator, and execution on real IBM QPUs.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qiskit-programming",
            "flashcard_category": "Qiskit",
            "videos": [
                {
                    "title": "Programming Quantum Computers with Qiskit",
                    "url": "https://www.youtube.com/watch?v=oaAjxcIFLtM",
                    "source": "Qiskit Developer Tutorial"
                }
            ]
        }
    },
    {
        "slug": "entanglement-bell-states",
        "title": "Quantum Entanglement & Bell States",
        "domain": "quantum-computing",
        "order_index": 13,
        "prerequisites": ["qiskit-programming"],
        "estimated_minutes": 90,
        "description": "Construct maximally entangled Bell states (|Φ+⟩, |Φ-⟩, |Ψ+⟩, |Ψ-⟩) using H and CNOT gates, verifying non-local correlations.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "bell-states",
            "flashcard_category": "Entanglement",
            "videos": [
                {
                    "title": "Quantum Entanglement & Bell States",
                    "url": "https://www.youtube.com/watch?v=I0jH1_H3x1o",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "quantum-teleportation",
        "title": "Quantum Teleportation Protocol",
        "domain": "quantum-computing",
        "order_index": 14,
        "prerequisites": ["entanglement-bell-states"],
        "estimated_minutes": 95,
        "description": "Step-by-step protocol for transmitting an unknown quantum state using EPR entangled pairs, classical communication, and Pauli corrections.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "quantum-teleportation",
            "flashcard_category": "Teleportation",
            "videos": [
                {
                    "title": "Quantum Teleportation Protocol",
                    "url": "https://www.youtube.com/watch?v=8CgquHFM_O8",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "superdense-coding",
        "title": "Superdense Coding Protocol",
        "domain": "quantum-computing",
        "order_index": 15,
        "prerequisites": ["quantum-teleportation"],
        "estimated_minutes": 85,
        "description": "Transmit two classical bits of information by manipulating and sending a single qubit from a pre-shared entangled Bell pair.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "superdense-coding",
            "flashcard_category": "Superdense Coding",
            "videos": [
                {
                    "title": "Superdense Coding Explained",
                    "url": "https://www.youtube.com/watch?v=bSC7geZ2870",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "phase-kickback-parallelism",
        "title": "Phase Kickback & Quantum Parallelism",
        "domain": "quantum-computing",
        "order_index": 16,
        "prerequisites": ["superdense-coding"],
        "estimated_minutes": 85,
        "description": "Exploit phase kickback mechanism where target qubit eigenvalue kickbacks phase onto control qubits, enabling quantum parallelism across 2^n inputs.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "phase-kickback",
            "flashcard_category": "Phase Kickback",
            "videos": [
                {
                    "title": "Phase Kickback & Quantum Parallelism",
                    "url": "https://www.youtube.com/watch?v=rLUfZ94RFtk",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "no-cloning-theorem",
        "title": "No-Cloning Theorem & Cryptographic Security",
        "domain": "quantum-computing",
        "order_index": 17,
        "prerequisites": ["phase-kickback-parallelism"],
        "estimated_minutes": 75,
        "description": "Prove why an arbitrary unknown quantum state cannot be cloned exactly, fundamentally securing quantum cryptography.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "no-cloning",
            "flashcard_category": "No-Cloning",
            "videos": [
                {
                    "title": "The No-Cloning Theorem",
                    "url": "https://www.youtube.com/watch?v=al-mQOkxfMs",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "deutsch-jozsa-algorithm",
        "title": "Deutsch-Jozsa Algorithm",
        "domain": "quantum-computing",
        "order_index": 18,
        "prerequisites": ["no-cloning-theorem"],
        "estimated_minutes": 90,
        "description": "Determine if a black-box oracle function f:{0,1}^n → {0,1} is constant or balanced in a single quantum evaluation.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "deutsch-jozsa",
            "flashcard_category": "Deutsch-Jozsa",
            "videos": [
                {
                    "title": "Deutsch-Jozsa Algorithm",
                    "url": "https://www.youtube.com/watch?v=pC2XRXInHnc",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "bernstein-vazirani-algorithm",
        "title": "Bernstein-Vazirani Algorithm",
        "domain": "quantum-computing",
        "order_index": 19,
        "prerequisites": ["deutsch-jozsa-algorithm"],
        "estimated_minutes": 90,
        "description": "Find a secret bitstring s ∈ {0,1}^n in an oracle function f(x) = s·x mod 2 using just 1 query instead of n classical queries.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "bernstein-vazirani",
            "flashcard_category": "Bernstein-Vazirani",
            "videos": [
                {
                    "title": "Bernstein-Vazirani Algorithm",
                    "url": "https://www.youtube.com/watch?v=xYvGvBIKMcI",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "grovers-search-algorithm",
        "title": "Grover's Search Algorithm",
        "domain": "quantum-computing",
        "order_index": 20,
        "prerequisites": ["bernstein-vazirani-algorithm"],
        "estimated_minutes": 60,
        "description": "Perform quadratic speedup search in an unsorted database of N items in O(√N) time using Oracle reflection and Diffusion operator amplification.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "grovers-algorithm",
            "flashcard_category": "Grovers Algorithm",
            "videos": [
                {
                    "title": "Grover's Search Algorithm",
                    "url": "https://www.youtube.com/watch?v=hnpjC8WQVrQ",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "quantum-fourier-transform",
        "title": "Quantum Fourier Transform (QFT)",
        "domain": "quantum-computing",
        "order_index": 21,
        "prerequisites": ["grovers-search-algorithm"],
        "estimated_minutes": 60,
        "description": "Master the quantum analogue of the Discrete Fourier Transform using Hadamard and controlled phase shift gates R_k in O(n^2) operations.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qft",
            "flashcard_category": "QFT",
            "videos": [
                {
                    "title": "Quantum Fourier Transform (QFT)",
                    "url": "https://www.youtube.com/watch?v=W8QZ-yxebFA",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "quantum-phase-estimation",
        "title": "Quantum Phase Estimation (QPE)",
        "domain": "quantum-computing",
        "order_index": 22,
        "prerequisites": ["quantum-fourier-transform"],
        "estimated_minutes": 60,
        "description": "Estimate the eigenphase θ of a unitary operator U|u⟩ = e^(2πiθ)|u⟩ using inverse QFT and superposition readout registers.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qpe",
            "flashcard_category": "Phase Estimation",
            "videos": [
                {
                    "title": "Quantum Phase Estimation (QPE)",
                    "url": "https://www.youtube.com/watch?v=4nT0BTUxhJY",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "shors-factoring-algorithm",
        "title": "Shor's Factoring Algorithm",
        "domain": "quantum-computing",
        "order_index": 23,
        "prerequisites": ["quantum-phase-estimation"],
        "estimated_minutes": 75,
        "description": "Factor large integers in polynomial time O((log N)^3) by reducing factoring to order-finding via Quantum Phase Estimation.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "shors-algorithm",
            "flashcard_category": "Shors Algorithm",
            "videos": [
                {
                    "title": "Shor's Factoring Algorithm",
                    "url": "https://www.youtube.com/watch?v=dscRoTBPeso",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "quantum-error-correction-gottesman-knill",
        "title": "Quantum Error Correction & Gottesman-Knill",
        "domain": "quantum-computing",
        "order_index": 24,
        "prerequisites": ["shors-factoring-algorithm"],
        "estimated_minutes": 60,
        "description": "Protect quantum info against bit-flip X and phase-flip Z errors; examine stabilizer codes and the Gottesman-Knill theorem for Clifford gates.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "error-correction",
            "flashcard_category": "Error Correction",
            "videos": [
                {
                    "title": "Quantum Error Correction",
                    "url": "https://www.youtube.com/watch?v=OoQSdcKAIZc",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "surface-codes-fault-tolerance",
        "title": "Surface Codes & Fault Tolerance",
        "domain": "quantum-computing",
        "order_index": 25,
        "prerequisites": ["quantum-error-correction-gottesman-knill"],
        "estimated_minutes": 95,
        "description": "Study 2D lattice surface codes, syndrome measurement measurements, and logical qubit fault-tolerant quantum architecture.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "surface-codes",
            "flashcard_category": "Surface Codes",
            "videos": [
                {
                    "title": "Surface Codes & Fault Tolerance",
                    "url": "https://www.youtube.com/watch?v=SyW1LkbFv6k",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "quantum-machine-learning-overview",
        "title": "Introduction to Quantum Machine Learning (QML)",
        "domain": "quantum-computing",
        "order_index": 26,
        "prerequisites": ["surface-codes-fault-tolerance"],
        "estimated_minutes": 60,
        "description": "Overview of Quantum Machine Learning (QML): Variational Quantum Circuits (VQC), Parameterized Quantum Circuits (PQC), and Hybrid Quantum-Classical optimization.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-overview",
            "flashcard_category": "QML",
            "videos": [
                {
                    "title": "Quantum Machine Learning Overview",
                    "url": "https://www.youtube.com/watch?v=Kd8uJx-OLHg",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "quantum-data-encoding",
        "title": "Quantum Data Encoding: Basis & Amplitude Encoding",
        "domain": "quantum-computing",
        "order_index": 27,
        "prerequisites": ["quantum-machine-learning-overview"],
        "estimated_minutes": 95,
        "description": "Encode classical data vectors into quantum states using Basis Encoding (|x⟩) and Amplitude Encoding (|ψ⟩ = ∑ x_i|i⟩).",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "data-encoding",
            "flashcard_category": "Data Encoding",
            "videos": [
                {
                    "title": "Data Encoding & Basis Encoding",
                    "url": "https://www.youtube.com/watch?v=S8zSfxbgEhk",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "hamiltonian-encoding",
        "title": "Hamiltonian Encoding & Quantum Feature Maps",
        "domain": "quantum-computing",
        "order_index": 28,
        "prerequisites": ["quantum-data-encoding"],
        "estimated_minutes": 90,
        "description": "Encode Hermitian feature matrices H into quantum state evolution operators e^(-iHt) for quantum kernel methods.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "hamiltonian-encoding",
            "flashcard_category": "Hamiltonian Encoding",
            "videos": [
                {
                    "title": "Hamiltonian Encoding for QML",
                    "url": "https://www.youtube.com/watch?v=X4gegxIuh1o",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "swap-test",
        "title": "SWAP Test & Quantum State Similarity",
        "domain": "quantum-computing",
        "order_index": 29,
        "prerequisites": ["hamiltonian-encoding"],
        "estimated_minutes": 85,
        "description": "Calculate inner product fidelity |⟨ψ|φ⟩|^2 between two quantum states using an ancilla qubit, Hadamard gate, and Fredkin (CSWAP) gate.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "swap-test",
            "flashcard_category": "Swap Test",
            "videos": [
                {
                    "title": "SWAP Test & State Similarity",
                    "url": "https://www.youtube.com/watch?v=0EoysYeuDBk",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "q-means-clustering",
        "title": "Q-means Clustering Algorithm",
        "domain": "quantum-computing",
        "order_index": 30,
        "prerequisites": ["swap-test"],
        "estimated_minutes": 60,
        "description": "Quantum algorithm for unsupervised clustering: leverage quantum distance estimation via SWAP test to achieve exponential speedup in centroid updates.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "q-means-clustering",
            "flashcard_category": "Q-Means",
            "videos": [
                {
                    "title": "Q-means Clustering Algorithm",
                    "url": "https://www.youtube.com/watch?v=9g8rR9i_CeA",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    # --- QUANTUM COMMUNICATION ROADMAP (10 LESSONS) ---
    {
        "slug": "qcomm-foundations-recap",
        "title": "Foundations Recap: Qubits, Superposition & Entanglement",
        "domain": "quantum-communication",
        "order_index": 1,
        "prerequisites": [],
        "estimated_minutes": 70,
        "description": "Explain superposition as a genuine combination of states and entanglement as non-local correlations, establishing why quantum communication requires these core resources.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qcomm-foundations-recap",
            "flashcard_category": "Quantum Communication Foundations",
            "videos": [
                {
                    "title": "Understanding Quantum Mechanics: Superposition & Entanglement",
                    "url": "https://www.youtube.com/watch?v=j6Mw3_tOcNI",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ],
            "slides": [
                {
                    "title": "Foundations Recap (Slide Deck)",
                    "url": "/slides/quantum-computation-overview.pdf",
                    "slide_count": 9,
                    "description": "Overview of qubits, superposition vs classical uncertainty, Bell states, and no-signaling theorem."
                }
            ]
        }
    },
    {
        "slug": "qcomm-no-cloning-theorem",
        "title": "The No-Cloning Theorem",
        "domain": "quantum-communication",
        "order_index": 2,
        "prerequisites": ["qcomm-foundations-recap"],
        "estimated_minutes": 75,
        "description": "Master the fundamental theorem forbidding exact copying of arbitrary unknown quantum states, proving why quantum operations are secure against eavesdropping.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qcomm-no-cloning-theorem",
            "flashcard_category": "No-Cloning Theorem",
            "videos": [
                {
                    "title": "The NO Cloning Theorem Explained",
                    "url": "https://www.youtube.com/watch?v=Ck3IwxQqCPQ",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "qcomm-teleportation-protocol",
        "title": "Quantum Teleportation Protocol",
        "domain": "quantum-communication",
        "order_index": 3,
        "prerequisites": ["qcomm-no-cloning-theorem"],
        "estimated_minutes": 90,
        "description": "Transfer an unknown qubit state using a shared entangled Bell pair and 2 classical bits without violating the speed of light or no-cloning theorem.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qcomm-teleportation-protocol",
            "flashcard_category": "Quantum Teleportation",
            "videos": [
                {
                    "title": "How Quantum Teleportation Really Works",
                    "url": "https://www.youtube.com/watch?v=jxqnzltpDdE",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "qcomm-superdense-coding",
        "title": "Superdense Coding Protocol",
        "domain": "quantum-communication",
        "order_index": 4,
        "prerequisites": ["qcomm-teleportation-protocol"],
        "estimated_minutes": 85,
        "description": "Transmit 2 classical bits by physically sending only 1 qubit, leveraging pre-shared entanglement and unitary encoding gates.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qcomm-superdense-coding",
            "flashcard_category": "Superdense Coding",
            "videos": [
                {
                    "title": "Superdense Coding: 2 Bits via 1 Qubit",
                    "url": "https://www.youtube.com/watch?v=w5rCn593Dig",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "qcomm-qkd-bb84-protocol",
        "title": "Quantum Key Distribution — BB84 Protocol",
        "domain": "quantum-communication",
        "order_index": 5,
        "prerequisites": ["qcomm-superdense-coding"],
        "estimated_minutes": 95,
        "description": "Master Bennett & Brassard's 1984 prepare-and-measure QKD protocol, basis sifting, quantum bit error rate (QBER) eavesdropper detection, and privacy amplification.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qcomm-qkd-bb84-protocol",
            "flashcard_category": "BB84 Protocol",
            "videos": [
                {
                    "title": "The BB84 Quantum Key Exchange Protocol",
                    "url": "https://www.youtube.com/watch?v=IE5952ExMK8",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "qcomm-qkd-e91-protocol",
        "title": "Quantum Key Distribution — E91 Protocol",
        "domain": "quantum-communication",
        "order_index": 6,
        "prerequisites": ["qcomm-qkd-bb84-protocol"],
        "estimated_minutes": 95,
        "description": "Entanglement-based QKD protocol by Ekert (1991) leveraging Bell (CHSH) inequality tests for device-independent cryptographic security.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qcomm-qkd-e91-protocol",
            "flashcard_category": "E91 Protocol",
            "videos": [
                {
                    "title": "How Quantum Key Distribution Works (BB84 & E91)",
                    "url": "https://www.youtube.com/watch?v=V3WzH2up7Os",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "qcomm-quantum-repeaters",
        "title": "Quantum Repeaters & Entanglement Swapping",
        "domain": "quantum-communication",
        "order_index": 7,
        "prerequisites": ["qcomm-qkd-e91-protocol"],
        "estimated_minutes": 60,
        "description": "Extend long-distance quantum communication past fiber attenuation by chaining short entangled links with Bell-basis entanglement swapping and quantum memory.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qcomm-quantum-repeaters",
            "flashcard_category": "Quantum Repeaters",
            "videos": [
                {
                    "title": "Quantum Repeaters & Entanglement Swapping",
                    "url": "https://www.youtube.com/watch?v=mr-kAG6KwMA",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "qcomm-quantum-networks",
        "title": "Quantum Networks & the Quantum Internet",
        "domain": "quantum-communication",
        "order_index": 8,
        "prerequisites": ["qcomm-quantum-repeaters"],
        "estimated_minutes": 60,
        "description": "Examine layered quantum network architecture, end nodes, quantum memory, and applications such as blind quantum computing and distributed quantum sensing.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qcomm-quantum-networks",
            "flashcard_category": "Quantum Internet",
            "videos": [
                {
                    "title": "The Quantum Internet Architecture",
                    "url": "https://www.youtube.com/watch?v=_N-2Sx-FDQA",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "qcomm-satellite-qkd-micius",
        "title": "Satellite-Based QKD (Micius & Beyond)",
        "domain": "quantum-communication",
        "order_index": 9,
        "prerequisites": ["qcomm-quantum-networks"],
        "estimated_minutes": 95,
        "description": "Analyze optical free-space satellite links overcoming ground fiber attenuation, exploring China's Micius (QUESS) satellite milestones and constellation QKD.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qcomm-satellite-qkd-micius",
            "flashcard_category": "Satellite QKD",
            "videos": [
                {
                    "title": "The World's First Quantum Satellite: Micius",
                    "url": "https://www.youtube.com/watch?v=G_ETpGEiXZA",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },
    {
        "slug": "qcomm-quantum-safe-pqc-vs-qkd",
        "title": "Quantum-Safe Security — QKD vs. Post-Quantum Cryptography",
        "domain": "quantum-communication",
        "order_index": 10,
        "prerequisites": ["qcomm-satellite-qkd-micius"],
        "estimated_minutes": 90,
        "description": "Compare physics-based QKD security against mathematical algorithm-based Post-Quantum Cryptography (PQC), exploring lattice cryptography and hybrid defense-in-depth strategies.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qcomm-quantum-safe-pqc-vs-qkd",
            "flashcard_category": "QKD vs PQC",
            "videos": [
                {
                    "title": "Quantum-Safe Security: QKD vs Post-Quantum Cryptography",
                    "url": "https://www.youtube.com/watch?v=v0JstN6vw6g",
                    "source": "Qrious Quantum Lesson Plan"
                }
            ]
        }
    },

    # --- QUANTUM MACHINE LEARNING ROADMAP (41 LESSONS) ---
    # Curriculum and lecture videos are the 41-part "Quantum Machine Learning MOOC"
    # playlist; every video URL below was scraped from that playlist, not hand-written,
    # so the ids resolve. estimated_minutes = lecture length + study time (see the
    # generator note in PLANS if these need regenerating).
    {
        "slug": "qml-01-introduction",
        "title": "Introduction",
        "domain": "quantum-machine-learning",
        "order_index": 1,
        "prerequisites": [],
        "estimated_minutes": 60,
        "description": "Meet the course: why machine learning and quantum computing are being combined, what a realistic near-term quantum advantage looks like, and how the three learning paradigms map onto quantum hardware.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-01-introduction",
            "flashcard_category": "QML Foundations",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 01 - Introduction",
                    "url": "https://www.youtube.com/watch?v=QtWCmO_KIlg&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-02-classical-probability-theory",
        "title": "Classical Probability Theory",
        "domain": "quantum-machine-learning",
        "order_index": 2,
        "prerequisites": ["qml-01-introduction"],
        "estimated_minutes": 60,
        "description": "Set up the classical baseline that quantum theory generalises — probability vectors, stochastic matrices, and expectation values expressed in the linear-algebraic form the quantum formalism reuses.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-02-classical-probability-theory",
            "flashcard_category": "QML Foundations",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 02 - Classical Probability Theory",
                    "url": "https://www.youtube.com/watch?v=m77_muSPrs0&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-03-quantum-states",
        "title": "Quantum States",
        "domain": "quantum-machine-learning",
        "order_index": 3,
        "prerequisites": ["qml-02-classical-probability-theory"],
        "estimated_minutes": 60,
        "description": "Introduce the qubit as a normalised complex vector: superposition, the Born rule, global versus relative phase, and how a quantum state differs from a classical probability distribution.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-03-quantum-states",
            "flashcard_category": "QML Foundations",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 03 - Quantum States",
                    "url": "https://www.youtube.com/watch?v=Y5WRv_9757A&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-04-multiple-qubits",
        "title": "Multiple Qubits",
        "domain": "quantum-machine-learning",
        "order_index": 4,
        "prerequisites": ["qml-03-quantum-states"],
        "estimated_minutes": 60,
        "description": "Build multi-qubit registers with the tensor product, distinguish product states from entangled ones, and see why the state space grows as 2^n — the resource every QML speed-up claim rests on.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-04-multiple-qubits",
            "flashcard_category": "QML Foundations",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 04 - Multiple Qubits",
                    "url": "https://www.youtube.com/watch?v=bNCC0YMLHuk&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-05-measurements",
        "title": "Measurements",
        "domain": "quantum-machine-learning",
        "order_index": 5,
        "prerequisites": ["qml-04-multiple-qubits"],
        "estimated_minutes": 65,
        "description": "Formalise measurement as projection onto a basis: outcome probabilities, post-measurement collapse, expectation values of observables, and the sampling cost of estimating them on hardware.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-05-measurements",
            "flashcard_category": "QML Foundations",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 05 - Measurements",
                    "url": "https://www.youtube.com/watch?v=aVFe08G0uYk&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-06-mixed-states",
        "title": "Mixed States",
        "domain": "quantum-machine-learning",
        "order_index": 6,
        "prerequisites": ["qml-05-measurements"],
        "estimated_minutes": 60,
        "description": "Extend pure states to density matrices for statistical ensembles: the trace and positivity conditions, purity, and reduced density matrices for describing a subsystem of an entangled pair.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-06-mixed-states",
            "flashcard_category": "QML Foundations",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 06 - Mixed States",
                    "url": "https://www.youtube.com/watch?v=BE8RxAESx5I&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-07-evolution-in-closed-quantum-systems",
        "title": "Evolution in Closed Quantum Systems",
        "domain": "quantum-machine-learning",
        "order_index": 7,
        "prerequisites": ["qml-06-mixed-states"],
        "estimated_minutes": 60,
        "description": "Describe isolated dynamics with unitary operators and the Schrodinger equation, and connect a Hamiltonian to the time-evolution operator that quantum simulation approximates.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-07-evolution-in-closed-quantum-systems",
            "flashcard_category": "QML Foundations",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 07 - Evolution in Closed Quantum Systems",
                    "url": "https://www.youtube.com/watch?v=P-mGqiKcEKE&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-08-open-quantum-systems",
        "title": "Open Quantum Systems",
        "domain": "quantum-machine-learning",
        "order_index": 8,
        "prerequisites": ["qml-07-evolution-in-closed-quantum-systems"],
        "estimated_minutes": 60,
        "description": "Account for a system coupled to its environment: decoherence, thermal states and the Gibbs distribution — the physics that both limits real devices and enables annealing-based sampling.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-08-open-quantum-systems",
            "flashcard_category": "QML Foundations",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 08 - Open Quantum Systems",
                    "url": "https://www.youtube.com/watch?v=_fmBNpDEen4&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-09-classical-ising-model",
        "title": "Classical Ising Model",
        "domain": "quantum-machine-learning",
        "order_index": 9,
        "prerequisites": ["qml-08-open-quantum-systems"],
        "estimated_minutes": 60,
        "description": "Introduce the Ising model as the canonical energy-based model: spins, couplings, and the energy function that encodes a huge class of optimisation problems.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-09-classical-ising-model",
            "flashcard_category": "Ising Models & Many-Body Physics",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 09 - Classical Ising Model",
                    "url": "https://www.youtube.com/watch?v=Wy9YoEYv-fA&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-10-transverse-field-ising-model",
        "title": "Transverse Field Ising Model",
        "domain": "quantum-machine-learning",
        "order_index": 10,
        "prerequisites": ["qml-09-classical-ising-model"],
        "estimated_minutes": 60,
        "description": "Add a transverse field to make the Hamiltonian genuinely quantum, producing non-commuting terms, quantum fluctuations, and the phase transition that adiabatic protocols exploit.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-10-transverse-field-ising-model",
            "flashcard_category": "Ising Models & Many-Body Physics",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 10 - Transverse Field Ising Model",
                    "url": "https://www.youtube.com/watch?v=egli0tC1tRo&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-11-quantum-many-body-physics",
        "title": "Quantum Many-Body Physics (Roger Melko)",
        "domain": "quantum-machine-learning",
        "order_index": 11,
        "prerequisites": ["qml-10-transverse-field-ising-model"],
        "estimated_minutes": 65,
        "description": "Guest lecture: why many-body quantum systems are hard — exponential Hilbert space growth, and what physicists actually want to compute from a many-body state.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-11-quantum-many-body-physics",
            "flashcard_category": "Ising Models & Many-Body Physics",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 11 - Quantum Many-Body Physics (Roger Melko)",
                    "url": "https://www.youtube.com/watch?v=MmpOva4-XPg&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-12-many-body-behavior-of-spins",
        "title": "Many-Body Behavior of Spins (Roger Melko)",
        "domain": "quantum-machine-learning",
        "order_index": 12,
        "prerequisites": ["qml-11-quantum-many-body-physics"],
        "estimated_minutes": 65,
        "description": "Guest lecture: emergent behaviour in interacting spin systems, order parameters, and phases of matter as the target of both simulation and learning.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-12-many-body-behavior-of-spins",
            "flashcard_category": "Ising Models & Many-Body Physics",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 12 - Many-Body Behavior of Spins (Roger Melko)",
                    "url": "https://www.youtube.com/watch?v=7HayIq9OR2E&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-13-strategies-to-solve-the-many-body-problem",
        "title": "Strategies to Solve the Many-Body Problem (Roger Melko)",
        "domain": "quantum-machine-learning",
        "order_index": 13,
        "prerequisites": ["qml-12-many-body-behavior-of-spins"],
        "estimated_minutes": 65,
        "description": "Guest lecture: the toolbox — Monte Carlo, tensor networks, and neural-network wavefunctions — and where each method breaks down, motivating quantum approaches.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-13-strategies-to-solve-the-many-body-problem",
            "flashcard_category": "Ising Models & Many-Body Physics",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 13 - Strategies to Solve the Many-Body Problem (Roger Melko)",
                    "url": "https://www.youtube.com/watch?v=uTCeQHzQMdc&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-14-gate-model-quantum-computing",
        "title": "Gate-Model Quantum Computing",
        "domain": "quantum-machine-learning",
        "order_index": 14,
        "prerequisites": ["qml-13-strategies-to-solve-the-many-body-problem"],
        "estimated_minutes": 60,
        "description": "Review the circuit paradigm as one of several models: universal gate sets, circuit depth, and the coherence-time budget that constrains every near-term algorithm.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-14-gate-model-quantum-computing",
            "flashcard_category": "Quantum Computing Paradigms",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 14 - Gate-Model Quantum Computing",
                    "url": "https://www.youtube.com/watch?v=92uqxeofPak&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-15-adiabatic-quantum-computing",
        "title": "Adiabatic Quantum Computing",
        "domain": "quantum-machine-learning",
        "order_index": 15,
        "prerequisites": ["qml-14-gate-model-quantum-computing"],
        "estimated_minutes": 60,
        "description": "Compute by slowly deforming a Hamiltonian: the adiabatic theorem, the spectral gap that sets the required runtime, and its polynomial equivalence to the gate model.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-15-adiabatic-quantum-computing",
            "flashcard_category": "Quantum Computing Paradigms",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 15 - Adiabatic Quantum Computing",
                    "url": "https://www.youtube.com/watch?v=csgEVurrBpU&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-16-quantum-annealing",
        "title": "Quantum Annealing",
        "domain": "quantum-machine-learning",
        "order_index": 16,
        "prerequisites": ["qml-15-adiabatic-quantum-computing"],
        "estimated_minutes": 60,
        "description": "Treat annealing as adiabatic computing's practical, finite-temperature relative — how D-Wave-style hardware minimises an Ising energy, and what it does and doesn't guarantee.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-16-quantum-annealing",
            "flashcard_category": "Quantum Computing Paradigms",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 16 - Quantum Annealing",
                    "url": "https://www.youtube.com/watch?v=7btX7OuR2QM&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-17-implementations",
        "title": "Implementations",
        "domain": "quantum-machine-learning",
        "order_index": 17,
        "prerequisites": ["qml-16-quantum-annealing"],
        "estimated_minutes": 60,
        "description": "Survey the physical platforms — superconducting circuits, trapped ions, and annealers — comparing qubit counts, connectivity, and noise against algorithmic requirements.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-17-implementations",
            "flashcard_category": "Quantum Computing Paradigms",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 17 - Implementations",
                    "url": "https://www.youtube.com/watch?v=l06HATJAbdI&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-18-quantum-approximate-optimization-algorithm",
        "title": "Quantum Approximate Optimization Algorithm (QAOA)",
        "domain": "quantum-machine-learning",
        "order_index": 18,
        "prerequisites": ["qml-17-implementations"],
        "estimated_minutes": 60,
        "description": "Discretise the adiabatic path into p alternating cost and mixer layers, then tune the angles with a classical optimiser — the gate-model route to combinatorial optimisation.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-18-quantum-approximate-optimization-algorithm",
            "flashcard_category": "Quantum Computing Paradigms",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 18 - Quantum Approximate Optimization Algorithm (QAOA)",
                    "url": "https://www.youtube.com/watch?v=N8e5nAk6KBQ&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-19-sampling-a-thermal-state",
        "title": "Sampling a Thermal State",
        "domain": "quantum-machine-learning",
        "order_index": 19,
        "prerequisites": ["qml-18-quantum-approximate-optimization-algorithm"],
        "estimated_minutes": 60,
        "description": "Draw samples from a Boltzmann distribution using quantum hardware, the primitive that connects annealers to training energy-based machine-learning models.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-19-sampling-a-thermal-state",
            "flashcard_category": "Quantum Computing Paradigms",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 19 - Sampling a Thermal State",
                    "url": "https://www.youtube.com/watch?v=VW43u8RM2qI&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-20-variational-circuits-and-quantum-simulation-1",
        "title": "Variational Circuits and Quantum Simulation 1 (Alan Aspuru-Guzik)",
        "domain": "quantum-machine-learning",
        "order_index": 20,
        "prerequisites": ["qml-19-sampling-a-thermal-state"],
        "estimated_minutes": 60,
        "description": "Guest lecture: the variational principle as an algorithm — a parameterised circuit prepares a trial state, hardware measures the energy, and a classical optimiser closes the loop.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-20-variational-circuits-and-quantum-simulation-1",
            "flashcard_category": "Variational Circuits",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 20 - Variational Circuits and Quantum Simulation 1 (Alan Aspuru-Guzik).",
                    "url": "https://www.youtube.com/watch?v=bVymBcvE7BA&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-21-variational-circuits-and-quantum-simulation-2",
        "title": "Variational Circuits and Quantum Simulation 2 (Alan Aspuru-Guzik)",
        "domain": "quantum-machine-learning",
        "order_index": 21,
        "prerequisites": ["qml-20-variational-circuits-and-quantum-simulation-1"],
        "estimated_minutes": 65,
        "description": "Guest lecture: VQE in practice for electronic structure — mapping fermionic Hamiltonians to qubits and grouping terms into measurable commuting sets.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-21-variational-circuits-and-quantum-simulation-2",
            "flashcard_category": "Variational Circuits",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 21 - Variational Circuits and Quantum Simulation 2 (Alan Aspuru-Guzik)",
                    "url": "https://www.youtube.com/watch?v=abB2zwLCmW4&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-22-variational-circuits-and-quantum-simulation-3",
        "title": "Variational Circuits and Quantum Simulation 3 (Alan Aspuru-Guzik)",
        "domain": "quantum-machine-learning",
        "order_index": 22,
        "prerequisites": ["qml-21-variational-circuits-and-quantum-simulation-2"],
        "estimated_minutes": 60,
        "description": "Guest lecture: ansatz design and optimisation, from chemistry-inspired to hardware-efficient circuits, and the measurement overhead each choice implies.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-22-variational-circuits-and-quantum-simulation-3",
            "flashcard_category": "Variational Circuits",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 22 - Variational Circuits and Quantum Simulation 3 (Alan Aspuru-Guzik)",
                    "url": "https://www.youtube.com/watch?v=qN0UdJda1a4&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-23-variational-circuits-and-quantum-simulation-4",
        "title": "Variational Circuits and Quantum Simulation 4 (Alan Aspuru-Guzik)",
        "domain": "quantum-machine-learning",
        "order_index": 23,
        "prerequisites": ["qml-22-variational-circuits-and-quantum-simulation-3"],
        "estimated_minutes": 60,
        "description": "Guest lecture: noise, error mitigation, and where variational quantum simulation stands against the best classical methods.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-23-variational-circuits-and-quantum-simulation-4",
            "flashcard_category": "Variational Circuits",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 23 - Variational Circuits and Quantum Simulation 4 (Alan Aspuru-Guzik)",
                    "url": "https://www.youtube.com/watch?v=Rm-wkvXkniw&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-24-encoding-classical-information",
        "title": "Encoding Classical Information",
        "domain": "quantum-machine-learning",
        "order_index": 24,
        "prerequisites": ["qml-23-variational-circuits-and-quantum-simulation-4"],
        "estimated_minutes": 60,
        "description": "Get classical data into a quantum state: basis, amplitude, and Hamiltonian encoding, and the state-preparation cost that can silently erase an algorithm's advantage.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-24-encoding-classical-information",
            "flashcard_category": "Encoding & Learning Algorithms",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 24 - Encoding Classical Information",
                    "url": "https://www.youtube.com/watch?v=LHzWAyT5rMI&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-25-ensemble-learning",
        "title": "Ensemble Learning",
        "domain": "quantum-machine-learning",
        "order_index": 25,
        "prerequisites": ["qml-24-encoding-classical-information"],
        "estimated_minutes": 60,
        "description": "Review boosting and ensembles classically, then frame the selection of weak learners as an optimisation problem a quantum device could solve.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-25-ensemble-learning",
            "flashcard_category": "Encoding & Learning Algorithms",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 25 - Ensemble Learning",
                    "url": "https://www.youtube.com/watch?v=TjVEfusNfVg&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-26-qboost",
        "title": "QBoost",
        "domain": "quantum-machine-learning",
        "order_index": 26,
        "prerequisites": ["qml-25-ensemble-learning"],
        "estimated_minutes": 60,
        "description": "Cast ensemble selection as a QUBO and hand it to an annealer, producing a sparse, regularised classifier — one of the earliest end-to-end quantum learning pipelines.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-26-qboost",
            "flashcard_category": "Encoding & Learning Algorithms",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 26 - QBoost",
                    "url": "https://www.youtube.com/watch?v=5Y3slnSx0wI&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-27-clustering-by-quantum-optimization",
        "title": "Clustering by Quantum Optimization",
        "domain": "quantum-machine-learning",
        "order_index": 27,
        "prerequisites": ["qml-26-qboost"],
        "estimated_minutes": 60,
        "description": "Express clustering as an Ising energy over pairwise distances and minimise it on quantum hardware instead of iterating Lloyd's algorithm.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-27-clustering-by-quantum-optimization",
            "flashcard_category": "Encoding & Learning Algorithms",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 27 - Clustering by Quantum Optimization",
                    "url": "https://www.youtube.com/watch?v=7MDwycGSiy0&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-28-kernel-methods",
        "title": "Kernel Methods",
        "domain": "quantum-machine-learning",
        "order_index": 28,
        "prerequisites": ["qml-27-clustering-by-quantum-optimization"],
        "estimated_minutes": 60,
        "description": "Recap the classical kernel trick — feature maps, inner products, and support vector machines — as the framework quantum feature maps plug directly into.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-28-kernel-methods",
            "flashcard_category": "Encoding & Learning Algorithms",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 28 - Kernel Methods",
                    "url": "https://www.youtube.com/watch?v=HILVRvDaQsE&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-29-an-interference-circuit",
        "title": "An Interference Circuit",
        "domain": "quantum-machine-learning",
        "order_index": 29,
        "prerequisites": ["qml-28-kernel-methods"],
        "estimated_minutes": 60,
        "description": "Use interference to compute an inner product between encoded data points, giving a quantum estimate of similarity and a nearest-neighbour style classifier.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-29-an-interference-circuit",
            "flashcard_category": "Encoding & Learning Algorithms",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 29 - An Interference Circuit",
                    "url": "https://www.youtube.com/watch?v=YHkfAC5Iu9I&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-30-probabilistic-graphical-models",
        "title": "Probabilistic Graphical Models",
        "domain": "quantum-machine-learning",
        "order_index": 30,
        "prerequisites": ["qml-29-an-interference-circuit"],
        "estimated_minutes": 60,
        "description": "Introduce Markov and Bayesian networks, the partition function, and why inference and sampling are the bottleneck classical methods struggle with.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-30-probabilistic-graphical-models",
            "flashcard_category": "Encoding & Learning Algorithms",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 30 - Probabilistic Graphical Models",
                    "url": "https://www.youtube.com/watch?v=DdWH2j6P8f0&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-31-optimization-and-sampling-in-pgms",
        "title": "Optimization and Sampling in PGMs",
        "domain": "quantum-machine-learning",
        "order_index": 31,
        "prerequisites": ["qml-30-probabilistic-graphical-models"],
        "estimated_minutes": 60,
        "description": "Train graphical models by sampling: contrastive divergence classically versus quantum thermal sampling, and how Boltzmann machines could be trained on annealers.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-31-optimization-and-sampling-in-pgms",
            "flashcard_category": "Encoding & Learning Algorithms",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 31 - Optimization and Sampling in PGMs",
                    "url": "https://www.youtube.com/watch?v=wk6zmGnJ3mw&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-32-quantum-enhanced-kernel-methods-1",
        "title": "Quantum-Enhanced Kernel Methods 1 (Maria Schuld)",
        "domain": "quantum-machine-learning",
        "order_index": 32,
        "prerequisites": ["qml-31-optimization-and-sampling-in-pgms"],
        "estimated_minutes": 70,
        "description": "Guest lecture: quantum circuits as feature maps into Hilbert space, with the kernel defined by the overlap between encoded states.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-32-quantum-enhanced-kernel-methods-1",
            "flashcard_category": "Quantum Kernels",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 32 - Quantum-Enhanced Kernel Methods 1 (Maria Schuld)",
                    "url": "https://www.youtube.com/watch?v=uDAAi5aQbMU&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-33-quantum-enhanced-kernel-methods-2",
        "title": "Quantum-Enhanced Kernel Methods 2 (Maria Schuld)",
        "domain": "quantum-machine-learning",
        "order_index": 33,
        "prerequisites": ["qml-32-quantum-enhanced-kernel-methods-1"],
        "estimated_minutes": 65,
        "description": "Guest lecture: estimating a kernel matrix on hardware, the sampling cost per entry, and the link between variational classifiers and kernel machines.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-33-quantum-enhanced-kernel-methods-2",
            "flashcard_category": "Quantum Kernels",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 33 - Quantum-Enhanced Kernel Methods 2 (Maria Schuld)",
                    "url": "https://www.youtube.com/watch?v=pfGHJivyzHA&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-34-quantum-enhanced-kernel-methods-3",
        "title": "Quantum-Enhanced Kernel Methods 3 (Maria Schuld)",
        "domain": "quantum-machine-learning",
        "order_index": 34,
        "prerequisites": ["qml-33-quantum-enhanced-kernel-methods-2"],
        "estimated_minutes": 65,
        "description": "Guest lecture: when a quantum kernel can beat a classical one — expressivity versus classical simulability, and honest limits on the advantage claims.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-34-quantum-enhanced-kernel-methods-3",
            "flashcard_category": "Quantum Kernels",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 34 - Quantum-Enhanced Kernel Methods 3 (Maria Schuld)",
                    "url": "https://www.youtube.com/watch?v=YWfAxmwOCjM&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-35-quantum-fourier-transform",
        "title": "Quantum Fourier Transform",
        "domain": "quantum-machine-learning",
        "order_index": 35,
        "prerequisites": ["qml-34-quantum-enhanced-kernel-methods-3"],
        "estimated_minutes": 60,
        "description": "Build the QFT as the quantum analogue of the DFT, its exponentially cheaper circuit, and its role as the engine behind phase estimation.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-35-quantum-fourier-transform",
            "flashcard_category": "Quantum Linear Algebra",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 35 - Quantum Fourier Transform",
                    "url": "https://www.youtube.com/watch?v=rtDC-j4Uw0A&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-36-quantum-phase-estimation",
        "title": "Quantum Phase Estimation",
        "domain": "quantum-machine-learning",
        "order_index": 36,
        "prerequisites": ["qml-35-quantum-fourier-transform"],
        "estimated_minutes": 60,
        "description": "Extract the eigenvalue of a unitary onto an ancilla register — the subroutine that turns eigenvalue problems into measurable phases.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-36-quantum-phase-estimation",
            "flashcard_category": "Quantum Linear Algebra",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 36 - Quantum Phase Estimation",
                    "url": "https://www.youtube.com/watch?v=tFQS9QvK-tE&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-37-overview-of-the-hhl-algorithm",
        "title": "Overview of the HHL Algorithm",
        "domain": "quantum-machine-learning",
        "order_index": 37,
        "prerequisites": ["qml-36-quantum-phase-estimation"],
        "estimated_minutes": 60,
        "description": "Walk the HHL pipeline for solving linear systems, and read its exponential speed-up carefully: the caveats on state preparation, condition number, and readout.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-37-overview-of-the-hhl-algorithm",
            "flashcard_category": "Quantum Linear Algebra",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 37 - Overview of the HHL Algorithm",
                    "url": "https://www.youtube.com/watch?v=hQpdPM-6wtU&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-38-quantum-matrix-inversion",
        "title": "Quantum Matrix Inversion",
        "domain": "quantum-machine-learning",
        "order_index": 38,
        "prerequisites": ["qml-37-overview-of-the-hhl-algorithm"],
        "estimated_minutes": 60,
        "description": "Implement the inversion step: conditional rotation by the reciprocal eigenvalue, amplitude amplification, and the success probability that governs the runtime.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-38-quantum-matrix-inversion",
            "flashcard_category": "Quantum Linear Algebra",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 38 - Quantum Matrix Inversion",
                    "url": "https://www.youtube.com/watch?v=24gxm-DhH2E&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-39-using-quantum-linear-algebra-for-learning",
        "title": "Using Quantum Linear Algebra for Learning",
        "domain": "quantum-machine-learning",
        "order_index": 39,
        "prerequisites": ["qml-38-quantum-matrix-inversion"],
        "estimated_minutes": 60,
        "description": "Apply quantum linear algebra to regression, PCA, and support vector machines, and check which of the advertised speed-ups survive realistic input/output assumptions.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-39-using-quantum-linear-algebra-for-learning",
            "flashcard_category": "Quantum Linear Algebra",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 39 - Using Quantum Linear Algebra for Learning",
                    "url": "https://www.youtube.com/watch?v=fgJ1pUbks4M&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-40-quantum-assisted-gaussian-processes",
        "title": "Quantum-Assisted Gaussian Processes",
        "domain": "quantum-machine-learning",
        "order_index": 40,
        "prerequisites": ["qml-39-using-quantum-linear-algebra-for-learning"],
        "estimated_minutes": 60,
        "description": "Use quantum linear-algebra subroutines inside Gaussian process regression, where the kernel-matrix inversion is exactly the classical bottleneck.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-40-quantum-assisted-gaussian-processes",
            "flashcard_category": "Quantum Linear Algebra",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 40 - Quantum-Assisted Gaussian Processes",
                    "url": "https://www.youtube.com/watch?v=A78Ez6dSWvA&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    {
        "slug": "qml-41-guest-lecture-by-seth-lloyd",
        "title": "Guest Lecture by Seth Lloyd",
        "domain": "quantum-machine-learning",
        "order_index": 41,
        "prerequisites": ["qml-40-quantum-assisted-gaussian-processes"],
        "estimated_minutes": 75,
        "description": "Closing guest lecture: a broad perspective on quantum machine learning — where the field's real opportunities lie and which claims deserve scepticism.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "qml-41-guest-lecture-by-seth-lloyd",
            "flashcard_category": "Quantum Linear Algebra",
            "videos": [
                {
                    "title": "Quantum Machine Learning - 41 - Guest lecture by Seth Lloyd",
                    "url": "https://www.youtube.com/watch?v=OstyW7c0v48&list=PLmRxgFnCIhaMgvot-Xuym_hn69lmzIokg",
                    "source": "Quantum Machine Learning MOOC"
                }
            ]
        }
    },
    # --- QUANTUM MATHS ROADMAP ---
    {
        "slug": "maths-vector-spaces",
        "title": "Complex Vector Spaces & Basis Vectors",
        "domain": "quantum-maths",
        "order_index": 1,
        "prerequisites": [],
        "estimated_minutes": 75,
        "description": "Master complex vector spaces, linear independence, basis vectors, and dimensionality foundational to quantum state representation.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "quantum-maths-vectors",
            "flashcard_category": "Quantum Mathematics",
            "videos": [
                {
                    "title": "Linear Algebra for Quantum Computing: Vector Spaces",
                    "url": "https://www.youtube.com/watch?v=mmibUFIep_s",
                    "source": "Qrious Mathematics Series"
                }
            ]
        }
    },
    {
        "slug": "maths-dirac-bra-ket",
        "title": "Dirac Bra-Ket Notation & Dual Spaces",
        "domain": "quantum-maths",
        "order_index": 2,
        "prerequisites": ["maths-vector-spaces"],
        "estimated_minutes": 70,
        "description": "Master state vectors |ψ⟩, dual bras ⟨ψ|, state normalization, and probability amplitude projections.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "quantum-maths-dirac",
            "flashcard_category": "Dirac Notation",
            "videos": [
                {
                    "title": "Dirac Bra-Ket Notation & Dual Vector Spaces",
                    "url": "https://www.youtube.com/watch?v=RyPQL8lccx4",
                    "source": "Qrious Mathematics Series"
                }
            ]
        }
    },
    {
        "slug": "maths-inner-products",
        "title": "Inner Products & Hilbert Spaces",
        "domain": "quantum-maths",
        "order_index": 3,
        "prerequisites": ["maths-dirac-bra-ket"],
        "estimated_minutes": 80,
        "description": "Explore Hilbert space geometry, inner products ⟨φ|ψ⟩, orthogonality, vector norms, and the Cauchy-Schwarz inequality.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "quantum-maths-hilbert",
            "flashcard_category": "Hilbert Spaces",
            "videos": [
                {
                    "title": "Hilbert Spaces & Inner Product Geometry",
                    "url": "https://www.youtube.com/watch?v=kT8O__Fl54I",
                    "source": "Qrious Mathematics Series"
                }
            ]
        }
    },
    {
        "slug": "maths-matrices-operators",
        "title": "Unitary, Hermitian & Spectral Operators",
        "domain": "quantum-maths",
        "order_index": 4,
        "prerequisites": ["maths-inner-products"],
        "estimated_minutes": 85,
        "description": "Analyze matrix operators: Unitary operators (U†U = I) preserving state norms, Hermitian observables (H = H†), and Spectral decomposition.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "quantum-maths-operators",
            "flashcard_category": "Quantum Operators",
            "videos": [
                {
                    "title": "Unitary & Hermitian Operators in Quantum Mechanics",
                    "url": "https://www.youtube.com/watch?v=dD-oYfhSKhg",
                    "source": "Qrious Mathematics Series"
                }
            ]
        }
    },
    {
        "slug": "maths-outer-tensor-products",
        "title": "Outer Products & Tensor Kronecker Products",
        "domain": "quantum-maths",
        "order_index": 5,
        "prerequisites": ["maths-matrices-operators"],
        "estimated_minutes": 80,
        "description": "Formulate outer products |ψ⟩⟨φ|, projection operators, completeness relations, and Kronecker tensor products V ⊗ W for multi-qubit systems.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "quantum-maths-tensors",
            "flashcard_category": "Tensor Algebra",
            "videos": [
                {
                    "title": "Tensor Products & Multi-System Math",
                    "url": "https://www.youtube.com/watch?v=85SoQ5f5dHk",
                    "source": "Qrious Mathematics Series"
                }
            ]
        }
    },
    {
        "slug": "maths-complex-analysis",
        "title": "Complex Numbers & Euler's Phase Formula",
        "domain": "quantum-maths",
        "order_index": 6,
        "prerequisites": ["maths-outer-tensor-products"],
        "estimated_minutes": 75,
        "description": "Understand complex plane geometry, Euler's formula e^(iθ) = cos(θ) + i sin(θ), quantum relative phases, and global phase invariance.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "quantum-maths-complex",
            "flashcard_category": "Complex Analysis",
            "videos": [
                {
                    "title": "Euler's Formula & Quantum Phase Factor",
                    "url": "https://www.youtube.com/watch?v=v0YEaeIClKY",
                    "source": "Qrious Mathematics Series"
                }
            ]
        }
    },
    # --- QUANTUM PHYSICS ROADMAP ---
    {
        "slug": "physics-wave-particle-duality",
        "title": "Wave-Particle Duality & Photoelectric Effect",
        "domain": "quantum-physics",
        "order_index": 1,
        "prerequisites": [],
        "estimated_minutes": 75,
        "description": "Explore the birth of quantum physics: Planck's radiation law, Einstein's photoelectric effect, and De Broglie matter waves (λ = h/p).",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "quantum-physics-duality",
            "flashcard_category": "Quantum Physics",
            "videos": [
                {
                    "title": "Wave-Particle Duality & De Broglie Wavelength",
                    "url": "https://www.youtube.com/watch?v=Q_h4IoPJXZw",
                    "source": "Qrious Physics Series"
                }
            ]
        }
    },
    {
        "slug": "physics-schrodinger-equation",
        "title": "Schrödinger Equation & Wavefunctions",
        "domain": "quantum-physics",
        "order_index": 2,
        "prerequisites": ["physics-wave-particle-duality"],
        "estimated_minutes": 85,
        "description": "Formulate time-dependent (iℏ ∂Ψ/∂t = HΨ) and time-independent Schrödinger differential equations, wavefunctions Ψ(x,t), and Born probability densities.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "quantum-physics-schrodinger",
            "flashcard_category": "Schrödinger Equation",
            "videos": [
                {
                    "title": "The Schrödinger Equation Derivation & Meaning",
                    "url": "https://www.youtube.com/watch?v=uK60giWfBRU",
                    "source": "Qrious Physics Series"
                }
            ]
        }
    },
    {
        "slug": "physics-uncertainty-principle",
        "title": "Heisenberg Uncertainty Principle",
        "domain": "quantum-physics",
        "order_index": 3,
        "prerequisites": ["physics-schrodinger-equation"],
        "estimated_minutes": 80,
        "description": "Analyze canonical commutation relations [x, p] = iℏ and Heisenberg's uncertainty relation Δx Δp ≥ ℏ/2.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "quantum-physics-uncertainty",
            "flashcard_category": "Uncertainty Principle",
            "videos": [
                {
                    "title": "Heisenberg Uncertainty Principle",
                    "url": "https://www.youtube.com/watch?v=TOKMaFIGtGs",
                    "source": "Qrious Physics Series"
                }
            ]
        }
    },
    {
        "slug": "physics-stern-gerlach",
        "title": "Stern-Gerlach Experiment & Quantized Spin",
        "domain": "quantum-physics",
        "order_index": 4,
        "prerequisites": ["physics-uncertainty-principle"],
        "estimated_minutes": 80,
        "description": "Examine the historic 1922 Stern-Gerlach beam deflection experiment demonstrating intrinsic electron angular momentum quantization.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "quantum-physics-stern-gerlach",
            "flashcard_category": "Quantum Spin",
            "videos": [
                {
                    "title": "Stern-Gerlach Experiment & Quantum Angular Momentum",
                    "url": "https://www.youtube.com/watch?v=-66rprgwGNU",
                    "source": "Qrious Physics Series"
                }
            ]
        }
    },
    {
        "slug": "physics-electron-spin",
        "title": "Pauli Spin Matrices & Spin-1/2 Algebra",
        "domain": "quantum-physics",
        "order_index": 5,
        "prerequisites": ["physics-stern-gerlach"],
        "estimated_minutes": 85,
        "description": "Study spin-1/2 state vectors, Pauli spin matrices (σx, σy, σz), spin commutation rules, and Bloch sphere spin orientation.",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "quantum-physics-pauli",
            "flashcard_category": "Pauli Matrices",
            "videos": [
                {
                    "title": "Pauli Matrices & Spin-1/2 Mechanics",
                    "url": "https://www.youtube.com/watch?v=90za6mazNps",
                    "source": "Qrious Physics Series"
                }
            ]
        }
    },
    {
        "slug": "physics-quantum-tunnelling",
        "title": "Potential Wells & Quantum Tunnelling",
        "domain": "quantum-physics",
        "order_index": 6,
        "prerequisites": ["physics-electron-spin"],
        "estimated_minutes": 85,
        "description": "Solve particle in a 1D box potential wells, finite square barriers, and non-zero barrier penetration transmission probabilities (quantum tunnelling).",
        "content_refs": {
            "lesson_ids": [],
            "quiz_topic_tag": "quantum-physics-tunnelling",
            "flashcard_category": "Quantum Tunnelling",
            "videos": [
                {
                    "title": "Quantum Tunnelling & Potential Energy Barriers",
                    "url": "https://www.youtube.com/watch?v=cTob6GgKHR8",
                    "source": "Qrious Physics Series"
                }
            ]
        }
    }
]

def validate_dag(topics: List[Dict[str, Any]]) -> bool:
    """Validates that prerequisite topics form a valid Directed Acyclic Graph (DAG)."""
    slug_map = {t["slug"]: t for t in topics}
    in_degree = {t["slug"]: 0 for t in topics}
    adj = {t["slug"]: [] for t in topics}

    for t in topics:
        for p in t.get("prerequisites", []):
            if p not in slug_map:
                raise ValueError(f"Prerequisite '{p}' for topic '{t['slug']}' does not exist.")
            adj[p].append(t["slug"])
            in_degree[t["slug"]] += 1

    queue = deque([s for s, deg in in_degree.items() if deg == 0])
    visited_count = 0

    while queue:
        curr = queue.popleft()
        visited_count += 1
        for nxt in adj[curr]:
            in_degree[nxt] -= 1
            if in_degree[nxt] == 0:
                queue.append(nxt)

    if visited_count != len(topics):
        raise ValueError(f"Cycle detected in topic prerequisites DAG. Visited {visited_count}/{len(topics)}.")
    return True

async def seed_roadmap(db: AsyncIOMotorDatabase) -> int:
    """Seeds or refreshes the roadmap_topics collection in MongoDB."""
    if db is None:
        return 0

    validate_dag(SEED_TOPICS)

    # Always drop existing collection to guarantee clean order_index re-seeding
    try:
        await db.roadmap_topics.drop()
    except Exception:
        pass

    inserted_count = 0
    for topic in SEED_TOPICS:
        if "materials" not in topic["content_refs"]:
            topic["content_refs"]["materials"] = [
                {
                    "title": f"{topic['title']} - Lecture Slide Notes.pdf",
                    "url": f"https://qrious-quantum.s3.amazonaws.com/materials/{topic['slug']}-slides.pdf",
                    "type": "PDF Slide Deck",
                    "file_size": "2.4 MB"
                },
                {
                    "title": f"{topic['title']} - Quick Reference Cheatsheet.pdf",
                    "url": f"https://qrious-quantum.s3.amazonaws.com/materials/{topic['slug']}-cheatsheet.pdf",
                    "type": "PDF Cheatsheet",
                    "file_size": "1.2 MB"
                }
            ]
        await db.roadmap_topics.update_one(
            {"slug": topic["slug"]},
            {"$set": topic},
            upsert=True
        )
        inserted_count += 1

    return inserted_count

seed_roadmap_topics = seed_roadmap
