import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { FaDownload } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { useQStudioApi } from '../hooks/useQStudioApi';
import { SlideStage, STAGE_WIDTH } from './SlideStage';
import type { SlidesResult } from '../types';

interface SlidesViewerProps {
  outputId: string;
  result: SlidesResult;
}

export const SlidesViewer: React.FC<SlidesViewerProps> = ({ outputId, result }) => {
  const { theme } = useTheme();
  const { getSlidesOutputUrls } = useQStudioApi();
  const [index, setIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const stageWrapRef = useRef<HTMLDivElement>(null);

  const total = result.slides.length;
  const slide = result.slides[index];

  useLayoutEffect(() => {
    const el = stageWrapRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / STAGE_WIDTH);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(total - 1, i + 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [total]);

  const handlePresent = () => {
    stageWrapRef.current?.requestFullscreen?.();
  };

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      let url = pdfUrl;
      if (!url) {
        const urls = await getSlidesOutputUrls(outputId);
        url = urls.pdf_url;
        setPdfUrl(url);
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className={cn('text-xs font-mono uppercase tracking-wider', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400')}>
          Slide {index + 1} of {total}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePresent}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border',
              theme === 'dark' ? 'border-white/10 text-zinc-300 hover:text-white' : 'border-zinc-200 text-zinc-700 hover:text-zinc-900',
            )}
          >
            <Maximize2 className="w-3 h-3" /> Present
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border disabled:opacity-50',
              theme === 'dark' ? 'border-white/10 text-zinc-300 hover:text-white' : 'border-zinc-200 text-zinc-700 hover:text-zinc-900',
            )}
          >
            <FaDownload className="w-3 h-3" /> {pdfLoading ? 'Preparing…' : 'Download PDF'}
          </button>
        </div>
      </div>

      <div
        ref={stageWrapRef}
        className={cn('w-full rounded-2xl overflow-hidden border', theme === 'dark' ? 'border-white/10' : 'border-zinc-200')}
        style={{ aspectRatio: '16 / 9' }}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <SlideStage slide={slide} theme={result.theme} index={index} total={total} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className={cn(
            'w-8 h-8 rounded-lg border flex items-center justify-center transition-colors disabled:opacity-30',
            theme === 'dark' ? 'border-white/10 text-zinc-300 hover:text-white' : 'border-zinc-200 text-zinc-700 hover:text-zinc-900',
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1.5">
          {result.slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={cn('w-1.5 h-1.5 rounded-full transition-colors', i === index ? 'bg-emerald-500' : theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-300')}
            />
          ))}
        </div>
        <button
          onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
          disabled={index === total - 1}
          className={cn(
            'w-8 h-8 rounded-lg border flex items-center justify-center transition-colors disabled:opacity-30',
            theme === 'dark' ? 'border-white/10 text-zinc-300 hover:text-white' : 'border-zinc-200 text-zinc-700 hover:text-zinc-900',
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
