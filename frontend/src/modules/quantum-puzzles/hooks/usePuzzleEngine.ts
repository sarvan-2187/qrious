import { useState, useCallback, useEffect } from 'react';
import { puzzles } from '../data/puzzles';

export function usePuzzleEngine(puzzleId?: string) {
  const currentPuzzle = puzzleId 
    ? puzzles.find(p => p.id === puzzleId) || puzzles[0] 
    : puzzles[0];

  const [isSuccess, setIsSuccess] = useState(false);
  const [showWrongFeedback, setShowWrongFeedback] = useState(false);

  useEffect(() => {
    setIsSuccess(false);
    setShowWrongFeedback(false);
  }, [currentPuzzle.id]);

  // Allow setting a new puzzle manually (useful if reusing the hook without unmounting)
  const setPuzzleById = useCallback((_id: string) => {
    setIsSuccess(false);
    setShowWrongFeedback(false);
  }, []);

  const getNextPuzzleId = useCallback(() => {
    const currentIndex = puzzles.findIndex(p => p.id === currentPuzzle.id);
    if (currentIndex >= 0 && currentIndex < puzzles.length - 1) {
      return puzzles[currentIndex + 1].id;
    }
    return null;
  }, [currentPuzzle]);

  const checkReachTarget = useCallback((liveState: { x: number, y: number, z: number } | null, hasGates: boolean = true) => {
    if (currentPuzzle.format !== 'reach_target' || !currentPuzzle.targetState || !liveState) return;
    
    const target = currentPuzzle.targetState;
    const tol = 0.05;
    
    const xMatch = Math.abs(liveState.x - target.x) < tol;
    const yMatch = Math.abs(liveState.y - target.y) < tol;
    const zMatch = Math.abs(liveState.z - target.z) < tol;
    
    if (xMatch && yMatch && zMatch && hasGates) {
      setIsSuccess(true);
      setShowWrongFeedback(false);
    } else {
      setShowWrongFeedback(hasGates);
    }
  }, [currentPuzzle]);

  const setSuccess = (val: boolean) => {
    setIsSuccess(val);
    if (val) setShowWrongFeedback(false);
  };
  
  const triggerWrongFeedback = () => setShowWrongFeedback(true);

  return {
    currentPuzzle,
    isSuccess,
    showWrongFeedback,
    setPuzzleById,
    getNextPuzzleId,
    checkReachTarget,
    setSuccess,
    triggerWrongFeedback
  };
}
