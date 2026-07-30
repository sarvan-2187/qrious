import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface QuizProgressDotsProps {
  total: number;
  currentIndex: number;
  answersMap: Record<number, any>;
  onSelectIndex: (index: number) => void;
}

export const QuizProgressDots: React.FC<QuizProgressDotsProps> = ({
  total,
  currentIndex,
  answersMap,
  onSelectIndex
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1 font-mono">
      {Array.from({ length: total }).map((_, idx) => {
        const isCurrent = currentIndex === idx;
        const hasAnswer = answersMap[idx] !== undefined && answersMap[idx] !== null && answersMap[idx] !== '';

        return (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectIndex(idx)}
            className={cn(
              "w-8 h-8 rounded-xl border text-xs font-medium flex items-center justify-center transition-all shrink-0 cursor-pointer",
              isCurrent
                ? "bg-emerald-500 text-white border-emerald-500 ring-2 ring-emerald-500/40 shadow-sm scale-105"
                : hasAnswer
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                  : isDark
                    ? "bg-black border-white/10 text-zinc-500 hover:text-white hover:border-white/20"
                    : "bg-zinc-100 border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-300"
            )}
          >
            {idx + 1}
          </button>
        );
      })}
    </div>
  );
};
