import React, { useState, useEffect } from 'react';
import { 
  Undo, 
  Keyboard, 
  Maximize2, 
  Shield, 
  Sliders, 
  AlertTriangle, 
  RotateCcw, 
  Play,
  Cpu,
  Thermometer,
  Box,
  LayoutTemplate,
  History,
  HardDrive
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useBuildState } from '../hooks/useBuildState';
import { useAssemblyStepGate } from '../hooks/useAssemblyStepGate';
import { useQForgeApi } from '../hooks/useQForgeApi';

// Sub-components
import { CryostatScene } from '../components/CryostatScene';
import { ComponentTray } from '../components/ComponentTray';
import { SignalChainRail } from '../components/SignalChainRail';
import { PropertyInspector } from '../components/PropertyInspector';
import { BuildReportPanel } from '../components/BuildReportPanel';
import { QubitCalibrationModal } from '../components/QubitCalibrationModal';
import { FaultInjectionDrawer } from '../components/FaultInjectionDrawer';
import { QecSurfaceCodeModal } from '../components/QecSurfaceCodeModal';
import { KeyboardShortcutsModal } from '../components/KeyboardShortcutsModal';
import { GuidedAssemblyAssistant } from '../components/GuidedAssemblyAssistant';
import { QForgeOnboardingModal } from '../components/QForgeOnboardingModal';
import { PedagogicalErrorModal } from '../components/PedagogicalErrorModal';
import { LiveMetricsSidebar } from '../components/LiveMetricsSidebar';
import { LabNotebookModal } from '../components/LabNotebookModal';
import { StartBuildView } from '../components/StartBuildView';

// Data
import { COMPONENTS } from '../constants/components';
import { QPU_CATALOG } from '../data/qpuCatalog';
import { CRYOSTAT_CATALOG } from '../data/cryostatCatalog';
import type { ComponentSpec } from '../constants/components';
import type { QForgeMode } from '../components/ModeSelectorBar';

export const QForgeBuilderPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { setOpen: setMainSidebarOpen } = useSidebar();

  useEffect(() => {
    setMainSidebarOpen(false);
    return () => {
      setMainSidebarOpen(true);
    };
  }, []);

  const { buildGraph, placeComponent, removeComponent, resetBuild, undo } = useBuildState();
  const { currentStep, resetStep } = useAssemblyStepGate();
  const { scoreBuild, isLoading } = useQForgeApi();

  // Mode & State
  const [isBuildStarted, setIsBuildStarted] = useState(false);
  const [currentMode, setCurrentMode] = useState<QForgeMode>('guided');
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [showNotebook, setShowNotebook] = useState<boolean>(false);
  const [pedagogicalError, setPedagogicalError] = useState<string | null>(null);

  // Hardware & Modal States
  const [selectedQpuId, setSelectedQpuId] = useState('contralto_a');
  const [selectedCryostatId, setSelectedCryostatId] = useState('ld450sl');
  const [wiringType, setWiringType] = useState<'discrete_coax' | 'crioflex'>('discrete_coax');

  const [inspectedSpec, setInspectedSpec] = useState<ComponentSpec | null>(null);
  const [simulationReport, setSimulationReport] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [showFaultDrawer, setShowFaultDrawer] = useState(false);
  const [showQecModal, setShowQecModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [isExploded, setIsExploded] = useState(false);
  const [activeFaults, setActiveFaults] = useState<string[]>([]);

  const handleStartBuild = () => {
    setIsBuildStarted(true);
    if (currentMode === 'guided') {
      setShowOnboarding(true);
    }
  };

  const handleToggleFault = (faultId: string) => {
    setActiveFaults(prev => 
      prev.includes(faultId) ? prev.filter(id => id !== faultId) : [...prev, faultId]
    );
  };

  const handleFullReset = () => {
    resetBuild();
    resetStep();
    setActiveFaults([]);
    setSimulationReport(null);
    setShowReport(false);
    setShowCalibrationModal(false);
    setShowFaultDrawer(false);
    setShowQecModal(false);
    setShowShortcutsModal(false);
    setIsExploded(false);
    setInspectedSpec(null);
    setPedagogicalError(null);
  };

  const handleRunSimulation = async () => {
    const report = await scoreBuild(buildGraph);
    if (report) {
      if (activeFaults.includes('blocked_pulse_tube')) {
        report.thermal = Math.max(10, report.thermal - 45);
        report.failures.push("CRITICAL: 1st stage pulse tube blocked — 4K stage warmed to 14.5 K.");
      }
      if (activeFaults.includes('ir_leakage')) {
        report.signalIntegrity = Math.max(15, report.signalIntegrity - 40);
        report.failures.push("CRITICAL: Stray 300K infrared photons reaching MXC — qubit T1 degraded by 65%.");
      }
      if (activeFaults.includes('untorqued_connector')) {
        report.signalIntegrity = Math.max(20, report.signalIntegrity - 30);
        report.warnings.push("WARNING: Loose SMA connector at MXC — 15 dB signal reflection loss.");
      }
      if (activeFaults.includes('he3_contamination')) {
        report.thermal = Math.max(15, report.thermal - 50);
        report.failures.push("CRITICAL: He-3 mixture contamination — MXC base temperature elevated to 110 mK.");
      }

      setSimulationReport(report);
      setShowReport(true);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === 'z') { undo(); }
      else if (key === 'u') { undo(); }
      else if (key === 'e') { handleRunSimulation(); }
      else if (key === 'r') { handleFullReset(); }
      else if (key === 'x') { setIsExploded(prev => !prev); }
      else if (key === 'c') { setShowCalibrationModal(prev => !prev); }
      else if (key === 'f') { setShowFaultDrawer(prev => !prev); }
      else if (key === 'q') { setShowQecModal(prev => !prev); }
      else if (key === '?' || key === '/') { setShowShortcutsModal(prev => !prev); }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [buildGraph, activeFaults, undo]);

  const handleSelectComponentById = (componentId: string) => {
    const spec = COMPONENTS.find(c => c.id === componentId);
    if (spec) {
      setInspectedSpec(spec);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        const spec = COMPONENTS.find(c => c.id === parsed.componentId);
        if (spec) {
          // Open inspector with default or detected stage
          setInspectedSpec(spec);
        }
      } catch (err) {
        console.error("Drop parsing failed", err);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const currentQpu = QPU_CATALOG.find(q => q.id === selectedQpuId);
  const currentCryo = CRYOSTAT_CATALOG.find(c => c.id === selectedCryostatId);

  // START BUILD SCREEN
  if (!isBuildStarted) {
    return (
      <div className={cn("h-screen flex flex-col font-sans", isDark ? "bg-zinc-950" : "bg-zinc-100")}>
        <header className={cn(
          "px-6 py-4 border-b flex items-center shrink-0",
          isDark ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200"
        )}>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-500" />
            <h1 className="text-sm font-mono uppercase tracking-wider text-zinc-200 font-semibold">QForge Workstation</h1>
          </div>
        </header>
        <StartBuildView 
          currentMode={currentMode}
          onSelectMode={setCurrentMode}
          selectedQpuId={selectedQpuId}
          onSelectQpuId={setSelectedQpuId}
          selectedCryostatId={selectedCryostatId}
          onSelectCryostatId={setSelectedCryostatId}
          onStartBuild={handleStartBuild}
        />
      </div>
    );
  }

  // WORKSPACE SCREEN
  return (
    <div className={cn(
      "h-[calc(100vh-3.5rem)] font-sans flex flex-col relative overflow-hidden transition-colors duration-300",
      isDark ? "bg-zinc-950 text-zinc-50" : "bg-zinc-100 text-zinc-900"
    )}>
      {/* 
        Professional Toolbar Hierarchy:
        Logo | Config | Simulation | History | Modules | XP
      */}
      <header className={cn(
        "px-4 py-2 border-b flex justify-between items-center shrink-0 z-10 transition-colors duration-300 gap-4",
        isDark ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200"
      )}>
        {/* Left: Logo & Config */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-500" />
            <h1 className="text-xs font-mono uppercase tracking-wider font-semibold">QForge</h1>
          </div>
          
          <div className={cn("h-4 w-px", isDark ? "bg-zinc-800" : "bg-zinc-300")} />

          <div className="flex items-center gap-3 text-[11px] font-mono">
            <div className="flex items-center gap-1.5" title="Active QPU">
               <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
               <span className="text-zinc-300">{currentQpu?.name}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Active Cryostat">
               <Thermometer className="w-3.5 h-3.5 text-zinc-400" />
               <span className="text-zinc-300">{currentCryo?.name}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Mode">
               <LayoutTemplate className="w-3.5 h-3.5 text-zinc-400" />
               <span className="text-emerald-400 capitalize">{currentMode}</span>
            </div>
          </div>
        </div>

        {/* Center/Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* History */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-md p-1">
             <button 
                onClick={() => undo()}
                disabled={buildGraph.placedComponents.length === 0}
                className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
                title="Undo [Ctrl+Z]"
              >
                <Undo className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={handleFullReset}
                className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-800"
                title="Reset Build [R]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
          </div>

          <div className={cn("h-4 w-px mx-1", isDark ? "bg-zinc-800" : "bg-zinc-300")} />

          {/* Modules */}
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsExploded(prev => !prev)}
              className={cn(
                "px-2.5 py-1.5 border rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer",
                isExploded 
                  ? "bg-purple-600 border-purple-500 text-white" 
                  : (isDark ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800" : "bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200")
              )}
              title="Toggle 3D Exploded View [X]"
            >
              <Maximize2 className="w-3.5 h-3.5" /> Exploded
            </button>
            <button 
              onClick={() => setShowCalibrationModal(true)}
              className={cn(
                "px-2.5 py-1.5 border rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer",
                isDark ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800" : "bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200"
              )}
            >
              <Sliders className="w-3.5 h-3.5" /> Calibration
            </button>
            <button 
              onClick={() => setShowQecModal(true)}
              className={cn(
                "px-2.5 py-1.5 border rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer",
                isDark ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800" : "bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200"
              )}
            >
              <Shield className="w-3.5 h-3.5" /> QEC
            </button>
            <button 
              onClick={() => setShowFaultDrawer(true)}
              className={cn(
                "px-2.5 py-1.5 border rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer",
                activeFaults.length > 0
                  ? "bg-amber-600 border-amber-500 text-white"
                  : (isDark ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800" : "bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200")
              )}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Faults {activeFaults.length > 0 && `(${activeFaults.length})`}
            </button>
          </div>

          <div className={cn("h-4 w-px mx-1", isDark ? "bg-zinc-800" : "bg-zinc-300")} />

          {/* Evaluate Action */}
          <button 
            onClick={handleRunSimulation}
            disabled={isLoading}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> {isLoading ? 'Simulating...' : 'Evaluate'}
          </button>
        </div>
      </header>

      {/* Main Workspace: 18% | 64% | 18% Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Panel: Component Library (18%) */}
        <aside className={cn(
          "w-[18%] min-w-[260px] max-w-[320px] border-r flex flex-col z-10 transition-colors duration-300",
          isDark ? "bg-zinc-950/80 border-zinc-800" : "bg-zinc-50 border-zinc-200"
        )}>
          {/* Header */}
          <div className="p-4 border-b border-zinc-800/50">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Box className="w-3.5 h-3.5" /> Component Library
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
             <ComponentTray 
               onPlace={placeComponent} 
               onInspect={setInspectedSpec}
               currentStep={currentStep} 
             />
          </div>
        </aside>

        {/* Center: Workspace (64%) */}
        <main 
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={cn(
          "flex-[3] flex flex-col relative min-w-0 overflow-hidden transition-colors duration-300",
          isDark ? "bg-zinc-950" : "bg-zinc-100"
        )}>
          {/* Breadcrumbs or Stage indicator can go here */}
          
          <div className="flex-1 relative min-h-0">
            <CryostatScene 
              buildGraph={buildGraph} 
              onRemove={removeComponent}
              onSelectComponent={handleSelectComponentById}
              isExploded={isExploded}
            />
          </div>

          <div className={cn(
            "shrink-0 border-t px-4 py-3 z-10 transition-colors duration-300",
            isDark ? "bg-zinc-950/90 border-zinc-800" : "bg-white/95 border-zinc-200"
          )}>
            <div className="flex items-center justify-between mb-2">
               <h3 className={cn("text-[10px] font-mono uppercase tracking-wider", isDark ? "text-zinc-500" : "text-zinc-500")}>
                 Signal Schematic ({wiringType === 'crioflex' ? 'Flex' : 'Coax'})
               </h3>
            </div>
            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-[10px] text-emerald-400 font-mono font-semibold shrink-0">DRIVE</span>
                <div className="flex-1 overflow-hidden">
                  <SignalChainRail components={buildGraph.placedComponents} line="drive" />
                </div>
              </div>
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-[10px] text-sky-400 font-mono font-semibold shrink-0">READ</span>
                <div className="flex-1 overflow-hidden">
                  <SignalChainRail components={buildGraph.placedComponents} line="readout" />
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Right Panel: Inspector & Metrics (18%) */}
        <aside className={cn(
          "w-[18%] min-w-[280px] max-w-[340px] border-l flex flex-col z-10 transition-colors duration-300",
          isDark ? "bg-zinc-950/80 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
        )}>
          {inspectedSpec ? (
             <div className="flex-1 overflow-hidden">
               <PropertyInspector 
                 spec={inspectedSpec}
                 onApply={(stage, line) => {
                   placeComponent({
                     id: Math.random().toString(36).substr(2, 9),
                     componentId: inspectedSpec.id,
                     stageId: stage,
                     line: line
                   });
                   setInspectedSpec(null);
                 }}
                 onCancel={() => setInspectedSpec(null)}
               />
             </div>
          ) : (
             <div className="flex-1 flex flex-col">
               {currentMode === 'guided' && (
                 <div className="border-b border-zinc-800">
                   <GuidedAssemblyAssistant 
                     buildGraph={buildGraph} 
                     onUndo={undo}
                     onClose={() => setCurrentMode('free')} 
                   />
                 </div>
               )}
               <LiveMetricsSidebar buildGraph={buildGraph} />
             </div>
          )}
        </aside>

      </div>

      {/* Modals & Overlays */}
      {showOnboarding && (
        <QForgeOnboardingModal
          onStart={() => {
            setCurrentMode('guided');
            setShowOnboarding(false);
          }}
          onClose={() => setShowOnboarding(false)}
        />
      )}

      {pedagogicalError && (
        <PedagogicalErrorModal
          errorMessage={pedagogicalError}
          onFixIt={undo}
          onClose={() => setPedagogicalError(null)}
        />
      )}

      {showNotebook && (
        <LabNotebookModal
          buildGraph={buildGraph}
          onClose={() => setShowNotebook(false)}
        />
      )}



      {showFaultDrawer && (
        <FaultInjectionDrawer
          activeFaults={activeFaults}
          onToggleFault={handleToggleFault}
          onClose={() => setShowFaultDrawer(false)}
        />
      )}

      {showCalibrationModal && (
        <QubitCalibrationModal
          buildGraph={buildGraph}
          onClose={() => setShowCalibrationModal(false)}
        />
      )}

      {showQecModal && (
        <QecSurfaceCodeModal
          buildGraph={buildGraph}
          onClose={() => setShowQecModal(false)}
        />
      )}

      {showShortcutsModal && (
        <KeyboardShortcutsModal
          onClose={() => setShowShortcutsModal(false)}
        />
      )}

      {showReport && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6 z-50 overflow-y-auto">
          <div className={cn(
            "w-full max-w-4xl border rounded-2xl p-6 relative shadow-2xl transition-colors duration-300",
            isDark ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200"
          )}>
            <button 
              onClick={() => setShowReport(false)}
              className={cn("absolute top-4 right-4 text-lg font-medium hover:opacity-70 cursor-pointer", isDark ? "text-zinc-400" : "text-zinc-500")}
            >
              ✕
            </button>
            <BuildReportPanel report={simulationReport} />
          </div>
        </div>
      )}
    </div>
  );
};

export default QForgeBuilderPage;
