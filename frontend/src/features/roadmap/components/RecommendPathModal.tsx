import React, { useState } from 'react';
import { recommendPath } from '../api';
import type { RecommendPathResult } from '../types/roadmap.types';
import { FaAtom, FaBolt, FaTimes, FaPlay, FaRedo, FaArrowRight, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface RecommendPathModalProps {
  onClose: () => void;
  onStartTopic: (slug: string, category: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  'quantum-maths': 'Quantum Mathematics',
  'quantum-physics': 'Quantum Physics',
  'quantum-computing': 'Quantum Computing',
  'quantum-communication': 'Quantum Communication',
  'quantum-machine-learning': 'Quantum Machine Learning',
  'quantum-hardware': 'Quantum Hardware'
};

export const RecommendPathModal: React.FC<RecommendPathModalProps> = ({ onClose, onStartTopic }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [maxTimeMinutes, setMaxTimeMinutes] = useState(45);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendPathResult | null>(null);

  const handleOptimize = async () => {
    try {
      setLoading(true);
      const res = await recommendPath(maxTimeMinutes);
      setResult(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to generate a recommended path.');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = (slug: string, category: string) => {
    onStartTopic(slug, category);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/40 backdrop-blur-md animate-fade-in font-sans cursor-pointer"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className={cn(
          "relative w-[95vw] max-w-2xl max-h-[88vh] overflow-y-auto border rounded-[2rem] shadow-2xl cursor-default",
          isDark ? "bg-zinc-950/95 border-white/10 text-white" : "bg-white/95 border-zinc-200 text-zinc-900"
        )}
      >
        {/* Header */}
        <div className={cn("flex items-center justify-between p-5 sm:p-6 border-b", isDark ? "border-white/10" : "border-zinc-200")}>
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center text-xl shrink-0">
              <FaBolt />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-sans font-normal tracking-tight">
                Quantum Learning Path Optimizer
              </h2>
              <span className="text-[11px] font-mono text-emerald-500 font-medium">
                QAOA-recommended study session
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "w-9 h-9 rounded-xl border flex items-center justify-center transition-colors cursor-pointer shrink-0",
              isDark ? "bg-black border-white/10 text-zinc-400 hover:text-white" : "bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900"
            )}
          >
            <FaTimes className="text-sm" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* Input state */}
          {!result && (
            <div className="space-y-5">
              <p className={cn("text-sm leading-relaxed", isDark ? "text-zinc-300" : "text-zinc-700")}>
                Runs a two-stage optimizer over your quiz history and roadmap progress: a classical pass
                finds your weakest unlocked topics, then a QAOA quantum circuit selects the combination
                that fits your session and maximizes learning value.
              </p>

              <div className="space-y-2">
                <label className={cn("text-xs font-mono uppercase tracking-wider", isDark ? "text-zinc-400" : "text-zinc-600")}>
                  Study session length
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={10}
                    max={180}
                    step={5}
                    value={maxTimeMinutes}
                    onChange={(e) => setMaxTimeMinutes(Math.max(10, Math.min(180, Number(e.target.value) || 45)))}
                    className={cn(
                      "w-24 px-3 py-2 rounded-xl border text-sm font-mono outline-none transition-colors",
                      isDark ? "bg-black border-white/10 text-white focus:border-emerald-500/50" : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-emerald-500/50"
                    )}
                  />
                  <span className={cn("text-sm", isDark ? "text-zinc-400" : "text-zinc-600")}>minutes</span>
                </div>
              </div>

              <button
                onClick={handleOptimize}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Running QAOA optimization...
                  </>
                ) : (
                  <>
                    <FaAtom /> Optimize My Path
                  </>
                )}
              </button>
            </div>
          )}

          {/* Result state — no optimization needed */}
          {result && result.message === 'no_optimization_needed' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-3xl flex items-center justify-center mx-auto">
                <FaCheckCircle />
              </div>
              <div>
                <h3 className="text-lg font-sans font-normal mb-1">You're on track</h3>
                <p className={cn("text-sm max-w-sm mx-auto leading-relaxed", isDark ? "text-zinc-400" : "text-zinc-600")}>
                  No weak, unlocked topics need optimizing for this session right now — keep going with
                  your current roadmap, or check back after your next quiz attempt.
                </p>
              </div>
              <button
                onClick={() => setResult(null)}
                className={cn(
                  "px-5 py-2 rounded-xl text-xs font-mono font-medium border transition-colors cursor-pointer",
                  isDark ? "bg-black border-white/10 text-zinc-300 hover:text-white" : "bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-zinc-900"
                )}
              >
                <FaRedo className="inline mr-1.5" /> Try Different Time Budget
              </button>
            </div>
          )}

          {/* Result state — path found */}
          {result && result.message === 'ok' && (
            <div className="space-y-5">
              {/* Algorithm badge row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn(
                  "px-3 py-1 rounded-full text-[11px] font-mono font-semibold border",
                  result.fallback_used
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                )}>
                  {result.algorithm}
                </span>
                <span className={cn("px-3 py-1 rounded-full text-[11px] font-mono border", isDark ? "bg-black border-white/10 text-zinc-400" : "bg-zinc-100 border-zinc-200 text-zinc-600")}>
                  {result.stage1_candidate_count} weak topics found
                </span>
                {result.qaoa_parameters && (
                  <span className={cn("px-3 py-1 rounded-full text-[11px] font-mono border", isDark ? "bg-black border-white/10 text-zinc-400" : "bg-zinc-100 border-zinc-200 text-zinc-600")}>
                    γ={result.qaoa_parameters.gamma.toFixed(3)} β={result.qaoa_parameters.beta.toFixed(3)}
                  </span>
                )}
              </div>

              {/* Totals */}
              <div className="grid grid-cols-2 gap-3">
                <div className={cn("p-4 rounded-xl border", isDark ? "bg-black border-white/10" : "bg-zinc-50 border-zinc-200")}>
                  <span className={cn("text-[10px] font-mono uppercase block", isDark ? "text-zinc-500" : "text-zinc-400")}>Total Time</span>
                  <span className="text-lg font-mono font-bold">{result.total_estimated_time} min</span>
                </div>
                <div className={cn("p-4 rounded-xl border", isDark ? "bg-black border-white/10" : "bg-zinc-50 border-zinc-200")}>
                  <span className={cn("text-[10px] font-mono uppercase block", isDark ? "text-zinc-500" : "text-zinc-400")}>Learning Value</span>
                  <span className="text-lg font-mono font-bold text-emerald-500">{result.total_learning_value.toFixed(0)}</span>
                </div>
              </div>

              {/* Selected topics */}
              <div className="space-y-2">
                <h4 className={cn("text-xs font-mono uppercase tracking-wider", isDark ? "text-zinc-400" : "text-zinc-600")}>
                  Your Recommended Session
                </h4>
                {result.selected_topics.map((topic) => (
                  <div
                    key={topic.slug}
                    className={cn(
                      "p-4 rounded-xl border flex items-center justify-between gap-3",
                      isDark ? "bg-black border-white/10" : "bg-zinc-50 border-zinc-200"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{topic.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-zinc-500">
                        <span>{CATEGORY_LABELS[topic.category] || topic.category}</span>
                        <span>·</span>
                        <span>{topic.time} min</span>
                        <span>·</span>
                        <span>{topic.mastery_score.toFixed(0)}% mastery</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStart(topic.slug, topic.category)}
                      className="shrink-0 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <FaPlay className="text-[10px]" /> Start
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setResult(null)}
                className={cn(
                  "w-full py-2.5 rounded-xl text-xs font-mono font-medium border transition-colors cursor-pointer flex items-center justify-center gap-2",
                  isDark ? "bg-black border-white/10 text-zinc-300 hover:text-white" : "bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-zinc-900"
                )}
              >
                <FaRedo /> Re-optimize with a different time budget <FaArrowRight className="text-[10px]" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
