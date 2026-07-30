import React from 'react';
import { useNavigate } from 'react-router-dom';

export const QForgeLandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans p-8">
      <div className="max-w-4xl mx-auto mt-16">
        <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-emerald-600 mb-6">
          QForge Hardware Simulator
        </h1>
        <p className="text-xl text-zinc-400 mb-12">
          Step into the lab. Assemble a superconducting quantum computer stage-by-stage,
          manage thermal budgets, and ensure signal integrity before cooling down to 10 mK.
        </p>
        
        <div 
          className="p-8 border border-zinc-800 rounded-xl bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors cursor-pointer"
          onClick={() => navigate('/qforge/builder')}
        >
          <h2 className="text-2xl font-semibold text-emerald-400 mb-2">Start a New Build</h2>
          <p className="text-zinc-400">
            Configure a Contralto-A 17-qubit QPU in a Bluefors LD450sl cryostat.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QForgeLandingPage;
