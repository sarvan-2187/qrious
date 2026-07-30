import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { DndContext, type DragEndEvent, type DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { PuzzleHeader } from '../components/PuzzleHeader';
import { MatchTheGate } from '../components/MatchTheGate';
import { usePuzzleEngine } from '../hooks/usePuzzleEngine';
import { GateTray } from '../../gates-playground/components/GateTray';
import { CircuitCanvas } from '../../gates-playground/components/CircuitCanvas';
import { useCircuitState } from '../../gates-playground/hooks/useCircuitState';
import { BlochSphere3D } from '@/components/bloch/components/BlochSphere3D';
import { 
  getInitialState, 
  getGateOperator, 
  applyUnitary, 
  stateToBlochVector, 
  calculateOperatorTrajectory 
} from '@/components/bloch/utils/quantumMath';
import type { TrajectoryPoint, BlochVector } from '@/components/bloch/types/quantum';
import { FaTrash, FaCheckCircle, FaArrowRight, FaStar, FaInfoCircle, FaLightbulb } from 'react-icons/fa';
import { apiClient } from '@/lib/apiClient';
import { toast } from 'sonner';

export default function PuzzlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  
  const {
    currentPuzzle,
    isSuccess,
    showWrongFeedback,
    getNextPuzzleId,
    checkReachTarget,
    setSuccess
  } = usePuzzleEngine(id);

  // Initialize circuit state with the required number of qubits
  const { gates, addGate, setGates, updateGate, removeGate } = useCircuitState(currentPuzzle.qubitCount);

  const [blochVec, setBlochVec] = useState<BlochVector>(() => {
    if (currentPuzzle.startState) {
      return { u: currentPuzzle.startState.x, v: currentPuzzle.startState.y, w: currentPuzzle.startState.z };
    }
    return { u: 0, v: 0, w: 1 };
  });
  const [trajectories, setTrajectories] = useState<TrajectoryPoint[]>([]);
  const [activeDragData, setActiveDragData] = useState<any>(null);
  const [showHint, setShowHint] = useState(false);
  const [overlayDismissed, setOverlayDismissed] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  const location = useLocation();
  const isDaily = new URLSearchParams(location.search).get('daily') === 'true';

  useEffect(() => {
    if (isSuccess && !hasCompleted) {
      setHasCompleted(true);
      
      const submitCompletion = async () => {
        try {
          const url = isDaily 
            ? '/api/v1/learning/puzzles/daily/complete'
            : `/api/v1/learning/puzzles/complete/${currentPuzzle.id}`;
          const response = await apiClient.post(url, { stars: 3 });
          if (response.data && response.data.data) {
            const result = response.data.data;
            if (isDaily) {
              toast.success(`🔥 Daily Challenge Solved! Streak: ${result.current_streak} Days! +${result.xp_awarded} XP earned`);
            } else if (result.xp_awarded > 0) {
              toast.success(`🎉 Solved! +${result.xp_awarded} XP earned (Level ${result.level})`);
            } else {
              toast.success("Puzzle solved!");
            }
            if (result.newly_unlocked_badges && result.newly_unlocked_badges.length > 0) {
              result.newly_unlocked_badges.forEach((badge: any) => {
                toast.success(`🏆 Badge Unlocked: ${badge.title}! - ${badge.description}`, {
                  duration: 6000
                });
              });
            }
          }
        } catch (err) {
          console.error("Failed to complete puzzle on backend", err);
          toast.error("Failed to save progress to backend.");
        }
      };
      
      submitCompletion();
    }
  }, [isSuccess, currentPuzzle.id, hasCompleted, isDaily]);

  // Reset completion check when puzzle changes
  useEffect(() => {
    setHasCompleted(false);
  }, [currentPuzzle.id]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragData(event.active.data.current);
  };

  // Calculate live state whenever gates change
  useEffect(() => {
    // We only simulate Bloch sphere for 1-qubit puzzles for now
    if (currentPuzzle.qubitCount > 1) return;

    // Initialize from puzzle's startState (NOT always |0⟩)
    let state = getInitialState(); // |0⟩ default
    if (currentPuzzle.startState) {
      const { x, y, z } = currentPuzzle.startState;
      // Map Bloch vector back to a QubitState from the Bloch vector (x, y, z)
      // |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ}sin(θ/2)|1⟩  where z=cos(θ), x+iy=sin(θ)e^{iφ}
      const theta = Math.acos(Math.max(-1, Math.min(1, z)));
      const phi = (x === 0 && y === 0) ? 0 : Math.atan2(y, x);
      const cosHalf = Math.cos(theta / 2);
      const sinHalf = Math.sin(theta / 2);
      // QubitState = [{re, im}, {re, im}] — NOT plain number arrays
      state = [
        { re: cosHalf, im: 0 },
        { re: sinHalf * Math.cos(phi), im: sinHalf * Math.sin(phi) }
      ];
    }

    const newTrajectories: TrajectoryPoint[] = [];
    const sortedGates = [...gates].sort((a, b) => a.step - b.step);

    let opSuccess = true;
    for (const gate of sortedGates) {
      const normalizedName = gate.name === 'Sdg' ? 'Sdag' : (gate.name === 'Tdg' ? 'Tdag' : gate.name);
      if (['H', 'S', 'Sdag', 'T', 'Tdag', 'X', 'Y', 'Z'].includes(normalizedName)) {
        try {
          const op = getGateOperator(normalizedName as any);
          if (op) {
            const traj = calculateOperatorTrajectory(op, state, theme === 'dark' ? '#10b981' : '#059669');
            newTrajectories.push(traj);
            state = applyUnitary(op, state);
          }
        } catch(e) {
          opSuccess = false;
        }
      }
    }
    
    if (opSuccess) {
      const finalVec = stateToBlochVector(state);
      setBlochVec({ u: finalVec.u, v: finalVec.v, w: finalVec.w });
      setTrajectories(newTrajectories);
      checkReachTarget({ x: finalVec.u, y: finalVec.v, z: finalVec.w }, gates.length > 0);
    }
  }, [gates, theme, checkReachTarget, currentPuzzle.qubitCount, currentPuzzle.startState]);

  // Reset circuit when puzzle changes
  useEffect(() => {
    setGates([]);
    setShowHint(false);
    setOverlayDismissed(false);
    // Reset Bloch sphere to the new puzzle's start position
    if (currentPuzzle.startState) {
      setBlochVec({ u: currentPuzzle.startState.x, v: currentPuzzle.startState.y, w: currentPuzzle.startState.z });
    } else {
      setBlochVec({ u: 0, v: 0, w: 1 });
    }
    setTrajectories([]);
  }, [currentPuzzle.id, setGates]);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragData(null);
    const { active, over } = event;
    if (!over) return;

    // Check gate limit
    if (currentPuzzle.gateLimit && gates.length >= currentPuzzle.gateLimit) {
      return; // Do not add more gates
    }

    const { name, type } = active.data.current as any;
    const { qubitIndex, stepIndex } = over.data.current as any;

    if (type === 'new_gate') {
      addGate({
        id: `${name}-${Date.now()}`,
        name: name,
        target: qubitIndex,
        control: undefined,
        step: stepIndex
      });
    }
  };

  const handleClear = () => {
    setGates([]);
  };

  const isReachTarget = currentPuzzle.format === 'reach_target';
  const isMatchGate = currentPuzzle.format === 'match_gate';

  const targetBlochVec = currentPuzzle.targetState 
    ? { u: currentPuzzle.targetState.x, v: currentPuzzle.targetState.y, w: currentPuzzle.targetState.z }
    : undefined;

  return (
    <div key={currentPuzzle.id} className="h-full flex flex-col bg-background font-sans overflow-hidden relative">
      <PuzzleHeader 
        level={currentPuzzle.level} 
        totalLevels={10} 
        prompt={currentPuzzle.prompt}
        tier={currentPuzzle.tier}
        streak={isDaily ? 0 : 4}
        stars={isDaily ? 0 : (isSuccess ? 3 : 0)}
        onBack={() => navigate('/puzzles')}
        isSuccess={isSuccess}
        onNext={isDaily ? undefined : () => {
          const nextId = getNextPuzzleId();
          if (nextId) {
            navigate(`/puzzles/${nextId}`);
          } else {
            navigate('/puzzles');
          }
        }}
      />



      <div className="flex-1 min-h-0 relative">
        {isMatchGate && currentPuzzle.matchTasks && (
          <MatchTheGate 
            tasks={currentPuzzle.matchTasks} 
            onComplete={() => {
              setSuccess(true);
            }}
          />
        )}

        {isReachTarget && (
          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-col h-full bg-qp-bg">
              {/* Top Bar: Gate Palette */}
              <div className="pt-6 px-8 pb-4 shrink-0 w-full flex items-center">
                <div className="flex-1 min-w-0 flex items-center bg-qp-card border border-qp-border rounded-xl p-3 shadow-md gap-6">
                  <GateTray />
                  
                  <div className="flex-1" />
                  
                  <div className="flex shrink-0 items-center gap-3 pl-6 border-l border-qp-border h-full">
                    <button 
                      onClick={handleClear} 
                      className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-sm border bg-qp-secondary hover:bg-qp-hover text-qp-text-muted hover:text-qp-text border-qp-border"
                    >
                      <FaTrash className="w-3.5 h-3.5" /> Clear
                    </button>
                    
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm border bg-qp-secondary border-qp-border text-qp-text-muted">
                       Gates: {gates.length} / {currentPuzzle.gateLimit || '∞'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Workspace */}
              <div className="flex-1 grid grid-cols-12 gap-6 px-8 pb-8 min-h-0">
                {/* Circuit Canvas */}
                <div className={cn(
                  "rounded-2xl border flex flex-col overflow-hidden shadow-sm transition-colors bg-qp-card border-qp-border",
                  currentPuzzle.qubitCount > 1 ? "col-span-12" : "col-span-7"
                )}>
                  <div className="px-4 py-3 text-[11px] font-mono tracking-widest uppercase flex flex-col border-b bg-qp-secondary border-qp-border z-10 shrink-0">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-qp-text-muted">Circuit Builder</span>
                      {((currentPuzzle.intuition && currentPuzzle.intuition.length > 0) || currentPuzzle.hint) && (
                        <div className="flex items-center gap-2 normal-case tracking-normal">
                          <button 
                            onClick={() => setShowHint(!showHint)}
                            className="text-emerald-500/80 hover:text-emerald-500 flex items-center gap-1.5 transition-colors focus:outline-none"
                          >
                            <FaLightbulb /> {showHint ? "Hide Hint" : "Show Hint"}
                          </button>
                        </div>
                      )}
                    </div>
                    {showHint && currentPuzzle.intuition && currentPuzzle.intuition.length > 0 && (
                      <div className={cn(
                        "mt-3 p-3.5 rounded-lg border font-sans text-xs space-y-1.5 normal-case tracking-normal animate-in fade-in duration-300",
                        theme === 'dark' ? "bg-zinc-900/50 border-white/5 text-zinc-300" : "bg-zinc-50 border-zinc-200 text-zinc-600"
                      )}>
                        <strong className="block mb-0.5 text-[10px] font-mono uppercase tracking-wider text-emerald-500 font-medium">Intuition:</strong>
                        <ul className="list-disc list-inside space-y-1">
                          {currentPuzzle.intuition.map((point, idx) => (
                            <li key={idx} className="leading-relaxed">{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {showHint && !currentPuzzle.intuition && currentPuzzle.hint && (
                      <div className="mt-2.5 text-xs text-emerald-500/80 normal-case tracking-normal animate-in fade-in duration-200">
                        {currentPuzzle.hint}
                      </div>
                    )}
                    {showWrongFeedback && !isSuccess && (
                      <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-500 normal-case tracking-normal text-sm flex items-start gap-2 animate-in fade-in">
                        <FaInfoCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <p>{currentPuzzle.wrongFeedback}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 relative overflow-auto custom-scrollbar bg-qp-bg/50">
                    <CircuitCanvas 
                      qubits={currentPuzzle.qubitCount}
                      cbits={0}
                      gates={gates} 
                      addGate={addGate} 
                      updateGate={updateGate} 
                      removeGate={removeGate} 
                      expandMacroGate={() => {}} 
                    />
                  </div>
                </div>

                {/* Bloch Sphere (Only for 1 Qubit) */}
                {currentPuzzle.qubitCount === 1 && (
                  <div className={cn(
                    "col-span-5 rounded-2xl border flex flex-col overflow-hidden shadow-sm transition-all duration-500",
                    theme === 'dark' ? "bg-zinc-950" : "bg-white",
                    isSuccess ? "border-emerald-500 ring-1 ring-emerald-500/50" : (theme === 'dark' ? "border-white/10" : "border-zinc-200")
                  )}>
                    <div className={cn(
                      "px-4 py-3 text-[11px] font-mono tracking-widest uppercase flex justify-between items-center border-b z-10 shrink-0 transition-colors",
                      isSuccess ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : (theme === 'dark' ? "bg-zinc-900 border-white/10 text-zinc-400" : "bg-zinc-50 border-zinc-200 text-zinc-500")
                    )}>
                      <span>Live State</span>
                      {isSuccess && <span>Target Reached!</span>}
                    </div>
                    
                    <div className="flex-1 relative min-h-0 bg-transparent">
                      <BlochSphere3D 
                        blochVec={blochVec}
                        targetBlochVec={targetBlochVec}
                        trajectories={trajectories}
                        spinColor={isSuccess ? "#10b981" : "#3b82f6"}
                        traceColor={theme === 'dark' ? '#10b981' : '#059669'}
                        historyLength={10}
                      />
                    </div>

                    <div className={cn(
                      "flex items-center justify-center gap-4 text-xs font-mono py-3 border-t transition-colors",
                      isSuccess ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : (theme === 'dark' ? "bg-zinc-900 border-white/10 text-zinc-400" : "bg-zinc-50 border-zinc-200 text-zinc-500")
                    )}>
                      <span>x: <strong className="tabular-nums">{blochVec.u.toFixed(2)}</strong></span>
                      <span>y: <strong className="tabular-nums">{blochVec.v.toFixed(2)}</strong></span>
                      <span>z: <strong className="tabular-nums">{blochVec.w.toFixed(2)}</strong></span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DragOverlay dropAnimation={{
              duration: 200,
              easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
            }}>
              {activeDragData && activeDragData.type === 'new_gate' ? (
                <div className={`w-9 h-9 flex items-center justify-center font-mono font-medium text-xs rounded shadow-lg opacity-90 ${activeDragData.color}`}>
                  {activeDragData.label}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Success Overlay */}
        {isSuccess && !overlayDismissed && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-300">
            <div className={cn(
              "flex flex-col items-center gap-4 p-6 rounded-2xl border shadow-xl animate-in zoom-in-95 duration-500 max-w-xs w-full mx-4",
              theme === 'dark' ? "bg-zinc-950 border-emerald-500/30 shadow-emerald-900/20" : "bg-white border-emerald-200 shadow-emerald-100"
            )}>
              <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <FaCheckCircle className="w-7 h-7" />
              </div>
              
              <div className="text-center">
                <h2 className="text-2xl font-sans tracking-tight text-foreground font-medium mb-1">Puzzle Solved!</h2>
                <p className="text-muted-foreground text-xs">{isDaily ? "+10 XP Earned" : "+10 XP • 3 Stars Earned"}</p>
                {currentPuzzle.level === 10 && !isDaily && (
                  <p className="text-emerald-500 text-xs font-medium mt-1 animate-pulse">Tier Badge Unlocked!</p>
                )}
              </div>

              {!isDaily && (
                <div className="flex gap-1.5 text-yellow-400">
                  <FaStar className="w-6 h-6 drop-shadow-sm" />
                  <FaStar className="w-6 h-6 drop-shadow-sm" />
                  <FaStar className="w-6 h-6 drop-shadow-sm" />
                </div>
              )}

              <div className="flex gap-2.5 w-full mt-2">
                <button
                  onClick={() => setOverlayDismissed(true)}
                  className={cn(
                    "flex-1 px-4 py-2.5 font-medium rounded-lg border transition-colors text-xs text-center",
                    theme === 'dark' 
                      ? "border-white/10 hover:bg-white/5 text-zinc-300" 
                      : "border-zinc-200 hover:bg-zinc-50 text-zinc-700"
                  )}
                >
                  Review
                </button>
                <button
                  onClick={() => {
                    if (isDaily) {
                      navigate('/puzzles');
                    } else {
                      const nextId = getNextPuzzleId();
                      if (nextId) {
                        navigate(`/puzzles/${nextId}`);
                      } else {
                        navigate('/puzzles');
                      }
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition-colors shadow-md active:scale-95 text-xs"
                >
                  {isDaily ? 'Finish' : (getNextPuzzleId() ? 'Next' : 'Finish')} <FaArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
