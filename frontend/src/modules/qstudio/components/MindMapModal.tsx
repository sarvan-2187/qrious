import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { MindMapViewer } from './MindMapViewer';
import type { MindMapResult } from '../types';

interface MindMapModalProps {
  result: MindMapResult;
  onClose: () => void;
}

export const MindMapModal: React.FC<MindMapModalProps> = ({ result, onClose }) => {
  const { theme } = useTheme();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 md:p-10"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full h-full max-w-6xl rounded-[2rem] border shadow-none flex flex-col overflow-hidden",
          theme === 'dark' ? "bg-zinc-950/95 border-white/10" : "bg-white/95 border-zinc-200",
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 shrink-0">
          <h3 className="font-semibold text-lg">Mind Map</h3>
          <button
            onClick={onClose}
            title="Close"
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
              theme === 'dark' ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100",
            )}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 px-6 pb-6">
          <MindMapViewer result={result} className="h-full" />
        </div>
      </div>
    </div>
  );
};
