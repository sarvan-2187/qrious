import React from 'react';
import type { Question } from '../../types/quiz.types';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { FaCheck } from 'react-icons/fa';

interface MultiCorrectQuestionProps {
  question: Question;
  selectedAnswer: string[] | null;
  onSelect: (selectedOptionIds: string[]) => void;
  disabled?: boolean;
}

export const MultiCorrectQuestion: React.FC<MultiCorrectQuestionProps> = ({
  question,
  selectedAnswer,
  onSelect,
  disabled
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const currentSelections = selectedAnswer || [];

  const toggleOption = (id: string) => {
    if (disabled) return;
    if (currentSelections.includes(id)) {
      onSelect(currentSelections.filter(item => item !== id));
    } else {
      onSelect([...currentSelections, id]);
    }
  };

  return (
    <div className="space-y-3 font-sans">
      <div className="text-xs text-emerald-500 font-mono mb-2 font-medium">Select all options that apply:</div>
      {question.options.map((option) => {
        const isSelected = currentSelections.includes(option.id);
        return (
          <div
            key={option.id}
            onClick={() => toggleOption(option.id)}
            className={cn(
              "p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between font-sans shadow-sm group",
              isSelected
                ? "bg-emerald-500/10 border-emerald-500 shadow-emerald-500/10"
                : isDark
                  ? "bg-black/60 border-white/10 text-zinc-300 hover:border-emerald-500/50 hover:bg-white/5"
                  : "bg-zinc-50 border-zinc-200 text-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-100",
              disabled && "opacity-80 cursor-not-allowed"
            )}
          >
            <span className={cn(
              "text-sm font-medium leading-relaxed",
              isSelected ? "text-emerald-500 font-semibold" : isDark ? "text-zinc-200" : "text-zinc-800"
            )}>
              {option.text}
            </span>
            <div
              className={cn(
                "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ml-3 transition-all",
                isSelected
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : isDark
                    ? "border-white/20 bg-black"
                    : "border-zinc-300 bg-white"
              )}
            >
              {isSelected && <FaCheck className="text-[10px]" />}
            </div>
          </div>
        );
      })}
    </div>
  );
};

