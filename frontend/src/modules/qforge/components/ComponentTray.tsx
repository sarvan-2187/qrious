import React from 'react';
import { COMPONENTS } from '../constants/components';
import type { PlacedComponent } from '../hooks/useBuildState';

interface ComponentTrayProps {
  onPlace: (component: PlacedComponent) => void;
  currentStep: string;
}

export const ComponentTray: React.FC<ComponentTrayProps> = ({ onPlace, currentStep }) => {
  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-100 mb-4">Components</h2>
      <div className="space-y-3">
        {COMPONENTS.map(comp => (
          <div 
            key={comp.id} 
            className="p-3 bg-zinc-800/80 border border-zinc-700 rounded cursor-pointer hover:border-emerald-500 transition-colors"
            onClick={() => onPlace({
              id: Math.random().toString(36).substr(2, 9),
              componentId: comp.id,
              stageId: comp.validStages[0], // default to first valid stage
              line: 'none'
            })}
          >
            <h3 className="text-sm font-medium text-emerald-300">{comp.name}</h3>
            <p className="text-xs text-zinc-400 mt-1">{comp.description}</p>
            <div className="mt-2 flex gap-1 flex-wrap">
              {comp.validStages.map(stage => (
                <span key={stage} className="px-1.5 py-0.5 bg-zinc-700 rounded text-[10px] text-zinc-300">
                  {stage}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
