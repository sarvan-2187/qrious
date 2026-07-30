import React from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { FaBrain, FaFileAlt, FaFilm, FaGraduationCap, FaHeadphones, FaImages, FaLayerGroup, FaNewspaper, FaShapes } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { IMPLEMENTED_OUTPUT_TYPES, OUTPUT_TYPE_LABELS } from '../types';
import type { Output, OutputType } from '../types';

const OUTPUT_ICONS: Record<OutputType, React.ReactNode> = {
  mindmap: <FaBrain />,
  flashcards: <FaLayerGroup />,
  briefing: <FaFileAlt />,
  study_guide: <FaGraduationCap />,
  blog_post: <FaNewspaper />,
  video: <FaFilm />,
  audio: <FaHeadphones />,
  slides: <FaImages />,
  animation: <FaShapes />,
};

export const STUDIO_GRID_ORDER: OutputType[] = [
  'mindmap', 'flashcards', 'briefing', 'study_guide', 'blog_post', 'video', 'audio', 'slides', 'animation',
];

interface StudioPanelProps {
  outputs: Output[];
  generating: OutputType | null;
  selectedType: OutputType | null;
  onSelect: (type: OutputType) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export const StudioPanel: React.FC<StudioPanelProps> = ({
  outputs,
  generating,
  selectedType,
  onSelect,
  collapsed,
  onToggleCollapsed,
}) => {
  const { theme } = useTheme();

  const latestOutputByType = (type: OutputType) =>
    outputs.filter((o) => o.type === type).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  if (collapsed) {
    return (
      <div className={cn(
        "w-14 shrink-0 rounded-[2rem] border shadow-sm flex flex-col items-center gap-2 py-4 overflow-y-auto custom-scrollbar",
        theme === 'dark' ? "bg-zinc-950/50 border-white/10" : "bg-white border-zinc-200",
      )}>
        <button
          onClick={onToggleCollapsed}
          title="Expand Studio panel"
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0",
            theme === 'dark' ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100",
          )}
        >
          <PanelRightOpen className="w-4 h-4" />
        </button>

        <div className={cn("w-8 h-px shrink-0 my-0.5", theme === 'dark' ? "bg-white/10" : "bg-zinc-200")} />

        {/* Icon-only rail — each output type stays selectable without expanding
            the panel, so it doesn't just collapse into a dead end. */}
        {STUDIO_GRID_ORDER.map((type) => {
          const implemented = IMPLEMENTED_OUTPUT_TYPES.includes(type);
          const output = latestOutputByType(type);
          const isGenerating = generating === type;
          const isSelected = selectedType === type;
          const statusWord = !implemented
            ? 'Soon'
            : isGenerating
              ? 'Generating…'
              : output?.status === 'ready'
                ? 'Ready'
                : output?.status === 'failed'
                  ? 'Failed'
                  : 'Not generated yet';

          return (
            <button
              key={type}
              onClick={() => implemented && !isGenerating && onSelect(type)}
              disabled={!implemented || isGenerating}
              title={`${OUTPUT_TYPE_LABELS[type]} — ${statusWord}`}
              className={cn(
                "relative w-9 h-9 rounded-xl border flex items-center justify-center text-sm shrink-0 transition-colors disabled:cursor-not-allowed",
                isSelected
                  ? theme === 'dark' ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" : "bg-emerald-50 border-emerald-500/30 text-emerald-600"
                  : theme === 'dark' ? "bg-black/30 border-white/10 text-zinc-400 hover:border-emerald-500/30" : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-emerald-500/30",
                !implemented && "opacity-40",
              )}
            >
              {OUTPUT_ICONS[type]}
              {implemented && isGenerating && (
                <Loader2 className={cn(
                  "absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-emerald-500 animate-spin",
                  theme === 'dark' ? "bg-zinc-950" : "bg-white",
                )} />
              )}
              {implemented && !isGenerating && output?.status === 'ready' && (
                <CheckCircle2 className={cn(
                  "absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-emerald-500",
                  theme === 'dark' ? "bg-zinc-950" : "bg-white",
                )} />
              )}
              {implemented && !isGenerating && output?.status === 'failed' && (
                <span className={cn(
                  "absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 ring-2",
                  theme === 'dark' ? "ring-zinc-950" : "ring-white",
                )} />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn(
      "w-full lg:w-[300px] shrink-0 rounded-[2rem] border shadow-sm p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar",
      theme === 'dark' ? "bg-zinc-950/50 border-white/10" : "bg-white border-zinc-200",
    )}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight uppercase text-emerald-500">Studio</h2>
        <button
          onClick={onToggleCollapsed}
          title="Collapse Studio panel"
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
            theme === 'dark' ? "text-zinc-500 hover:text-white hover:bg-white/5" : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100",
          )}
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        {STUDIO_GRID_ORDER.map((type) => {
          const implemented = IMPLEMENTED_OUTPUT_TYPES.includes(type);
          const output = latestOutputByType(type);
          const isGenerating = generating === type;
          const isSelected = selectedType === type;

          return (
            <button
              key={type}
              onClick={() => implemented && !isGenerating && onSelect(type)}
              disabled={!implemented || isGenerating}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors disabled:cursor-not-allowed",
                isSelected
                  ? theme === 'dark' ? "bg-emerald-500/10 border-emerald-500/40" : "bg-emerald-50 border-emerald-500/30"
                  : theme === 'dark' ? "bg-black/30 border-white/10 hover:border-emerald-500/30" : "bg-zinc-50 border-zinc-200 hover:border-emerald-500/30",
                !implemented && "opacity-50",
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg border flex items-center justify-center text-sm shrink-0",
                theme === 'dark' ? "bg-black border-white/10 text-zinc-400" : "bg-white border-zinc-200 text-zinc-600",
              )}>
                {OUTPUT_ICONS[type]}
              </div>
              <span className="flex-1 text-sm font-medium">{OUTPUT_TYPE_LABELS[type]}</span>

              {!implemented && (
                <span className={cn("text-[10px] uppercase font-mono", theme === 'dark' ? "text-zinc-600" : "text-zinc-400")}>
                  Soon
                </span>
              )}
              {implemented && isGenerating && (
                <Loader2 className="w-4 h-4 text-emerald-500 animate-spin shrink-0" />
              )}
              {implemented && !isGenerating && output?.status === 'ready' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
              {implemented && !isGenerating && output?.status === 'failed' && (
                <span className="text-[10px] uppercase font-mono text-red-500 shrink-0">Failed</span>
              )}
              {implemented && !isGenerating && !output && (
                <ChevronRight className={cn("w-4 h-4 shrink-0", theme === 'dark' ? "text-zinc-600" : "text-zinc-400")} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
