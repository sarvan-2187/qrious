import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'E', action: 'Evaluate Simulation', description: 'Runs thermal, signal integrity, and power budget solvers.' },
  { key: 'R', action: 'Reset & Try Again', description: 'Completely resets hardware, placed components, faults, and stepper.' },
  { key: 'X', action: 'Toggle Exploded View', description: 'Animates 3D stage plate Y spacing for internal inspection.' },
  { key: 'C', action: 'Qubit Calibration Lab', description: 'Opens Qubit Spectroscopy, Rabi drive, and T1/T2 decay lab.' },
  { key: 'F', action: 'Fault Injection Lab', description: 'Opens hardware failure mode toggle drawer.' },
  { key: 'Q', action: 'QEC Surface Code Lab', description: 'Opens distance-d Surface Code topological lattice lab.' },
  { key: '?', action: 'Keyboard Shortcuts', description: 'Toggles this keyboard shortcuts cheat sheet.' },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ onClose }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6 z-50 overflow-y-auto font-sans">
      <div className={cn(
        "w-full max-w-xl border rounded-2xl p-6 relative shadow-2xl transition-colors duration-300",
        isDark ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
      )}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-emerald-500 flex items-center gap-2">
              <span>⌨</span> QForge Keyboard Shortcuts
            </h2>
            <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-zinc-600")}>
              Quick key bindings for fast navigation and simulator control.
            </p>
          </div>
          <button 
            onClick={onClose} 
            className={cn("text-lg font-bold hover:opacity-70 px-2 py-1", isDark ? "text-zinc-400" : "text-zinc-500")}
          >
            ✕
          </button>
        </div>

        <div className="space-y-2.5">
          {SHORTCUTS.map(s => (
            <div 
              key={s.key}
              className={cn(
                "flex items-center justify-between p-3 border rounded-xl transition-colors",
                isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-zinc-50 border-zinc-200"
              )}
            >
              <div>
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{s.action}</div>
                <div className={cn("text-[11px] mt-0.5", isDark ? "text-zinc-400" : "text-zinc-600")}>{s.description}</div>
              </div>

              <kbd className={cn(
                "px-2.5 py-1 font-mono text-xs font-bold border rounded-md shadow-sm shrink-0",
                isDark ? "bg-zinc-950 border-zinc-700 text-amber-400" : "bg-white border-zinc-300 text-amber-600"
              )}>
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center text-xs text-zinc-500 font-mono">
          Press <kbd className="px-1.5 py-0.5 border rounded bg-zinc-800 text-zinc-300 text-[10px]">Esc</kbd> or click ✕ to close.
        </div>
      </div>
    </div>
  );
};
