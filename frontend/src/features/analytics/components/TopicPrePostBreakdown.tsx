import React, { useState } from 'react';
import type { TopicAssessmentEntry } from '../types/analytics.types';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaAtom, FaChevronDown, FaChevronUp, FaCheckCircle,
  FaLock, FaArrowUp, FaArrowDown, FaMinus, FaTrophy
} from 'react-icons/fa';

interface TopicPrePostBreakdownProps {
  entries: TopicAssessmentEntry[];
  roadmapId: string | null;
}

function ScoreBar({ score, color, label }: { score: number | null; color: string; label: string }) {
  const { theme } = useTheme();
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className={cn("text-[10px] font-mono uppercase w-14 shrink-0", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
        {label}
      </span>
      <div className={cn("flex-1 rounded-full h-2 overflow-hidden", theme === 'dark' ? "bg-zinc-800" : "bg-zinc-100")}>
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }}
          whileInView={{ width: score !== null ? `${score}%` : '0%' }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span className={cn("text-xs font-mono font-bold w-10 text-right shrink-0", score !== null ? "" : theme === 'dark' ? "text-zinc-600" : "text-zinc-300")}>
        {score !== null ? `${score}%` : '—'}
      </span>
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const isPos = delta >= 0;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-bold border",
      isPos
        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
        : "bg-red-500/10 border-red-500/30 text-red-500"
    )}>
      {isPos ? <FaArrowUp className="text-[9px]" /> : <FaArrowDown className="text-[9px]" />}
      {isPos ? '+' : ''}{delta}%
    </span>
  );
}

function StatusChip({ classification }: { classification: string }) {
  const { theme } = useTheme();
  const isGood = ['Excellent Progress', 'Consistent Improvement', 'Post-Assessment Completed'].includes(classification);
  const isNeutral = ['Baseline Established', 'Stable Performance', 'Pending Assessment'].includes(classification);

  return (
    <span className={cn(
      "px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold border tracking-wide",
      isGood
        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
        : isNeutral
        ? theme === 'dark' ? "bg-zinc-800 border-zinc-700 text-zinc-400" : "bg-zinc-100 border-zinc-200 text-zinc-500"
        : "bg-red-500/10 border-red-500/20 text-red-500"
    )}>
      {classification}
    </span>
  );
}

export const TopicPrePostBreakdown: React.FC<TopicPrePostBreakdownProps> = ({ entries }) => {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const isDark = theme === 'dark';

  if (!entries || entries.length === 0) return null;

  const toggleExpand = (slug: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  // Summary stats
  const assessed = entries.filter(e => e.pre.taken || e.post.taken);
  const both = entries.filter(e => e.pre.taken && e.post.taken);
  const avgGain = both.length > 0
    ? Math.round(both.reduce((sum, e) => sum + (e.delta_pct ?? 0), 0) / both.length * 10) / 10
    : null;

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm",
            isDark ? "bg-zinc-900 border-white/10 text-emerald-400" : "bg-zinc-50 border-zinc-200 text-emerald-600"
          )}>
            <FaAtom className="text-lg" />
          </div>
          <div>
            <h3 className="text-xl font-medium tracking-tight">Topic Learning Development</h3>
            <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-500" : "text-zinc-400")}>
              Per-topic pre/post assessment comparison &amp; learner progress
            </p>
          </div>
        </div>

        {/* Summary pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-mono border",
            isDark ? "bg-zinc-900 border-white/10 text-zinc-300" : "bg-white border-zinc-200 text-zinc-600"
          )}>
            {assessed.length} Assessed
          </span>
          <span className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-mono border",
            isDark ? "bg-zinc-900 border-white/10 text-zinc-300" : "bg-white border-zinc-200 text-zinc-600"
          )}>
            {both.length} Compared
          </span>
          {avgGain !== null && (
            <span className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-mono border font-bold",
              avgGain >= 0
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                : "bg-red-500/10 border-red-500/20 text-red-500"
            )}>
              Avg Gain: {avgGain >= 0 ? '+' : ''}{avgGain}%
            </span>
          )}
        </div>
      </div>

      {/* Topic Cards */}
      <div className="space-y-3">
        {entries.map((entry, idx) => {
          const { pre, post, delta_pct, performance_classification, academic_recommendation } = entry;
          const isExpanded = expanded.has(entry.topic_slug);
          const hasAny = pre.taken || post.taken;

          return (
            <motion.div
              key={entry.topic_slug}
              className={cn(
                "rounded-2xl border overflow-hidden transition-all duration-300",
                isDark ? "bg-zinc-950/50 border-white/10" : "bg-white border-zinc-200",
                !hasAny && "opacity-50"
              )}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: hasAny ? 1 : 0.45, y: 0 }}
              viewport={{ once: true, margin: "-10px" }}
              transition={{ duration: 0.35, delay: idx * 0.04 }}
            >
              {/* Row Header — always visible */}
              <button
                onClick={() => hasAny && toggleExpand(entry.topic_slug)}
                disabled={!hasAny}
                className={cn(
                  "w-full px-5 py-4 flex items-center gap-4 text-left transition-colors",
                  hasAny ? "cursor-pointer" : "cursor-default",
                  isDark ? "hover:bg-white/5" : "hover:bg-zinc-50"
                )}
              >
                {/* Status dot */}
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  pre.taken && post.taken
                    ? "bg-emerald-500"
                    : pre.taken
                    ? "bg-blue-400"
                    : "bg-zinc-500"
                )} />

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">{entry.topic_title}</span>
                  <span className={cn("text-[10px] font-mono", isDark ? "text-zinc-500" : "text-zinc-400")}>
                    {!hasAny ? 'No assessment taken' : pre.taken && post.taken ? 'Pre & Post assessed' : pre.taken ? 'Pre-test taken' : 'Post-test taken'}
                  </span>
                </div>

                {/* Inline bar previews */}
                <div className="hidden sm:flex flex-col gap-1.5 w-48">
                  <ScoreBar score={pre.score_pct} color="bg-blue-400" label="Pre" />
                  <ScoreBar score={post.score_pct} color="bg-emerald-500" label="Post" />
                </div>

                {/* Delta */}
                <div className="shrink-0 w-20 flex justify-end">
                  {delta_pct !== null ? (
                    <DeltaBadge delta={delta_pct} />
                  ) : pre.taken && !post.taken ? (
                    <span className={cn("text-[10px] font-mono", isDark ? "text-zinc-600" : "text-zinc-400")}>Post pending</span>
                  ) : !hasAny ? (
                    <FaLock className={cn("text-xs", isDark ? "text-zinc-700" : "text-zinc-300")} />
                  ) : (
                    <FaMinus className={cn("text-xs", isDark ? "text-zinc-700" : "text-zinc-300")} />
                  )}
                </div>

                {/* Status chip */}
                {performance_classification && hasAny && (
                  <div className="hidden md:block shrink-0">
                    <StatusChip classification={performance_classification} />
                  </div>
                )}

                {/* Expand chevron */}
                {hasAny && (
                  <div className={cn("shrink-0 ml-1", isDark ? "text-zinc-500" : "text-zinc-400")}>
                    {isExpanded ? <FaChevronUp className="text-xs" /> : <FaChevronDown className="text-xs" />}
                  </div>
                )}
              </button>

              {/* Expanded Detail Panel */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className={cn(
                      "px-5 pb-5 pt-1 border-t space-y-4",
                      isDark ? "border-white/10" : "border-zinc-100"
                    )}>
                      {/* Score breakdown */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className={cn("p-4 rounded-xl border text-center", isDark ? "bg-zinc-900/60 border-white/10" : "bg-zinc-50 border-zinc-200")}>
                          <p className={cn("text-[10px] font-mono uppercase mb-1", isDark ? "text-zinc-500" : "text-zinc-400")}>Pre-Test</p>
                          <p className="text-2xl font-extrabold font-mono">
                            {pre.taken && pre.score_pct !== null ? `${pre.score_pct}%` : '—'}
                          </p>
                          {pre.taken && (
                            <p className={cn("text-[10px] font-mono mt-1", isDark ? "text-zinc-500" : "text-zinc-400")}>
                              {pre.total_correct}/{pre.total_questions} correct
                            </p>
                          )}
                        </div>

                        <div className={cn(
                          "p-4 rounded-xl border text-center",
                          post.taken
                            ? isDark ? "bg-emerald-950/30 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"
                            : isDark ? "bg-zinc-900/40 border-white/10" : "bg-zinc-50 border-zinc-200"
                        )}>
                          <p className={cn("text-[10px] font-mono uppercase mb-1", isDark ? "text-zinc-500" : "text-zinc-400")}>Post-Test</p>
                          <p className={cn("text-2xl font-extrabold font-mono", post.taken ? "text-emerald-500" : "")}>
                            {post.taken && post.score_pct !== null ? `${post.score_pct}%` : '—'}
                          </p>
                          {post.taken && (
                            <p className={cn("text-[10px] font-mono mt-1", isDark ? "text-zinc-500" : "text-zinc-400")}>
                              {post.total_correct}/{post.total_questions} correct
                            </p>
                          )}
                        </div>

                        <div className={cn("p-4 rounded-xl border text-center", isDark ? "bg-zinc-900/60 border-white/10" : "bg-zinc-50 border-zinc-200")}>
                          <p className={cn("text-[10px] font-mono uppercase mb-1", isDark ? "text-zinc-500" : "text-zinc-400")}>Learning Gain</p>
                          <p className={cn(
                            "text-2xl font-extrabold font-mono",
                            delta_pct !== null ? (delta_pct >= 0 ? "text-emerald-500" : "text-red-500") : ""
                          )}>
                            {delta_pct !== null ? `${delta_pct >= 0 ? '+' : ''}${delta_pct}%` : '—'}
                          </p>
                          {delta_pct !== null && (
                            <p className={cn("text-[10px] font-mono mt-1", isDark ? "text-zinc-500" : "text-zinc-400")}>
                              {delta_pct >= 15 ? 'Excellent 🎉' : delta_pct >= 5 ? 'Solid gain' : delta_pct >= 0 ? 'Steady' : 'Needs review'}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Visual bar comparison */}
                      <div className={cn("p-4 rounded-xl border space-y-3", isDark ? "bg-zinc-900/40 border-white/10" : "bg-zinc-50 border-zinc-200")}>
                        <p className={cn("text-[10px] font-mono uppercase font-semibold", isDark ? "text-zinc-500" : "text-zinc-400")}>Score Comparison</p>
                        <ScoreBar score={pre.score_pct} color="bg-blue-400" label="Pre" />
                        <ScoreBar score={post.score_pct} color="bg-emerald-500" label="Post" />
                      </div>

                      {/* AI Recommendation */}
                      {academic_recommendation && (
                        <div className={cn(
                          "p-4 rounded-xl border flex items-start gap-3 text-sm",
                          isDark ? "bg-emerald-950/20 border-emerald-500/20" : "bg-emerald-50/70 border-emerald-200"
                        )}>
                          {delta_pct !== null && delta_pct >= 15
                            ? <FaTrophy className="text-emerald-500 shrink-0 mt-0.5" />
                            : <FaCheckCircle className="text-emerald-500 shrink-0 mt-0.5" />
                          }
                          <div>
                            <p className="text-[10px] font-mono uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                              AI Recommendation
                            </p>
                            <p className={cn("text-xs leading-relaxed", isDark ? "text-zinc-300" : "text-zinc-700")}>
                              {academic_recommendation}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
