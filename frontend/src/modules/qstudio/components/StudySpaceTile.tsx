import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Layers, Trash2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { StudySpaceSummary } from '../types';

interface StudySpaceTileProps {
  studySpace: StudySpaceSummary;
  onDelete: (id: string) => void;
}

export const StudySpaceTile: React.FC<StudySpaceTileProps> = ({ studySpace, onDelete }) => {
  const { theme } = useTheme();

  return (
    <motion.div
      className={cn(
        "p-8 rounded-[2rem] border overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col h-full relative",
        theme === 'dark'
          ? "bg-zinc-950/50 border-white/10 hover:border-emerald-500/50 hover:bg-white/5"
          : "bg-white border-zinc-200 hover:border-emerald-500/30",
      )}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
    >
      <button
        onClick={(e) => { e.preventDefault(); onDelete(studySpace.id); }}
        title="Delete study space"
        className={cn(
          "absolute top-6 right-6 w-8 h-8 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
          theme === 'dark' ? "text-zinc-500 hover:text-red-400 hover:bg-red-500/10" : "text-zinc-400 hover:text-red-500 hover:bg-red-50",
        )}
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <Link to={`/qstudio/${studySpace.id}`} className="flex flex-col h-full">
        <div className={cn(
          "w-12 h-12 rounded-2xl border flex items-center justify-center mb-6 shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:text-emerald-500",
          theme === 'dark' ? "bg-black border-white/10 text-zinc-400" : "bg-zinc-50 border-zinc-200 text-zinc-700",
        )}>
          <Layers className="w-6 h-6" />
        </div>

        <h3 className="text-2xl font-semibold mb-3 pr-8">{studySpace.title}</h3>
        <p className={cn("mb-8 flex-1 text-sm", theme === 'dark' ? "text-zinc-400" : "text-zinc-500")}>
          {studySpace.source_count} {studySpace.source_count === 1 ? 'source' : 'sources'} · {studySpace.output_count}{' '}
          {studySpace.output_count === 1 ? 'output' : 'outputs'} · updated{' '}
          {new Date(studySpace.updated_at).toLocaleDateString()}
        </p>

        <div className="inline-flex items-center gap-2 text-emerald-500 font-medium transition-colors w-fit text-sm">
          Open study space <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </div>
      </Link>
    </motion.div>
  );
};
