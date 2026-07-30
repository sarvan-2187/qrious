import React from 'react';
import { Compass, Sliders, Trophy, BookOpen } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

export type QForgeMode = 'guided' | 'free' | 'challenge' | 'notebook';

interface ModeSelectorBarProps {
  currentMode: QForgeMode;
  onSelectMode: (mode: QForgeMode) => void;
}

export const ModeSelectorBar: React.FC<ModeSelectorBarProps> = ({
  currentMode,
  onSelectMode
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const modes: { id: QForgeMode; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
    { id: 'guided', label: 'Guided Tour', icon: Compass, desc: 'Step-by-step assembly tutorial' },
    { id: 'free', label: 'Free Design', icon: Sliders, desc: 'Unconstrained engineering sandbox' },
    { id: 'challenge', label: 'Challenge', icon: Trophy, desc: 'Real-world constrained scenarios' },
    { id: 'notebook', label: 'Lab Notebook', icon: BookOpen, desc: 'Build history & design analysis' },
  ];

  return (
    <div className={cn(
      "flex items-center gap-1 p-1 rounded-lg border transition-colors duration-300",
      isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-100 border-zinc-200"
    )}>
      {modes.map(m => {
        const isActive = currentMode === m.id;
        const Icon = m.icon;
        return (
          <button
            key={m.id}
            onClick={() => onSelectMode(m.id)}
            title={m.desc}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
              isActive
                ? "bg-emerald-600 text-white shadow-sm"
                : (isDark ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900" : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200")
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
};
