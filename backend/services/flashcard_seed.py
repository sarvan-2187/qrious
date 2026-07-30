from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime

SEED_FLASHCARDS: List[Dict[str, Any]] = [
    # 1. Quantum History (Quantum Computation: History & Overview)
    {
        "category": "Quantum History",
        "front": "What is a Quantum Bit (Qubit)?",
        "back": "The fundamental unit of quantum information. Unlike classical bits (0 or 1), a qubit can exist in a linear combination (superposition) of basis states |0> and |1>.",
        "difficulty": "easy",
        "is_system": True
    },
    {
        "category": "Quantum History",
        "front": "What key physical phenomenon powers Quantum Speedup?",
        "back": "Superposition, Quantum Interference, and Entanglement allow quantum computers to evaluate complex computational paths simultaneously.",
        "difficulty": "easy",
        "is_system": True
    },
    {
        "category": "Quantum History",
        "front": "What are DiVincenzo's Criteria?",
        "back": "A set of five experimental conditions (plus two for networking) necessary for building a practical quantum computer, including scalable physical qubits, initialization, long decoherence times, universal gate sets, and qubit measurement.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Quantum History",
        "front": "What is Quantum Advantage (Quantum Supremacy)?",
        "back": "The benchmark milestone where a programmable quantum device solves a computational problem faster than any achievable runtime on the world's most powerful classical supercomputers.",
        "difficulty": "medium",
        "is_system": True
    },

    # 2. Linear Algebra (Review of Linear Algebra)
    {
        "category": "Linear Algebra",
        "front": "What is a Vector Space over complex numbers C^n?",
        "back": "A mathematical structure formed by a set of complex vectors that can be added together and multiplied by complex scalars, satisfying key axioms like associativity, commutativity, and distributivity.",
        "difficulty": "easy",
        "is_system": True
    },
    {
        "category": "Linear Algebra",
        "front": "What constitutes Linear Independence among vectors?",
        "back": "A set of vectors is linearly independent if no vector in the set can be expressed as a linear combination of the other vectors.",
        "difficulty": "easy",
        "is_system": True
    },
    {
        "category": "Linear Algebra",
        "front": "What is a Basis of a vector space?",
        "back": "A set of linearly independent vectors that span the entire vector space, allowing any vector in the space to be uniquely written as a linear combination of basis vectors.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Linear Algebra",
        "front": "What is a Dual Space in linear algebra?",
        "back": "The vector space formed by all linear functionals (maps from vector space to complex scalars). In Dirac notation, dual space vectors are represented as bra vectors <psi|.",
        "difficulty": "hard",
        "is_system": True
    },

    # 3. Dirac Notation (Dirac Notation & State Vectors)
    {
        "category": "Dirac Notation",
        "front": "What does a Ket vector |psi> represent?",
        "back": "A column vector representing a quantum state in Hilbert space.",
        "difficulty": "easy",
        "is_system": True
    },
    {
        "category": "Dirac Notation",
        "front": "What does a Bra vector <psi| represent?",
        "back": "The conjugate transpose (Hermitian adjoint) of a ket vector |psi>, forming a row vector in the dual vector space.",
        "difficulty": "easy",
        "is_system": True
    },
    {
        "category": "Dirac Notation",
        "front": "How is the inner product of kets |psi> and |phi> written and evaluated?",
        "back": "Written as <psi|phi>, calculated by multiplying the conjugate transpose row vector of |psi> with the column vector of |phi>, yielding a complex scalar.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Dirac Notation",
        "front": "How is a general single-qubit state vector represented in Dirac notation?",
        "back": "|psi> = alpha|0> + beta|1>, where alpha and beta are complex probability amplitudes satisfying |alpha|^2 + |beta|^2 = 1.",
        "difficulty": "easy",
        "is_system": True
    },

    # 4. Hilbert Spaces (Hilbert Spaces & Inner Products)
    {
        "category": "Hilbert Spaces",
        "front": "What is a Hilbert Space in quantum mechanics?",
        "back": "A complete complex vector space equipped with an inner product, providing the mathematical framework for defining quantum state vectors.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Hilbert Spaces",
        "front": "What does orthogonality mean for two quantum states |psi> and |phi>?",
        "back": "Their inner product is zero (<psi|phi> = 0), meaning the states are mutually exclusive and perfectly distinguishable upon measurement.",
        "difficulty": "easy",
        "is_system": True
    },
    {
        "category": "Hilbert Spaces",
        "front": "What is the Cauchy-Schwarz inequality for quantum inner products?",
        "back": "|<psi|phi>|^2 <= <psi|psi><phi|phi>, proving that the absolute inner product of two states is bounded by the product of their norms.",
        "difficulty": "hard",
        "is_system": True
    },
    {
        "category": "Hilbert Spaces",
        "front": "What is the Euclidean Norm of a ket vector |psi>?",
        "back": "The magnitude |||psi>|| = sqrt(<psi|psi>), which equals 1 for normalized physical quantum states.",
        "difficulty": "easy",
        "is_system": True
    },

    # 5. Quantum Matrices (Unitary, Hermitian & Normal Matrices)
    {
        "category": "Quantum Matrices",
        "front": "What defines a Unitary Operator U?",
        "back": "An operator satisfying U^dagger U = U U^dagger = I (where U^dagger is the Hermitian adjoint), which preserves vector norms and angles.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Quantum Matrices",
        "front": "Why must all closed-system quantum evolutions be Unitary?",
        "back": "Unitary operations preserve state vector normalization (total probability = 1) and guarantee that quantum computations are strictly reversible.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Quantum Matrices",
        "front": "What defines a Hermitian Operator H?",
        "back": "An operator equal to its own Hermitian adjoint (H^dagger = H), possessing real eigenvalues and orthogonal eigenvectors.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Quantum Matrices",
        "front": "Why do Hermitian operators represent physical observables?",
        "back": "Because physical measurement results are real numbers, and Hermitian matrices guarantee real eigenvalues corresponding to observable outcomes.",
        "difficulty": "hard",
        "is_system": True
    },

    # 6. Tensor Products (Outer Products & Tensor Products)
    {
        "category": "Tensor Products",
        "front": "What is an Outer Product |psi><phi|?",
        "back": "The matrix multiplication of column ket |psi> and row bra <phi|, producing a linear operator (matrix).",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Tensor Products",
        "front": "What is the Completeness Relation (Resolution of Identity)?",
        "back": "Sum_i |i><i| = I, stating that summing the projection operators over an orthonormal basis yields the identity matrix.",
        "difficulty": "hard",
        "is_system": True
    },
    {
        "category": "Tensor Products",
        "front": "How are multi-qubit state spaces constructed?",
        "back": "Via the Tensor Product (V (x) W). An n-qubit system state resides in a 2^n dimensional Hilbert Space.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Tensor Products",
        "front": "What is the dimension of an n-qubit Hilbert space?",
        "back": "2^n complex dimensions, enabling exponential scaling of state space capacity.",
        "difficulty": "easy",
        "is_system": True
    },

    # 7. Postulates (Postulates of Quantum Mechanics)
    {
        "category": "Postulates",
        "front": "What is Postulate 1 of Quantum Mechanics?",
        "back": "Any isolated physical system is associated with a complex Hilbert space state space, and the state is completely described by a unit vector |psi>.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Postulates",
        "front": "What is Postulate 2 of Quantum Mechanics (Evolution)?",
        "back": "The time evolution of a closed quantum system is described by a unitary operator U: |psi(t2)> = U(t1, t2)|psi(t1)>.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Postulates",
        "front": "What is Postulate 3 of Quantum Mechanics (Born Rule)?",
        "back": "Quantum measurements are described by measurement operators {M_m}. The probability of measuring outcome m is P(m) = <psi|M_m^dagger M_m|psi>.",
        "difficulty": "hard",
        "is_system": True
    },
    {
        "category": "Postulates",
        "front": "What is Postulate 4 of Quantum Mechanics (Composite Systems)?",
        "back": "The state space of a composite physical system is the tensor product of the state spaces of the component systems (|psi_12> = |psi_1> (x) |psi_2>).",
        "difficulty": "medium",
        "is_system": True
    },

    # 8. Stern-Gerlach (Stern-Gerlach Experiment)
    {
        "category": "Stern-Gerlach",
        "front": "What did the 1922 Stern-Gerlach experiment discover?",
        "back": "Spatial quantization of angular momentum and the existence of electron spin-1/2.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Stern-Gerlach",
        "front": "Why did silver atoms split into exactly two discrete beams in Stern-Gerlach?",
        "back": "Silver atom net electron spin is 1/2, yielding two discrete spin orientations (spin-up |+z> and spin-down |-z>) when passed through an inhomogeneous magnetic field.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Stern-Gerlach",
        "front": "What happens when spin-up silver atoms are passed through an X-oriented Stern-Gerlach magnet?",
        "back": "The state |+z> splits 50/50 into |+x> and |-x>, illustrating that z-spin and x-spin are complementary non-commuting observables.",
        "difficulty": "hard",
        "is_system": True
    },

    # 9. Bloch Sphere (Qubits & Bloch Sphere Representation)
    {
        "category": "Bloch Sphere",
        "front": "What is the Bloch Sphere?",
        "back": "A geometrical representation of the pure state space of a two-level quantum system (qubit) on the surface of a unit sphere.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Bloch Sphere",
        "front": "What points on the Bloch Sphere correspond to basis states |0> and |1>?",
        "back": "State |0> is at the North Pole (theta=0), and state |1> is at the South Pole (theta=pi).",
        "difficulty": "easy",
        "is_system": True
    },
    {
        "category": "Bloch Sphere",
        "front": "What states lie on the equator of the Bloch Sphere (theta = pi/2)?",
        "back": "Equal superposition states of the form (|0> + e^(i phi)|1>)/sqrt(2), including |+> = (|0>+|1>)/sqrt(2) and |-> = (|0>-|1>)/sqrt(2).",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Bloch Sphere",
        "front": "How do single-qubit unitary operations act on the Bloch Sphere?",
        "back": "As 3D rotations of the state vector around an axis of the Bloch Sphere.",
        "difficulty": "medium",
        "is_system": True
    },

    # 10. Circuit Model (Circuit Model of Quantum Computing)
    {
        "category": "Circuit Model",
        "front": "What are the core components of a Quantum Circuit?",
        "back": "Quantum wires (qubits), single/multi-qubit unitary logic gates, and measurement operators converting quantum states into classical bit registers.",
        "difficulty": "easy",
        "is_system": True
    },
    {
        "category": "Circuit Model",
        "front": "What is Quantum Circuit Depth?",
        "back": "The maximum number of sequential gate layers executed from start to end along any wire path, defining circuit run time.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Circuit Model",
        "front": "What is Quantum Circuit Width?",
        "back": "The total number of qubits (data + ancilla wires) utilized in the quantum circuit.",
        "difficulty": "easy",
        "is_system": True
    },

    # 11. Quantum Gates (Quantum Gates & Circuit Architecture)
    {
        "category": "Quantum Gates",
        "front": "What does the Pauli-X gate do?",
        "back": "Acts as a quantum NOT gate. Flips basis states: X|0> = |1> and X|1> = |0>.",
        "difficulty": "easy",
        "is_system": True
    },
    {
        "category": "Quantum Gates",
        "front": "What does the Pauli-Z gate do?",
        "back": "Applies a phase flip: Z|0> = |0> and Z|1> = -|1>.",
        "difficulty": "easy",
        "is_system": True
    },
    {
        "category": "Quantum Gates",
        "front": "What is the Hadamard Gate (H) effect on state |0>?",
        "back": "H|0> = (|0> + |1>) / sqrt(2) = |+>, creating an equal superposition of basis states.",
        "difficulty": "easy",
        "is_system": True
    },
    {
        "category": "Quantum Gates",
        "front": "What does the CNOT (Controlled-NOT) gate do?",
        "back": "Flips the target qubit if and only if the control qubit is in state |1>.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Quantum Gates",
        "front": "What is the Toffoli (CCX) gate?",
        "back": "A 3-qubit gate that flips the target qubit if both control qubits are in state |1>. It is universal for classical reversible computation.",
        "difficulty": "hard",
        "is_system": True
    },

    # 12. Qiskit (Qiskit Programming & IBM Quantum Hands-on)
    {
        "category": "Qiskit",
        "front": "How do you create a 2-qubit circuit with 2 classical bits in IBM Qiskit?",
        "back": "qc = QuantumCircuit(2, 2) in Python using the Qiskit SDK.",
        "difficulty": "easy",
        "is_system": True
    },
    {
        "category": "Qiskit",
        "front": "What is AerSimulator in Qiskit?",
        "back": "A high-performance local C++ simulator backend for executing noise-free or noisy quantum circuits.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Qiskit",
        "front": "What is Transpilation in Qiskit?",
        "back": "The process of rewriting a quantum circuit to optimize depth and match the native gate sets and physical coupling map of target hardware.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Qiskit",
        "front": "How do you add measurement to all qubits in Qiskit?",
        "back": "qc.measure_all() or qc.measure(q_register, c_register).",
        "difficulty": "easy",
        "is_system": True
    },

    # 13. Entanglement (Quantum Entanglement & Bell States)
    {
        "category": "Entanglement",
        "front": "What is a Bell State (EPR Pair)?",
        "back": "A maximally entangled two-qubit state, such as |Phi+> = (|00> + |11>) / sqrt(2), where measuring one qubit instantly determines the state of the other.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Entanglement",
        "front": "How is the Bell state |Phi+> created in a quantum circuit?",
        "back": "Apply a Hadamard gate (H) to qubit 0, followed by a CNOT gate with control=qubit 0 and target=qubit 1 starting from |00>.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Entanglement",
        "front": "Can quantum entanglement be used for faster-than-light communication?",
        "back": "No. Measurement results are intrinsically random, requiring classical communication channels to transmit useful information (No-Communication Theorem).",
        "difficulty": "hard",
        "is_system": True
    },
    {
        "category": "Entanglement",
        "front": "What is Bell's Theorem?",
        "back": "Proves that no local hidden variable theory can reproduce all predictions of quantum mechanics, verified by CHSH inequality violations.",
        "difficulty": "hard",
        "is_system": True
    },

    # 14. Teleportation (Quantum Teleportation Protocol)
    {
        "category": "Teleportation",
        "front": "What is the goal of the Quantum Teleportation Protocol?",
        "back": "To transmit an unknown single-qubit state |psi> from Alice to Bob using a pre-shared entangled Bell pair and 2 classical bits.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Teleportation",
        "front": "How many classical bits must Alice send Bob in Quantum Teleportation?",
        "back": "Exactly 2 classical bits derived from Bell basis measurement on her two qubits.",
        "difficulty": "easy",
        "is_system": True
    },
    {
        "category": "Teleportation",
        "front": "What gates does Bob apply in Quantum Teleportation based on received classical bits (b1, b2)?",
        "back": "If b2=1 apply X gate; if b1=1 apply Z gate. (Apply Z^b1 X^b2 to recover exact state |psi>).",
        "difficulty": "hard",
        "is_system": True
    },
    {
        "category": "Teleportation",
        "front": "Does Quantum Teleportation clone an unknown quantum state?",
        "back": "No. Alice's original state is destroyed by measurement during the process, strictly respecting the No-Cloning theorem.",
        "difficulty": "medium",
        "is_system": True
    },

    # 15. Superdense Coding (Superdense Coding)
    {
        "category": "Superdense Coding",
        "front": "What does Superdense Coding accomplish?",
        "back": "Allows sending two classical bits of information by transmitting only one physical qubit, using a pre-shared entangled Bell pair.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Superdense Coding",
        "front": "What Pauli operations does Alice apply in Superdense Coding for classical bits 00, 01, 10, 11?",
        "back": "00 -> I, 01 -> Z, 10 -> X, 11 -> iY (or XZ), transforming the shared Bell pair into distinct Bell states.",
        "difficulty": "hard",
        "is_system": True
    },
    {
        "category": "Superdense Coding",
        "front": "How does Bob decode the 2 classical bits in Superdense Coding?",
        "back": "Applies CNOT(0,1), Hadamard on qubit 0, and measures both qubits in the computational basis.",
        "difficulty": "medium",
        "is_system": True
    },

    # 16. Phase Kickback (Phase Kickback & Quantum Parallelism)
    {
        "category": "Phase Kickback",
        "front": "What is Phase Kickback?",
        "back": "A quantum mechanism where an eigenvalue/phase associated with an operation on a target qubit is kicked back onto the control qubit state.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Phase Kickback",
        "front": "How is an oracle set up to achieve Phase Kickback?",
        "back": "Initialize the target qubit in state |-> = (|0>-|1>)/sqrt(2). Applying oracle U_f |x>|-> yields (-1)^(f(x)) |x>|->, kicking the function phase onto |x>.",
        "difficulty": "hard",
        "is_system": True
    },
    {
        "category": "Phase Kickback",
        "front": "What is Quantum Parallelism?",
        "back": "The ability of a quantum circuit to evaluate a function f(x) for all 2^n input values simultaneously by applying an oracle to a superposition state.",
        "difficulty": "medium",
        "is_system": True
    },

    # 17. No-Cloning (No-Cloning Theorem)
    {
        "category": "No-Cloning",
        "front": "What does the No-Cloning Theorem state?",
        "back": "It is impossible to create an identical copy of an arbitrary unknown quantum state using linear unitary operations.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "No-Cloning",
        "front": "How is the No-Cloning Theorem mathematically proven?",
        "back": "From linearity of unitary operators: U(|a>|0>) = |a>|a> and U(|b>|0>) = |b>|b> implies U((|a>+|b>)|0>) = |a>|a> + |b>|b>, which does NOT equal (|a>+|b>)(|a>+|b>).",
        "difficulty": "hard",
        "is_system": True
    },
    {
        "category": "No-Cloning",
        "front": "Why is the No-Cloning Theorem crucial for Quantum Cryptography?",
        "back": "It prevents eavesdroppers from silently copying quantum key distribution (QKD) signals without disturbing the quantum state and revealing their presence.",
        "difficulty": "medium",
        "is_system": True
    },

    # 18. Deutsch-Jozsa (Deutsch-Jozsa Algorithm)
    {
        "category": "Deutsch-Jozsa",
        "front": "What problem does the Deutsch-Jozsa algorithm solve?",
        "back": "Determines whether a boolean function f(x) is constant or balanced in a single query, demonstrating exponential speedup.",
        "difficulty": "hard",
        "is_system": True
    },
    {
        "category": "Deutsch-Jozsa",
        "front": "How many queries does classical vs quantum Deutsch-Jozsa require?",
        "back": "Classical requires 2^(n-1) + 1 queries in worst-case, whereas quantum requires exactly 1 query.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Deutsch-Jozsa",
        "front": "What measurement outcome in Deutsch-Jozsa indicates a constant function?",
        "back": "Measuring all 0s (|00...0>) on the query register guarantees the function is constant. Any non-zero result means balanced.",
        "difficulty": "medium",
        "is_system": True
    },

    # 19. Bernstein-Vazirani (Bernstein-Vazirani Algorithm)
    {
        "category": "Bernstein-Vazirani",
        "front": "What problem does the Bernstein-Vazirani algorithm solve?",
        "back": "Finds a secret n-bit string s in an oracle function f(x) = s . x (mod 2) in a single query.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Bernstein-Vazirani",
        "front": "What is the query complexity of classical vs quantum Bernstein-Vazirani?",
        "back": "Classical requires n queries (bit by bit), while quantum requires exactly 1 query.",
        "difficulty": "easy",
        "is_system": True
    },
    {
        "category": "Bernstein-Vazirani",
        "front": "What circuit pattern is used in Bernstein-Vazirani?",
        "back": "Apply H^tensor n to input |0...0>, target in |->, evaluate oracle U_f, apply H^tensor n, measure input register to directly read secret string s.",
        "difficulty": "hard",
        "is_system": True
    },

    # 20. Grovers Algorithm (Grover's Search Algorithm)
    {
        "category": "Grovers Algorithm",
        "front": "What is the time complexity of Grover's Search Algorithm?",
        "back": "O(sqrt(N)) queries for searching an unsorted database of N items, providing quadratic speedup over classical O(N).",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Grovers Algorithm",
        "front": "What are the two core operators in Grover's iterator?",
        "back": "1. Oracle operator (flips the phase of the target state)  2. Diffusion operator (amplifies amplitude about the mean).",
        "difficulty": "hard",
        "is_system": True
    },
    {
        "category": "Grovers Algorithm",
        "front": "How many Grover iterations are required for optimal probability of success?",
        "back": "Approximately (pi / 4) * sqrt(N) iterations.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Grovers Algorithm",
        "front": "What does the Grover Diffusion Operator do geometrically?",
        "back": "Reflects the state vector about the uniform superposition state vector |s>, amplifying the target amplitude while suppressing non-target amplitudes.",
        "difficulty": "hard",
        "is_system": True
    },

    # 21. QFT (Quantum Fourier Transform)
    {
        "category": "QFT",
        "front": "What is the Quantum Fourier Transform (QFT)?",
        "back": "The quantum analogue of the Discrete Fourier Transform (DFT), mapping computational basis state |j> to superposition Sum_k e^(2pi i j k / N) |k> / sqrt(N).",
        "difficulty": "hard",
        "is_system": True
    },
    {
        "category": "QFT",
        "front": "What is the computational gate complexity of QFT on n qubits?",
        "back": "O(n^2) quantum gates, compared to classical Fast Fourier Transform (FFT) complexity of O(n 2^n).",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "QFT",
        "front": "What quantum gates compose the QFT circuit?",
        "back": "Hadamard (H) gates, Controlled-Phase rotation gates (R_k), and SWAP gates at the end to reverse qubit order.",
        "difficulty": "medium",
        "is_system": True
    },

    # 22. Phase Estimation (Quantum Phase Estimation)
    {
        "category": "Phase Estimation",
        "front": "What is the purpose of Quantum Phase Estimation (QPE)?",
        "back": "To estimate the unknown phase theta in U|u> = e^(2pi i theta)|u> for a unitary operator U and eigenvector |u>.",
        "difficulty": "hard",
        "is_system": True
    },
    {
        "category": "Phase Estimation",
        "front": "What role does the Inverse QFT play in QPE?",
        "back": "Transforms the phase information encoded into controlled-U^2^j operations back into computational basis states for measurement.",
        "difficulty": "hard",
        "is_system": True
    },
    {
        "category": "Phase Estimation",
        "front": "How does adding evaluation qubits affect QPE precision?",
        "back": "Adding t evaluation qubits provides t bits of precision for phase theta with success probability > 1 - epsilon.",
        "difficulty": "medium",
        "is_system": True
    },

    # 23. Shors Algorithm (Shor's Factoring Algorithm)
    {
        "category": "Shors Algorithm",
        "front": "What problem does Shor's Algorithm solve?",
        "back": "Finds prime factors of a composite integer N in polynomial time O((log N)^3), breaking RSA encryption.",
        "difficulty": "hard",
        "is_system": True
    },
    {
        "category": "Shors Algorithm",
        "front": "Which quantum subroutine does Shor's Algorithm rely on?",
        "back": "Quantum Phase Estimation (QPE) utilizing the Quantum Fourier Transform (QFT) for period finding of f(x) = a^x mod N.",
        "difficulty": "hard",
        "is_system": True
    },
    {
        "category": "Shors Algorithm",
        "front": "Why is order finding useful for factoring an integer N?",
        "back": "If the period r of a^x mod N is even and a^(r/2) != -1 mod N, then gcd(a^(r/2) +/- 1, N) yields non-trivial prime factors of N.",
        "difficulty": "hard",
        "is_system": True
    },

    # 24. Error Correction (Quantum Error Correction & Gottesman-Knill)
    {
        "category": "Error Correction",
        "front": "Why cannot classical error correction (bit repetition) be directly applied to qubits?",
        "back": "Because measuring qubits collapses superposition (Born rule) and the No-Cloning theorem prevents state duplication.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Error Correction",
        "front": "What is the 3-qubit Bit-Flip code?",
        "back": "Encodes logical qubit |0_L> = |000> and |1_L> = |111>, detecting single-qubit X errors via syndrome measurements without destroying superposition.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Error Correction",
        "front": "What is the Shor 9-qubit Code?",
        "back": "The first quantum error-correcting code capable of protecting a logical qubit against arbitrary single-qubit errors (both bit-flip X and phase-flip Z errors).",
        "difficulty": "hard",
        "is_system": True
    },
    {
        "category": "Error Correction",
        "front": "What does the Gottesman-Knill Theorem state?",
        "back": "Any quantum circuit composed solely of Clifford group gates (Hadamard, Phase S, CNOT, Pauli gates, measurement) can be efficiently simulated classically in polynomial time O(n^2).",
        "difficulty": "hard",
        "is_system": True
    },

    # 25. Surface Codes (Surface Codes & Fault Tolerance)
    {
        "category": "Surface Codes",
        "front": "What is a Surface Code in Quantum Error Correction?",
        "back": "A 2D lattice error-correcting code that detects bit-flip and phase-flip errors using nearest-neighbor stabilizer measurements.",
        "difficulty": "hard",
        "is_system": True
    },
    {
        "category": "Surface Codes",
        "front": "What are Stabilizer Syndrome Measurements in Surface Codes?",
        "back": "Interspersed measurement of star (Z-type) and plaquette (X-type) ancilla qubits to detect error locations without measuring data qubits directly.",
        "difficulty": "hard",
        "is_system": True
    },
    {
        "category": "Surface Codes",
        "front": "What is the fault-tolerance error threshold for Surface Codes?",
        "back": "Approximately 1% physical error rate per gate, making it the most practical architecture for fault-tolerant quantum computers.",
        "difficulty": "medium",
        "is_system": True
    },

    # 26. QML (Introduction to Quantum Machine Learning)
    {
        "category": "QML",
        "front": "What is a Variational Quantum Circuit (VQC) / Parameterized Quantum Circuit (PQC)?",
        "back": "A quantum circuit with tunable gate parameters (theta) optimized iteratively using classical gradient descent algorithms.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "QML",
        "front": "How does Hybrid Quantum-Classical optimization work?",
        "back": "Quantum hardware executes parameterized circuits to evaluate cost function expectation values, while classical optimizers (SPSA, Adam) update parameters.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "QML",
        "front": "What are Barren Plateaus in QML?",
        "back": "Phenomenon where gradient of the cost function vanishes exponentially with circuit size and depth, making optimization intractable.",
        "difficulty": "hard",
        "is_system": True
    },

    # 27. Data Encoding (Quantum Data Encoding: Basis & Amplitude Encoding)
    {
        "category": "Data Encoding",
        "front": "What is Basis Encoding for classical data?",
        "back": "Encodes an n-bit binary string x into a computational basis state |x> (e.g. string '101' -> quantum state |101>).",
        "difficulty": "easy",
        "is_system": True
    },
    {
        "category": "Data Encoding",
        "front": "What is Amplitude Encoding?",
        "back": "Encodes a normalized classical vector x of length 2^n into the 2^n complex amplitudes of an n-qubit state |psi> = Sum x_i |i>.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Data Encoding",
        "front": "What is Angle Encoding?",
        "back": "Encodes classical features x_i as rotation angles in single-qubit rotation gates R_x(x_i), R_y(x_i), or R_z(x_i).",
        "difficulty": "medium",
        "is_system": True
    },

    # 28. Hamiltonian Encoding (Hamiltonian Encoding)
    {
        "category": "Hamiltonian Encoding",
        "front": "What is Hamiltonian Encoding in QML?",
        "back": "Encoding a Hermitian data matrix H into a unitary evolution operator U = e^(-i H t) to manipulate quantum state amplitudes.",
        "difficulty": "hard",
        "is_system": True
    },
    {
        "category": "Hamiltonian Encoding",
        "front": "How is matrix exponentiation e^(-i H t) implemented on quantum hardware?",
        "back": "Via Suzuki-Trotter decomposition, splitting the Hamiltonian sum into product of short-depth elementary gate evolutions.",
        "difficulty": "hard",
        "is_system": True
    },

    # 29. Swap Test (SWAP Test Protocol)
    {
        "category": "Swap Test",
        "front": "What does the SWAP Test measure?",
        "back": "Calculates the inner product overlap |<psi|phi>|^2 (fidelity/similarity) between two unknown quantum states |psi> and |phi>.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Swap Test",
        "front": "What circuit components are required for the SWAP Test?",
        "back": "One ancilla qubit initialized in |0>, Hadamard on ancilla, Controlled-SWAP (Fredkin) gate between the two states, Hadamard on ancilla, and measurement of ancilla.",
        "difficulty": "hard",
        "is_system": True
    },
    {
        "category": "Swap Test",
        "front": "What is the relationship between ancilla state |0> measurement probability P(0) and inner product |<psi|phi>|^2 in SWAP test?",
        "back": "P(0) = 0.5 + 0.5 * |<psi|phi>|^2. If states are identical P(0)=1; if orthogonal P(0)=0.5.",
        "difficulty": "hard",
        "is_system": True
    },

    # 30. Q-Means (Q-means Clustering Algorithm)
    {
        "category": "Q-Means",
        "front": "What is the Q-means Algorithm?",
        "back": "A quantum version of the k-means clustering algorithm that uses quantum distance estimation (SWAP test / amplitude estimation) to assign data vectors to centroids.",
        "difficulty": "hard",
        "is_system": True
    },
    {
        "category": "Q-Means",
        "front": "What speedup does Q-means achieve over classical k-means?",
        "back": "Polylogarithmic speedup in data dimension N: O(k d sqrt(N)) vs classical O(k d N) per iteration.",
        "difficulty": "hard",
        "is_system": True
    },

    # --- QUANTUM COMMUNICATION FLASHCARDS ---
    # 31. Quantum Communication Foundations
    {
        "category": "Quantum Communication Foundations",
        "front": "What is Quantum Superposition?",
        "back": "A qubit's ability to exist in a linear combination alpha|0> + beta|1> of basis states simultaneously until measured.",
        "difficulty": "easy",
        "is_system": True
    },
    {
        "category": "Quantum Communication Foundations",
        "front": "What is Quantum Entanglement?",
        "back": "A correlation between two or more qubits such that their combined state cannot be written as a product of individual single-qubit states.",
        "difficulty": "easy",
        "is_system": True
    },
    {
        "category": "Quantum Communication Foundations",
        "front": "What are the four Bell States?",
        "back": "Maximally entangled two-qubit basis states: |Phi+>, |Phi->, |Psi+>, and |Psi->.",
        "difficulty": "medium",
        "is_system": True
    },

    # 32. No-Cloning Theorem
    {
        "category": "No-Cloning Theorem",
        "front": "What is the No-Cloning Theorem?",
        "back": "It is physically impossible to create an independent, identical copy of an arbitrary unknown quantum state.",
        "difficulty": "easy",
        "is_system": True
    },
    {
        "category": "No-Cloning Theorem",
        "front": "Why does linearity of quantum operations forbid cloning?",
        "back": "Applying a unitary operation linearly to superpositions produces cross-terms that contradict the target product state.",
        "difficulty": "hard",
        "is_system": True
    },
    {
        "category": "No-Cloning Theorem",
        "front": "How does No-Cloning enable Eavesdropping Detection in QKD?",
        "back": "Because an eavesdropper cannot copy unknown qubits secretly, any interception attempt inevitably disturbs the quantum state and reveals their presence.",
        "difficulty": "medium",
        "is_system": True
    },

    # 33. Quantum Teleportation
    {
        "category": "Quantum Teleportation",
        "front": "What is Quantum Teleportation?",
        "back": "A protocol transferring an unknown qubit state to a distant node using a shared Bell pair and 2 classical bits, destroying the original state.",
        "difficulty": "easy",
        "is_system": True
    },
    {
        "category": "Quantum Teleportation",
        "front": "What is a Bell-Basis Measurement?",
        "back": "A joint two-qubit measurement projecting them onto one of four Bell states, yielding 2 classical bits of outcome.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Quantum Teleportation",
        "front": "Why are 2 classical bits required for teleportation?",
        "back": "To inform Bob which of the 4 unitary correction operations (I, X, Z, or XZ) to apply to recover the exact original qubit state.",
        "difficulty": "medium",
        "is_system": True
    },

    # 34. Superdense Coding
    {
        "category": "Superdense Coding",
        "front": "What is Superdense Coding?",
        "back": "A protocol allowing 2 classical bits to be communicated by physically transmitting only 1 qubit over a pre-shared entangled pair.",
        "difficulty": "easy",
        "is_system": True
    },
    {
        "category": "Superdense Coding",
        "front": "What are Alice's 4 encoding operations in Superdense Coding?",
        "back": "I (00), X (01), Z (10), and XZ (11) — applied to her half of the Bell pair before sending it to Bob.",
        "difficulty": "medium",
        "is_system": True
    },

    # 35. BB84 Protocol
    {
        "category": "BB84 Protocol",
        "front": "What is the BB84 Protocol?",
        "back": "The first Quantum Key Distribution protocol (Bennett & Brassard 1984) transmitting single photons randomly encoded in two conjugate bases.",
        "difficulty": "easy",
        "is_system": True
    },
    {
        "category": "BB84 Protocol",
        "front": "What is Basis Sifting in BB84?",
        "back": "The step where Alice and Bob compare their chosen measurement bases over a public classical channel, keeping only matching-basis bits (~50%).",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "BB84 Protocol",
        "front": "What is QBER (Quantum Bit Error Rate)?",
        "back": "The fraction of sifted key bits that disagree between Alice and Bob; an elevated QBER alerts them to eavesdropping.",
        "difficulty": "medium",
        "is_system": True
    },

    # 36. E91 Protocol
    {
        "category": "E91 Protocol",
        "front": "What is the E91 Protocol?",
        "back": "An entanglement-based QKD protocol (Ekert 1991) where Alice and Bob measure shared entangled pairs and verify security via Bell inequality tests.",
        "difficulty": "easy",
        "is_system": True
    },
    {
        "category": "E91 Protocol",
        "front": "What is Monogamy of Entanglement?",
        "back": "The principle that the more entangled two qubits are with each other, the less either can be entangled with any third party (Eve).",
        "difficulty": "medium",
        "is_system": True
    },

    # 37. Quantum Repeaters
    {
        "category": "Quantum Repeaters",
        "front": "What is a Quantum Repeater?",
        "back": "A device extending quantum communication distance by chaining shorter entangled links via entanglement swapping rather than classical signal amplification.",
        "difficulty": "medium",
        "is_system": True
    },
    {
        "category": "Quantum Repeaters",
        "front": "What is Entanglement Swapping?",
        "back": "A procedure where a Bell-basis measurement at an intermediate node entangles two outer nodes that never directly interacted.",
        "difficulty": "hard",
        "is_system": True
    },

    # 38. Quantum Internet
    {
        "category": "Quantum Internet",
        "front": "What is the Quantum Internet?",
        "back": "A network distributing quantum states and entanglement between distant nodes for QKD, distributed sensing, and quantum cloud computing.",
        "difficulty": "easy",
        "is_system": True
    },
    {
        "category": "Quantum Internet",
        "front": "What is Blind Quantum Computing?",
        "back": "A protocol letting a client execute quantum programs on a remote quantum server without revealing inputs, algorithms, or outputs to the server.",
        "difficulty": "medium",
        "is_system": True
    },

    # 39. Satellite QKD
    {
        "category": "Satellite QKD",
        "front": "What is the Micius (QUESS) Satellite?",
        "back": "The world's first dedicated quantum science satellite (launched by China in 2016) demonstrating satellite-to-ground QKD and space teleportation.",
        "difficulty": "easy",
        "is_system": True
    },
    {
        "category": "Satellite QKD",
        "front": "Why do free-space satellites outperform optical fiber for long distance QKD?",
        "back": "Free-space photon propagation through near-vacuum above the atmosphere avoids exponential fiber glass absorption loss.",
        "difficulty": "medium",
        "is_system": True
    },

    # 40. QKD vs PQC
    {
        "category": "QKD vs PQC",
        "front": "What is Post-Quantum Cryptography (PQC)?",
        "back": "Classical cryptographic algorithms (like lattice-based CRYSTALS-Kyber) designed to resist mathematical attacks from quantum computers.",
        "difficulty": "easy",
        "is_system": True
    },
    {
        "category": "QKD vs PQC",
        "front": "How do QKD and PQC differ in security guarantees?",
        "back": "QKD provides physics-based security relying on laws of quantum mechanics, while PQC relies on computational mathematical hardness assumptions.",
        "difficulty": "medium",
        "is_system": True
    }
]

async def seed_flashcards(db: AsyncIOMotorDatabase):
    """Seed system flashcards across all quantum roadmap topics into database."""
    if db is None:
        return
        
    for card in SEED_FLASHCARDS:
        card_copy = dict(card)
        card_copy["created_at"] = datetime.utcnow()
        await db.flashcards.update_one(
            {"front": card["front"]},
            {"$set": card_copy},
            upsert=True
        )
    print(f"System flashcards ({len(SEED_FLASHCARDS)} cards) seeded successfully for all quantum topics!")

