import React, { useEffect, useRef, useState } from 'react';
import { FaHeadphones } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useQStudioApi } from '../hooks/useQStudioApi';
import { VOICE_OPTIONS } from '../types';
import type { AudioOverviewResult, Output } from '../types';

interface AudioOverviewOutputCardProps {
  outputId: string;
  // The parent's own `outputs` list is only a snapshot from the moment generation
  // started — it never learns this doc finished unless told. Called once when
  // polling here settles on 'ready' or 'failed', so the parent can refresh and
  // e.g. show its "Regenerate" affordance again.
  onSettled?: () => void;
}

const POLL_INTERVAL_MS = 3000;

const voiceLabel = (key: string) => VOICE_OPTIONS.find((v) => v.value === key)?.label ?? key;

export const AudioOverviewOutputCard: React.FC<AudioOverviewOutputCardProps> = ({ outputId, onSettled }) => {
  const { theme } = useTheme();
  const { getOutput, getAudioOutputUrl } = useQStudioApi();
  const [output, setOutput] = useState<Output | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setOutput(null);
    setAudioUrl(null);
    setError(null);

    const poll = async () => {
      try {
        const result = await getOutput(outputId);
        setOutput(result);
        if (result.status === 'ready') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          onSettled?.();
          try {
            const urlResult = await getAudioOutputUrl(outputId);
            setAudioUrl(urlResult.audio_url);
          } catch (err: any) {
            setError(err.message || 'Failed to load audio.');
          }
        } else if (result.status === 'failed') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          onSettled?.();
        }
      } catch (err: any) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setError(err.message || 'Lost connection while checking status.');
      }
    };

    poll();
    pollTimerRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outputId]);

  if (error || output?.status === 'failed') {
    return (
      <div className="text-sm text-red-500">{error || output?.error || 'Audio generation failed.'}</div>
    );
  }

  if (output?.status === 'ready' && audioUrl) {
    const result = output.result as AudioOverviewResult;
    return (
      <div className="space-y-3">
        <div className={cn(
          "flex items-center gap-3 p-4 rounded-2xl border",
          theme === 'dark' ? "bg-black/40 border-white/10" : "bg-zinc-50 border-zinc-200",
        )}>
          <div className={cn(
            "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0",
            theme === 'dark' ? "bg-black border-white/10 text-emerald-400" : "bg-white border-zinc-200 text-emerald-600",
          )}>
            <FaHeadphones />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">Deep dive with {voiceLabel(result.voice_a)} &amp; {voiceLabel(result.voice_b)}</p>
            <p className={cn("text-xs", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
              {Math.round(result.duration_seconds)}s
            </p>
          </div>
        </div>
        <audio controls src={audioUrl} className="w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={cn("flex items-center gap-2 text-sm", theme === 'dark' ? "text-zinc-400" : "text-zinc-500")}>
        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        Writing the dialogue and recording narration…
      </div>
      <div className={cn("h-1.5 w-full rounded-full overflow-hidden", theme === 'dark' ? "bg-white/10" : "bg-zinc-200")}>
        <motion.div
          className="h-full rounded-full bg-emerald-500"
          initial={{ width: '10%' }}
          animate={{ width: '70%' }}
          transition={{ duration: 20, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};
