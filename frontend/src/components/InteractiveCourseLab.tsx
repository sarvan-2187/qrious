import React from 'react';
import { GatesPlayground } from '@/modules/gates-playground/components/GatesPlayground';

interface Props {
  initialCircuitQasm?: string;
  taskInstructions?: string;
  targetState?: string;
}

export const InteractiveCourseLab: React.FC<Props> = ({
  taskInstructions = "Build and execute the required quantum circuit using the interactive gate tray below to inspect measurement results and statevector amplitudes.",
  initialCircuitQasm
}) => {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="p-4 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-xl shadow-sm">
        <h4 className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
          Interactive Quantum Lab Task
        </h4>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{taskInstructions}</p>
      </div>
      <div className="w-full rounded-2xl overflow-hidden border border-border bg-qp-bg shadow-2xl">
        {/* Embedded Gates Playground */}
        <GatesPlayground initialQasm={initialCircuitQasm} isEmbedded={true} />
      </div>
    </div>
  );
};

export default InteractiveCourseLab;
