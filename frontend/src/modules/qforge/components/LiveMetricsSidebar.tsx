import React from 'react';
import { Activity, Shield, Thermometer, Radio, Lightbulb, Zap } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import type { BuildGraphState } from '../hooks/useBuildState';

interface LiveMetricsSidebarProps {
  buildGraph: BuildGraphState;
}

export const LiveMetricsSidebar: React.FC<LiveMetricsSidebarProps> = ({ buildGraph }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const count = buildGraph.placedComponents.length;
  
  const has50KAtt = buildGraph.placedComponents.some(c => c.stageId === '50K' && c.componentId.includes('20db'));
  const hasHemt = buildGraph.placedComponents.some(c => c.stageId === '4K' && c.componentId === 'hemt');
  const hasPurcell = buildGraph.placedComponents.some(c => c.componentId === 'purcell_filter' || c.stageId === 'coldplate');
  const hasTwpa = buildGraph.placedComponents.some(c => c.stageId === 'mxc' && c.componentId === 'twpa');

  const thermalScore = Math.min(100, (has50KAtt ? 45 : 15) + (count * 10));
  const signalScore = Math.min(100, (hasHemt ? 40 : 10) + (hasTwpa ? 40 : 10) + (count * 5));
  const qubitProtectionScore = Math.min(100, (hasPurcell ? 50 : 10) + (count * 8));

  const overallScore = Math.round((thermalScore + signalScore + qubitProtectionScore) / 3);
  
  // Fake delta simulation for UI polish
  const isDeltaPositive = count > 0;
  const deltaValue = isDeltaPositive ? "+4" : "0";

  return (
    <div className={cn(
      "p-4 flex flex-col font-sans shrink-0 overflow-y-auto",
      isDark ? "bg-zinc-950 text-zinc-100" : "bg-white text-zinc-900"
    )}>
      
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5" /> Live Telemetry
        </h3>
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Telemetry Active" />
      </div>

      {/* Overall Score with Delta */}
      <div className={cn(
        "p-3 rounded-lg border mb-5 relative overflow-hidden",
        isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"
      )}>
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">System Score</span>
        <div className="flex items-end gap-2 mt-1">
          <div className="text-3xl font-mono font-medium text-zinc-100">
            {overallScore}
          </div>
          <div className={cn("text-xs font-mono mb-1", isDeltaPositive ? "text-emerald-400" : "text-zinc-500")}>
            {deltaValue}
          </div>
        </div>
      </div>

      {/* Individual Metric Clean Bars */}
      <div className="space-y-4 text-xs font-sans mb-6">
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className={cn("font-medium flex items-center gap-1.5", isDark ? "text-zinc-300" : "text-zinc-700")}>
              <Thermometer className="w-3.5 h-3.5 text-zinc-400" /> Thermal Budget
            </span>
            <span className="font-mono text-zinc-400">{thermalScore}%</span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full transition-all duration-300 ease-out" style={{ width: `${thermalScore}%` }}></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className={cn("font-medium flex items-center gap-1.5", isDark ? "text-zinc-300" : "text-zinc-700")}>
              <Radio className="w-3.5 h-3.5 text-zinc-400" /> Signal Integrity
            </span>
            <span className="font-mono text-zinc-400">{signalScore}%</span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full transition-all duration-300 ease-out" style={{ width: `${signalScore}%` }}></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className={cn("font-medium flex items-center gap-1.5", isDark ? "text-zinc-300" : "text-zinc-700")}>
              <Shield className="w-3.5 h-3.5 text-zinc-400" /> Qubit Protection
            </span>
            <span className="font-mono text-zinc-400">{qubitProtectionScore}%</span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full transition-all duration-300 ease-out" style={{ width: `${qubitProtectionScore}%` }}></div>
          </div>
        </div>
      </div>

      {/* Actionable Suggestions */}
      <div>
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
          <Lightbulb className="w-3 h-3" /> Diagnostics
        </h3>
        
        <div className="space-y-2">
          {!has50KAtt && (
            <div className={cn("p-2.5 rounded-md border text-[11px]", isDark ? "bg-zinc-900/30 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
              <div className="font-medium text-amber-400 flex justify-between">
                <span>Missing 50K Attenuation</span>
                <span className="text-emerald-500">+12%</span>
              </div>
              <p className={cn("mt-1 mb-2", isDark ? "text-zinc-400" : "text-zinc-600")}>Thermal photons from 300K are causing heat load.</p>
              <button className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[10px] font-medium transition-colors flex items-center gap-1 w-full justify-center">
                <Zap className="w-3 h-3" /> Quick Install: 20dB Attenuator
              </button>
            </div>
          )}
          {!hasHemt && (
            <div className={cn("p-2.5 rounded-md border text-[11px]", isDark ? "bg-zinc-900/30 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
              <div className="font-medium text-amber-400 flex justify-between">
                <span>Weak Readout Signal</span>
                <span className="text-emerald-500">+15%</span>
              </div>
              <p className={cn("mt-1 mb-2", isDark ? "text-zinc-400" : "text-zinc-600")}>Signal reaching room temp is indistinguishable from noise.</p>
              <button className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[10px] font-medium transition-colors flex items-center gap-1 w-full justify-center">
                <Zap className="w-3 h-3" /> Quick Install: HEMT @ 4K
              </button>
            </div>
          )}
          {has50KAtt && hasHemt && hasPurcell && hasTwpa && (
            <div className={cn("p-2.5 rounded-md border text-[11px] text-center", isDark ? "bg-emerald-950/20 border-emerald-900/50" : "bg-emerald-50 border-emerald-200")}>
              <p className="text-emerald-500 font-medium">System optimized. Ready for evaluation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
