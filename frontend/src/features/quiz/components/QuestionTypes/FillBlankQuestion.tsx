import React from 'react';
import type { Question } from '../../types/quiz.types';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface FillBlankQuestionProps {
  question: Question;
  selectedAnswer: string | null;
  onSelect: (text: string) => void;
  disabled?: boolean;
}

export const FillBlankQuestion: React.FC<FillBlankQuestionProps> = ({
  selectedAnswer,
  onSelect,
  disabled
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="space-y-4 font-sans">
      <label className={cn("block text-xs font-mono font-medium", isDark ? "text-zinc-400" : "text-zinc-600")}>
        Type your answer below:
      </label>
      <input
        type="text"
        disabled={disabled}
        value={selectedAnswer || ''}
        onChange={(e) => onSelect(e.target.value)}
        placeholder="Type answer here..."
        className={cn(
          "w-full border rounded-2xl p-4 font-mono text-base outline-none transition-colors shadow-inner",
          isDark
            ? "bg-black border-white/10 text-white focus:border-emerald-500 placeholder:text-zinc-600"
            : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-emerald-500 placeholder:text-zinc-400"
        )}
      />
    </div>
  );
};

