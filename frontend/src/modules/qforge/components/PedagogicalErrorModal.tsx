import React, { useState } from 'react';
import { AlertTriangle, Info, Undo, X } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface PedagogicalErrorModalProps {
  errorMessage: string;
  onFixIt: () => void;
  onClose: () => void;
}

export const PedagogicalErrorModal: React.FC<PedagogicalErrorModalProps> = ({
  errorMessage,
  onFixIt,
  onClose
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showDetailedWhy, setShowDetailedWhy] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6 z-50 overflow-y-auto font-sans">
      <div className={cn(
        "w-full max-w-lg border rounded-2xl p-6 shadow-2xl relative transition-colors duration-300",
        isDark ? "bg-zinc-950 border-amber-500/30 text-zinc-100" : "bg-white border-amber-300 text-zinc-900"
      )}>
        <button
          onClick={onClose}
          className={cn("absolute top-4 right-4 p-1 rounded hover:opacity-70 text-zinc-400 cursor-pointer")}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-mono uppercase tracking-wider text-amber-400">Component Placement Tip</h3>
            <p className={cn("text-xs font-medium mt-0.5", isDark ? "text-zinc-300" : "text-zinc-700")}>
              {errorMessage}
            </p>
          </div>
        </div>

        {/* Real-world Physics Analogy Box */}
        <div className={cn(
          "p-3.5 rounded-xl border mb-5 text-xs leading-relaxed font-sans",
          isDark ? "bg-amber-950/20 border-amber-800/40 text-amber-200" : "bg-amber-50 border-amber-200 text-amber-900"
        )}>
          <span className="font-semibold block mb-1">Physics Analogy:</span>
          Think of thermal noise like background chatter at a concert. Adding an attenuator at higher temperature stages (50K / 4K) turns down the background volume so qubits can hear microwave control signals clearly at 10 millikelvin.
        </div>

        {showDetailedWhy && (
          <div className={cn(
            "p-3 rounded-lg border text-xs mb-5 space-y-2 animate-fadeIn font-sans",
            isDark ? "bg-zinc-900/60 border-zinc-800 text-zinc-300" : "bg-zinc-50 border-zinc-200 text-zinc-700"
          )}>
            <span className="font-semibold text-emerald-400 block flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> Technical Rationale:
            </span>
            <p>
              High-power amplifiers placed at 50K dissipate too much heat and would overwhelm the cryostat's cooling capacity. Instead, amplifiers are placed at 4K (HEMT) and MXC (TWPA) where thermal load is managed and quantum signal-to-noise ratio is maximized.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-800/60">
          <button
            onClick={() => setShowDetailedWhy(prev => !prev)}
            className={cn(
              "px-3 py-1.5 border rounded-md text-xs font-medium transition-colors cursor-pointer",
              isDark ? "bg-zinc-900 border-zinc-800 text-sky-400 hover:bg-zinc-800" : "bg-zinc-100 border-zinc-200 text-sky-700 hover:bg-zinc-200"
            )}
          >
            {showDetailedWhy ? 'Hide rationale' : 'Why does this matter?'}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { onFixIt(); onClose(); }}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-md shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <Undo className="w-3.5 h-3.5" /> Revert Change
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
