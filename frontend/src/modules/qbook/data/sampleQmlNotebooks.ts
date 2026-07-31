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
        content: `# Quantum Support Vector Classifier (QSVC)\nThis notebook demonstrates mapping classical data into a high-dimensional quantum Hilbert space and computing a Quantum Kernel matrix using Statevector overlaps for classification with Scikit-Learn.`
      },
      {
        type: 'code',
        content: `import numpy as np
from sklearn.datasets import make_circles
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC
from qiskit.circuit.library import ZZFeatureMap
from qiskit.quantum_info import Statevector

# 1. Generate a non-linear dataset (Concentric Circles)
X, y = make_circles(n_samples=40, noise=0.05, factor=0.3, random_state=42)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)

# 2. Quantum Feature Map (Encodes 2D classical data into a quantum Hilbert space)
feature_dimension = 2
feature_map = ZZFeatureMap(feature_dimension=feature_dimension, reps=2)
print("Quantum Feature Map (ZZFeatureMap):")
print(feature_map.draw())

# 3. Compute Quantum Kernel Matrix via Statevector Overlaps: |<psi_i|psi_j>|^2
def compute_quantum_kernel(X1, X2):
    states1 = [Statevector(feature_map.assign_parameters(x)) for x in X1]
    states2 = [Statevector(feature_map.assign_parameters(x)) for x in X2]
    
    kernel_matrix = np.zeros((len(X1), len(X2)))
    for i, s1 in enumerate(states1):
        for j, s2 in enumerate(states2):
            # Compute quantum state fidelity
            kernel_matrix[i, j] = abs(s1.inner(s2)) ** 2
    return kernel_matrix

print("\\nComputing Quantum Kernel Matrix...")
K_train = compute_quantum_kernel(X_train, X_train)

# 4. Train Scikit-Learn Support Vector Classifier using the precomputed Quantum Kernel
qsvc = SVC(kernel='precomputed')
print("Training QSVC...")
qsvc.fit(K_train, y_train)

# 5. Evaluate Accuracy on test data
K_test = compute_quantum_kernel(X_test, X_train)
score = qsvc.score(K_test, y_test)
print(f"\\nQSVC Classification Accuracy: {score * 100:.1f}%")`
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
        content: '# Estimator Quantum Neural Network (QNN)\\nUsing pure Qiskit to create a parameterized quantum circuit and optimizing its parameters (weights) via scipy, simulating a neural network training loop.'
      },
      {
        type: 'code',
        content: `import numpy as np
from qiskit.circuit.library import RealAmplitudes, ZZFeatureMap
from qiskit.quantum_info import SparsePauliOp
from qiskit.primitives import StatevectorEstimator as Estimator
from scipy.optimize import minimize

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
estimator = Estimator()

# 3. Define the objective function for the QNN
target_val = 1.0
input_data = np.array([0.5, 0.8])

def cost_function(weights):
    param_vals = list(input_data) + list(weights)
    result = estimator.run([(qc, observable, param_vals)]).result()
    expectation_value = result[0].data.evs
    return (expectation_value - target_val) ** 2

# 4. Train the QNN (Find optimal weights)
initial_weights = np.random.rand(ansatz.num_parameters)
print(f"\\nInput Features: {input_data}")
print(f"Target Output: {target_val}")
print(f"Initial Weights: {initial_weights}")

print("\\nTraining QNN with COBYLA...")
opt_result = minimize(cost_function, initial_weights, method="COBYLA", options={'maxiter': 20})

print(f"\\nOptimization Success: {opt_result.success}")
print(f"Final Cost: {opt_result.fun:.4f}")

# 5. Forward Pass with optimized weights
param_vals = list(input_data) + list(opt_result.x)
final_val = estimator.run([(qc, observable, param_vals)]).result()[0].data.evs
print(f"QNN Forward Output (Expectation Value): {final_val:.4f}")`
      }
    ]
  },
  {
    id: 'pennylane-basics',
    title: 'Pure Qiskit Variational Circuit',
    description: 'Build and optimize a differentiable variational quantum circuit using Qiskit and SciPy.',
    tags: ['Variational', 'Optimization', 'Qiskit'],
    cells: [
      {
        type: 'markdown',
        content: `# Pure Qiskit Variational Circuit\nThis notebook demonstrates how to build parameterized quantum circuits and optimize them with classical optimizers (like SciPy) using Qiskit Statevector expectation values.`
      },
      {
        type: 'code',
        content: `import numpy as np
from qiskit import QuantumCircuit
from qiskit.circuit import ParameterVector
from qiskit.quantum_info import SparsePauliOp, Statevector
from scipy.optimize import minimize

# 1. Define a parameterized Quantum Circuit (Ansatz)
num_qubits = 2
qc = QuantumCircuit(num_qubits)
params = ParameterVector('θ', 2)

qc.rx(params[0], 0)
qc.ry(params[1], 1)
qc.cx(0, 1)

print("Parameterized Quantum Circuit:")
print(qc.draw())

# 2. Define the Observable (e.g., Pauli Z on Qubit 0)
observable = SparsePauliOp.from_list([("ZI", 1.0)])

# 3. Define the Cost Function using Statevector expectation value
def cost_function(param_values):
    # Bind parameters to the circuit and convert to Statevector
    state = Statevector(qc.assign_parameters(param_values))
    # Expectation value: <state|observable|state>
    expectation_val = state.expectation_value(observable).real
    return expectation_val

# 4. Optimize the Circuit using SciPy (COBYLA)
init_params = np.array([0.1, 0.2])
print("\\nStarting Optimization (Minimizing Expectation Value)...")

history = []
def callback(x):
    history.append(cost_function(x))

opt_result = minimize(cost_function, init_params, method="COBYLA", callback=callback, options={'maxiter': 20})

for i, cost_val in enumerate(history):
    if i % 5 == 0:
        print(f"Step {i+1} - Cost: {cost_val:.4f}")

print(f"\\nOptimization Success: {opt_result.success}")
print(f"Final Optimized Parameters: {opt_result.x}")
print(f"Minimum Expectation Value: {opt_result.fun:.4f}")`
      }
    ]
  },
  {
    id: 'simple-vqe',
    title: 'VQE with Qiskit Primitives',
    description: 'A pure Qiskit implementation of Variational Quantum Eigensolver (VQE) using Qiskit Estimator Primitive.',
    tags: ['VQE', 'Variational Algorithms', 'Qiskit Core'],
    cells: [
      {
        type: 'markdown',
        content: `# Simplified Variational Quantum Eigensolver (VQE)\nThis notebook demonstrates how to find the ground state energy (minimum eigenvalue) of a Hamiltonian using Qiskit Estimator Primitive and SciPy.`
      },
      {
        type: 'code',
        content: `import numpy as np
from qiskit import QuantumCircuit
from qiskit.circuit import Parameter
from qiskit.quantum_info import SparsePauliOp
from qiskit.primitives import StatevectorEstimator as Estimator
from scipy.optimize import minimize

# 1. Define Hamiltonian / Observable (e.g. ZI + IX)
observable = SparsePauliOp(["ZI", "IX"], coeffs=[1.0, 1.0])

# 2. Define a parameterized ansatz circuit
theta_0 = Parameter('θ0')
theta_1 = Parameter('θ1')
ansatz = QuantumCircuit(2)
ansatz.ry(theta_0, 0)
ansatz.rx(theta_1, 1)
ansatz.cx(0, 1)

print("Ansatz Circuit:")
print(ansatz.draw())

# 3. Initialize Qiskit Estimator Primitive
estimator = Estimator()

# 4. Define the VQE Energy Cost Function using Estimator Primitive
def vqe_cost(params):
    # Pass Pub (ansatz, observable, parameter_values) to Estimator
    job = estimator.run([(ansatz, observable, params)])
    result = job.result()
    # Extract expectation value
    return float(result[0].data.evs)

# 5. Run Classical Optimizer (SciPy COBYLA)
initial_params = np.array([0.0, 0.0])
print("\\nRunning VQE Optimization with Qiskit Estimator Primitive...")
result = minimize(vqe_cost, initial_params, method='COBYLA', options={'maxiter': 20})

print(f"\\nOptimization Success: {result.success}")
print(f"Optimized Ground State Energy: {result.fun:.4f}")
print(f"Optimal Parameters: {result.x}")`
      }
    ]
  }
];
