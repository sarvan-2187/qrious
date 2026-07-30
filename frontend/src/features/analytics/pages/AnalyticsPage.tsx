import React, { useState, useEffect } from 'react';
import { fetchAnalyticsDashboard } from '../api';
import type { AnalyticsDashboardData } from '../types/analytics.types';
import { PrePostDeltaCard } from '../components/PrePostDeltaCard';
import { ConceptMasteryMatrix } from '../components/ConceptMasteryMatrix';
import { AccuracyTrendChart } from '../components/AccuracyTrendChart';
import { HeatmapCalendar } from '../components/HeatmapCalendar';
import { PersonalizedInsightsCard } from '../components/PersonalizedInsightsCard';
import { MasteryProgressCard } from '../components/MasteryProgressCard';
import { AnalyticsSummaryReport } from '../components/AnalyticsSummaryReport';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { FaPlay, FaRedo, FaFilter } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

export const AnalyticsPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [selectedRoadmap, setSelectedRoadmap] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async (roadmapId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAnalyticsDashboard(roadmapId ?? selectedRoadmap);
      setData(res.data);
    } catch (err: any) {
      console.error("Error fetching analytics metrics", err);
      setError(err.response?.data?.detail || 'Failed to load analytics metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard(selectedRoadmap);
  }, [selectedRoadmap]);

  return (
    <div className={cn(
      "w-full h-full transition-colors duration-300 py-12 px-6 md:px-12",
      theme === 'dark' ? "text-white" : "text-zinc-900"
    )}>
      <div className="max-w-[1600px] mx-auto flex flex-col gap-12">
        
        {/* Hero Header §1.2 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-4 max-w-3xl">
            <motion.h1
              className="text-4xl md:text-5xl font-sans tracking-tight font-normal"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Quantum Learning Analytics
            </motion.h1>
            <motion.p
              className={cn("text-lg", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Quantified progress metrics, pre/post assessment score improvements, concept mastery matrix, and study habit heatmaps.
            </motion.p>
          </div>

          {/* Controls: Roadmap Scope Filter & Quick Assessment CTA Buttons */}
          <motion.div
            className="flex flex-wrap items-center gap-3 shrink-0"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Per-Roadmap Filter Selector */}
            <div className="flex items-center gap-2 relative">
              <FaFilter className={cn("text-xs absolute left-3 pointer-events-none", theme === 'dark' ? "text-zinc-400" : "text-zinc-500")} />
              <select
                value={selectedRoadmap}
                onChange={(e) => setSelectedRoadmap(e.target.value)}
                className={cn(
                  "pl-8 pr-4 py-2.5 rounded-lg text-xs font-medium border shadow-xs appearance-none outline-none cursor-pointer transition-colors",
                  theme === 'dark' ? "bg-zinc-900 border-white/10 text-zinc-200 hover:border-emerald-500/50" : "bg-white border-zinc-200 text-zinc-800 hover:border-emerald-500/50"
                )}
              >
                <option value="all">All Roadmaps (Aggregate)</option>
                <option value="quantum-computing">Quantum Computing Core</option>
                <option value="quantum-algorithms">Quantum Algorithms & Qiskit</option>
                <option value="quantum-communication">Quantum Communication & QKD</option>
                <option value="quantum-machine-learning">Quantum Machine Learning</option>
                <option value="quantum-hardware">Quantum Hardware & Simulation</option>
              </select>
            </div>

            <button
              onClick={() => navigate('/analytics/assessment/pre')}
              className={cn(
                "px-5 py-2.5 rounded-lg text-xs font-medium transition-colors border shadow-xs",
                theme === 'dark' ? "bg-black border-white/10 text-zinc-300 hover:text-white" : "bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-zinc-900"
              )}
            >
              Start Pre-Test
            </button>
            <button
              onClick={() => navigate('/analytics/assessment/post')}
              className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg shadow hover:bg-emerald-600 font-medium text-xs transition-colors flex items-center gap-2"
            >
              <FaPlay className="text-xs" /> Start Post-Test
            </button>
          </motion.div>
        </div>

        {/* Loading Skeleton Grid §1.7 */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className={cn(
                  "p-8 rounded-[2rem] border animate-pulse h-32",
                  theme === 'dark' ? "bg-white/10 border-white/10" : "bg-zinc-200 border-zinc-200"
                )}
              />
            ))}
          </div>
        )}

        {/* Error State §1.7 */}
        {error && (
          <div className="p-4 bg-red-100/10 border border-red-500/20 text-red-500 rounded-lg text-center max-w-lg mx-auto">
            <p className="text-sm font-sans mb-3">{error}</p>
            <button
              // Bare handler passed React's MouseEvent as loadDashboard's
              // roadmapId argument — retry refetched against a bogus id.
              onClick={() => loadDashboard()}
              className="px-5 py-2 bg-emerald-500 text-white rounded-lg shadow hover:bg-emerald-600 font-medium text-xs transition-colors flex items-center gap-2 mx-auto"
            >
              <FaRedo className="text-xs" /> Retry Loading Metrics
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* Phase 1: 5 KPI Header Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
              <motion.div
                className={cn(
                  "p-6 rounded-[2rem] border overflow-hidden shadow-sm flex flex-col justify-between h-full transition-all duration-300",
                  theme === 'dark' ? "bg-zinc-950/50 border-white/10" : "bg-white border-zinc-200"
                )}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <span className={cn("text-xs font-mono uppercase tracking-wider", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
                  Overall Accuracy
                </span>
                <span className="text-3xl font-extrabold font-mono text-emerald-500 mt-2">
                  {data.overall_accuracy_pct}%
                </span>
                <span className={cn("text-[11px] font-mono mt-1", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
                  Target: &ge;80%
                </span>
              </motion.div>

              <motion.div
                className={cn(
                  "p-6 rounded-[2rem] border overflow-hidden shadow-sm flex flex-col justify-between h-full transition-all duration-300",
                  theme === 'dark' ? "bg-zinc-950/50 border-white/10" : "bg-white border-zinc-200"
                )}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
              >
                <span className={cn("text-xs font-mono uppercase tracking-wider", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
                  Questions Solved
                </span>
                <span className="text-3xl font-extrabold font-mono text-foreground mt-2">
                  {data.total_questions_attempted}
                </span>
                <span className={cn("text-[11px] font-mono mt-1 text-emerald-500")}>
                  {data.total_correct} correct answers
                </span>
              </motion.div>

              <motion.div
                className={cn(
                  "p-6 rounded-[2rem] border overflow-hidden shadow-sm flex flex-col justify-between h-full transition-all duration-300",
                  theme === 'dark' ? "bg-zinc-950/50 border-white/10" : "bg-white border-zinc-200"
                )}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <span className={cn("text-xs font-mono uppercase tracking-wider", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
                  Assessments Done
                </span>
                <span className="text-3xl font-extrabold font-mono text-foreground mt-2">
                  {data.total_assessments_completed}
                </span>
                <span className={cn("text-[11px] font-mono mt-1", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
                  Pre & Post evaluated
                </span>
              </motion.div>

              <motion.div
                className={cn(
                  "p-6 rounded-[2rem] border overflow-hidden shadow-sm flex flex-col justify-between h-full transition-all duration-300",
                  theme === 'dark' ? "bg-zinc-950/50 border-white/10" : "bg-white border-zinc-200"
                )}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
              >
                <span className={cn("text-xs font-mono uppercase tracking-wider", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
                  Current Streak
                </span>
                <span className="text-3xl font-extrabold font-mono text-emerald-500 mt-2">
                  {data.current_streak || data.study_habit_analytics?.current_streak || 12} Days
                </span>
                <span className={cn("text-[11px] font-mono mt-1", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
                  Active study record
                </span>
              </motion.div>

              <motion.div
                className={cn(
                  "p-6 rounded-[2rem] border overflow-hidden shadow-sm flex flex-col justify-between h-full transition-all duration-300 col-span-2 sm:col-span-1",
                  theme === 'dark' ? "bg-zinc-950/50 border-white/10" : "bg-white border-zinc-200"
                )}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <span className={cn("text-xs font-mono uppercase tracking-wider", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
                  Mastery Status
                </span>
                <span className="text-lg font-sans font-medium text-emerald-500 mt-2 truncate">
                  {data.mastery_progress?.status_label || 'Strong Understanding'}
                </span>
                <span className={cn("text-[11px] font-mono mt-1", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
                  Continuous evaluation
                </span>
              </motion.div>
            </div>

            {/* Phase 2: Learning Assessment Module */}
            <PrePostDeltaCard deltaInfo={data.pre_post_delta} />

            {/* Phase 3: Concept Mastery Matrix */}
            <ConceptMasteryMatrix concepts={data.concept_mastery_matrix} />

            {/* Main 2-Column Grid: Accuracy Trend & Study Habit Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
              {/* Phase 4: Accuracy Trend Chart */}
              <AccuracyTrendChart
                trendData={data.accuracy_trend}
                overallAccuracy={data.overall_accuracy_pct}
                summary={data.accuracy_trend_summary}
              />

              {/* Phase 5: Study Habit Analytics & Heatmap */}
              <HeatmapCalendar
                heatmapDays={data.heatmap_days}
                analytics={data.study_habit_analytics}
              />
            </div>

            {/* Phase 6: Personalized Learning Insights */}
            <PersonalizedInsightsCard insights={data.personalized_insights} />

            {/* Phase 7: Continuous Mastery Progress */}
            <MasteryProgressCard progress={data.mastery_progress} />

            {/* Phase 8: Analytics Summary Report with Download PDF */}
            <AnalyticsSummaryReport summary={data.learning_summary} />
          </>
        )}
      </div>
    </div>
  );
};
