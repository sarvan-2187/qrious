import React from 'react';
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
  if (!report) return null;

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-zinc-950 border border-zinc-800 rounded-2xl">
      <h2 className="text-2xl font-bold text-zinc-100 mb-6">Simulation Report</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <BuildScoreCard category="Thermal Budget" score={report.thermal} />
        <BuildScoreCard category="Signal Integrity" score={report.signalIntegrity} />
        <BuildScoreCard category="Power Specs" score={report.power} />
        <BuildScoreCard category="Overall Score" score={report.overall} colorClass={report.overall > 90 ? "text-emerald-400" : "text-zinc-100"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-xl">
          <h3 className="text-red-400 font-semibold mb-3 flex items-center gap-2">
            <span>✕</span> Failures ({report.failures.length})
          </h3>
          <ul className="space-y-2 text-sm text-zinc-300">
            {report.failures.length === 0 ? (
              <li className="text-zinc-500 italic">No critical failures.</li>
            ) : (
              report.failures.map((f, i) => <li key={i}>• {f}</li>)
            )}
          </ul>
        </div>

        <div className="p-4 bg-yellow-950/20 border border-yellow-900/50 rounded-xl">
          <h3 className="text-yellow-400 font-semibold mb-3 flex items-center gap-2">
            <span>⚠</span> Warnings ({report.warnings.length})
          </h3>
          <ul className="space-y-2 text-sm text-zinc-300">
            {report.warnings.length === 0 ? (
              <li className="text-zinc-500 italic">No warnings.</li>
            ) : (
              report.warnings.map((w, i) => <li key={i}>• {w}</li>)
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};
