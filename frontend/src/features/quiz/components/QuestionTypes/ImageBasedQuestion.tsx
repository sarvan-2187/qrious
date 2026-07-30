import React from 'react';
import type { Question } from '../../types/quiz.types';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface ImageBasedQuestionProps {
  question: Question;
  selectedAnswer: string | null;
  onSelect: (optionId: string) => void;
  disabled?: boolean;
}

export const ImageBasedQuestion: React.FC<ImageBasedQuestionProps> = ({
  question,
  selectedAnswer,
  onSelect,
  disabled
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="space-y-4 font-sans">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {question.options.map((option) => {
          const isSelected = selectedAnswer === option.id;
          return (
            <div
              key={option.id}
              onClick={() => !disabled && onSelect(option.id)}
              className={cn(
                "p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col items-center text-center justify-between font-sans shadow-sm group",
                isSelected
                  ? "bg-emerald-500/10 border-emerald-500 shadow-emerald-500/10"
                  : isDark
                    ? "bg-black/60 border-white/10 text-zinc-300 hover:border-emerald-500/50 hover:bg-white/5"
                    : "bg-zinc-50 border-zinc-200 text-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-100",
                disabled && "opacity-80 cursor-not-allowed"
              )}
            >
              {option.image_url && (
                <img
                  src={option.image_url}
                  alt={option.text}
                  className={cn(
                    "w-full h-32 object-contain mb-3 rounded-xl p-2 border",
                    isDark ? "bg-black border-white/10" : "bg-zinc-100 border-zinc-200"
                  )}
                />
              )}
              <span className={cn(
                "text-sm font-medium leading-relaxed",
                isSelected ? "text-emerald-500 font-semibold" : isDark ? "text-zinc-200" : "text-zinc-800"
              )}>
                {option.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

