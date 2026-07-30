import React, { useState } from 'react';
import type { AccuracyTrendItem, AccuracyTrendSummary } from '../types/analytics.types';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface AccuracyTrendChartProps {
  trendData: AccuracyTrendItem[];
  overallAccuracy: number;
  summary?: AccuracyTrendSummary;
}

export const AccuracyTrendChart: React.FC<AccuracyTrendChartProps> = ({ trendData, summary }) => {
  const { theme } = useTheme();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const scores = trendData.map((d) => d.score_pct);
  const bestScore = summary?.best_score ?? (scores.length > 0 ? Math.max(...scores) : 88);
  const lowestScore = summary?.lowest_score ?? (scores.length > 0 ? Math.min(...scores) : 64);
  const trendSummary = summary?.trend_summary ?? `Accuracy has improved by ${scores.length > 1 ? Math.round(scores[scores.length - 1] - scores[0]) : 18}% over the last eight learning sessions.`;

  // SVG Chart Geometry
  const width = 600;
  const height = 180;
  const paddingX = 40;
  const paddingY = 20;

  const points = trendData.map((item, idx) => {
    const x = paddingX + (idx / Math.max(trendData.length - 1, 1)) * (width - paddingX * 2);
    const y = height - paddingY - (item.score_pct / 100) * (height - paddingY * 2);
    return { x, y, ...item };
  });

  const pathD = points.reduce((acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`), '');

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
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-medium tracking-tight">Accuracy Trend</h3>
            <p className={cn("text-xs mt-0.5", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
              Single-line academic visualization across recent learning sessions
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <span className={cn(
              "px-3 py-1 rounded-full border",
              theme === 'dark' ? "bg-zinc-900 border-white/10 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700"
            )}>
              Best: {bestScore}%
            </span>
            <span className={cn(
              "px-3 py-1 rounded-full border",
              theme === 'dark' ? "bg-zinc-900 border-white/10 text-zinc-400" : "bg-zinc-100 border-zinc-200 text-zinc-600"
            )}>
              Lowest: {lowestScore}%
            </span>
          </div>
        </div>

        {/* Clean SVG Line Chart */}
        <div className="relative w-full my-4">
          {trendData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 border border-dashed rounded-2xl">
              <p className={cn("text-sm font-sans", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
                No quiz or assessment sessions completed yet.
              </p>
            </div>
          ) : (
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 overflow-visible">
              {/* Horizontal Light Grid lines */}
              {[25, 50, 75, 100].map((val) => {
                const y = height - paddingY - (val / 100) * (height - paddingY * 2);
                return (
                  <g key={val}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={width - paddingX}
                      y2={y}
                      stroke={theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)'}
                      strokeDasharray="4 4"
                    />
                    <text
                      x={paddingX - 10}
                      y={y + 4}
                      fill={theme === 'dark' ? '#71717a' : '#a1a1aa'}
                      fontSize="10"
                      textAnchor="end"
                      fontFamily="monospace"
                    >
                      {val}%
                    </text>
                  </g>
                );
              })}

              {/* Single Accent Line */}
              <path
                d={pathD}
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Interactive Points */}
              {points.map((pt, idx) => (
                <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredIdx(idx)} onMouseLeave={() => setHoveredIdx(null)}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredIdx === idx ? "6" : "4"}
                    fill={hoveredIdx === idx ? "#10b981" : theme === 'dark' ? "#09090b" : "#ffffff"}
                    stroke="#10b981"
                    strokeWidth="2.5"
                    className="transition-all duration-200"
                  />

                {/* X-Axis Date Label */}
                <text
                  x={pt.x}
                  y={height - 2}
                  fill={theme === 'dark' ? '#a1a1aa' : '#71717a'}
                  fontSize="10"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {pt.taken_at}
                </text>
              </g>
            ))}
          </svg>
          )}

          {/* Hover Tooltip */}
          {hoveredIdx !== null && points[hoveredIdx] && (
            <div
              className={cn(
                "absolute -top-10 transform -translate-x-1/2 px-3 py-1.5 rounded-lg border text-xs font-mono shadow-md z-10 pointer-events-none transition-all",
                theme === 'dark' ? "bg-zinc-900 border-white/20 text-white" : "bg-zinc-900 text-white border-zinc-800"
              )}
              style={{ left: `${(points[hoveredIdx].x / width) * 100}%` }}
            >
              {points[hoveredIdx].title}: <span className="font-bold text-emerald-400">{points[hoveredIdx].score_pct}%</span>
            </div>
          )}
        </div>

        {/* Small Summary Caption */}
        <div className={cn(
          "mt-4 p-3 rounded-xl border text-xs font-mono flex items-center justify-between",
          theme === 'dark' ? "bg-zinc-900/40 border-white/10 text-zinc-400" : "bg-zinc-50 border-zinc-200 text-zinc-600"
        )}>
          <span>{trendSummary}</span>
        </div>
      </div>
    </motion.div>
  );
};
