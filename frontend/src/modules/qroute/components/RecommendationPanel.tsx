import React, { useState } from 'react';
import { FaCircleNotch, FaMedal, FaExclamationTriangle } from 'react-icons/fa';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQRouteApi, type DeviceRecommendation, type RecommendResponse } from '../hooks/useQRouteApi';

interface Props {
  qasm: string;
  shots: number;
  onSelect: (deviceKey: string) => void;
}

// Named presets rather than raw sliders — a student picking "prioritise
// accuracy" learns the tradeoff exists; a 3-way weight slider teaches nothing.
const PRESETS: Record<string, Record<string, number>> = {
  Balanced: { fidelity: 0.6, queue: 0.25, cost: 0.15 },
  Accuracy: { fidelity: 1.0, queue: 0.0, cost: 0.0 },
  Speed: { fidelity: 0.3, queue: 0.7, cost: 0.0 },
  Cheapest: { fidelity: 0.2, queue: 0.0, cost: 0.8 },
};

const SIGN_STYLE: Record<string, string> = {
  '+': 'text-emerald-600 dark:text-emerald-400',
  '-': 'text-amber-600 dark:text-amber-400',
  '~': 'text-muted-foreground',
};

const CONFIDENCE_STYLE: Record<string, string> = {
  high: 'text-emerald-600 dark:text-emerald-400',
  medium: 'text-amber-600 dark:text-amber-400',
  low: 'text-destructive',
};

const RecommendationPanel: React.FC<Props> = ({ qasm, shots, onSelect }) => {
  const { recommendDevices } = useQRouteApi();
  const [result, setResult] = useState<RecommendResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preset, setPreset] = useState<string>('Balanced');

  const run = async (presetName: string) => {
    setPreset(presetName);
    setBusy(true);
    setErr(null);
    try {
      setResult(await recommendDevices(qasm, shots, PRESETS[presetName]));
    } catch (e: any) {
      setErr(e.response?.data?.detail || e.message || 'Could not rank backends');
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card size="sm" className="shrink-0">
      <CardHeader className="py-2 border-b">
        <CardTitle className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Resource Optimizer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-3">
        <div className="flex gap-2">
          {Object.keys(PRESETS).map((name) => (
            <Button
              key={name}
              size="sm"
              variant={preset === name && result ? 'default' : 'outline'}
              disabled={busy || !qasm.trim()}
              onClick={() => run(name)}
            >
              {name}
            </Button>
          ))}
        </div>

        {busy && (
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <FaCircleNotch className="animate-spin" /> Transpiling your circuit for every backend...
          </p>
        )}
        {err && <p className="text-xs text-destructive">{err}</p>}

        {result?.ranked.map((r: DeviceRecommendation, i: number) => (
          <button
            key={r.device_key}
            onClick={() => r.fits && onSelect(r.device_key)}
            disabled={!r.fits}
            className={`w-full text-left rounded-md border p-3 transition ${
              r.fits ? 'hover:border-primary cursor-pointer' : 'opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-2">
              {i === 0 && r.fits && <FaMedal className="text-amber-500 shrink-0" />}
              {!r.fits && <FaExclamationTriangle className="text-destructive shrink-0" />}
              <span className="font-medium text-sm">{r.device_name}</span>
              <span className="text-xs text-muted-foreground">· {r.provider}</span>
              {r.fits && (
                <span className="ml-auto text-xs font-mono" title="Upper bound — ignores decoherence and crosstalk">
                  ≤ {(r.expected_fidelity * 100).toFixed(1)}%
                </span>
              )}
            </div>

            {/* Signed tradeoffs, not prose — a student can scan "+ no routing /
                - costs $30.72" far faster than a sentence containing both. */}
            <ul className="mt-2 space-y-0.5">
              {r.factors.map((f, k) => (
                <li key={k} className={`text-xs leading-relaxed ${SIGN_STYLE[f.sign] ?? ''}`}>
                  <span className="font-mono mr-1">{f.sign}</span>
                  {f.text}
                </li>
              ))}
            </ul>

            {r.fits && (
              <div className="flex gap-3 mt-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <span>est. fidelity is an upper bound</span>
                <span className={CONFIDENCE_STYLE[r.confidence]}>
                  {r.confidence} confidence
                </span>
              </div>
            )}
          </button>
        ))}

        {result && result.unrated.length > 0 && (
          <p className="text-[10px] text-muted-foreground">
            No published calibration data for: {result.unrated.map((d) => d.name).join(', ')} — not ranked.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default RecommendationPanel;
