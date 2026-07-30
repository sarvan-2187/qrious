import React from 'react';

interface StatevectorTableProps {
  statevector: { real: number; imag: number }[];
}

export const StatevectorTable: React.FC<StatevectorTableProps> = ({ statevector }) => {
  const numQubits = Math.log2(statevector.length);
  
  return (
    <div className="w-full h-full overflow-hidden">
      <div className="w-full h-full overflow-y-auto custom-scrollbar">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="border-b border-qp-border text-qp-text-muted">
              <th className="pb-2.5 font-medium uppercase tracking-wider text-[10px]">Basis State</th>
              <th className="pb-2.5 font-medium uppercase tracking-wider text-[10px]">Amplitude (α)</th>
              <th className="pb-2.5 font-medium uppercase tracking-wider text-[10px]">Probability (|α|²)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-qp-border/30">
            {statevector.map((amp, idx) => {
              const prob = (amp.real * amp.real + amp.imag * amp.imag);
              if (prob < 0.0001) return null; // Only show non-zero states to save space
              
              const bin = idx.toString(2).padStart(numQubits, '0');
              const sign = amp.imag >= 0 ? '+' : '-';
              const imagStr = Math.abs(amp.imag) > 0.001 ? ` ${sign} ${Math.abs(amp.imag).toFixed(3)}i` : '';
              
              return (
                <tr key={idx} className="hover:bg-qp-hover/50 transition-colors">
                  <td className="py-2.5 text-emerald-400 font-medium">|{bin}⟩</td>
                  <td className="py-2.5 text-qp-text">
                    {amp.real.toFixed(3)}{imagStr}
                  </td>
                  <td className="py-2.5 text-qp-text-muted">{(prob * 100).toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
