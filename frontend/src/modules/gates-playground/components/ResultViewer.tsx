import React from 'react';
import { HistogramChart } from '../../gates-playground/components/HistogramChart';

interface ResultViewerProps {
  simulationResult: any;
}

export const ResultViewer: React.FC<ResultViewerProps> = ({ simulationResult }) => {
  if (!simulationResult || !simulationResult.probabilities) {
    return (
      <div className="w-full h-full flex items-center justify-center text-qp-text-muted italic bg-qp-card rounded-xl shadow border border-qp-border p-4">
        No simulation results available. 
        Print structured JSON from your code if you want to visualize it here.
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-4">
      <HistogramChart probabilities={simulationResult.probabilities} />
    </div>
  );
};
