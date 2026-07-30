import React from 'react';
import type { QubitState, BlochVector } from '../types/quantum';
import { Undo, RotateCcw, Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StateInspectorProps {
  currentState: QubitState;
  blochVec: BlochVector;
  historyLength: number;
  onUndo: () => void;
  onReset: () => void;
  onExport: () => void;
}

export const StateInspector: React.FC<StateInspectorProps> = ({
  currentState,
  blochVec,
  historyLength,
  onUndo,
  onReset,
  onExport
}) => {
  const alphaRe = currentState[0].re;
  const alphaIm = currentState[0].im;
  const betaRe = currentState[1].re;
  const betaIm = currentState[1].im;

  const p0 = Math.min(100, Math.max(0, (alphaRe * alphaRe + alphaIm * alphaIm) * 100));
  const p1 = Math.min(100, Math.max(0, (betaRe * betaRe + betaIm * betaIm) * 100));

  const formatComplex = (re: number, im: number) => {
    const r = re.toFixed(3);
    const sign = im >= 0 ? '+' : '-';
    const i = Math.abs(im).toFixed(3);
    return `${r} ${sign} ${i}i`;
  };

  return (
    <div className="bg-card/70 backdrop-blur-md rounded-xl p-4 border border-border/50 shadow-md space-y-4 font-sans">
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <h3 className="text-xs font-mono font-semibold flex items-center gap-2 text-primary uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-primary" /> Qubit State & Amplitudes
        </h3>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onUndo}
            disabled={historyLength <= 1}
            className="h-7 text-xs font-mono px-2.5"
          >
            <Undo className="w-3 h-3 mr-1" /> Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="h-7 text-xs font-mono px-2.5 text-destructive hover:bg-destructive/10"
          >
            <RotateCcw className="w-3 h-3 mr-1" /> Reset
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onExport}
            className="h-7 text-xs font-mono px-2.5"
            title="Export 3D Bloch View Image"
          >
            <Download className="w-3 h-3 mr-1" /> Export
          </Button>
        </div>
      </div>

      {/* Complex State Vector |Ψ⟩ = α|0⟩ + β|1⟩ */}
      <div className="p-3 rounded-lg bg-secondary/40 border border-border/40 space-y-2">
        <div className="text-[11px] font-mono text-muted-foreground flex items-center justify-between">
          <span>State Vector |Ψ⟩</span>
          <span className="text-foreground font-semibold">SU(2) Normalized</span>
        </div>
        <div className="text-sm font-mono font-bold text-foreground">
          |Ψ⟩ = (<span className="text-foreground">{formatComplex(alphaRe, alphaIm)}</span>)|0⟩ + (<span className="text-foreground">{formatComplex(betaRe, betaIm)}</span>)|1⟩
        </div>
      </div>

      {/* Bloch Coordinates (u, v, w) */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-lg bg-secondary/50 border border-border/50">
          <div className="text-[10px] font-mono text-muted-foreground font-semibold uppercase">u (X coord)</div>
          <div className="text-sm font-mono font-bold text-foreground">{blochVec.u.toFixed(3)}</div>
        </div>
        <div className="p-2 rounded-lg bg-secondary/50 border border-border/50">
          <div className="text-[10px] font-mono text-muted-foreground font-semibold uppercase">v (Y coord)</div>
          <div className="text-sm font-mono font-bold text-foreground">{blochVec.v.toFixed(3)}</div>
        </div>
        <div className="p-2 rounded-lg bg-secondary/50 border border-border/50">
          <div className="text-[10px] font-mono text-muted-foreground font-semibold uppercase">w (Z coord)</div>
          <div className="text-sm font-mono font-bold text-foreground">{blochVec.w.toFixed(3)}</div>
        </div>
      </div>

      {/* Measurement Probability Gauges */}
      <div className="space-y-2 pt-1">
        <div className="flex justify-between text-xs font-mono text-foreground font-medium">
          <span>P(|0⟩) = {p0.toFixed(1)}%</span>
          <span>P(|1⟩) = {p1.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden flex">
          <div
            className="bg-purple-500 h-full transition-all duration-300"
            style={{ width: `${p0}%` }}
          />
          <div
            className="bg-cyan-500 h-full transition-all duration-300"
            style={{ width: `${p1}%` }}
          />
        </div>
      </div>
    </div>
  );
};
