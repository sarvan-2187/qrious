import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Book, Trash2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { NotebookSummary } from '../types';

interface NotebookTileProps {
  notebook: NotebookSummary;
  onDelete: (id: string) => void;
}

export const NotebookTile: React.FC<NotebookTileProps> = ({ notebook, onDelete }) => {
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
        onClick={(e) => { e.preventDefault(); onDelete(notebook.id); }}
        title="Delete notebook"
        className={cn(
          "absolute top-6 right-6 w-8 h-8 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
          theme === 'dark' ? "text-zinc-500 hover:text-red-400 hover:bg-red-500/10" : "text-zinc-400 hover:text-red-500 hover:bg-red-50",
        )}
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <Link to={`/qbook/${notebook.id}`} className="flex flex-col h-full">
        <div className={cn(
          "w-12 h-12 rounded-2xl border flex items-center justify-center mb-6 shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:text-emerald-500",
          theme === 'dark' ? "bg-black border-white/10 text-zinc-400" : "bg-zinc-50 border-zinc-200 text-zinc-700",
        )}>
          <Book className="w-6 h-6" />
        </div>

        <h3 className="text-2xl font-semibold mb-3 pr-8">{notebook.title}</h3>
        <p className={cn("mb-8 flex-1 text-sm", theme === 'dark' ? "text-zinc-400" : "text-zinc-500")}>
          {notebook.cell_count} {notebook.cell_count === 1 ? 'cell' : 'cells'} · updated{' '}
          {new Date(notebook.updated_at).toLocaleDateString()}
        </p>

        <div className="inline-flex items-center gap-2 text-emerald-500 font-medium transition-colors w-fit text-sm">
          Open notebook <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </div>
      </Link>
    </motion.div>
  );
};
