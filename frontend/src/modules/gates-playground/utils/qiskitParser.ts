import { v4 as uuidv4 } from 'uuid';
import type { GateInstance } from '../hooks/useCircuitState';

export const gatesToQiskit = (gates: GateInstance[], numQubits: number, numCbits: number): string => {
  let py = `from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister\n`;
  py += `from qiskit_aer import AerSimulator\n\n`;
  py += `# Create registers\n`;
  py += `q = QuantumRegister(${numQubits}, 'q')\n`;
  py += `c = ClassicalRegister(${numCbits}, 'c')\n`;
  py += `qc = QuantumCircuit(q, c)\n\n`;
  py += `# Build circuit\n`;

  // Sort gates by step to ensure correct execution order, filtering out-of-bounds gates
  const sortedGates = [...gates]
    .filter(g => g.target < numQubits && (g.control === undefined || g.control < numQubits))
    .sort((a, b) => a.step - b.step);

  sortedGates.forEach(gate => {
    const gName = gate.name.toLowerCase();
    
    let paramsStr = '';
    if (gate.params && gate.params.length > 0) {
      paramsStr = gate.params.map(p => Number(p).toString()).join(', ');
    }

    if (gName === 'barrier') {
      py += `qc.barrier()\n`;
    } else if (gName === 'reset') {
      py += `qc.reset(q[${gate.target}])\n`;
    } else if (gName === 'measure') {
      py += `qc.measure(q[${gate.target}], c[${Math.min(gate.target, numCbits - 1)}])\n`;
    } else if (gName === 'cnot' || gName === 'cx' || gName === 'ctrl') {
      if (gate.control !== undefined) {
        py += `qc.cx(q[${gate.control}], q[${gate.target}])\n`;
      }
    } else if (gName === 'cz') {
      if (gate.control !== undefined) {
        py += `qc.cz(q[${gate.control}], q[${gate.target}])\n`;
      }
    } else if (gName === 'cy') {
      if (gate.control !== undefined) {
        py += `qc.cy(q[${gate.control}], q[${gate.target}])\n`;
      }
    } else if (gName === 'cp' || gName === 'cu1') {
      if (gate.control !== undefined) {
        py += `qc.cp(${paramsStr || '0'}, q[${gate.control}], q[${gate.target}])\n`;
      }
    } else if (gName === 'swap') {
      if (gate.control !== undefined) {
        py += `qc.swap(q[${gate.control}], q[${gate.target}])\n`;
      }
    } else if (['rx', 'ry', 'rz', 'p', 'u', 'u1', 'u2', 'u3'].includes(gName)) {
      py += `qc.${gName}(${paramsStr || '0'}, q[${gate.target}])\n`;
    } else if (['h', 'x', 'y', 'z', 's', 'sdg', 't', 'tdg', 'id', 'i'].includes(gName)) {
      const fn = gName === 'i' ? 'id' : gName;
      py += `qc.${fn}(q[${gate.target}])\n`;
    } else if (gName === 'qft') {
      py += `# QFT applied to circuit\n`;
    } else if (gate.control !== undefined) {
      const argStr = paramsStr ? `${paramsStr}, ` : '';
      py += `qc.${gName}(${argStr}q[${gate.control}], q[${gate.target}])\n`;
    } else {
      const argStr = paramsStr ? `${paramsStr}, ` : '';
      py += `qc.${gName}(${argStr}q[${gate.target}])\n`;
    }
  });

  py += `\n# Run simulation\n`;
  py += `simulator = AerSimulator()\n`;
  py += `qc_sim = qc.copy()\n`;
  py += `if not any(inst.operation.name == 'measure' for inst in qc_sim.data):\n`;
  py += `    qc_sim.measure_all()\n`;
  py += `result = simulator.run(qc_sim, shots=1024).result()\n`;
  py += `counts = result.get_counts()\n`;
  py += `print(counts)\n`;

  return py;
};

export const qiskitToGates = (code: string): { gates: GateInstance[], numQubits: number, numCbits: number } => {
  const gates: GateInstance[] = [];
  let numQubits = 3;
  let numCbits = 3;

  // Extract qubit and cbit counts from QuantumCircuit or QuantumRegister
  const qcMatch = code.match(/QuantumCircuit\s*\(\s*(?:q,\s*c|(\d+)\s*,\s*(\d+)|(\d+))/);
  if (qcMatch) {
    if (qcMatch[1]) {
      numQubits = parseInt(qcMatch[1], 10);
      numCbits = qcMatch[2] ? parseInt(qcMatch[2], 10) : numQubits;
    } else if (qcMatch[3]) {
      numQubits = parseInt(qcMatch[3], 10);
      numCbits = numQubits;
    }
  }

  const qRegMatch = code.match(/QuantumRegister\s*\(\s*(\d+)/);
  if (qRegMatch) {
    numQubits = parseInt(qRegMatch[1], 10);
  }
  const cRegMatch = code.match(/ClassicalRegister\s*\(\s*(\d+)/);
  if (cRegMatch) {
    numCbits = parseInt(cRegMatch[1], 10);
  }

  const lines = code.split('\n');
  let currentStep = 0;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed.includes('.')) return;

    // Match qc.gate(args...)
    const gateMatch = trimmed.match(/^(?:\w+)\.(\w+)\s*\((.*?)\)/);
    if (!gateMatch) return;

    const op = gateMatch[1].toLowerCase();
    const argsStr = gateMatch[2];

    if (['run', 'get_counts', 'append', 'bind_parameters', 'assign_parameters'].includes(op)) return;

    if (op === 'barrier') {
      gates.push({ id: uuidv4(), name: 'BARRIER', target: 0, step: currentStep++ });
      return;
    }

    // Parse arguments: parameters vs qubits/cbits
    const tokens = argsStr.split(',').map(t => t.trim()).filter(Boolean);
    const params: number[] = [];
    const bitIndices: number[] = [];

    tokens.forEach(tok => {
      // Extract integer from q[0], c[0], or plain number if used as qubit index
      const bitMatch = tok.match(/(?:q|c)?\s*\[\s*(\d+)\s*\]/);
      if (bitMatch) {
        bitIndices.push(parseInt(bitMatch[1], 10));
      } else {
        const num = Number(tok);
        if (!isNaN(num)) {
          // If gate takes parameters (like rx, cp), first float/numbers are params
          if (['rx', 'ry', 'rz', 'p', 'u', 'u1', 'u2', 'u3', 'cp', 'cu1'].includes(op) && params.length < (op === 'u' ? 3 : op === 'cp' || op === 'cu1' ? 1 : 1)) {
            params.push(num);
          } else {
            bitIndices.push(num);
          }
        }
      }
    });

    if (op === 'measure') {
      const target = bitIndices[0] !== undefined ? bitIndices[0] : 0;
      if (target >= numQubits) numQubits = target + 1;
      if (target >= numCbits) numCbits = target + 1;
      gates.push({ id: uuidv4(), name: 'MEASURE', target, step: currentStep++ });
      return;
    }

    if (op === 'reset') {
      const target = bitIndices[0] !== undefined ? bitIndices[0] : 0;
      if (target >= numQubits) numQubits = target + 1;
      gates.push({ id: uuidv4(), name: 'RESET', target, step: currentStep++ });
      return;
    }

    // Map gate names
    let name = op.toUpperCase();
    if (op === 'cx' || op === 'cnot') name = 'CNOT';
    if (op === 'id' || op === 'i') name = 'ID';

    if (bitIndices.length >= 2) {
      const control = bitIndices[0];
      const target = bitIndices[1];
      if (control >= numQubits) numQubits = control + 1;
      if (target >= numQubits) numQubits = target + 1;
      const newGate: GateInstance = { id: uuidv4(), name, control, target, step: currentStep++ };
      if (params.length > 0) newGate.params = params;
      gates.push(newGate);
    } else if (bitIndices.length === 1) {
      const target = bitIndices[0];
      if (target >= numQubits) numQubits = target + 1;
      const newGate: GateInstance = { id: uuidv4(), name, target, step: currentStep++ };
      if (params.length > 0) newGate.params = params;
      gates.push(newGate);
    }
  });

  return { gates, numQubits, numCbits };
};
