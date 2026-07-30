import React from 'react';

interface CircuitDiagramProps {
  text: string;
}

export const CircuitDiagram: React.FC<CircuitDiagramProps> = ({ text }) => {
  return (
    <div className="w-full bg-qp-card p-4 rounded-xl shadow border border-qp-border overflow-x-auto">
      <h3 className="text-lg font-semibold mb-2 text-qp-text">Qiskit Diagram</h3>
      <pre className="text-xs sm:text-sm text-qp-text-muted font-mono">
        {text}
      </pre>
    </div>
  );
};
