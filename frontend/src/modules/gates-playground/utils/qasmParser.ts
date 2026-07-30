import type { GateInstance } from '../hooks/useCircuitState';

// Standard OpenQASM 2.0 Header
const HEADER = `OPENQASM 2.0;\ninclude "qelib1.inc";\n\n`;

export const gatesToQasm = (gates: GateInstance[], numQubits: number, numCbits: number): string => {
  let qasm = HEADER;
  qasm += `qreg q[${numQubits}];\ncreg c[${numCbits}];\n\n`;

  // Sort gates by step to ensure correct execution order, filtering out-of-bounds gates
  const sortedGates = [...gates]
    .filter(g => g.target < numQubits && (g.control === undefined || g.control < numQubits))
    .sort((a, b) => a.step - b.step);

  sortedGates.forEach(gate => {
    const gName = gate.name.toLowerCase();
    
    // Map internal gate names to QASM names if necessary
    let qasmGate = gName;
    if (gName === 'cnot') qasmGate = 'cx';
    if (gName === 'ctrl') qasmGate = 'cx'; // default to CX for now if user drops CTRL
    
    // Check if it's a parametric gate
    let paramsStr = '';
    if (gate.params && gate.params.length > 0) {
      paramsStr = `(${gate.params.join(',')})`;
    }

    if (gName === 'barrier') {
      qasm += `barrier q;\n`;
    } else if (gName === 'measure') {
      const cbitIndex = Math.min(gate.target, numCbits - 1); // fallback if cbits < qubits
      qasm += `measure q[${gate.target}] -> c[${cbitIndex}];\n`;
    } else if (gName === 'reset') {
      qasm += `reset q[${gate.target}];\n`;
    } else if (gName === 'qft' || gName === 'iqft') {
      qasm += `// ${gName} applied to all qubits\n`;
    } else if (gate.control !== undefined) {
      qasm += `${qasmGate}${paramsStr} q[${gate.control}], q[${gate.target}];\n`;
    } else {
      qasm += `${qasmGate}${paramsStr} q[${gate.target}];\n`;
    }
  });
  
  return qasm;
};

export const qasmToGates = (qasm: string): { gates: GateInstance[], numQubits: number, numCbits: number } => {
  const lines = qasm.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('//'));
  
  let numQubits = 3; // Default
  let numCbits = 3; // Default
  const gates: GateInstance[] = [];
  let currentStep = 0;

  for (const line of lines) {
    if (line.startsWith('qreg')) {
      const match = line.match(/q\[(\d+)\]/);
      if (match) numQubits = parseInt(match[1], 10);
      continue;
    }
    
    if (line.startsWith('creg')) {
      const match = line.match(/c\[(\d+)\]/);
      if (match) numCbits = parseInt(match[1], 10);
      continue;
    }
    
    if (line.startsWith('OPENQASM') || line.startsWith('include')) {
      continue;
    }

    if (line.startsWith('barrier')) {
      gates.push({ id: crypto.randomUUID(), name: 'BARRIER', target: 0, step: currentStep++ });
      continue;
    }

    if (line.startsWith('reset')) {
      const match = line.match(/q\[(\d+)\]/);
      if (match) {
        gates.push({ id: crypto.randomUUID(), name: 'RESET', target: parseInt(match[1], 10), step: currentStep++ });
      }
      continue;
    }

    if (line.startsWith('measure')) {
      const match = line.match(/q\[(\d+)\](?:\s*->\s*c\[(\d+)\])?/);
      if (match) {
        const qIdx = parseInt(match[1], 10);
        const cIdx = match[2] ? parseInt(match[2], 10) : qIdx;
        if (qIdx >= numQubits) numQubits = qIdx + 1;
        if (cIdx >= numCbits) numCbits = cIdx + 1;
        gates.push({ id: crypto.randomUUID(), name: 'MEASURE', target: qIdx, step: currentStep++ });
      }
      continue;
    }

    // Parse gates: e.g. "h q[0];", "rx(1.57) q[0];", "cx q[0], q[1];", "u3(0.5, 0.1, 0.2) q[0];"
    const match = line.match(/^([a-z0-9]+)(?:\s*\(([^)]+)\))?\s+q\[(\d+)\]\s*(?:,\s*q\[(\d+)\])?\s*;/i);
    
    if (match) {
      let gName = match[1].toUpperCase();
      const gateMap: Record<string, string> = {
        'CX': 'CNOT', 'ID': 'I', 'U3': 'U', 'U2': 'U', 'U1': 'U',
        'CP': 'CP', 'CU1': 'CP', 'SWAP': 'SWAP', 'CY': 'CY', 'CZ': 'CZ',
        'SDG': 'SDG', 'TDG': 'TDG', 'CTRL': 'CNOT'
      };
      if (gateMap[gName]) gName = gateMap[gName];
      
      const params = match[2] ? match[2].split(',').map(p => parseFloat(p.trim())) : undefined;
      const target = match[4] ? parseInt(match[4], 10) : parseInt(match[3], 10);
      const control = match[4] ? parseInt(match[3], 10) : undefined;
      
      if (target >= numQubits) numQubits = target + 1;
      if (control !== undefined && control >= numQubits) numQubits = control + 1;
      
      const newGate: GateInstance = {
        id: crypto.randomUUID(),
        name: gName,
        target,
        control,
        step: currentStep++
      };
      
      if (params) {
        newGate.params = params;
      }
      
      gates.push(newGate);
    }
  }

  return { gates, numQubits, numCbits };
};

export { gatesToQiskit, qiskitToGates } from './qiskitParser';
