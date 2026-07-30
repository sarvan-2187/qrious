import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { VOICE_OPTIONS } from '../types';
import type { VoiceKey } from '../types';

interface AudioOverviewGenerateFormProps {
  generating: boolean;
  onGenerate: (voiceA: VoiceKey, voiceB: VoiceKey) => void;
}

export const AudioOverviewGenerateForm: React.FC<AudioOverviewGenerateFormProps> = ({ generating, onGenerate }) => {
  const { theme } = useTheme();
  const [voiceA, setVoiceA] = useState<VoiceKey>('jenny');
  const [voiceB, setVoiceB] = useState<VoiceKey>('guy');

  return (
    <div className="flex flex-col gap-4">
      <p className={cn("text-sm", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
        A two-host "deep dive" conversation about this study space's sources. Pick a voice for each host.
      </p>
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1.5 flex-1 min-w-45">
          <label className={cn("text-xs font-mono uppercase tracking-wider", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
            Host A voice
          </label>
          <Select value={voiceA} onValueChange={(v) => setVoiceA(v as VoiceKey)}>
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
        <div className="flex flex-col gap-1.5 flex-1 min-w-45">
          <label className={cn("text-xs font-mono uppercase tracking-wider", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
            Host B voice
          </label>
          <Select value={voiceB} onValueChange={(v) => setVoiceB(v as VoiceKey)}>
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
      <button
        onClick={() => onGenerate(voiceA, voiceB)}
        disabled={generating}
        className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 w-fit"
      >
        {generating ? 'Generating…' : 'Generate'}
      </button>
    </div>
  );
};
