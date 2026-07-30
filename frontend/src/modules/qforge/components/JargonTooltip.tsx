import React, { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

export interface JargonDef {
  term: string;
  oneLineDef: string;
  analogy: string;
  whyItMatters: string;
}

export const JARGON_DICTIONARY: Record<string, JargonDef> = {
  purcell_filter: {
    term: "Purcell Filter",
    oneLineDef: "Bandpass microwave filter placed at the Cold Plate to block spontaneous qubit photon decay.",
    analogy: "Think of it like noise-canceling headphones for qubits — it lets readout signals through while muting background noise.",
    whyItMatters: "Prevents spontaneous emission decay, increasing qubit coherence lifetime T1 by up to 300%."
  },
  twpa: {
    term: "TWPA (Traveling-Wave Parametric Amplifier)",
    oneLineDef: "Quantum-limited parametric amplifier operated at 10 millikelvin directly above the QPU.",
    analogy: "Like a high-precision microscope for quantum signals — boosts single-photon signals without adding noise.",
    whyItMatters: "Enables single-shot qubit readout with > 98% state assignment fidelity."
  },
  hemt: {
    term: "HEMT (High Electron Mobility Transistor)",
    oneLineDef: "Cryogenic low-noise solid-state amplifier mounted at the 4K stage.",
    analogy: "The main power amplifier at a concert — takes the weak signal boosted by the TWPA and pumps it up to room temperature levels.",
    whyItMatters: "Provides 35-40 dB of gain while withstanding 4K thermal power dissipation."
  },
  surface_code: {
    term: "Surface Code Distance (d=3 / d=5)",
    oneLineDef: "2D lattice of physical qubits working together to encode one fault-tolerant logical qubit.",
    analogy: "Like repeating a message 3 times so if one word gets garbled, you can still understand the true meaning.",
    whyItMatters: "Exponentially suppresses logical error rates as lattice distance d increases (PL ∝ (p/pth)^((d+1)/2))."
  }
};

interface JargonTooltipProps {
  termKey: keyof typeof JARGON_DICTIONARY;
  children: React.ReactNode;
}

export const JargonTooltip: React.FC<JargonTooltipProps> = ({ termKey, children }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);

  const def = JARGON_DICTIONARY[termKey];
  if (!def) return <>{children}</>;

  return (
    <span className="relative inline-block" onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
      <span className="underline decoration-dotted underline-offset-4 decoration-emerald-500 cursor-help font-semibold">
        {children}
      </span>

      {isOpen && (
        <div className={cn(
          "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 rounded-xl border shadow-2xl z-50 text-xs font-sans leading-relaxed animate-fadeIn",
          isDark ? "bg-zinc-950 border-zinc-700 text-zinc-100" : "bg-white border-zinc-300 text-zinc-900"
        )}>
          <div className="font-bold text-emerald-500 mb-1 flex items-center justify-between">
            <span>{def.term}</span>
            <span className="text-[10px] text-zinc-400 font-mono font-normal">Glossary</span>
          </div>

          <p className="font-medium text-[11px] mb-2">{def.oneLineDef}</p>

          <div className={cn(
            "p-2 rounded-lg border text-[11px] mb-2",
            isDark ? "bg-zinc-900 border-zinc-800 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-900"
          )}>
            <span className="font-bold block text-[10px]">💡 Analogy:</span>
            {def.analogy}
          </div>

          <div className="text-[10px] text-emerald-400 font-medium">
            <span className="font-bold text-zinc-400">Why it matters:</span> {def.whyItMatters}
          </div>
        </div>
      )}
    </span>
  );
};
