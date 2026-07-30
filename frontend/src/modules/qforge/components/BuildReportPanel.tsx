import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { BuildScoreCard } from './BuildScoreCard';

interface BuildReportPanelProps {
  report: {
    thermal: number;
    signalIntegrity: number;
    power: number;
    overall: number;
    warnings: string[];
    failures: string[];
  } | null;
}

export const BuildReportPanel: React.FC<BuildReportPanelProps> = ({ report }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!report) return null;

  return (
    <div className={cn(
      "w-full max-w-4xl mx-auto p-6 border rounded-2xl",
      isDark ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
    )}>
      <h2 className="text-2xl font-bold mb-6">Simulation Report</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <BuildScoreCard category="Thermal Budget" score={report.thermal} />
        <BuildScoreCard category="Signal Integrity" score={report.signalIntegrity} />
        <BuildScoreCard category="Power Specs" score={report.power} />
        <BuildScoreCard category="Overall Score" score={report.overall} colorClass={report.overall > 90 ? "text-emerald-500" : (isDark ? "text-zinc-100" : "text-zinc-900")} />
      </div>

      {/* Phase 3 Electrical Power Grid & UPS Status */}
      <div className={cn("p-4 border rounded-xl mb-6 font-mono text-xs", isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-emerald-500 flex items-center gap-1.5">
            <span>⚡</span> Electrical Power System & UPS Telemetry
          </span>
          <span className="text-[10px] text-zinc-500">PDU Load: 3.8 kW / 5.0 kW (76%)</span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-[11px] text-zinc-400">
          <div>• UPS Battery Backup: <span className="text-emerald-400 font-bold">45 min runtime</span></div>
          <div>• Ground Loop Isolation: <span className="text-emerald-400 font-bold">Isolated (Single-point Ground)</span></div>
          <div>• Compressor Voltage: <span className="text-sky-400 font-bold">208V 3-Phase (60 Hz)</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={cn(
          "p-4 border rounded-xl",
          isDark ? "bg-red-950/20 border-red-900/50" : "bg-red-50 border-red-200"
        )}>
          <h3 className="text-red-600 dark:text-red-400 font-semibold mb-3 flex items-center gap-2">
            <span>✕</span> Failures ({report.failures.length})
          </h3>
          <ul className={cn("space-y-2 text-sm", isDark ? "text-zinc-300" : "text-zinc-700")}>
            {report.failures.length === 0 ? (
              <li className={cn("italic text-xs", isDark ? "text-zinc-500" : "text-zinc-400")}>No critical failures.</li>
            ) : (
              report.failures.map((f, i) => <li key={i}>• {f}</li>)
            )}
          </ul>
        </div>

        <div className={cn(
          "p-4 border rounded-xl",
          isDark ? "bg-yellow-950/20 border-yellow-900/50" : "bg-yellow-50 border-yellow-200"
        )}>
          <h3 className="text-amber-600 dark:text-yellow-400 font-semibold mb-3 flex items-center gap-2">
            <span>⚠</span> Warnings ({report.warnings.length})
          </h3>
          <ul className={cn("space-y-2 text-sm", isDark ? "text-zinc-300" : "text-zinc-700")}>
            {report.warnings.length === 0 ? (
              <li className={cn("italic text-xs", isDark ? "text-zinc-500" : "text-zinc-400")}>No warnings.</li>
            ) : (
              report.warnings.map((w, i) => <li key={i}>• {w}</li>)
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};
