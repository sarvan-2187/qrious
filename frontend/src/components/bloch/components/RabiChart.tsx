import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import type { PulseParams, QubitState } from '../types/quantum';

interface RabiChartProps {
  pulse: PulseParams;
  currentState: QubitState;
}

export const RabiChart: React.FC<RabiChartProps> = ({ pulse, currentState }) => {
  // Generate Rabi oscillation probability curve over pulse length
  const data = React.useMemo(() => {
    const points = 40;
    const result = [];
    const maxTime = Math.max(1.0, pulse.pulseLength * 1.5);
    const detRad = 2 * Math.PI * pulse.detuning;
    const w1Rad = 2 * Math.PI * pulse.amplitude;
    const wEff = Math.sqrt(w1Rad * w1Rad + detRad * detRad) || 0.001;

    for (let i = 0; i <= points; i++) {
      const t = (i / points) * maxTime;
      // Rabi formula: P(|1>) = (w1 / wEff)^2 * sin^2(wEff * t / 2)
      const p1Rabi = Math.pow(w1Rad / wEff, 2) * Math.pow(Math.sin((wEff * t) / 2), 2);
      const p0Rabi = 1 - p1Rabi;

      result.push({
        time: parseFloat(t.toFixed(2)),
        P0: parseFloat((p0Rabi * 100).toFixed(1)),
        P1: parseFloat((p1Rabi * 100).toFixed(1))
      });
    }
    return result;
  }, [pulse, currentState]);

  return (
    <div className="w-full bg-card/60 backdrop-blur-md rounded-xl p-4 border border-border/50 shadow-md">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          Rabi Oscillation Probability Graph
        </h4>
        <span className="text-[11px] font-mono text-muted-foreground">
          Ω<sub>eff</sub> = {(Math.sqrt(Math.pow(2 * Math.PI * pulse.amplitude, 2) + Math.pow(2 * Math.PI * pulse.detuning, 2)) / (2 * Math.PI)).toFixed(2)} Hz
        </span>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="time"
              stroke="var(--muted-foreground)"
              tick={{ fontSize: 10 }}
              unit="s"
            />
            <YAxis
              domain={[0, 100]}
              stroke="var(--muted-foreground)"
              tick={{ fontSize: 10 }}
              unit="%"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--popover)',
                borderColor: 'rgba(56, 189, 248, 0.3)',
                borderRadius: '0.5rem',
                fontSize: '11px',
                color: 'var(--popover-foreground)'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
            <Line
              type="monotone"
              dataKey="P0"
              name="P(|0⟩)"
              stroke="#a855f7"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="P1"
              name="P(|1⟩)"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
