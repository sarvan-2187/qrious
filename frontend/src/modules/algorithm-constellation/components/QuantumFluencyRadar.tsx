import React, { useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Target } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import type { AlgorithmSummary } from '../../algorithm-explorer/hooks/useAlgorithmApi';
import { getAlgorithmDomain, domainHex, ALL_DOMAINS } from '../utils/domainMapper';
import type { Domain } from '../utils/domainMapper';
import { getExploredSlugs } from '../hooks/useConstellationState';

interface QuantumFluencyRadarProps {
  algorithms: AlgorithmSummary[];
  onDomainHover: (domain: string | null) => void;
  onDomainClick: (domain: string) => void;
}

interface RadarDataPoint {
  domain: string;
  score: number;
  explored: number;
  total: number;
  fullMark: number;
}

const DOMAIN_SHORT: Record<string, string> = {
  'Foundations': 'Found.',
  'Search': 'Search',
  'Optimization': 'Optim.',
  'Simulation': 'Simul.',
  'Machine Learning': 'ML',
  'Cryptography': 'Crypto',
  'Communication': 'Comm.',
  'Error Correction': 'EC',
  'Chemistry': 'Chem.',
  'Sensing': 'Sense',
};

export const QuantumFluencyRadar: React.FC<QuantumFluencyRadarProps> = ({
  algorithms,
  onDomainHover,
  onDomainClick,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const radarData: RadarDataPoint[] = useMemo(() => {
    const explored = getExploredSlugs();

    const domainStats: Record<Domain, { total: number; explored: number }> = {} as any;
    ALL_DOMAINS.forEach(d => { domainStats[d] = { total: 0, explored: 0 }; });

    algorithms.forEach(alg => {
      const domain = getAlgorithmDomain(alg.category || '', alg.name);
      if (domain in domainStats) {
        domainStats[domain].total += 1;
        if (explored.has(alg.slug)) domainStats[domain].explored += 1;
      }
    });

    return ALL_DOMAINS.map(domain => {
      const { total, explored: exp } = domainStats[domain];
      const score = total > 0 ? Math.round((exp / total) * 100) : 0;
      return {
        domain: DOMAIN_SHORT[domain] ?? domain,
        score,
        explored: exp,
        total,
        fullMark: 100,
      };
    });
  }, [algorithms]);

  const totalExplored = useMemo(() => {
    const explored = getExploredSlugs();
    return algorithms.filter(a => explored.has(a.slug)).length;
  }, [algorithms]);

  const overallScore = useMemo(() => {
    if (algorithms.length === 0) return 0;
    return Math.round((totalExplored / algorithms.length) * 100);
  }, [algorithms, totalExplored]);

  // Find closest milestone (domain where score is highest but < 100%)
  const closestMilestone = useMemo(() => {
    const candidates = radarData
      .filter(d => d.score > 0 && d.score < 100 && d.total > 0)
      .sort((a, b) => b.score - a.score);
    if (candidates.length === 0) return null;
    const top = candidates[0];
    const remaining = top.total - top.explored;
    const domainFull = ALL_DOMAINS.find(d => DOMAIN_SHORT[d] === top.domain || d === top.domain) ?? top.domain;
    return `Explore ${remaining} more ${domainFull} algorithm${remaining !== 1 ? 's' : ''} to reach mastery.`;
  }, [radarData]);

  // emerald-400 on white is ~1.9:1 — unreadable. Drop to emerald-700 in light mode.
  const accentColor = isDark ? '#34d399' : '#047857';

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const d = payload[0].payload as RadarDataPoint;
      return (
        <div className={cn(
          'px-3 py-2 rounded-xl text-xs border shadow-lg font-sans',
          isDark ? 'bg-zinc-900 border-white/10 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-800'
        )}>
          <div className="font-medium mb-0.5">{d.domain}</div>
          <div className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
            {d.explored} / {d.total} explored
          </div>
          <div style={{ color: accentColor }}>{d.score}% fluency</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn(
      // Was bg-zinc-950/50 with no blur, so 3D node labels showed straight
      // through the panel and collided with the radar's own axis labels.
      'flex flex-col gap-3 p-4 rounded-2xl border backdrop-blur-xl shadow-xl',
      isDark ? 'bg-zinc-950/92 border-white/10' : 'bg-white/95 border-zinc-300'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={cn('text-sm font-sans tracking-tight', isDark ? 'text-white' : 'text-zinc-900')}>
            Quantum Fluency
          </h3>
          <p className={cn('text-xs mt-0.5', isDark ? 'text-zinc-500' : 'text-zinc-600')}>
            Based on algorithms explored
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xl font-sans" style={{ color: accentColor }}>
            {overallScore}%
          </span>
          <span className={cn('text-[11px]', isDark ? 'text-zinc-500' : 'text-zinc-600')}>
            {totalExplored}/{algorithms.length}
          </span>
        </div>
      </div>

      {/* Radar chart */}
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 12, right: 30, bottom: 12, left: 30 }}>
            <PolarGrid
              stroke={isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}
              strokeDasharray="2 4"
            />
            <PolarAngleAxis
              dataKey="domain"
              tick={({ payload, x, y, cx, cy, ...rest }: any) => {
                const domainFull = ALL_DOMAINS.find(d => DOMAIN_SHORT[d] === payload.value || d === payload.value) ?? payload.value;
                const color = domainHex(domainFull as Domain, isDark);
                return (
                  <text
                    x={x}
                    y={y}
                    textAnchor={x > (cx ?? 0) ? 'start' : x < (cx ?? 0) ? 'end' : 'middle'}
                    fill={color}
                    fontSize={10.5}
                    fontFamily="var(--font-sans, ui-sans-serif)"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onDomainClick(domainFull)}
                    onMouseEnter={() => onDomainHover(domainFull)}
                    onMouseLeave={() => onDomainHover(null)}
                  >
                    {payload.value}
                  </text>
                );
              }}
            />
            <Radar
              name="Fluency"
              dataKey="score"
              stroke={accentColor}
              fill={accentColor}
              fillOpacity={0.18}
              strokeWidth={1.5}
              dot={{ r: 3, fill: accentColor, strokeWidth: 0 }}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Milestone hint */}
      {closestMilestone && (
        <div className={cn(
          'text-xs px-3 py-2 rounded-xl border font-sans',
          isDark
            ? 'border-emerald-500/20 bg-emerald-500/8 text-emerald-400'
            : 'border-emerald-500/25 bg-emerald-50 text-emerald-700'
        )}>
          <span className="flex items-start gap-1.5">
            <Target size={12} className="shrink-0 mt-0.5" />
            {closestMilestone}
          </span>
        </div>
      )}

      {/* Domain legend — click to filter graph */}
      <div className="flex flex-wrap gap-1.5">
        {ALL_DOMAINS.slice(0, 6).map(domain => {
          const color = domainHex(domain, isDark);
          return (
            <button
              key={domain}
              onClick={() => onDomainClick(domain)}
              onMouseEnter={() => onDomainHover(domain)}
              onMouseLeave={() => onDomainHover(null)}
              className="text-[11px] px-2 py-0.5 rounded-full border transition-all hover:scale-105 font-sans"
              style={{ borderColor: `${color}40`, color, background: `${color}10` }}
            >
              {DOMAIN_SHORT[domain] ?? domain}
            </button>
          );
        })}
      </div>
    </div>
  );
};
