import React from 'react';
import type { ConceptMasteryItem } from '../types/analytics.types';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { FaExclamationTriangle, FaArrowRight, FaBrain } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

interface WeakConceptListProps {
  weakConcepts: ConceptMasteryItem[];
}

export const WeakConceptList: React.FC<WeakConceptListProps> = ({ weakConcepts }) => {
  const { theme } = useTheme();
  const navigate = useNavigate();

  return (
    <motion.div
      className={cn(
        "p-8 rounded-[2rem] border overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group relative font-sans h-full",
        theme === 'dark'
          ? "bg-zinc-950/50 border-white/10 hover:border-emerald-500/50 hover:bg-white/5 text-white"
          : "bg-white border-zinc-200 hover:border-emerald-500/30 text-zinc-900"
      )}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div>
        {/* Header with Icon Badge §1.5 */}
        <div className="flex items-center gap-4 mb-6">
          <div className={cn(
            "w-12 h-12 rounded-2xl border flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:text-emerald-500",
            theme === 'dark' ? "bg-black border-white/10 text-zinc-400" : "bg-zinc-50 border-zinc-200 text-zinc-700"
          )}>
            <FaBrain className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-sans tracking-tight">Weak Quantum Concepts</h3>
            <p className={cn("text-xs", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
              Targeted concepts recommended for targeted review
            </p>
          </div>
        </div>

        {/* List of Concepts */}
        {weakConcepts.length === 0 ? (
          <div className={cn("p-6 rounded-2xl border text-center my-4", theme === 'dark' ? "bg-black/40 border-white/10" : "bg-zinc-50 border-zinc-200")}>
            <p className={cn("text-xs font-sans", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
              No weak concepts detected! Your accuracy across quizzes is above target thresholds.
            </p>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {weakConcepts.map((item) => (
              <div
                key={item.concept}
                className={cn(
                  "p-4 rounded-2xl border flex flex-col gap-2 transition-colors",
                  theme === 'dark' ? "bg-black/60 border-white/10" : "bg-zinc-50 border-zinc-200"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FaExclamationTriangle className="text-amber-500 text-xs shrink-0" />
                    <span className="text-sm font-sans capitalize">{item.concept.replace(/_/g, ' ')}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-500">
                    {item.accuracy_pct}% Accuracy
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className={theme === 'dark' ? "text-zinc-400" : "text-zinc-600"}>
                    {item.correct_questions} / {item.total_questions} questions correct
                  </span>
                  <button
                    onClick={() => navigate(`/quiz/${item.topic_slug}`)}
                    className="text-emerald-500 hover:underline flex items-center gap-1 font-sans"
                  >
                    Practice Topic <FaArrowRight className="text-[10px]" />
                  </button>
                </div>

                {/* Accuracy Bar */}
                <div className={cn("w-full h-1.5 rounded-full overflow-hidden mt-1", theme === 'dark' ? "bg-white/10" : "bg-zinc-200")}>
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      item.accuracy_pct < 50 ? "bg-red-500" : item.accuracy_pct < 70 ? "bg-amber-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${item.accuracy_pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={cn("pt-4 border-t flex items-center justify-between text-xs font-mono", theme === 'dark' ? "border-white/10 text-zinc-500" : "border-zinc-200 text-zinc-400")}>
        <span>Automatically computed from quiz logs</span>
        <button
          onClick={() => navigate('/roadmap')}
          className="text-emerald-500 hover:underline font-sans font-medium"
        >
          View Full Roadmap →
        </button>
      </div>
    </motion.div>
  );
};
