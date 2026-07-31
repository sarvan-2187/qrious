export interface QmlNotebookTemplate {
  id: string;
  title: string;
  description: string;
  tags: string[];
  cells: Array<{
    type: 'markdown' | 'code';
    content: string;
  }>;
}

export const SAMPLE_QML_NOTEBOOKS: QmlNotebookTemplate[] = [
  {
    id: 'qsvc-classification',
    title: 'Quantum Support Vector Classifier (QSVC)',
    description: 'Classify non-linear datasets using a Quantum Kernel Estimator.',
    tags: ['QSVC', 'Machine Learning', 'Qiskit ML'],
    cells: [
      {
        type: 'markdown',
        content: '# Quantum Support Vector Classifier (QSVC)\nThis notebook demonstrates mapping classical data into a high-dimensional quantum Hilbert space using Qiskit Machine Learning and Scikit-Learn.'
      },
      {
        type: 'code',
        content: `import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import make_adaboost
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC
from qiskit.circuit.library import ZZFeatureMap
from qiskit.primitives import Sampler
from qiskit_machine_learning.algorithms import QSVC
from qiskit_machine_learning.kernels import FidelityQuantumKernel

# 1. Generate a toy classification dataset
X, y = make_adaboost(n_samples=40, n_features=2, random_state=42)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 2. Define the Quantum Feature Map
feature_map = ZZFeatureMap(feature_dimension=2, reps=2)
print("Quantum Feature Map (ZZFeatureMap):")
print(feature_map.draw())

# 3. Create the Quantum Kernel
qkernel = FidelityQuantumKernel(feature_map=feature_map)

# 4. Train the Quantum Support Vector Classifier
qsvc = QSVC(quantum_kernel=qkernel)
print("\\nTraining QSVC...")
qsvc.fit(X_train, y_train)

# 5. Evaluate the model
score = qsvc.score(X_test, y_test)
print(f"QSVC Classification Accuracy: {score * 100:.1f}%")`
      }
    ]
  },
  {
    id: 'qnn-regression',
    title: 'Quantum Neural Network (QNN)',
    description: 'Build a parameterized quantum neural network using Qiskit ML.',
    tags: ['QNN', 'Neural Networks', 'Qiskit ML'],
    cells: [
      {
        type: 'markdown',
        content: '# Estimator Quantum Neural Network (QNN)\nUsing Qiskit Machine Learning to create a parameterized quantum circuit that can be trained like a standard neural network layer.'
      },
      {
        type: 'code',
        content: `import numpy as np
from qiskit.circuit.library import RealAmplitudes, ZZFeatureMap
from qiskit.quantum_info import SparsePauliOp
from qiskit_machine_learning.neural_networks import EstimatorQNN

# 1. Define network structure
num_qubits = 2
feature_map = ZZFeatureMap(feature_dimension=num_qubits, reps=1)
ansatz = RealAmplitudes(num_qubits, reps=1)

# Combine into a single quantum circuit
qc = feature_map.compose(ansatz)
print("QNN Circuit Architecture:")
print(qc.draw())

# 2. Define an observable (e.g., Z on the first qubit)
observable = SparsePauliOp.from_list([("Z" + "I" * (num_qubits - 1), 1)])

# 3. Initialize the QNN
qnn = EstimatorQNN(
    circuit=qc,
    observables=observable,
    input_params=feature_map.parameters,
    weight_params=ansatz.parameters
)

# 4. Forward Pass (Predict)
# Random input data (batch size of 1)
input_data = np.random.rand(qnn.num_inputs)
# Random initial weights
weights = np.random.rand(qnn.num_weights)

# Evaluate QNN
output = qnn.forward(input_data, weights)
print(f"\\nInput Features: {input_data}")
print(f"Initial Weights: {weights}")
print(f"QNN Forward Output (Expectation Value): {output[0][0]:.4f}")`
      }
    ]
  },
  {
    id: 'pennylane-basics',
    title: 'PennyLane Variational Circuit',
    description: 'Use PennyLane and Qiskit-Aer to build a differentiable quantum circuit.',
    tags: ['PennyLane', 'Variational', 'Cross-Platform'],
    cells: [
      {
        type: 'markdown',
        content: '# PennyLane on Qiskit Aer\nThis notebook demonstrates how to use `pennylane` for differentiable quantum programming, executing on a `qiskit.aer` backend.'
      },
      {
        type: 'code',
        content: `import pennylane as qml
import numpy as np

# 1. Initialize a PennyLane device backed by Qiskit Aer
dev = qml.device('qiskit.aer', wires=2)

# 2. Define a QNode (a quantum function executed on the device)
@qml.qnode(dev)
def circuit(params):
    qml.RX(params[0], wires=0)
    qml.RY(params[1], wires=1)
    qml.CNOT(wires=[0, 1])
    return qml.expval(qml.PauliZ(1))

# 3. Define a cost function
def cost(params):
    return circuit(params)

# 4. Initialize parameters and optimizer
init_params = np.array([0.1, 0.2], requires_grad=True)
opt = qml.GradientDescentOptimizer(stepsize=0.4)

# 5. Optimize the circuit (train it to minimize the expectation value)
params = init_params
print("Starting Optimization...")
for i in range(5):
    params, cost_val = opt.step_and_cost(cost, params)
    print(f"Step {i+1} - Cost: {cost_val:.4f}, Params: {params}")

print(f"\\nFinal optimized parameters: {params}")`
      }
    ]
  },
  {
    id: 'simple-vqe',
    title: 'VQE with Qiskit Primitives',
    description: 'A pure Qiskit implementation of VQE without requiring external chemistry packages.',
    tags: ['VQE', 'Variational Algorithms', 'Qiskit Core'],
    cells: [
      {
        type: 'markdown',
        content: '# Simplified Variational Quantum Eigensolver (VQE)\nThis notebook demonstrates how to find the minimum eigenvalue of a simple observable using Qiskit Estimator and SciPy, without needing Qiskit Nature.'
      },
      {
        type: 'code',
        content: `from qiskit import QuantumCircuit
from qiskit.quantum_info import SparsePauliOp
from qiskit.primitives import Estimator
from scipy.optimize import minimize
import numpy as np

# 1. Define a simple observable (Hamiltonian)
observable = SparsePauliOp(["ZI", "IX"], coeffs=[1.0, 1.0])

# 2. Define a parameterized ansatz circuit
ansatz = QuantumCircuit(2)
ansatz.ry(theta=0, qubit=0)  # We will parameterize this
ansatz.rx(theta=0, qubit=1)
ansatz.cx(0, 1)

# Function to update the circuit parameters
def create_circuit(params):
    qc = QuantumCircuit(2)
    qc.ry(params[0], 0)
    qc.rx(params[1], 1)
    qc.cx(0, 1)
    return qc

estimator = Estimator()

# 3. Define the objective function to minimize
def cost_function(params):
    qc = create_circuit(params)
    job = estimator.run(qc, observable)
    result = job.result()
    return result.values[0]

# 4. Run the classical optimizer (SciPy)
initial_guess = np.array([0.0, 0.0])
print("Starting VQE Optimization...")

res = minimize(cost_function, initial_guess, method='COBYLA', options={'maxiter': 100})

print("\\nOptimization complete!")
print(f"Optimal Parameters: {res.x}")
print(f"Minimum Eigenvalue (Energy): {res.fun:.4f}")`
      }
    ]
  }
];
