import React, { useState, useEffect } from 'react';
import { useDebugStepApi } from '../hooks/useDebugStepApi';
import type { DebugStep } from '../hooks/useDebugStepApi';
import type { GateInstance } from '../hooks/useCircuitState';
import { BlochSphereViewer } from './BlochSphereViewer';
import { TimelineScrubber } from './TimelineScrubber';
import { StatevectorTable } from './StatevectorTable';
import { DensityMatrixTable } from './DensityMatrixTable';

interface DebuggerPanelProps {
  qubits: number;
  cbits: number;
  gates: GateInstance[];
}

export const DebuggerPanel: React.FC<DebuggerPanelProps> = ({ qubits, cbits, gates }) => {
  const { fetchDebugSteps, loading, error } = useDebugStepApi();
  const [steps, setSteps] = useState<DebugStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetchDebugSteps(undefined, qubits, cbits, gates);
        if (active) {
          setSteps(res);
          setCurrentStep(0);
          setIsPlaying(false);
        }
      } catch (err) {
        console.error(err);
      }
    };
    
    // Only load if there are gates to debug
    load();
    
    return () => { active = false; };
  }, [qubits, cbits, gates, fetchDebugSteps]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, steps.length]);

  if (loading) {
    return <div className="p-8 text-center text-qp-text-muted animate-pulse">Computing quantum states...</div>;
  }

  if (error) {
    return <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>;
  }

  if (steps.length === 0) {
    return <div className="p-8 text-center text-qp-text-muted">Building initial state...</div>;
  }

  const stepData = steps[currentStep];

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-3">
          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-md text-[11px] uppercase tracking-widest font-mono border border-emerald-500/20">Debug Mode</span>
        </h2>
      </div>
      
      <TimelineScrubber 
        currentStep={currentStep} 
        totalSteps={steps.length - 1} 
        onStepChange={setCurrentStep}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
      />
      
      <div className="flex flex-col gap-6">
        {/* Bloch Spheres Horizontal Row */}
        <div className="flex flex-col gap-3">
          <h3 className="text-[11px] font-mono uppercase tracking-widest ml-1 text-qp-text-muted">Bloch Spheres</h3>
          <div className="flex flex-row overflow-x-auto gap-4 custom-scrollbar pb-2 min-h-[290px]">
            {Array.from({ length: qubits }).map((_, idx) => (
              <div key={idx} className="rounded-2xl border flex flex-col p-3 shadow-xl bg-qp-card border-qp-border min-w-[280px]">
                <BlochSphereViewer 
                  qubitIndex={idx.toString()} 
                  vector={stepData.per_qubit_bloch_vectors[idx.toString()] || { x: 0, y: 0, z: 0 }} 
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="rounded-2xl border flex flex-col overflow-hidden shadow-xl bg-qp-card border-qp-border max-h-[400px]">
             <div className="px-4 py-3 text-[11px] font-mono tracking-widest uppercase border-b bg-qp-secondary border-qp-border text-qp-text-muted shrink-0">
               Statevector
             </div>
             <div className="flex-1 min-h-0 p-4 overflow-y-auto custom-scrollbar">
               <StatevectorTable statevector={stepData.statevector} />
             </div>
           </div>

           <div className="rounded-2xl border flex flex-col overflow-hidden shadow-xl bg-qp-card border-qp-border max-h-[400px]">
             <div className="px-4 py-3 text-[11px] font-mono tracking-widest uppercase border-b bg-qp-secondary border-qp-border text-qp-text-muted shrink-0">
               Density Matrix
             </div>
             <div className="flex-1 min-h-0 p-4 overflow-y-auto custom-scrollbar">
               <DensityMatrixTable densityMatrix={stepData.density_matrix} />
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};
