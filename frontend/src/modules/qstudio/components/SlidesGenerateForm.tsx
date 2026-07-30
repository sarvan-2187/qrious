import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { SLIDE_THEME_OPTIONS } from '../types';
import type { SlideTheme } from '../types';

interface SlidesGenerateFormProps {
  generating: boolean;
  onGenerate: (theme: SlideTheme) => void;
}

export const SlidesGenerateForm: React.FC<SlidesGenerateFormProps> = ({ generating, onGenerate }) => {
  const { theme: uiTheme } = useTheme();
  const [slideTheme, setSlideTheme] = useState<SlideTheme>('minimal_dark');

  return (
    <div className="flex flex-col gap-4">
      <p className={cn("text-sm", uiTheme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
        A presentation deck built from this study space's sources — a title slide, section
        dividers, bullets, quotes, comparisons, and stat callouts. Pick a visual theme.
      </p>
      <div className="flex flex-col gap-1.5 max-w-xs">
        <label className={cn("text-xs font-mono uppercase tracking-wider", uiTheme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
          Theme
        </label>
        <Select value={slideTheme} onValueChange={(v) => setSlideTheme(v as SlideTheme)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SLIDE_THEME_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <button
        onClick={() => onGenerate(slideTheme)}
        disabled={generating}
        className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 w-fit"
      >
        {generating ? 'Generating…' : 'Generate'}
      </button>
    </div>
  );
};
