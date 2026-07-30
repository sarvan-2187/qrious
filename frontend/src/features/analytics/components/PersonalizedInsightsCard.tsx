import React from 'react';
import type { PersonalizedInsight } from '../types/analytics.types';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { FaLightbulb, FaCheck, FaExclamationTriangle, FaArrowRight } from 'react-icons/fa';

interface PersonalizedInsightsCardProps {
  insights: PersonalizedInsight[];
}

const INSIGHT_ICONS = {
  strength: <FaCheck className="text-emerald-500 text-sm" />,
  improvement: <FaExclamationTriangle className="text-amber-500 text-sm" />,
  recommendation: <FaArrowRight className="text-blue-500 text-sm" />
};

export const PersonalizedInsightsCard: React.FC<PersonalizedInsightsCardProps> = ({ insights }) => {
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
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm",
            theme === 'dark' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-600"
          )}>
            <FaLightbulb className="text-lg" />
          </div>
          <div>
            <h3 className="text-xl font-medium tracking-tight">Personalized Learning Insights</h3>
            <p className={cn("text-xs mt-0.5", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
              Structured academic evidence and evidence-based guidance
            </p>
          </div>
        </div>

        {/* 3 Insight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.slice(0, 3).map((item, idx) => (
            <div
              key={idx}
              className={cn(
                "p-5 rounded-2xl border flex flex-col justify-between space-y-3 transition-all duration-200 hover:scale-[1.01]",
                theme === 'dark' ? "bg-zinc-900/40 border-white/10" : "bg-zinc-50 border-zinc-200"
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center border shrink-0",
                  theme === 'dark' ? "bg-zinc-800 border-white/10" : "bg-white border-zinc-200 shadow-xs"
                )}>
                  {INSIGHT_ICONS[item.type] || <FaLightbulb className="text-amber-500 text-xs" />}
                </div>
                <span className="font-semibold text-xs uppercase tracking-wider font-mono text-foreground">
                  {item.title}
                </span>
              </div>

              <p className={cn("text-xs leading-relaxed font-sans", theme === 'dark' ? "text-zinc-300" : "text-zinc-700")}>
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
