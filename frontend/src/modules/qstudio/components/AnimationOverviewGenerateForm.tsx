import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { SLIDE_THEME_OPTIONS } from '../types';
import type { SlideTheme } from '../types';

// Single narrator, female/male binary — same as Video Overview's own picker
// (VideoOverviewGenerateForm.tsx), not Audio Overview's 6-voice VOICE_OPTIONS
// catalog. See PLANS/qstudio-animation.md §3/§7. Voice is optional — 'none'
// is a real selectable choice (a silent animation, no narration synthesis),
// not just a fallback/unset state — see pipeline_manim.py::run_animation_pipeline.
type AnimationVoice = 'female' | 'male';
type VoiceSelection = AnimationVoice | 'none';

const VOICE_OPTIONS: { value: VoiceSelection; label: string }[] = [
  { value: 'female', label: 'Female Narrator' },
  { value: 'male', label: 'Male Narrator' },
  { value: 'none', label: 'No narration (silent)' },
];

interface AnimationOverviewGenerateFormProps {
  generating: boolean;
  onGenerate: (voice: AnimationVoice | null, animationTheme: SlideTheme) => void;
  defaultVoice?: AnimationVoice | null;
  defaultAnimationTheme?: SlideTheme;
  // Present only when regenerating an existing animation (there's already a
  // result to fall back to) — same shape as VideoOverviewGenerateForm's
  // onCancel, lets the user back out of the config form without submitting.
  onCancel?: () => void;
}

export const AnimationOverviewGenerateForm: React.FC<AnimationOverviewGenerateFormProps> = ({
  generating,
  onGenerate,
  defaultVoice = 'female',
  defaultAnimationTheme = 'minimal_dark',
  onCancel,
}) => {
  const { theme } = useTheme();
  const [voice, setVoice] = useState<VoiceSelection>(defaultVoice ?? 'none');
  const [animationTheme, setAnimationTheme] = useState<SlideTheme>(defaultAnimationTheme);

  return (
    <div className="flex flex-col gap-4">
      <p className={cn('text-sm', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600')}>
        A short narrated Manim animation built from this study space's sources — concepts, comparisons, and simple diagrams brought to life with motion.
      </p>
      <div className="flex flex-col gap-1.5 max-w-56">
        <label className={cn('text-xs font-mono uppercase tracking-wider', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400')}>
          Narrator voice
        </label>
        <Select value={voice} onValueChange={(v) => setVoice(v as VoiceSelection)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VOICE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5 max-w-56">
        <label className={cn('text-xs font-mono uppercase tracking-wider', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400')}>
          Visual theme
        </label>
        <Select value={animationTheme} onValueChange={(v) => setAnimationTheme(v as SlideTheme)}>
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
      <div className="flex items-center gap-3">
        <button
          onClick={() => onGenerate(voice === 'none' ? null : voice, animationTheme)}
          disabled={generating}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 w-fit"
        >
          {generating ? 'Generating…' : 'Generate'}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={generating}
            className={cn(
              'text-xs font-medium transition-colors disabled:opacity-50',
              theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900',
            )}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
