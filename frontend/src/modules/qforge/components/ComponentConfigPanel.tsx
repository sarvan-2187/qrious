import React from 'react';
import type { ComponentSpec } from '../constants/components';

interface ComponentConfigPanelProps {
  spec: ComponentSpec;
  onClose: () => void;
}

export const ComponentConfigPanel: React.FC<ComponentConfigPanelProps> = ({ spec, onClose }) => {
  return (
    <div className="absolute inset-y-0 right-0 w-80 bg-zinc-900 border-l border-zinc-700 p-6 shadow-2xl flex flex-col z-50">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-emerald-400">{spec.name}</h2>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100">✕</button>
      </div>
      
      <div className="space-y-4 flex-1">
        <div>
          <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Description</h3>
          <p className="text-sm text-zinc-300">{spec.description}</p>
        </div>
        
        <div>
          <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Valid Stages</h3>
          <div className="flex gap-1 flex-wrap">
            {spec.validStages.map(s => (
              <span key={s} className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-300 border border-zinc-700">{s}</span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {spec.attenuationDb !== undefined && (
            <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
              <div className="text-xs text-zinc-500">Attenuation</div>
              <div className="text-lg font-semibold text-zinc-200">{spec.attenuationDb} dB</div>
            </div>
          )}
          {spec.gainDb !== undefined && (
            <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
              <div className="text-xs text-zinc-500">Gain</div>
              <div className="text-lg font-semibold text-zinc-200">{spec.gainDb} dB</div>
            </div>
          )}
          {spec.noiseTempK !== undefined && (
            <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
              <div className="text-xs text-zinc-500">Noise Temp</div>
              <div className="text-lg font-semibold text-zinc-200">{spec.noiseTempK} K</div>
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
          <h3 className="text-xs text-emerald-500 uppercase tracking-wider mb-2 flex items-center gap-2">
            <span>📚</span> From the Source
          </h3>
          <p className="text-sm text-zinc-400 italic font-serif">"{spec.specSource}"</p>
        </div>
      </div>
    </div>
  );
};
