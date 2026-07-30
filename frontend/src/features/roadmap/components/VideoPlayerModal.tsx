import React, { useEffect } from 'react';
import { FaTimes, FaYoutube, FaExternalLinkAlt } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: {
    title: string;
    url: string;
    source: string;
  } | null;
  onTimeSpentTick?: (seconds: number) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  isOpen,
  onClose,
  video,
  onTimeSpentTick
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Track watch time while modal is open (silently updates progress)
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      onTimeSpentTick?.(5);
    }, 5000);

    return () => clearInterval(interval);
  }, [isOpen, onTimeSpentTick]);

  if (!isOpen || !video) return null;

  // Robust YouTube embed URL extractor
  const getEmbedUrl = (url: string) => {
    try {
      if (!url) return '';

      if (url.includes('youtube.com/playlist') || url.includes('list=')) {
        const listMatch = url.match(/list=([a-zA-Z0-9_-]+)/);
        if (listMatch) {
          return `https://www.youtube.com/embed/videoseries?list=${listMatch[1]}&autoplay=1&rel=0`;
        }
      }

      if (url.includes('v=')) {
        const parts = url.split('v=');
        if (parts[1]) {
          const id = parts[1].split('&')[0].split('#')[0].split('?')[0];
          if (id && id.length >= 8) {
            return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
          }
        }
      }

      if (url.includes('youtu.be/')) {
        const parts = url.split('youtu.be/');
        if (parts[1]) {
          const id = parts[1].split('?')[0].split('&')[0].split('#')[0];
          if (id && id.length >= 8) {
            return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
          }
        }
      }

      if (url.includes('/embed/')) {
        const parts = url.split('/embed/');
        if (parts[1]) {
          const id = parts[1].split('?')[0].split('&')[0].split('#')[0];
          if (id && id.length >= 8) {
            return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
          }
        }
      }

      return url;
    } catch {
      return url;
    }
  };

  const embedUrl = getEmbedUrl(video.url);

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/30 backdrop-blur-sm animate-fade-in font-sans cursor-pointer"
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className={cn(
            "relative w-full max-w-4xl border rounded-[2rem] p-4 sm:p-6 shadow-none overflow-hidden font-sans cursor-default flex flex-col gap-4",
            isDark ? "bg-zinc-950/95 border-white/10 text-white" : "bg-white/95 border-zinc-200 text-zinc-900"
          )}
        >
          {/* Header */}
          <div className={cn("flex items-center justify-between gap-4 pb-3 border-b", isDark ? "border-white/10" : "border-zinc-200")}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0 shadow-sm">
                <FaYoutube className="text-xl" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-sans font-normal tracking-tight truncate leading-tight">
                  {video.title}
                </h3>
                <span className="text-xs font-mono text-emerald-500 font-medium block mt-0.5">
                  Trusted Source: {video.source}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className={cn(
                "w-9 h-9 rounded-full border flex items-center justify-center transition-colors shrink-0",
                isDark ? "bg-black border-white/10 text-zinc-400 hover:text-white" : "bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900"
              )}
            >
              <FaTimes className="text-sm" />
            </button>
          </div>

          {/* Responsive 16:9 Embedded Video Player Container */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black shadow-inner">
            <iframe
              src={embedUrl}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>

          {/* Footer with External Fallback & Done Button */}
          <div className="flex items-center justify-end gap-2 pt-1 text-xs font-mono">
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "px-4 py-1.5 rounded-lg border text-[11px] font-sans font-medium flex items-center gap-1.5 transition-colors",
                isDark ? "bg-black border-white/10 text-zinc-400 hover:text-white" : "bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900"
              )}
            >
              <span>Watch on YouTube</span>
              <FaExternalLinkAlt className="text-[9px]" />
            </a>

            <button
              onClick={onClose}
              className="px-5 py-1.5 bg-emerald-500 text-white rounded-lg shadow hover:bg-emerald-600 font-medium text-xs transition-colors shrink-0"
            >
              Done Watching
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
