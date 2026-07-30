import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Library } from 'lucide-react';
import type { AlgorithmSummary } from '../hooks/useAlgorithmApi';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface AlgorithmCardProps {
  algorithm: AlgorithmSummary;
}

export const AlgorithmCard: React.FC<AlgorithmCardProps> = ({ algorithm }) => {
  const { theme } = useTheme();
  const navigate = useNavigate();

  return (
    <motion.div 
      onClick={() => {
        if (algorithm.status !== 'coming_soon') {
          navigate(`/algorithms/${algorithm.slug}`);
        }
      }}
      className={cn(
        "p-8 rounded-[2rem] border overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col h-full relative",
        algorithm.status === 'coming_soon' ? "cursor-default opacity-80 hover:border-zinc-500/30" : "cursor-pointer",
        theme === 'dark' 
          ? (algorithm.status === 'coming_soon' ? "bg-zinc-950/50 border-white/10" : "bg-zinc-950/50 border-white/10 hover:border-emerald-500/50 hover:bg-white/5") 
          : (algorithm.status === 'coming_soon' ? "bg-white border-zinc-200" : "bg-white border-zinc-200 hover:border-emerald-500/30")
      )}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-row justify-between items-start mb-4">
        <div className={cn(
          "w-12 h-12 rounded-2xl border flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:text-emerald-500",
          theme === 'dark' ? "bg-black border-white/10 text-zinc-400" : "bg-zinc-50 border-zinc-200 text-zinc-700"
        )}>
          <Library className="w-6 h-6" />
        </div>
        <div className="flex flex-col gap-2 items-end">
          <span className={cn(
            "text-xs px-2 py-1 rounded-full border",
            algorithm.difficulty.toLowerCase().includes("beginner") ? "border-green-500/30 text-green-500 bg-green-500/10" :
            algorithm.difficulty.toLowerCase().includes("advanced") ? "border-red-500/30 text-red-500 bg-red-500/10" :
            "border-yellow-500/30 text-yellow-500 bg-yellow-500/10"
          )}>
            {algorithm.difficulty || 'Intermediate'}
          </span>
          <span className={cn("text-xs px-2 py-1 rounded-full border border-zinc-500/30 text-zinc-400 bg-zinc-500/10 max-w-[150px] truncate")}>
            {algorithm.category || 'Quantum'}
          </span>
        </div>
      </div>
      
      <h3 className="text-xl font-semibold mb-3 leading-tight">{algorithm.name}</h3>
      <p className={cn(
        "mb-8 flex-1 leading-relaxed text-sm line-clamp-3",
        theme === 'dark' ? "text-zinc-400" : "text-zinc-500"
      )}>
        {algorithm.shortDescription || 'Explore the theory, complexity, and interactive simulation of this fundamental quantum algorithm.'}
      </p>

      <div className="flex justify-between items-center mt-auto">
        <div className={cn(
          "inline-flex items-center gap-2 font-medium transition-colors text-sm",
          algorithm.status === 'coming_soon' ? "text-zinc-500 cursor-not-allowed" : "text-emerald-500"
        )}>
          Read More <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </div>
        {algorithm.status === 'coming_soon' ? (
          <span className="text-xs px-3 py-1.5 rounded-lg border border-orange-500/30 text-orange-500 bg-orange-500/10 font-medium">
            Coming Soon
          </span>
        ) : (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/playground?algorithm=${algorithm.slug}`);
            }}
            className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            Run/Experiment
          </button>
        )}
      </div>
    </motion.div>
  );
};
