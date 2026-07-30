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
        "estimated_minutes": 30,
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
        "estimated_minutes": 45,
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
        "estimated_minutes": 35,
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
        "estimated_minutes": 40,
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
        "estimated_minutes": 45,
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
        "estimated_minutes": 45,
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
        "estimated_minutes": 50,
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
        "estimated_minutes": 40,
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
        "estimated_minutes": 45,
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
        "estimated_minutes": 40,
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
        "estimated_minutes": 50,
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
        "estimated_minutes": 50,
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
        "estimated_minutes": 55,
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
        "estimated_minutes": 45,
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
        "estimated_minutes": 45,
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
        "estimated_minutes": 35,
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
        "estimated_minutes": 50,
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
        "estimated_minutes": 50,
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
        "estimated_minutes": 55,
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
        "estimated_minutes": 55,
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
        "estimated_minutes": 50,
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
        "estimated_minutes": 45,
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
        "estimated_minutes": 30,
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
        "estimated_minutes": 35,
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
        "estimated_minutes": 50,
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
        "estimated_minutes": 45,
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
        "estimated_minutes": 55,
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
        "estimated_minutes": 55,
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
        "estimated_minutes": 55,
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
        "estimated_minutes": 50,
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
