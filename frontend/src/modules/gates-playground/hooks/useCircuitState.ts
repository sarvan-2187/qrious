import { useState } from 'react';

export interface GateInstance {
  id: string; // unique id (e.g., from uuid)
  name: string; // Gate name (H, X, CNOT, etc.)
  target: number; // Qubit index (0 to numQubits-1)
  control?: number; // Control qubit index if applicable
  step: number; // Time step index (horizontal position)
  params?: number[]; // Parameters like phase angles (e.g., [pi/2])
}

export const useCircuitState = (initialQubits: number = 3) => {
  const [qubits, setQubits] = useState(initialQubits);
  const [cbits, setCbits] = useState(initialQubits);
  const [gates, setGates] = useState<GateInstance[]>([]);
  const [qasm, setQasm] = useState<string>('');

  const [history, setHistory] = useState<{gates: GateInstance[], qubits: number, cbits: number, qasm: string}[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const commitHistory = (newGates: GateInstance[], newQubits: number, newCbits: number, newQasm: string) => {
    setHistory(prev => {
      const next = prev.slice(0, historyIndex + 1);
      return [...next, { gates: newGates, qubits: newQubits, cbits: newCbits, qasm: newQasm }];
    });
    setHistoryIndex(prev => prev + 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setGates(prev.gates);
      setQubits(prev.qubits);
      setCbits(prev.cbits);
      setQasm(prev.qasm);
      return prev;
    }
    return null;
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setGates(next.gates);
      setQubits(next.qubits);
      setCbits(next.cbits);
      setQasm(next.qasm);
      return next;
    }
    return null;
  };

  const addGate = (gate: GateInstance) => {
    setGates((prev) => {
      const next = [...prev, gate];
      commitHistory(next, qubits, cbits, qasm);
      return next;
    });
  };

  const removeGate = (id: string) => {
    setGates(current => {
      const next = current.filter(g => g.id !== id);
      commitHistory(next, qubits, cbits, qasm);
      return next;
    });
  };

  const updateGate = (id: string, updates: Partial<GateInstance>) => {
    setGates((prev) => {
      const next = prev.map((g) => g.id === id ? { ...g, ...updates } : g);
      commitHistory(next, qubits, cbits, qasm);
      return next;
    });
  };
  
  const expandMacroGate = (id: string) => {
    setGates(current => {
      const gateIndex = current.findIndex(g => g.id === id);
      if (gateIndex === -1) return current;
      
      const macroGate = current[gateIndex];
      if (macroGate.name !== 'QFT' && macroGate.name !== 'IQFT') return current;
      
      const newGates = current.filter(g => g.id !== id);
      const isInverse = macroGate.name === 'IQFT';
      
      let stepOffset = 0;
      const qftGates: GateInstance[] = [];
      const sign = isInverse ? -1 : 1;
      
      if (!isInverse) {
        for (let i = qubits - 1; i >= 0; i--) {
          qftGates.push({ id: crypto.randomUUID(), name: 'H', target: i, step: macroGate.step + stepOffset++ });
          for (let j = i - 1; j >= 0; j--) {
            const angle = sign * Math.PI / Math.pow(2, i - j);
            qftGates.push({ id: crypto.randomUUID(), name: 'CP', target: i, control: j, params: [angle], step: macroGate.step + stepOffset++ });
          }
        }
        for (let i = 0; i < Math.floor(qubits / 2); i++) {
          qftGates.push({ id: crypto.randomUUID(), name: 'SWAP', target: i, control: qubits - 1 - i, step: macroGate.step + stepOffset++ });
        }
      } else {
        for (let i = 0; i < Math.floor(qubits / 2); i++) {
          qftGates.push({ id: crypto.randomUUID(), name: 'SWAP', target: i, control: qubits - 1 - i, step: macroGate.step + stepOffset++ });
        }
        for (let i = 0; i < qubits; i++) {
          for (let j = 0; j < i; j++) {
            const angle = sign * Math.PI / Math.pow(2, i - j);
            qftGates.push({ id: crypto.randomUUID(), name: 'CP', target: i, control: j, params: [angle], step: macroGate.step + stepOffset++ });
          }
          qftGates.push({ id: crypto.randomUUID(), name: 'H', target: i, step: macroGate.step + stepOffset++ });
        }
      }
      
      const shiftedGates = newGates.map(g => {
        if (g.step > macroGate.step) {
          return { ...g, step: g.step + stepOffset - 1 };
        }
        return g;
      });
      
      const next = [...shiftedGates, ...qftGates];
      commitHistory(next, qubits, cbits, qasm);
      return next;
    });
  };

  const updateQasm = (newQasm: string) => {
    setQasm(newQasm);
  };

  return { qubits, setQubits, cbits, setCbits, gates, setGates, addGate, removeGate, updateGate, expandMacroGate, qasm, updateQasm, commitHistory, undo, redo, history, historyIndex, setHistory, setHistoryIndex };
};
