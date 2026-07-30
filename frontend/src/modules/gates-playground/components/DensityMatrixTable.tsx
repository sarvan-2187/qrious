import React from 'react';

interface DensityMatrixTableProps {
  densityMatrix: { real: number; imag: number }[][];
}

export const DensityMatrixTable: React.FC<DensityMatrixTableProps> = ({ densityMatrix }) => {
  return (
    <div className="w-full h-full overflow-hidden">
      <div className="w-full h-full overflow-auto custom-scrollbar font-mono text-[10px]">
        <table className="w-full border-collapse">
          <tbody>
            {densityMatrix.map((row, i) => (
              <tr key={i}>
                {row.map((val, j) => {
                  const prob = val.real * val.real + val.imag * val.imag;
                  const isZero = prob < 0.0001;
                  const sign = val.imag >= 0 ? '+' : '-';
                  const imagStr = Math.abs(val.imag) > 0.001 ? ` ${sign} ${Math.abs(val.imag).toFixed(2)}i` : '';
                  const cellText = isZero ? '0' : `${val.real.toFixed(2)}${imagStr}`;
                  
                  return (
                    <td 
                      key={j} 
                      className={`border border-qp-border p-2 font-mono ${isZero ? 'text-qp-text-muted' : 'text-qp-text'}`}
                      style={{
                        backgroundColor: isZero ? 'transparent' : `rgba(16, 185, 129, ${Math.min(0.5, prob + 0.1)})`
                      }}
                    >
                      {cellText}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
