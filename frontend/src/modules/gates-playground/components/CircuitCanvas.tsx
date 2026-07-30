import React, { useState } from 'react';
import type { GateInstance } from '../hooks/useCircuitState';
import { QubitRail } from './QubitRail';

interface CircuitCanvasProps {
  qubits: number;
  cbits: number;
  gates: GateInstance[];
  addGate: (gate: GateInstance) => void;
  updateGate: (id: string, updates: Partial<GateInstance>) => void;
  removeGate: (id: string) => void;
  expandMacroGate?: (id: string) => void;
  // rendering a past job's circuit) — the gate grid itself is unchanged,
  // so it stays visually identical to the interactive composer, just
  // without affordances to edit a circuit nothing will save.
  readOnly?: boolean;
  selectedGateToPlace?: string | null;
  onPlaceGate?: (name: string, qubitIndex: number, stepIndex: number) => void;
}

export const CircuitCanvas: React.FC<CircuitCanvasProps> = ({ qubits, cbits, gates, updateGate, removeGate, expandMacroGate, readOnly = false, selectedGateToPlace, onPlaceGate }) => {
  const steps = 10; // Fixed number of steps for now
  const [editingGateId, setEditingGateId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 relative z-10 flex flex-col p-6 min-h-0">
        <div className="flex justify-between items-center mb-8">
            <h3 className="text-[11px] font-mono uppercase tracking-widest text-qp-text-muted">
              Circuit Canvas
            </h3>
          </div>
          
          <div className="min-w-max flex-1 overflow-x-auto overflow-y-visible custom-scrollbar pr-8 pb-8">
            {Array.from({ length: qubits }).map((_, idx) => (
              <QubitRail 
                key={idx} 
                qubitIndex={idx}
                qubits={qubits}
                steps={steps} 
                gates={gates} 
                updateGate={updateGate}
                removeGate={(id) => { removeGate(id); setEditingGateId(null); }}
                expandMacroGate={expandMacroGate}
                editingGateId={editingGateId}
                setEditingGateId={setEditingGateId}
                readOnly={readOnly}
                selectedGateToPlace={selectedGateToPlace}
                onPlaceGate={onPlaceGate}
              />
            ))}
            {/* Classical Bits Rendering */}
            {cbits > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                {Array.from({ length: cbits }).map((_, idx) => (
                  <div key={`cbit-${idx}`} className="flex items-center relative h-10 w-full opacity-60">
                    <div className="w-14 h-8 flex items-center justify-center rounded-md font-mono text-xs shadow-sm z-10 shrink-0 bg-qp-secondary text-qp-text-muted border border-qp-border">
                      c[{idx}]
                    </div>
                    <div className="flex-1 relative flex items-center ml-4 h-full">
                      {/* Single horizontal line for classical bits */}
                      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1px] bg-qp-border z-0"></div>
                      
                      {/* Empty spaces to align with steps */}
                      {Array.from({ length: steps }).map((_, stepIndex) => (
                        <div key={stepIndex} className="w-16 h-16 flex items-center justify-center z-10 relative">
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
      </div>
    </div>
  );
};
