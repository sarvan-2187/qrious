import { useState } from 'react';
import type { StageId } from '../constants/stages';

export interface PlacedComponent {
  id: string; // unique instance ID
  componentId: string; // reference to catalog component
  stageId: StageId;
  line: 'drive' | 'readout' | 'none';
  orderIndex?: number;
}

export interface BuildGraphState {
  qpuId: string | null;
  cryostatId: string | null;
  placedComponents: PlacedComponent[];
}

export const useBuildState = () => {
  const [buildGraph, setBuildGraph] = useState<BuildGraphState>({
    qpuId: null,
    cryostatId: null,
    placedComponents: [],
  });

  const placeComponent = (component: PlacedComponent) => {
    setBuildGraph((prev) => ({
      ...prev,
      placedComponents: [...prev.placedComponents, component],
    }));
  };

  const removeComponent = (instanceId: string) => {
    setBuildGraph((prev) => ({
      ...prev,
      placedComponents: prev.placedComponents.filter((c) => c.id !== instanceId),
    }));
  };

  const setHardware = (type: 'qpu' | 'cryostat', id: string) => {
    setBuildGraph((prev) => ({
      ...prev,
      [type === 'qpu' ? 'qpuId' : 'cryostatId']: id,
    }));
  };

  const resetBuild = () => {
    setBuildGraph((prev) => ({
      ...prev,
      placedComponents: [],
    }));
  };

  const undo = () => {
    setBuildGraph((prev) => ({
      ...prev,
      placedComponents: prev.placedComponents.slice(0, -1),
    }));
  };

  return {
    buildGraph,
    placeComponent,
    removeComponent,
    resetBuild,
    undo,
    setHardware,
  };
};
