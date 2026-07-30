import { useState, useCallback, useEffect, useRef } from 'react';

const SESSION_KEY = 'constellation_state';

interface CameraState {
  x: number;
  y: number;
  k: number; // zoom scale
}

interface ConstellationState {
  search: string;
  filterDomain: string;
  filterDifficulty: string;
  filterStatus: string;
  selectedSlug: string | null;
  camera: CameraState;
  hoveredDomain: string | null;
}

const DEFAULT_STATE: ConstellationState = {
  search: '',
  filterDomain: 'All',
  filterDifficulty: 'All',
  filterStatus: 'All',
  selectedSlug: null,
  camera: { x: 0, y: 0, k: 1 },
  hoveredDomain: null,
};

function loadSession(): ConstellationState {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT_STATE;
}

// Returns the set of algorithm slugs the user has viewed (stored in localStorage)
export function getExploredSlugs(): Set<string> {
  try {
    const raw = localStorage.getItem('qrious_explored_algorithms');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set<string>(arr);
    }
  } catch {
    // ignore
  }
  return new Set<string>();
}

// Call this when user navigates to an algorithm page
export function markAlgorithmExplored(slug: string): void {
  try {
    const existing = getExploredSlugs();
    existing.add(slug);
    localStorage.setItem('qrious_explored_algorithms', JSON.stringify([...existing]));
  } catch {
    // ignore
  }
}

export function useConstellationState() {
  const [state, setState] = useState<ConstellationState>(loadSession);
  // Ref to avoid stale closure in the debounced save
  const stateRef = useRef(state);
  stateRef.current = state;

  // Persist to sessionStorage on every change (debounced)
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(stateRef.current));
      } catch {
        // ignore quota errors
      }
    }, 200);
    return () => clearTimeout(id);
  }, [state]);

  const setSearch = useCallback((search: string) => setState(s => ({ ...s, search })), []);
  const setFilterDomain = useCallback((filterDomain: string) => setState(s => ({ ...s, filterDomain })), []);
  const setFilterDifficulty = useCallback((filterDifficulty: string) => setState(s => ({ ...s, filterDifficulty })), []);
  const setFilterStatus = useCallback((filterStatus: string) => setState(s => ({ ...s, filterStatus })), []);
  const setSelectedSlug = useCallback((selectedSlug: string | null) => setState(s => ({ ...s, selectedSlug })), []);
  const setCamera = useCallback((camera: CameraState) => setState(s => ({ ...s, camera })), []);
  const setHoveredDomain = useCallback((hoveredDomain: string | null) => setState(s => ({ ...s, hoveredDomain })), []);

  return {
    ...state,
    setSearch,
    setFilterDomain,
    setFilterDifficulty,
    setFilterStatus,
    setSelectedSlug,
    setCamera,
    setHoveredDomain,
  };
}
