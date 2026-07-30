import React from 'react';
import type { ConceptMasteryItem, ConceptMasteryStatus } from '../types/analytics.types';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ConceptMasteryMatrixProps {
  concepts: ConceptMasteryItem[];
}

const STATUS_CONFIG: Record<ConceptMasteryStatus, { label: string; bg: string; text: string; border: string }> = {
  needs_attention: {
    label: 'Needs Attention',
    bg: 'bg-red-500/10 dark:bg-red-500/20',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-500/20'
  },
  review: {
    label: 'Review',
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/20'
  },
  strong: {
    label: 'Strong',
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/20'
  },
  mastered: {
    label: 'Mastered',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20'
  }
};

export const ConceptMasteryMatrix: React.FC<ConceptMasteryMatrixProps> = ({ concepts }) => {
  const { theme } = useTheme();

  return (
    <motion.div
      className={cn(
        "p-8 rounded-[2rem] border overflow-hidden shadow-sm flex flex-col justify-between h-full font-sans transition-all duration-300",
        theme === 'dark' ? "bg-zinc-950/50 border-white/10" : "bg-white border-zinc-200"
      )}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
    >
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-medium tracking-tight">Concept Mastery Matrix</h3>
            <p className={cn("text-xs mt-1", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
              Comprehensive proficiency status across quantum mechanics and algorithm topics
            </p>
          </div>
          <span className={cn(
            "text-xs font-mono px-3 py-1 rounded-full border",
            theme === 'dark' ? "bg-zinc-900 border-white/10 text-zinc-400" : "bg-zinc-100 border-zinc-200 text-zinc-600"
          )}>
            {concepts.length} Concepts Tracked
          </span>
        </div>

        {concepts.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-2xl my-2">
            <p className={cn("text-sm font-sans", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
              No concept data recorded yet. Solve quizzes or assessments to populate your matrix.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className={cn(
                  "border-b text-xs font-mono uppercase tracking-wider",
                  theme === 'dark' ? "border-white/10 text-zinc-400" : "border-zinc-200 text-zinc-500"
                )}>
                  <th className="py-3 px-4 font-normal">Concept</th>
                  <th className="py-3 px-4 font-normal">Questions</th>
                  <th className="py-3 px-4 font-normal">Mastery</th>
                  <th className="py-3 px-4 font-normal text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {concepts.map((item, idx) => {
                  const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.review;
                  return (
                    <tr
                      key={idx}
                      className={cn(
                        "transition-colors group",
                        theme === 'dark' ? "hover:bg-white/5" : "hover:bg-zinc-50"
                      )}
                    >
                      <td className="py-4 px-4 font-medium">
                        <div className="font-medium text-foreground">{item.concept}</div>
                        <div className={cn("text-xs font-mono capitalize", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
                          {item.topic_slug.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-muted-foreground">
                        {item.correct_questions}/{item.total_questions} Solved
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-24 bg-secondary h-2 rounded-full overflow-hidden shrink-0">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                item.accuracy_pct >= 90 ? "bg-emerald-500" : item.accuracy_pct >= 75 ? "bg-blue-500" : item.accuracy_pct >= 65 ? "bg-amber-500" : "bg-red-500"
                              )}
                              style={{ width: `${Math.min(item.accuracy_pct, 100)}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs font-bold">{item.accuracy_pct}%</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className={cn(
                          "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border font-sans",
                          config.bg, config.text, config.border
                        )}>
                          {config.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};
