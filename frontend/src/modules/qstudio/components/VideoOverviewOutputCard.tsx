import React, { useEffect, useRef, useState } from 'react';
import { getVideoOverviewStatus, getVideoOverviewViewUrl } from '@/api/videoOverviews';
import type { VideoOverviewStatus } from '@/api/videoOverviews';
import { VideoResourcePlayer } from '@/components/VideoResourcePlayer';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface VideoOverviewOutputCardProps {
  videoOverviewId: string;
}

const POLL_INTERVAL_MS = 3000;

const STATUS_LABEL: Record<VideoOverviewStatus, string> = {
  queued: 'Queued…',
  scripting: 'Writing slide script…',
  narrating: 'Generating narration audio…',
  rendering: 'Rendering slides…',
  assembling: 'Assembling video…',
  uploading: 'Uploading video…',
  ready: 'Ready',
  failed: 'Failed',
};

const STATUS_PROGRESS: Record<VideoOverviewStatus, number> = {
  queued: 5,
  scripting: 20,
  narrating: 40,
  rendering: 60,
  assembling: 80,
  uploading: 92,
  ready: 100,
  failed: 100,
};

// This card only exists in local dev — qstudio_service (which does the actual
// rendering) runs local-Docker-only for this MVP, same as the standalone Video
// Overview chat page. See PLANS/qstudio.md §0a / video-overview-generator.md.
export const VideoOverviewOutputCard: React.FC<VideoOverviewOutputCardProps> = ({ videoOverviewId }) => {
  const { theme } = useTheme();
  const [status, setStatus] = useState<VideoOverviewStatus>('queued');
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const result = await getVideoOverviewStatus(videoOverviewId);
        setStatus(result.status);
        setError(result.error ?? null);
        if (result.status === 'ready' || result.status === 'failed') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        }
      } catch (err: any) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setStatus('failed');
        setError(err.message || 'Lost connection while checking status.');
      }
    };

    poll();
    pollTimerRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [videoOverviewId]);

  if (status === 'failed') {
    return (
      <div className="text-sm text-red-500">{error || 'Video generation failed.'}</div>
    );
  }

  if (status === 'ready') {
    return (
      <div className="w-full aspect-video rounded-xl overflow-hidden">
        <VideoResourcePlayer resourceId={videoOverviewId} title="AI Video Overview" fetchUrl={getVideoOverviewViewUrl} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={cn("flex items-center gap-2 text-sm", theme === 'dark' ? "text-zinc-400" : "text-zinc-500")}>
        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        {STATUS_LABEL[status]}
      </div>
      <div className={cn("h-1.5 w-full rounded-full overflow-hidden", theme === 'dark' ? "bg-white/10" : "bg-zinc-200")}>
        <motion.div
          className="h-full rounded-full bg-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${STATUS_PROGRESS[status]}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </div>
  );
};
