import React from 'react';
import { useBuildState } from '../hooks/useBuildState';
import { useAssemblyStepGate } from '../hooks/useAssemblyStepGate';
import { CryostatScene } from '../components/CryostatScene';
import { ComponentTray } from '../components/ComponentTray';
import { AssemblyStepper } from '../components/AssemblyStepper';

export const QForgeBuilderPage: React.FC = () => {
  const { buildGraph, placeComponent, removeComponent } = useBuildState();
  const { currentStep, advanceStep, progressPercent } = useAssemblyStepGate();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans flex flex-col">
      <header className="p-4 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center">
        <h1 className="text-xl font-bold text-emerald-400">QForge Builder</h1>
        <div className="w-1/3">
          <AssemblyStepper progress={progressPercent} currentStep={currentStep} />
        </div>
        <button 
          onClick={advanceStep}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-medium transition-colors"
        >
          Next Step
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Component Tray Sidebar */}
        <aside className="w-80 border-r border-zinc-800 bg-zinc-900/50 p-4 overflow-y-auto">
          <ComponentTray onPlace={placeComponent} currentStep={currentStep} />
        </aside>

        {/* Main 3D Canvas / Assembly Area */}
        <main className="flex-1 relative bg-zinc-950">
          <CryostatScene buildGraph={buildGraph} onRemove={removeComponent} />
          
          <div className="absolute bottom-4 right-4 bg-zinc-900/90 border border-zinc-700 p-4 rounded-lg shadow-xl backdrop-blur">
            <h3 className="text-sm font-semibold text-zinc-300 mb-2">Build Stats</h3>
            <p className="text-xs text-zinc-400">Components: {buildGraph.placedComponents.length}</p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default QForgeBuilderPage;
