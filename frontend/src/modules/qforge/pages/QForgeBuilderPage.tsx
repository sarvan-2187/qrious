import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useBuildState } from '../hooks/useBuildState';
import { useAssemblyStepGate } from '../hooks/useAssemblyStepGate';
import { useQForgeApi } from '../hooks/useQForgeApi';
import { CryostatScene } from '../components/CryostatScene';
import { ComponentTray } from '../components/ComponentTray';
import { AssemblyStepper } from '../components/AssemblyStepper';
import { SignalChainRail } from '../components/SignalChainRail';
import { ComponentConfigPanel } from '../components/ComponentConfigPanel';
import { BuildReportPanel } from '../components/BuildReportPanel';
import { QubitCalibrationModal } from '../components/QubitCalibrationModal';
import { FaultInjectionDrawer } from '../components/FaultInjectionDrawer';
import { QecSurfaceCodeModal } from '../components/QecSurfaceCodeModal';
import { KeyboardShortcutsModal } from '../components/KeyboardShortcutsModal';
import { GuidedAssemblyAssistant } from '../components/GuidedAssemblyAssistant';
import { COMPONENTS } from '../constants/components';
import { QPU_CATALOG } from '../data/qpuCatalog';
import { CRYOSTAT_CATALOG } from '../data/cryostatCatalog';
import type { ComponentSpec } from '../constants/components';

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
  const { currentStep, advanceStep, resetStep, progressPercent } = useAssemblyStepGate();
  const { scoreBuild, isLoading } = useQForgeApi();

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
  const [isGuidedMode, setIsGuidedMode] = useState(false);
  const [isExploded, setIsExploded] = useState(false);
  const [activeFaults, setActiveFaults] = useState<string[]>([]);

  const handleToggleFault = (faultId: string) => {
    setActiveFaults(prev => 
      prev.includes(faultId) ? prev.filter(id => id !== faultId) : [...prev, faultId]
    );
  };

  const handleFullReset = () => {
    resetBuild();
    resetStep();
    setSelectedQpuId('contralto_a');
    setSelectedCryostatId('ld450sl');
    setWiringType('discrete_coax');
    setActiveFaults([]);
    setSimulationReport(null);
    setShowReport(false);
    setShowCalibrationModal(false);
    setShowFaultDrawer(false);
    setShowQecModal(false);
    setShowShortcutsModal(false);
    setIsExploded(false);
    setInspectedSpec(null);
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

  // Keyboard Shortcuts Listener
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
      else if (key === 'g') { setIsGuidedMode(prev => !prev); }
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
    if (spec) setInspectedSpec(spec);
  };

  const currentQpu = QPU_CATALOG.find(q => q.id === selectedQpuId);

  return (
    <div className={cn(
      "h-[calc(100vh-3.5rem)] font-sans flex flex-col relative overflow-hidden transition-colors duration-300",
      isDark ? "bg-zinc-950 text-zinc-50" : "bg-zinc-100 text-zinc-900"
    )}>
      {/* Header Bar Navigation & Shortcuts */}
      <header className={cn(
        "p-2.5 border-b flex justify-between items-center shrink-0 z-10 transition-colors duration-300 gap-2 overflow-x-auto",
        isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
      )}>
        <div className="flex items-center gap-2">
          <h1 className="text-base font-bold text-emerald-600 dark:text-emerald-400 shrink-0">QForge Builder</h1>
          
          <div className="flex items-center gap-1.5 text-xs">
            <select 
              value={selectedQpuId}
              onChange={e => setSelectedQpuId(e.target.value)}
              className={cn(
                "border rounded px-2 py-1 text-xs font-medium outline-none",
                isDark ? "bg-zinc-950 border-zinc-800 text-zinc-200" : "bg-zinc-50 border-zinc-200 text-zinc-800"
              )}
            >
              {QPU_CATALOG.map(q => (
                <option key={q.id} value={q.id}>{q.name} ({q.qubits}Q)</option>
              ))}
            </select>

            <select 
              value={selectedCryostatId}
              onChange={e => setSelectedCryostatId(e.target.value)}
              className={cn(
                "border rounded px-2 py-1 text-xs font-medium outline-none",
                isDark ? "bg-zinc-950 border-zinc-800 text-zinc-200" : "bg-zinc-50 border-zinc-200 text-zinc-800"
              )}
            >
              {CRYOSTAT_CATALOG.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select 
              value={wiringType}
              onChange={e => setWiringType(e.target.value as any)}
              className={cn(
                "border rounded px-2 py-1 text-xs font-medium outline-none hidden md:block",
                isDark ? "bg-zinc-950 border-zinc-800 text-zinc-200" : "bg-zinc-50 border-zinc-200 text-zinc-800"
              )}
            >
              <option value="discrete_coax">Discrete Coax</option>
              <option value="crioflex">Cri/oFlex Flex-Circuit</option>
            </select>
          </div>
        </div>

        <div className="w-1/6 hidden lg:block">
          <AssemblyStepper progress={progressPercent} currentStep={currentStep} />
        </div>

        {/* Header Action Toolbar */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button 
            onClick={() => setIsGuidedMode(prev => !prev)}
            className={cn(
              "px-2.5 py-1.5 border rounded-lg text-xs font-semibold transition-all flex items-center gap-1 shadow-sm cursor-pointer",
              isGuidedMode 
                ? "bg-emerald-600 border-emerald-500 text-white animate-pulse" 
                : (isDark ? "bg-zinc-800 border-zinc-700 text-emerald-400 hover:bg-zinc-700" : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100")
            )}
            title="Toggle Step-by-Step Guided Assembly Assistant [Press G]"
          >
            <span>🎯</span> Guided Mode
          </button>

          <button 
            onClick={() => undo()}
            disabled={buildGraph.placedComponents.length === 0}
            className={cn(
              "px-2.5 py-1.5 border rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-40",
              isDark ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200"
            )}
            title="Undo last placed component [Press Ctrl+Z or U]"
          >
            <span>↩</span> Undo
          </button>

          <button 
            onClick={() => setShowShortcutsModal(true)}
            className={cn(
              "px-2 py-1.5 border rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm cursor-pointer",
              isDark ? "bg-zinc-800 border-zinc-700 text-amber-400 hover:bg-zinc-700" : "bg-zinc-100 border-zinc-200 text-amber-600 hover:bg-zinc-200"
            )}
            title="Open Keyboard Shortcuts List [Press ?]"
          >
            <span>⌨</span> Shortcuts
          </button>

          <button 
            onClick={() => setIsExploded(prev => !prev)}
            className={cn(
              "px-2.5 py-1.5 border rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm cursor-pointer",
              isExploded 
                ? "bg-purple-600 border-purple-500 text-white" 
                : (isDark ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200")
            )}
            title="Toggle 3D Exploded Cryostat Camera View [Press X]"
          >
            <span>💥</span> Exploded View
          </button>

          <button 
            onClick={() => setShowQecModal(true)}
            className="px-2 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
            title="Open Quantum Error Correction Surface Code Lab [Press Q]"
          >
            <span>🛡</span> QEC Lab
          </button>

          <button 
            onClick={() => setShowCalibrationModal(true)}
            className="px-2 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
            title="Open Spectroscopy & Rabi Pulse Calibration Lab [Press C]"
          >
            <span>🔬</span> Calibration
          </button>

          <button 
            onClick={() => setShowFaultDrawer(true)}
            className={cn(
              "px-2 py-1.5 border rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm",
              activeFaults.length > 0
                ? "bg-amber-600 border-amber-500 text-white animate-pulse"
                : (isDark ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200")
            )}
            title="Open Hardware Fault Injection Lab [Press F]"
          >
            <span>⚠</span> Faults {activeFaults.length > 0 && `(${activeFaults.length})`}
          </button>

          <button 
            onClick={handleFullReset}
            className={cn(
              "px-2 py-1.5 border rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm cursor-pointer",
              isDark ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-red-950/50 hover:text-red-400 hover:border-red-800" : "bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            )}
            title="Completely reset simulator to default state [Press R]"
          >
            <span>🔄</span> Reset & Try Again
          </button>

          <button 
            onClick={handleRunSimulation}
            disabled={isLoading}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
            title="Evaluate Thermal, Signal, and Power Specs [Press E]"
          >
            <span>⚡</span> {isLoading ? 'Simulating...' : 'Cooldown & Evaluate'}
          </button>
        </div>
      </header>

      {/* Guided Assembly Assistant Banner */}
      {isGuidedMode && (
        <GuidedAssemblyAssistant 
          buildGraph={buildGraph} 
          onUndo={undo}
          onClose={() => setIsGuidedMode(false)} 
        />
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        <aside className={cn(
          "w-80 shrink-0 min-w-[320px] border-r p-4 overflow-y-auto z-10 transition-colors duration-300",
          isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"
        )}>
          <ComponentTray 
            onPlace={placeComponent} 
            onInspect={setInspectedSpec}
            currentStep={currentStep} 
          />
        </aside>

        <main className={cn(
          "flex-1 flex flex-col relative min-w-0 overflow-hidden transition-colors duration-300",
          isDark ? "bg-zinc-950" : "bg-zinc-100"
        )}>
          <div className="flex-1 relative min-h-0">
            <CryostatScene 
              buildGraph={buildGraph} 
              onRemove={removeComponent}
              onSelectComponent={handleSelectComponentById}
              isExploded={isExploded}
            />

            <div className={cn(
              "absolute top-4 left-4 border p-3 rounded-xl shadow-xl backdrop-blur max-w-xs z-10 transition-colors duration-300",
              isDark ? "bg-zinc-900/90 border-zinc-800" : "bg-white/90 border-zinc-200"
            )}>
              <div className="flex justify-between items-center mb-1.5">
                <h3 className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-300" : "text-zinc-700")}>
                  Installed ({buildGraph.placedComponents.length})
                </h3>
                <span className="text-[10px] text-emerald-500 font-mono font-bold">{currentQpu?.name}</span>
              </div>
              
              {buildGraph.placedComponents.length === 0 ? (
                <p className={cn("text-xs italic", isDark ? "text-zinc-500" : "text-zinc-400")}>
                  No components installed yet. Click "Install to Cryostat" in the catalog.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {buildGraph.placedComponents.map(comp => {
                    const spec = COMPONENTS.find(c => c.id === comp.componentId);
                    return (
                      <div key={comp.id} className={cn(
                        "flex justify-between items-center text-xs p-1.5 border rounded",
                        isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200"
                      )}>
                        <div>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">{spec?.name}</span>
                          <span className={cn("text-[10px] ml-1.5", isDark ? "text-zinc-500" : "text-zinc-400")}>({comp.stageId})</span>
                        </div>
                        <button 
                          onClick={() => removeComponent(comp.id)}
                          className="text-zinc-400 hover:text-red-500 text-xs px-1"
                          title="Remove from cryostat"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className={cn(
            "shrink-0 border-t px-4 py-2.5 overflow-hidden z-10 transition-colors duration-300",
            isDark ? "bg-zinc-900/90 border-zinc-800" : "bg-white/95 border-zinc-200"
          )}>
            <h3 className={cn("text-[10px] font-semibold uppercase tracking-wider mb-1", isDark ? "text-zinc-400" : "text-zinc-500")}>
              Signal Lines Schematic ({wiringType === 'crioflex' ? 'Cri/oFlex Flex-Circuit' : 'Discrete Coax Wiring'})
            </h3>
            <div className="grid grid-cols-2 gap-3 items-center">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold shrink-0">DRIVE:</span>
                <div className="flex-1 overflow-hidden">
                  <SignalChainRail components={buildGraph.placedComponents} line="drive" />
                </div>
              </div>
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-semibold shrink-0">READOUT:</span>
                <div className="flex-1 overflow-hidden">
                  <SignalChainRail components={buildGraph.placedComponents} line="readout" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {inspectedSpec && (
        <ComponentConfigPanel 
          spec={inspectedSpec} 
          onClose={() => setInspectedSpec(null)} 
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-50 overflow-y-auto">
          <div className={cn(
            "w-full max-w-4xl border rounded-2xl p-6 relative shadow-2xl transition-colors duration-300",
            isDark ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200"
          )}>
            <button 
              onClick={() => setShowReport(false)}
              className={cn("absolute top-4 right-4 text-lg font-bold hover:opacity-70", isDark ? "text-zinc-400" : "text-zinc-500")}
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
