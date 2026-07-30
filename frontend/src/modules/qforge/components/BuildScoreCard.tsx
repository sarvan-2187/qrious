import React from 'react';

interface BuildScoreCardProps {
  category: string;
  score: number; // 0 to 100
  colorClass?: string;
}

export const BuildScoreCard: React.FC<BuildScoreCardProps> = ({ 
  category, 
  score, 
  colorClass = "text-emerald-400" 
}) => {
  return (
    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
      <h3 className="text-sm text-zinc-400 mb-2">{category}</h3>
      <div className="flex items-end gap-2">
        <span className={`text-3xl font-bold ${colorClass}`}>{score}</span>
        <span className="text-zinc-500 text-sm mb-1">/ 100</span>
      </div>
      <div className="w-full bg-zinc-950 rounded-full h-1.5 mt-4">
        <div 
          className={`h-1.5 rounded-full ${score > 80 ? 'bg-emerald-500' : score > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
          style={{ width: `${score}%` }}
        ></div>
      </div>
    </div>
  );
};
