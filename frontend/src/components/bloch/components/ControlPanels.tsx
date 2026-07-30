import React, { useState } from 'react';
import type { PulseParams, RotationParams } from '../types/quantum';
import { RotateCw, Zap, Radio, Sliders } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

export interface BlochSettings {
  spinColor: string;
  traceColor: string;
  topStateText: string;
  bottomStateText: string;
  historyLength: number;
  exportSize: number;
}

interface ControlPanelsProps {
  onRotate: (axis: 'x' | 'y' | 'z', angleDeg: number) => void;
  onGate: (gate: 'H' | 'S' | 'Sdag' | 'T' | 'Tdag' | 'X' | 'Y' | 'Z') => void;
  onCustomRotate: (polarDeg: number, azimuthalDeg: number, rotationDeg: number) => void;
  onUGate?: (theta: number, phi: number, lambda: number) => void;
  onPulse: (axis: 'x' | 'y') => void;
  pulse: PulseParams;
  setPulse: React.Dispatch<React.SetStateAction<PulseParams>>;
  settings: BlochSettings;
  setSettings: React.Dispatch<React.SetStateAction<BlochSettings>>;
}

/** Minimal accordion row matching bloch.kherb.io right panel */
function AccordionRow({
  icon,
  label,
  open,
  onToggle,
  children
}: {
  icon: React.ReactNode;
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <div className={cn(
      "border-b last:border-b-0",
      theme === 'dark' ? "border-white/10" : "border-zinc-200"
    )}>
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-3 px-5 py-3.5 text-sm text-foreground transition-colors text-left",
          theme === 'dark' ? "hover:bg-white/5" : "hover:bg-zinc-50"
        )}
      >
        <span className="text-foreground shrink-0">{icon}</span>
        <span className="font-semibold tracking-wide">{label}</span>
      </button>
      {open && (
        <div className={cn(
          "px-5 pb-5 pt-2 animate-in fade-in duration-150",
          theme === 'dark' ? "bg-black/20" : "bg-zinc-50/20"
        )}>
          {children}
        </div>
      )}
    </div>
  );
}

/** Compact labeled number input */
function Field({
  label,
  value,
  onChange,
  step,
  min,
  max
}: {
  label: string;
  value: number | string;
  onChange: (v: string) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  const { theme } = useTheme();
  return (
    <div className="flex flex-col gap-1.5">
      <label className={cn("text-[11px] font-semibold uppercase tracking-wider", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>{label}</label>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "border rounded-lg px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-full transition-all duration-300",
          theme === 'dark' ? "bg-black border-white/10" : "bg-white border-zinc-200"
        )}
      />
    </div>
  );
}

export const ControlPanels: React.FC<ControlPanelsProps> = ({
  onRotate,
  onGate,
  onCustomRotate,
  onUGate,
  onPulse,
  pulse,
  setPulse,
  settings,
  setSettings
}) => {
  const { theme } = useTheme();
  const [open, setOpen] = useState<Record<string, boolean>>({
    defaultRotations: true,
    customRotations: false,
    gates: false,
    ugate: false,
    pulses: false,
    settings: false
  });

  const [customAxis, setCustomAxis] = useState<RotationParams>({
    axis: 'custom',
    angle: 90,
    polarAngle: 45,
    azimuthalAngle: 45
  });

  const [uGateParams, setUGateParams] = useState({ theta: 90, phi: 0, lambda: 0 });
  const [customAngle, setCustomAngle] = useState<number>(90);

  const toggle = (key: string) => setOpen(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="divide-y divide-border/40 font-sans">

      {/* 1 — Rotations around default axes */}
      <AccordionRow
        icon={<RotateCw className="w-4 h-4" />}
        label="Rotations around default axes"
        open={open.defaultRotations}
        onToggle={() => toggle('defaultRotations')}
      >
        <div className="space-y-3">
          {/* Quick buttons */}
          <div className="grid grid-cols-3 gap-1.5">
            {(['x', 'y', 'z'] as const).map(ax => (
              <Button
                key={`${ax}90`}
                id={`bloch-rot-${ax}-90`}
                variant="outline"
                size="sm"
                onClick={() => onRotate(ax, 90)}
                className="text-[11px] font-mono h-8 hover:border-emerald-500/50 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all duration-300"
              >
                {ax.toUpperCase()} +90°
              </Button>
            ))}
            {(['x', 'y', 'z'] as const).map(ax => (
              <Button
                key={`${ax}180`}
                id={`bloch-rot-${ax}-180`}
                variant="outline"
                size="sm"
                onClick={() => onRotate(ax, 180)}
                className="text-[11px] font-mono h-8 hover:border-emerald-500/50 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all duration-300"
              >
                {ax.toUpperCase()} 180°
              </Button>
            ))}
          </div>
          {/* Custom angle row */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="number"
              value={customAngle}
              onChange={(e) => setCustomAngle(parseFloat(e.target.value) || 0)}
              className={cn(
                "w-20 border rounded-lg px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300",
                theme === 'dark' ? "bg-black border-white/10" : "bg-white border-zinc-200"
              )}
              placeholder="Angle°"
            />
            {(['x', 'y', 'z'] as const).map(ax => (
              <Button
                key={`${ax}custom`}
                id={`bloch-rot-${ax}-custom`}
                variant="secondary"
                size="sm"
                onClick={() => onRotate(ax, customAngle)}
                className="flex-1 text-[11px] font-mono h-8 hover:bg-emerald-500 hover:text-white transition-all duration-300"
              >
                {ax.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      </AccordionRow>

      {/* 2 — Rotations around custom axis */}
      <AccordionRow
        icon={<RotateCw className="w-4 h-4" />}
        label="Rotations around custom axis"
        open={open.customRotations}
        onToggle={() => toggle('customRotations')}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Field
              label="Polar θ°"
              value={customAxis.polarAngle ?? 45}
              onChange={(v) => setCustomAxis({ ...customAxis, polarAngle: parseFloat(v) || 0 })}
            />
            <Field
              label="Azimuthal φ°"
              value={customAxis.azimuthalAngle ?? 45}
              onChange={(v) => setCustomAxis({ ...customAxis, azimuthalAngle: parseFloat(v) || 0 })}
            />
            <Field
              label="Rotation γ°"
              value={customAxis.angle}
              onChange={(v) => setCustomAxis({ ...customAxis, angle: parseFloat(v) || 0 })}
            />
          </div>
          <button
            id="bloch-custom-rotate-btn"
            onClick={() => onCustomRotate(customAxis.polarAngle ?? 45, customAxis.azimuthalAngle ?? 45, customAxis.angle)}
            className="w-full text-xs font-semibold h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-all duration-300 shadow hover:shadow-emerald-500/25 active:scale-95 flex items-center justify-center"
          >
            Rotate around n̂(θ, φ)
          </button>
        </div>
      </AccordionRow>

      {/* 3 — Quantum gates */}
      <AccordionRow
        icon={<Zap className="w-4 h-4" />}
        label="Quantum gates"
        open={open.gates}
        onToggle={() => toggle('gates')}
      >
        <div className="grid grid-cols-4 gap-1.5">
          {(['H', 'X', 'Y', 'Z', 'S', 'Sdag', 'T', 'Tdag'] as const).map(gate => (
            <Button
              key={gate}
              id={`bloch-gate-${gate}`}
              variant="outline"
              size="sm"
              onClick={() => onGate(gate)}
              className="text-[11px] font-mono h-8 hover:border-emerald-500/50 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all duration-300"
            >
              {gate === 'Sdag' ? 'S†' : gate === 'Tdag' ? 'T†' : gate}
            </Button>
          ))}
        </div>
      </AccordionRow>

      {/* 4 — Universal U Gate */}
      <AccordionRow
        icon={<RotateCw className="w-4 h-4" />}
        label="Universal U Gate"
        open={open.ugate}
        onToggle={() => toggle('ugate')}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Field
              label="Theta (θ)°"
              value={uGateParams.theta}
              onChange={(v) => setUGateParams({ ...uGateParams, theta: parseFloat(v) || 0 })}
            />
            <Field
              label="Phi (φ)°"
              value={uGateParams.phi}
              onChange={(v) => setUGateParams({ ...uGateParams, phi: parseFloat(v) || 0 })}
            />
            <Field
              label="Lambda (λ)°"
              value={uGateParams.lambda}
              onChange={(v) => setUGateParams({ ...uGateParams, lambda: parseFloat(v) || 0 })}
            />
          </div>
          <button
            id="bloch-u-gate-btn"
            onClick={() => onUGate?.(uGateParams.theta, uGateParams.phi, uGateParams.lambda)}
            className="w-full text-xs font-semibold h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-all duration-300 shadow hover:shadow-emerald-500/25 active:scale-95 flex items-center justify-center"
          >
            Apply U(θ, φ, λ)
          </button>
        </div>
      </AccordionRow>

      {/* 5 — Pulses */}
      <AccordionRow
        icon={<Radio className="w-4 h-4" />}
        label="Pulses"
        open={open.pulses}
        onToggle={() => toggle('pulses')}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field
              label="Detuning Δ"
              value={pulse.detuning}
              step={0.1}
              onChange={(v) => setPulse({ ...pulse, detuning: parseFloat(v) || 0 })}
            />
            <Field
              label="Amplitude ω₁"
              value={pulse.amplitude}
              step={0.1}
              onChange={(v) => setPulse({ ...pulse, amplitude: parseFloat(v) || 0 })}
            />
            <Field
              label="Phase φ°"
              value={pulse.phase}
              onChange={(v) => setPulse({ ...pulse, phase: parseFloat(v) || 0 })}
            />
            <Field
              label="Length t"
              value={pulse.pulseLength}
              step={0.05}
              onChange={(v) => setPulse({ ...pulse, pulseLength: parseFloat(v) || 0 })}
            />
          </div>
          <div className="flex gap-2">
            <Button id="bloch-pulse-x" variant="outline" size="sm" onClick={() => onPulse('x')} className="flex-1 text-xs font-mono h-8 hover:border-emerald-500/50 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all duration-300">X Pulse</Button>
            <Button id="bloch-pulse-y" variant="outline" size="sm" onClick={() => onPulse('y')} className="flex-1 text-xs font-mono h-8 hover:border-emerald-500/50 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all duration-300">Y Pulse</Button>
          </div>
        </div>
      </AccordionRow>

      {/* 5 — Settings (flat, matching reference settings block) */}
      <AccordionRow
        icon={<Sliders className="w-4 h-4" />}
        label="Settings"
        open={open.settings}
        onToggle={() => toggle('settings')}
      >
        <div className="space-y-3 text-xs">
          {/* Color row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground mb-1.5">Spin color</p>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.spinColor}
                  onChange={(e) => setSettings({ ...settings, spinColor: e.target.value })}
                  className="w-10 h-7 rounded border border-border cursor-pointer bg-transparent p-0.5"
                />
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-1.5">History trace color</p>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.traceColor}
                  onChange={(e) => setSettings({ ...settings, traceColor: e.target.value })}
                  className="w-10 h-7 rounded border border-border cursor-pointer bg-transparent p-0.5"
                />
              </div>
            </div>
          </div>



          {/* Numeric settings */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/30">
            <div>
              <p className="text-muted-foreground mb-1">History trace length</p>
              <input
                type="number"
                min={1}
                max={50}
                value={settings.historyLength}
                onChange={(e) => setSettings({ ...settings, historyLength: parseInt(e.target.value) || 10 })}
                className="w-full bg-background border border-border/60 rounded px-2.5 py-1.5 font-mono text-xs text-foreground focus:outline-none"
              />
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Export size</p>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step={100}
                  value={settings.exportSize}
                  onChange={(e) => setSettings({ ...settings, exportSize: parseInt(e.target.value) || 800 })}
                  className="w-full bg-background border border-border/60 rounded px-2.5 py-1.5 font-mono text-xs text-foreground focus:outline-none"
                />
                <span className="text-muted-foreground text-[11px] shrink-0">px</span>
              </div>
            </div>
          </div>
        </div>
      </AccordionRow>

    </div>
  );
};
