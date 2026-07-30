import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface BuildScoreCardProps {
  category: string;
  score: number; // 0 to 100
  colorClass?: string;
}

export const BuildScoreCard: React.FC<BuildScoreCardProps> = ({ 
  category, 
  score, 
  colorClass = "text-emerald-500" 
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={cn(
      "p-4 border rounded-xl shadow-sm",
      isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
    )}>
      <h3 className={cn("text-xs mb-2 font-medium", isDark ? "text-zinc-400" : "text-zinc-500")}>{category}</h3>
      <div className="flex items-end gap-1.5">
        <span className={`text-3xl font-bold ${colorClass}`}>{Math.round(score)}</span>
        <span className={cn("text-xs mb-1 font-mono", isDark ? "text-zinc-500" : "text-zinc-400")}>/ 100</span>
      </div>
      <div className={cn("w-full rounded-full h-1.5 mt-3", isDark ? "bg-zinc-950" : "bg-zinc-100")}>
        <div 
          className={`h-1.5 rounded-full ${score > 80 ? 'bg-emerald-500' : score > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
          style={{ width: `${score}%` }}
        ></div>
      </div>
    </div>
  );
};
