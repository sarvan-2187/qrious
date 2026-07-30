import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { Check, X, AlertCircle, Info, Trash2, Copy } from 'lucide-react';
import type { ComponentSpec } from '../constants/components';
import type { StageId } from '../constants/stages';

interface PropertyInspectorProps {
  spec: ComponentSpec;
  initialStage?: StageId;
  onApply: (stage: StageId, line: 'drive' | 'readout') => void;
  onCancel: () => void;
  // If editing an already placed component
  isEditing?: boolean;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

export const PropertyInspector: React.FC<PropertyInspectorProps> = ({ 
  spec, 
  initialStage, 
  onApply, 
  onCancel,
  isEditing,
  onDelete,
  onDuplicate
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [selectedStage, setSelectedStage] = useState<StageId>(initialStage || spec.validStages[0]);
  const [selectedLine, setSelectedLine] = useState<'drive' | 'readout'>(spec.kind === 'attenuator' ? 'drive' : 'readout');

  // Update if spec changes
  useEffect(() => {
    setSelectedStage(initialStage || spec.validStages[0]);
    setSelectedLine(spec.kind === 'attenuator' ? 'drive' : 'readout');
  }, [spec, initialStage]);

  const isStageValid = spec.validStages.includes(selectedStage);

  return (
    <div className="flex flex-col h-full font-sans">
      
      {/* Header */}
      <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Inspector
        </h2>
        <div className="flex gap-1">
          {isEditing && (
            <>
              <button onClick={onDuplicate} className="p-1 text-zinc-500 hover:text-zinc-300 rounded" title="Duplicate">
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button onClick={onDelete} className="p-1 text-red-500 hover:text-red-400 rounded" title="Delete">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button onClick={onCancel} className="p-1 text-zinc-500 hover:text-zinc-300 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Component Title */}
        <div>
          <h3 className={cn("text-base font-semibold", isDark ? "text-emerald-400" : "text-emerald-600")}>
            {spec.name}
          </h3>
          <p className={cn("text-xs mt-1", isDark ? "text-zinc-400" : "text-zinc-600")}>
            {spec.description}
          </p>
        </div>

        {/* Configuration Form */}
        <div className="space-y-3">
          <h4 className={cn("text-[10px] uppercase font-bold tracking-wider", isDark ? "text-zinc-500" : "text-zinc-400")}>Configuration</h4>
          
          <div>
            <label className={cn("text-xs font-medium block mb-1.5", isDark ? "text-zinc-300" : "text-zinc-700")}>Target Stage</label>
            <select 
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value as StageId)}
              className={cn(
                "w-full px-2 py-1.5 text-xs rounded border outline-none font-mono",
                isDark ? "bg-zinc-950 border-zinc-800 text-zinc-200" : "bg-zinc-50 border-zinc-200 text-zinc-800"
              )}
            >
              {(['300K', '50K', '4K', 'still', 'coldplate', 'mxc'] as StageId[]).map(s => (
                <option key={s} value={s}>{s.toUpperCase()} Stage</option>
              ))}
            </select>
            {!isStageValid && (
              <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Warning: Non-standard operating temperature.
              </p>
            )}
          </div>

          <div>
            <label className={cn("text-xs font-medium block mb-1.5", isDark ? "text-zinc-300" : "text-zinc-700")}>Signal Line</label>
            <select 
              value={selectedLine}
              onChange={(e) => setSelectedLine(e.target.value as 'drive' | 'readout')}
              className={cn(
                "w-full px-2 py-1.5 text-xs rounded border outline-none font-mono",
                isDark ? "bg-zinc-950 border-zinc-800 text-zinc-200" : "bg-zinc-50 border-zinc-200 text-zinc-800"
              )}
            >
              <option value="drive">Drive Line</option>
              <option value="readout">Readout Line</option>
            </select>
          </div>
        </div>

        {/* Technical Specs */}
        <div className="space-y-2">
          <h4 className={cn("text-[10px] uppercase font-bold tracking-wider mb-2", isDark ? "text-zinc-500" : "text-zinc-400")}>Specifications</h4>
          <div className="grid grid-cols-2 gap-2">
            {spec.attenuationDb !== undefined && (
              <div className={cn("p-2 rounded border", isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
                <div className="text-[10px] text-zinc-500">Attenuation</div>
                <div className="text-sm font-mono text-zinc-200">{spec.attenuationDb} dB</div>
              </div>
            )}
            {spec.gainDb !== undefined && (
              <div className={cn("p-2 rounded border", isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
                <div className="text-[10px] text-zinc-500">Gain</div>
                <div className="text-sm font-mono text-emerald-400">+{spec.gainDb} dB</div>
              </div>
            )}
            {spec.noiseTempK !== undefined && (
              <div className={cn("p-2 rounded border", isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
                <div className="text-[10px] text-zinc-500">Noise Temp</div>
                <div className="text-sm font-mono text-sky-400">{spec.noiseTempK} K</div>
              </div>
            )}
            <div className={cn("p-2 rounded border", isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
              <div className="text-[10px] text-zinc-500">Form Factor</div>
              <div className="text-sm font-mono text-zinc-200 capitalize">{spec.kind}</div>
            </div>
          </div>
        </div>

        {/* Documentation */}
        <div className={cn("p-3 rounded-md border", isDark ? "bg-zinc-900/30 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
          <h4 className="text-[10px] uppercase font-bold tracking-wider text-emerald-500 mb-1 flex items-center gap-1">
            <Info className="w-3 h-3" /> Documentation
          </h4>
          <p className={cn("text-[11px] italic leading-relaxed", isDark ? "text-zinc-400" : "text-zinc-600")}>
            "{spec.specSource}"
          </p>
        </div>

      </div>

      {/* Action Footer */}
      <div className="p-4 border-t border-zinc-800/50 shrink-0 bg-zinc-950">
        <button
          onClick={() => onApply(selectedStage, selectedLine)}
          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-md shadow flex justify-center items-center gap-1.5 transition-colors"
        >
          <Check className="w-4 h-4" /> 
          {isEditing ? "Update Component" : "Confirm Placement"}
        </button>
      </div>

    </div>
  );
};
