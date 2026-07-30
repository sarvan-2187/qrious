import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import type { VideoTemplate, VoiceGender } from '@/api/videoOverviews';

// Same three visual themes the standalone Video Overview chat page offers
// (VideoOverviewChatPage.tsx's own TEMPLATE_OPTIONS) — kept in sync by hand since
// they're two separate entry points into the same qstudio_service pipeline.
const TEMPLATE_OPTIONS: { value: VideoTemplate; label: string; description: string }[] = [
  { value: 'minimal_dark', label: 'Minimal Dark', description: 'Sleek black theme' },
  { value: 'bold_gradient', label: 'Bold Gradient', description: 'Vibrant colorful theme' },
  { value: 'academic_light', label: 'Academic Light', description: 'Clean lecture-note theme' },
];

const VOICE_OPTIONS: { value: VoiceGender; label: string }[] = [
  { value: 'female', label: 'Female Narrator' },
  { value: 'male', label: 'Male Narrator' },
];

interface VideoOverviewGenerateFormProps {
  generating: boolean;
  onGenerate: (template: VideoTemplate, voice: VoiceGender) => void;
  defaultTemplate?: VideoTemplate;
  defaultVoice?: VoiceGender;
  // Present only when regenerating an existing video (there's already a result to
  // fall back to) — lets the user back out of the config form without submitting.
  onCancel?: () => void;
}

export const VideoOverviewGenerateForm: React.FC<VideoOverviewGenerateFormProps> = ({
  generating,
  onGenerate,
  defaultTemplate = 'minimal_dark',
  defaultVoice = 'female',
  onCancel,
}) => {
  const { theme: uiTheme } = useTheme();
  const [template, setTemplate] = useState<VideoTemplate>(defaultTemplate);
  const [voice, setVoice] = useState<VoiceGender>(defaultVoice);

  return (
    <div className="flex flex-col gap-4">
      <p className={cn('text-sm', uiTheme === 'dark' ? 'text-zinc-400' : 'text-zinc-600')}>
        A narrated slide-deck video built from this study space's sources. Pick a visual theme and narrator voice.
      </p>
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1.5 flex-1 min-w-45">
          <label className={cn('text-xs font-mono uppercase tracking-wider', uiTheme === 'dark' ? 'text-zinc-500' : 'text-zinc-400')}>
            Theme
          </label>
          <Select value={template} onValueChange={(v) => setTemplate(v as VideoTemplate)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label} &mdash; {opt.description}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5 flex-1 min-w-45">
          <label className={cn('text-xs font-mono uppercase tracking-wider', uiTheme === 'dark' ? 'text-zinc-500' : 'text-zinc-400')}>
            Narrator voice
          </label>
          <Select value={voice} onValueChange={(v) => setVoice(v as VoiceGender)}>
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
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onGenerate(template, voice)}
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
              uiTheme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900',
            )}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
