import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface HistogramChartProps {
  probabilities: Record<string, number>;
}

export const HistogramChart: React.FC<HistogramChartProps> = ({ probabilities }) => {
  const data = Object.entries(probabilities).map(([state, prob]) => ({
    state,
    probability: prob
  }));

  return (
    <div className="w-full h-full p-4 rounded-xl">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="state" stroke="var(--qp-text-muted)" />
          <YAxis stroke="var(--qp-text-muted)" />
          <Tooltip
            formatter={(value) => [`${(Number(value) * 100).toFixed(2)}%`, 'Probability']}
            contentStyle={{ backgroundColor: 'var(--qp-secondary)', color: 'var(--qp-text)', border: '1px solid var(--qp-border)', borderRadius: '8px' }}
          />
          <Bar dataKey="probability" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
