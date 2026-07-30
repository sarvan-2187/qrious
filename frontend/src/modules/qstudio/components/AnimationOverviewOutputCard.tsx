import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useQStudioApi } from '../hooks/useQStudioApi';
import type { AnimationResult, Output } from '../types';

interface AnimationOverviewOutputCardProps {
  outputId: string;
  // Same reasoning as AudioOverviewOutputCard/SlidesOutputCard: the parent's
  // `outputs` snapshot never learns this doc finished unless told — called
  // once polling here settles on 'ready' or 'failed'.
  onSettled?: () => void;
}

const POLL_INTERVAL_MS = 3000;

export const AnimationOverviewOutputCard: React.FC<AnimationOverviewOutputCardProps> = ({ outputId, onSettled }) => {
  const { theme } = useTheme();
  const { getOutput, getAnimationOutputUrl } = useQStudioApi();
  const [output, setOutput] = useState<Output | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setOutput(null);
    setVideoUrl(null);
    setError(null);

    const poll = async () => {
      try {
        const result = await getOutput(outputId);
        setOutput(result);
        if (result.status === 'ready') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          onSettled?.();
          try {
            const urlResult = await getAnimationOutputUrl(outputId);
            setVideoUrl(urlResult.video_url);
          } catch (err: any) {
            setError(err.message || 'Failed to load animation.');
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
      <div className="text-sm text-red-500">{error || output?.error || 'Animation generation failed.'}</div>
    );
  }

  if (output?.status === 'ready' && videoUrl) {
    const result = output.result as AnimationResult;
    return (
      <div className="space-y-3">
        <video controls src={videoUrl} className="w-full rounded-2xl" />
        <p className={cn('text-xs', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400')}>
          {Math.round(result.duration_seconds)}s
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={cn('flex items-center gap-2 text-sm', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500')}>
        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        Writing the storyboard and rendering the animation…
      </div>
      <div className={cn('h-1.5 w-full rounded-full overflow-hidden', theme === 'dark' ? 'bg-white/10' : 'bg-zinc-200')}>
        <motion.div
          className="h-full rounded-full bg-emerald-500"
          initial={{ width: '10%' }}
          animate={{ width: '70%' }}
          transition={{ duration: 45, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};
