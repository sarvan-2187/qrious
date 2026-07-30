import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

export const QForgeLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={cn(
      "min-h-screen font-sans p-8 transition-colors duration-300",
      isDark ? "bg-zinc-950 text-zinc-50" : "bg-zinc-50 text-zinc-900"
    )}>
      <div className="max-w-4xl mx-auto mt-16">
        <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-emerald-700 mb-6">
          QForge Hardware Simulator
        </h1>
        <p className={cn("text-xl mb-12", isDark ? "text-zinc-400" : "text-zinc-600")}>
          Step into the lab. Assemble a superconducting quantum computer stage-by-stage,
          manage thermal budgets, and ensure signal integrity before cooling down to 10 mK.
        </p>
        
        <div 
          className={cn(
            "p-8 border rounded-2xl transition-all cursor-pointer shadow-sm hover:shadow-md",
            isDark 
              ? "bg-zinc-900/50 border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-900" 
              : "bg-white border-zinc-200 hover:border-emerald-500/30 hover:bg-emerald-50/30"
          )}
          onClick={() => navigate('/qforge/builder')}
        >
          <h2 className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mb-2">Start a New Build</h2>
          <p className={isDark ? "text-zinc-400" : "text-zinc-600"}>
            Configure a Contralto-A 17-qubit QPU in a Bluefors LD450sl cryostat.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QForgeLandingPage;
