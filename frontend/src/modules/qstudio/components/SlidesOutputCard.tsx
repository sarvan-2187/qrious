import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useQStudioApi } from '../hooks/useQStudioApi';
import { SlidesViewer } from './SlidesViewer';
import type { Output, SlidesResult } from '../types';

interface SlidesOutputCardProps {
  outputId: string;
  // Same reasoning as AudioOverviewOutputCard: the parent's `outputs` snapshot never
  // learns this doc finished unless told — called once polling here settles.
  onSettled?: () => void;
}

const POLL_INTERVAL_MS = 3000;

export const SlidesOutputCard: React.FC<SlidesOutputCardProps> = ({ outputId, onSettled }) => {
  const { theme } = useTheme();
  const { getOutput } = useQStudioApi();
  const [output, setOutput] = useState<Output | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setOutput(null);
    setError(null);

    const poll = async () => {
      try {
        const result = await getOutput(outputId);
        setOutput(result);
        if (result.status === 'ready' || result.status === 'failed') {
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
      <div className="text-sm text-red-500">{error || output?.error || 'Slide deck generation failed.'}</div>
    );
  }

  if (output?.status === 'ready') {
    return <SlidesViewer outputId={outputId} result={output.result as SlidesResult} />;
  }

  return (
    <div className="space-y-3">
      <div className={cn('flex items-center gap-2 text-sm', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500')}>
        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        Writing the deck and rendering slides…
      </div>
      <div className={cn('h-1.5 w-full rounded-full overflow-hidden', theme === 'dark' ? 'bg-white/10' : 'bg-zinc-200')}>
        <motion.div
          className="h-full rounded-full bg-emerald-500"
          initial={{ width: '10%' }}
          animate={{ width: '70%' }}
          transition={{ duration: 25, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};
