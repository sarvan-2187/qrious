import React, { useState, useEffect } from 'react';
import type { Question } from '../../types/quiz.types';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';

interface ArrangeStepsQuestionProps {
  question: Question;
  selectedAnswer: string[] | null;
  onSelect: (orderedIds: string[]) => void;
  disabled?: boolean;
}

export const ArrangeStepsQuestion: React.FC<ArrangeStepsQuestionProps> = ({
  question,
  selectedAnswer,
  onSelect,
  disabled
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [items, setItems] = useState<typeof question.options>([]);

  useEffect(() => {
    if (selectedAnswer && selectedAnswer.length > 0) {
      const optionMap = new Map(question.options.map(o => [o.id, o]));
      const ordered = selectedAnswer.map(id => optionMap.get(id)).filter(Boolean) as typeof question.options;
      if (ordered.length === question.options.length) {
        setItems(ordered);
        return;
      }
    }
    setItems([...question.options]);
  }, [question, selectedAnswer]);

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (disabled) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    setItems(newItems);
    onSelect(newItems.map(item => item.id));
  };

  return (
    <div className="space-y-3 font-sans">
      <div className="text-xs text-emerald-500 font-mono mb-2 font-medium">
        Re-order the steps into the correct sequence using the controls:
      </div>
      {items.map((item, index) => (
        <div
          key={item.id}
          className={cn(
            "p-4 rounded-2xl border flex items-center justify-between gap-4 font-sans shadow-sm",
            isDark ? "bg-black/60 border-white/10 text-zinc-200" : "bg-zinc-50 border-zinc-200 text-zinc-800"
          )}
        >
          <div className="flex items-center gap-3">
            <span className={cn(
              "w-7 h-7 rounded-lg border flex items-center justify-center font-mono text-xs text-emerald-500 font-bold",
              isDark ? "bg-black border-white/10" : "bg-white border-zinc-200"
            )}>
              {index + 1}
            </span>
            <span className="text-sm font-medium">{item.text}</span>
          </div>

          {!disabled && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => moveItem(index, 'up')}
                className={cn(
                  "w-8 h-8 rounded-lg border disabled:opacity-30 flex items-center justify-center transition-colors",
                  isDark ? "bg-black border-white/10 text-zinc-400 hover:text-white" : "bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900"
                )}
              >
                <FaArrowUp className="text-xs" />
              </button>
              <button
                type="button"
                disabled={index === items.length - 1}
                onClick={() => moveItem(index, 'down')}
                className={cn(
                  "w-8 h-8 rounded-lg border disabled:opacity-30 flex items-center justify-center transition-colors",
                  isDark ? "bg-black border-white/10 text-zinc-400 hover:text-white" : "bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900"
                )}
              >
                <FaArrowDown className="text-xs" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

