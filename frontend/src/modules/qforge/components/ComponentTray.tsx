import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { COMPONENTS } from '../constants/components';
import type { ComponentSpec } from '../constants/components';
import type { PlacedComponent } from '../hooks/useBuildState';
import type { StageId } from '../constants/stages';

interface ComponentTrayProps {
  onPlace: (component: PlacedComponent) => void;
  onInspect: (spec: ComponentSpec) => void;
  currentStep: string;
}

export const ComponentTray: React.FC<ComponentTrayProps> = ({ onPlace, onInspect, currentStep }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [selectedStages, setSelectedStages] = React.useState<Record<string, StageId>>({});
  const [selectedLines, setSelectedLines] = React.useState<Record<string, 'drive' | 'readout'>>({});

  return (
    <div>
      <h2 className={cn("text-lg font-semibold mb-1", isDark ? "text-zinc-100" : "text-zinc-900")}>
        Component Catalog
      </h2>
      <p className={cn("text-xs mb-4", isDark ? "text-zinc-400" : "text-zinc-500")}>
        Click info to inspect specs, or select stage & line to install.
      </p>
      
      <div className="space-y-3">
        {COMPONENTS.map(comp => {
          const currentStage = selectedStages[comp.id] || comp.validStages[0];
          const currentLine = selectedLines[comp.id] || (comp.kind === 'attenuator' ? 'drive' : 'readout');

          return (
            <div 
              key={comp.id} 
              className={cn(
                "p-3 border rounded-xl transition-all shadow-sm",
                isDark 
                  ? "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700" 
                  : "bg-white border-zinc-200 hover:border-zinc-300"
              )}
            >
              <div className="flex justify-between items-start">
                <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{comp.name}</h3>
                <button 
                  onClick={() => onInspect(comp)}
                  className={cn(
                    "text-xs px-2 py-0.5 rounded transition-colors font-medium",
                    isDark 
                      ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200" 
                      : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                  )}
                  title="Inspect Component Specs"
                >
                  ℹ Details
                </button>
              </div>
              
              <p className={cn("text-xs mt-1 line-clamp-2", isDark ? "text-zinc-400" : "text-zinc-600")}>
                {comp.description}
              </p>
              
              {/* Controls for Stage and Line Selection */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className={cn("text-[10px] block mb-1 font-medium", isDark ? "text-zinc-400" : "text-zinc-500")}>
                    Target Stage
                  </label>
                  <select 
                    value={currentStage}
                    onChange={(e) => setSelectedStages(prev => ({ ...prev, [comp.id]: e.target.value as StageId }))}
                    className={cn(
                      "w-full border rounded px-1.5 py-1 text-xs outline-none",
                      isDark 
                        ? "bg-zinc-950 border-zinc-800 text-zinc-200" 
                        : "bg-zinc-50 border-zinc-200 text-zinc-800"
                    )}
                  >
                    {comp.validStages.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={cn("text-[10px] block mb-1 font-medium", isDark ? "text-zinc-400" : "text-zinc-500")}>
                    Line
                  </label>
                  <select 
                    value={currentLine}
                    onChange={(e) => setSelectedLines(prev => ({ ...prev, [comp.id]: e.target.value as 'drive' | 'readout' }))}
                    className={cn(
                      "w-full border rounded px-1.5 py-1 text-xs outline-none",
                      isDark 
                        ? "bg-zinc-950 border-zinc-800 text-zinc-200" 
                        : "bg-zinc-50 border-zinc-200 text-zinc-800"
                    )}
                  >
                    <option value="drive">Drive Line</option>
                    <option value="readout">Readout Line</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={() => onPlace({
                  id: Math.random().toString(36).substr(2, 9),
                  componentId: comp.id,
                  stageId: currentStage,
                  line: currentLine
                })}
                className="mt-3 w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 shadow-sm"
              >
                <span>+</span> Install to Cryostat
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
