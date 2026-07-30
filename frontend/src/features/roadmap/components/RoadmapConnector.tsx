import React from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';

interface RoadmapConnectorProps {
  status?: 'locked' | 'unlocked' | 'in_progress' | 'completed';
}

export const RoadmapConnector: React.FC<RoadmapConnectorProps> = ({ status = 'locked' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getLineGradient = () => {
    switch (status) {
      case 'completed':
        return 'from-emerald-500 via-emerald-400 to-emerald-500 shadow-emerald-500/50';
      case 'in_progress':
        return 'from-purple-500 via-emerald-400 to-cyan-500 shadow-purple-500/50 animate-pulse';
      case 'unlocked':
        return 'from-cyan-500/60 to-zinc-600';
      case 'locked':
      default:
        return isDark ? 'from-zinc-800 to-zinc-800' : 'from-zinc-200 to-zinc-200';
    }
  };

  return (
    <div className="relative flex justify-center items-center h-12 sm:h-16 my-1">
      {/* Central connector line */}
      <div className={cn(
        "w-1 h-full bg-gradient-to-b rounded-full transition-all duration-700 shadow-sm",
        getLineGradient()
      )} />
    </div>
  );
};
