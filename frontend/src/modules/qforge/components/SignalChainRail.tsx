import React from 'react';
import type { PlacedComponent } from '../hooks/useBuildState';
import { COMPONENTS } from '../constants/components';

interface SignalChainRailProps {
  components: PlacedComponent[];
  line: 'drive' | 'readout';
}

export const SignalChainRail: React.FC<SignalChainRailProps> = ({ components, line }) => {
  const lineComponents = components
    .filter(c => c.line === line)
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  return (
    <div className="w-full overflow-x-auto py-4">
      <div className="flex items-center min-w-max space-x-2">
        <div className="px-3 py-1 bg-zinc-800 text-zinc-400 text-xs rounded border border-zinc-700">
          {line === 'drive' ? 'Room Temp (300K)' : 'QPU (10mK)'}
        </div>
        
        {lineComponents.length === 0 && (
          <>
            <div className="w-8 border-b border-zinc-700 border-dashed"></div>
            <div className="text-zinc-500 text-sm italic">Empty Line</div>
          </>
        )}

        {lineComponents.map((pc, index) => {
          const spec = COMPONENTS.find(c => c.id === pc.componentId);
          return (
            <React.Fragment key={pc.id}>
              <div className="w-8 border-b-2 border-emerald-900"></div>
              <div className="px-3 py-2 bg-zinc-900 border border-emerald-800 rounded shadow text-center">
                <div className="text-sm font-medium text-emerald-400">{spec?.name}</div>
                <div className="text-[10px] text-zinc-500 mt-1">{pc.stageId} Stage</div>
              </div>
            </React.Fragment>
          );
        })}

        <div className="w-8 border-b-2 border-emerald-900"></div>
        <div className="px-3 py-1 bg-zinc-800 text-zinc-400 text-xs rounded border border-zinc-700">
          {line === 'drive' ? 'QPU (10mK)' : 'Room Temp (300K)'}
        </div>
      </div>
    </div>
  );
};
