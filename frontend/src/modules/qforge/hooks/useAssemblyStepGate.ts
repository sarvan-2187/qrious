import { useState } from 'react';

export type AssemblyStep = 
  | 'install_cryostat'
  | 'install_wiring'
  | 'install_qpu'
  | 'install_electronics'
  | 'power_on'
  | 'calibrate';

export const STEPS: AssemblyStep[] = [
  'install_cryostat',
  'install_wiring',
  'install_qpu',
  'install_electronics',
  'power_on',
  'calibrate'
];

export const useAssemblyStepGate = () => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const currentStep = STEPS[currentStepIndex];
  
  const advanceStep = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const isStepUnlocked = (step: AssemblyStep) => {
    return STEPS.indexOf(step) <= currentStepIndex;
  };

  return {
    currentStep,
    advanceStep,
    isStepUnlocked,
    progressPercent: (currentStepIndex / (STEPS.length - 1)) * 100
  };
};
