import React, { useState } from 'react';
import { BookOpen, FileText, Download, X } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import type { BuildGraphState } from '../hooks/useBuildState';

interface LabNotebookModalProps {
  buildGraph: BuildGraphState;
  onClose: () => void;
}

export const LabNotebookModal: React.FC<LabNotebookModalProps> = ({
  buildGraph,
  onClose
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'history' | 'comparison' | 'export'>('history');

  const sampleHistory = [
    { date: '2026-07-30 19:30', name: 'Baseline 17Q Contralto-A Build', thermal: 95, signal: 92, power: 100, score: 96 },
    { date: '2026-07-30 18:45', name: 'Discrete Coax Test Run #2', thermal: 50, signal: 50, power: 0, score: 33 },
    { date: '2026-07-30 17:15', name: 'Initial Cryostat Experiment', thermal: 25, signal: 30, power: 0, score: 18 }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 z-50 overflow-y-auto font-sans">
      <div className={cn(
        "w-full max-w-3xl border rounded-2xl p-6 shadow-2xl relative transition-colors duration-300",
        isDark ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
      )}>
        <button
          onClick={onClose}
          className={cn("absolute top-4 right-4 p-1 rounded hover:opacity-70 text-zinc-400 cursor-pointer")}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-mono uppercase tracking-wider text-zinc-100">Quantum Lab Notebook & History</h2>
            <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-zinc-600")}>
              Review past processor simulation iterations, compare signal chain designs, and export telemetry logs.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-6 gap-4 border-zinc-800 font-mono text-xs">
          <button
            onClick={() => setActiveTab('history')}
            className={cn("pb-2 font-medium transition-all border-b-2 cursor-pointer", activeTab === 'history' ? "border-emerald-500 text-emerald-400" : "border-transparent text-zinc-400")}
          >
            Run History Log ({sampleHistory.length})
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={cn("pb-2 font-medium transition-all border-b-2 cursor-pointer", activeTab === 'comparison' ? "border-emerald-500 text-emerald-400" : "border-transparent text-zinc-400")}
          >
            Architecture Comparison Matrix
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={cn("pb-2 font-medium transition-all border-b-2 cursor-pointer", activeTab === 'export' ? "border-emerald-500 text-emerald-400" : "border-transparent text-zinc-400")}
          >
            Telemetry Export
          </button>
        </div>

        {/* Tab 1: Run History Log */}
        {activeTab === 'history' && (
          <div className="space-y-3 font-sans">
            {sampleHistory.map((run, i) => (
              <div key={i} className={cn(
                "p-3.5 rounded-xl border flex justify-between items-center text-xs",
                isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"
              )}>
                <div>
                  <span className="font-medium block text-emerald-400">{run.name}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">{run.date}</span>
                </div>

                <div className="flex items-center gap-4 text-center font-mono">
                  <div>
                    <span className="text-[9px] text-zinc-500 block">Thermal</span>
                    <span className="font-medium text-zinc-300">{run.thermal}/100</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 block">Signal</span>
                    <span className="font-medium text-zinc-300">{run.signal}/100</span>
                  </div>
                  <div className="pl-3 border-l border-zinc-800">
                    <span className="text-[9px] text-zinc-500 block">Score</span>
                    <span className="font-bold text-emerald-400 text-sm">{run.score}/100</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Comparison Matrix */}
        {activeTab === 'comparison' && (
          <div className="overflow-x-auto text-xs font-sans">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={cn("border-b text-[10px] uppercase font-mono", isDark ? "border-zinc-800 text-zinc-400" : "border-zinc-200 text-zinc-600")}>
                  <th className="p-2.5">Feature / Spec</th>
                  <th className="p-2.5">Discrete Coax</th>
                  <th className="p-2.5 text-emerald-400">Cri/oFlex Flex-Circuit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                <tr>
                  <td className="p-2.5 font-medium">Thermal Load at MXC</td>
                  <td className="p-2.5 font-mono text-zinc-400">0.85 µW / line</td>
                  <td className="p-2.5 font-mono text-emerald-400">0.22 µW / line (-74%)</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">Channel Density</td>
                  <td className="p-2.5 font-mono text-zinc-400">Up to 24 SMA lines</td>
                  <td className="p-2.5 font-mono text-emerald-400">Up to 128 flex lines</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">Insertion Loss (6 GHz)</td>
                  <td className="p-2.5 font-mono text-zinc-400">1.2 dB / m</td>
                  <td className="p-2.5 font-mono text-emerald-400">0.45 dB / m</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Telemetry Export */}
        {activeTab === 'export' && (
          <div className="text-center py-6 space-y-4 font-sans">
            <p className={cn("text-xs max-w-md mx-auto leading-relaxed", isDark ? "text-zinc-300" : "text-zinc-700")}>
              Export your quantum processor configuration, thermal budget calculations, and signal line schematics for academic course credit or technical design portfolios.
            </p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => alert("Downloading QForge Telemetry JSON...")}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-md shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Export Telemetry JSON
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium text-xs rounded-md border border-zinc-800 cursor-pointer"
          >
            Close Notebook
          </button>
        </div>
      </div>
    </div>
  );
};
