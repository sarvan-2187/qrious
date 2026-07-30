import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Clock, Zap, CheckCircle, Lock } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import type { AlgorithmSummary } from '../../algorithm-explorer/hooks/useAlgorithmApi';
import { getAlgorithmDomain, domainHex } from '../utils/domainMapper';
import { getExploredSlugs } from '../hooks/useConstellationState';

interface AlgorithmSidePanelProps {
  algorithm: AlgorithmSummary | null;
  allAlgorithms: AlgorithmSummary[];
  onClose: () => void;
  onNavigateToAlgorithm: (slug: string) => void;
}

export const AlgorithmSidePanel: React.FC<AlgorithmSidePanelProps> = ({
  algorithm,
  allAlgorithms,
  onClose,
  onNavigateToAlgorithm,
}) => {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const explored = useMemo(() => getExploredSlugs(), [algorithm?.slug]);

  const domain = algorithm
    ? getAlgorithmDomain(algorithm.category || '', algorithm.name)
    : null;
  const hex = domainHex(domain ?? undefined, theme === 'dark');

  const difficulty = algorithm?.difficulty?.toLowerCase() ?? '';
  const difficultyColor = theme === 'dark'
    ? difficulty.includes('beginner')
      ? 'text-green-400 border-green-500/30 bg-green-500/10'
      : difficulty.includes('advanced')
      ? 'text-red-400 border-red-500/30 bg-red-500/10'
      : 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
    // -400 weights sit at ~1.5-2:1 on the white panel — step down to -700.
    : difficulty.includes('beginner')
      ? 'text-green-700 border-green-600/30 bg-green-50'
      : difficulty.includes('advanced')
      ? 'text-red-700 border-red-600/30 bg-red-50'
      : 'text-yellow-800 border-yellow-600/30 bg-yellow-50';

  const isExplored = algorithm ? explored.has(algorithm.slug) : false;
  const isComingSoon = algorithm?.status === 'coming_soon';

  return (
    <AnimatePresence>
      {algorithm && (
        <motion.aside
          key="side-panel"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 36 }}
          className={cn(
            'absolute top-0 right-0 bottom-0 w-80 flex flex-col border-l overflow-y-auto z-20',
            theme === 'dark'
              ? 'bg-zinc-950/95 border-white/10 backdrop-blur-xl'
              : 'bg-white/95 border-zinc-200 backdrop-blur-xl'
          )}
          style={{ boxShadow: `0 0 40px ${hex}18` }}
        >
          {/* Header */}
          <div
            className="flex items-start justify-between p-5 pb-4 border-b"
            style={{
              borderColor: `${hex}30`,
              background: `linear-gradient(135deg, ${hex}10 0%, transparent 60%)`,
            }}
          >
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              {/* Domain badge */}
              <span
                className="text-[11px] uppercase tracking-widest font-sans px-2 py-0.5 rounded-full w-fit"
                style={{ color: hex, background: `${hex}18`, border: `1px solid ${hex}40` }}
              >
                {domain}
              </span>
              <h2
                className={cn(
                  'text-lg font-sans leading-tight mt-1',
                  theme === 'dark' ? 'text-white' : 'text-zinc-900'
                )}
              >
                {algorithm.name}
              </h2>
            </div>
            <button
              onClick={onClose}
              className={cn(
                'ml-3 mt-0.5 p-1.5 rounded-lg transition-colors shrink-0',
                theme === 'dark'
                  ? 'text-zinc-500 hover:text-white hover:bg-zinc-800'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
              )}
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-col gap-5 p-5 flex-1">
            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              <span className={cn('text-xs px-2.5 py-1 rounded-full border font-sans', difficultyColor)}>
                {algorithm.difficulty || 'Intermediate'}
              </span>
              {isExplored ? (
                <span className={cn(
                  'text-xs px-2.5 py-1 rounded-full border font-sans flex items-center gap-1',
                  theme === 'dark'
                    ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10'
                    : 'border-cyan-600/30 text-cyan-800 bg-cyan-50'
                )}>
                  <CheckCircle size={11} /> Explored
                </span>
              ) : isComingSoon ? (
                <span className={cn(
                  'text-xs px-2.5 py-1 rounded-full border font-sans flex items-center gap-1',
                  theme === 'dark'
                    ? 'border-orange-500/30 text-orange-400 bg-orange-500/10'
                    : 'border-orange-600/30 text-orange-800 bg-orange-50'
                )}>
                  <Lock size={11} /> Coming Soon
                </span>
              ) : null}
            </div>

            {/* Description */}
            <p className={cn('text-sm leading-relaxed', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600')}>
              {algorithm.shortDescription || 'Explore the theory, complexity, and interactive simulation of this quantum algorithm.'}
            </p>

            {/* Metadata row */}
            <div className={cn(
              'flex items-center gap-4 text-xs p-3 rounded-xl border',
              theme === 'dark' ? 'border-white/8 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'
            )}>
              <div className="flex items-center gap-1.5 text-zinc-500">
                <Zap size={12} style={{ color: hex }} />
                <span className={theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}>
                  Level {algorithm.learningLevel ?? '—'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-500">
                <Clock size={12} style={{ color: hex }} />
                <span className={theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}>
                  {algorithm.category || 'Quantum'}
                </span>
              </div>
            </div>

            {/* Related algorithms */}
            <div>
              <p className={cn('text-xs uppercase tracking-wider mb-2 font-sans', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-600')}>
                Related Algorithms
              </p>
              <div className="flex flex-col gap-1.5">
                {(() => {
                  const related: string[] = (algorithm as any).relatedAlgorithms ?? [];
                  if (related.length === 0)
                    return (
                      <span className={cn('text-xs', theme === 'dark' ? 'text-zinc-600' : 'text-zinc-600')}>
                        None listed
                      </span>
                    );
                  return related.slice(0, 5).map((r, i) => {
                    const match = allAlgorithms.find(
                      a => a.slug === r || a.name.toLowerCase() === r.toLowerCase()
                    );
                    if (!match) return (
                      <span key={i} className={cn('text-xs', theme === 'dark' ? 'text-zinc-600' : 'text-zinc-600')}>
                        {r}
                      </span>
                    );
                    return (
                      <button
                        key={match.slug}
                        onClick={() => onNavigateToAlgorithm(match.slug)}
                        className="text-xs text-left transition-colors"
                        style={{ color: hex }}
                      >
                        → {match.name}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* Footer CTA */}
          <div className={cn('p-5 border-t', theme === 'dark' ? 'border-white/8' : 'border-zinc-200')}>
            {isComingSoon ? (
              <div className={cn(
                'w-full text-center py-3 rounded-xl border text-sm font-sans',
                theme === 'dark'
                  ? 'border-orange-500/30 text-orange-400 bg-orange-500/10'
                  : 'border-orange-400/30 text-orange-600 bg-orange-50'
              )}>
                Coming Soon
              </div>
            ) : (
              <button
                onClick={() => navigate(`/constellation/${algorithm.slug}`)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-sans text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: `linear-gradient(135deg, ${hex}cc, ${hex}88)` }}
              >
                Start Learning <ArrowRight size={15} />
              </button>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
