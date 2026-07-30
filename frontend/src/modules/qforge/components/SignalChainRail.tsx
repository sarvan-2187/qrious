import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import type { PlacedComponent } from '../hooks/useBuildState';
import { COMPONENTS } from '../constants/components';

interface SignalChainRailProps {
  components: PlacedComponent[];
  line: 'drive' | 'readout';
}

export const SignalChainRail: React.FC<SignalChainRailProps> = ({ components, line }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const lineComponents = components
    .filter(c => c.line === line)
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  return (
    <div className="w-full overflow-x-auto py-0.5 scrollbar-none">
      <div className="flex items-center min-w-max space-x-1.5">
        <div className={cn(
          "px-2 py-0.5 text-[10px] font-mono rounded border shrink-0",
          isDark ? "bg-zinc-900 border-zinc-800 text-zinc-400" : "bg-zinc-100 border-zinc-200 text-zinc-600"
        )}>
          {line === 'drive' ? 'Room Temp (300K)' : 'QPU (10mK)'}
        </div>
        
        {lineComponents.length === 0 && (
          <>
            <div className={cn("w-6 border-b border-dashed shrink-0", isDark ? "border-zinc-800" : "border-zinc-300")}></div>
            <div className={cn("text-[10px] italic font-mono shrink-0", isDark ? "text-zinc-600" : "text-zinc-400")}>Empty Line</div>
          </>
        )}

        {lineComponents.map((pc) => {
          const spec = COMPONENTS.find(c => c.id === pc.componentId);
          return (
            <React.Fragment key={pc.id}>
              <div className={cn("w-4 border-b-2 shrink-0", line === 'drive' ? "border-emerald-500" : "border-blue-500")}></div>
              <div className={cn(
                "px-2 py-0.5 border rounded-md shadow-xs text-center shrink-0 flex items-center gap-1.5",
                isDark 
                  ? "bg-zinc-900 border-zinc-800" 
                  : "bg-white border-zinc-200"
              )}>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{spec?.name}</span>
                <span className={cn("text-[9px] font-mono px-1 rounded", isDark ? "bg-zinc-800 text-zinc-400" : "bg-zinc-100 text-zinc-500")}>
                  {pc.stageId}
                </span>
              </div>
            </React.Fragment>
          );
        })}

        <div className={cn("w-4 border-b-2 shrink-0", line === 'drive' ? "border-emerald-500" : "border-blue-500")}></div>
        <div className={cn(
          "px-2 py-0.5 text-[10px] font-mono rounded border shrink-0",
          isDark ? "bg-zinc-900 border-zinc-800 text-zinc-400" : "bg-zinc-100 border-zinc-200 text-zinc-600"
        )}>
          {line === 'drive' ? 'QPU (10mK)' : 'Room Temp (300K)'}
        </div>
      </div>
    </div>
  );
};
