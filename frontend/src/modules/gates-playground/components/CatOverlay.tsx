import React, { useLayoutEffect, useEffect, useState } from 'react';
import { motion, useAnimation, useReducedMotion } from 'framer-motion';
import { SchrodingerCat } from './SchrodingerCat';
import type { SchrodingerCatState } from './SchrodingerCat';
import { QuantumCatGate } from './QuantumCatGate';
import type { QuantumGateState } from './QuantumCatGate';

interface CatOverlayProps {
  isOpen: boolean;
  launcherAnchorRef: React.RefObject<HTMLButtonElement | null>;
  gateAAnchorRef: React.RefObject<HTMLDivElement | null>;
  gateBAnchorRef: React.RefObject<HTMLDivElement | null>;
  copilotCatAnchorRef: React.RefObject<HTMLDivElement | null>;
  isCatInCopilot?: boolean;
  onCatArrived?: () => void;
}

export const CatOverlay: React.FC<CatOverlayProps> = ({ 
  isOpen, 
  launcherAnchorRef, 
  gateAAnchorRef, 
  gateBAnchorRef, 
  copilotCatAnchorRef,
  isCatInCopilot,
  onCatArrived
}) => {
  const controls = useAnimation();
  const maskControls = useAnimation();
  const prefersReducedMotion = useReducedMotion();
  
  const [catState, setCatState] = useState<SchrodingerCatState>('idle');
  const [isRendered, setIsRendered] = useState(false);

  const [gateAState, setGateAState] = useState<QuantumGateState>('hidden');
  const [gateBState, setGateBState] = useState<QuantumGateState>('hidden');
  const [gateAPos, setGateAPos] = useState({ x: 0, y: 0 });
  const [gateBPos, setGateBPos] = useState({ x: 0, y: 0 });
  const [catVisible, setCatVisible] = useState(true);
  const [localVisible, setLocalVisible] = useState(true);

  const targetX = (rect: DOMRect) => rect.left + rect.width / 2 - 20; 
  const targetY = (rect: DOMRect) => rect.top + rect.height / 2 - 20;

  // Immediate synchronous positioning on mount to avoid flash/rectangle issue
  useLayoutEffect(() => {
    if (launcherAnchorRef.current && !isOpen) {
      const launcher = launcherAnchorRef.current.getBoundingClientRect();
      const x = targetX(launcher);
      const y = targetY(launcher);
      controls.set({ x, y });
      maskControls.set({ clipPath: `inset(0px 0px 0px 0px)` });
      setIsRendered(true);
    }
  }, []);

  useEffect(() => {
    if (isCatInCopilot) {
      setLocalVisible(false);
    } else {
      setLocalVisible(true);
    }
  }, [isCatInCopilot]);

  useEffect(() => {
    if (!isRendered) return;

    let isMounted = true;

    const animateCat = async () => {
      const launcher = launcherAnchorRef.current?.getBoundingClientRect();
      const gateA = gateAAnchorRef.current?.getBoundingClientRect();
      const gateB = gateBAnchorRef.current?.getBoundingClientRect();
      const copilotDest = copilotCatAnchorRef.current?.getBoundingClientRect();

      // Ensure we have our authoritative anchors
      if (!launcher || !gateA || !gateB) return;

      const launchX = targetX(launcher);
      const launchY = targetY(launcher);
      
      const gateAX = targetX(gateA);
      const gateAY = targetY(gateA);
      
      const gateBX = targetX(gateB);
      const gateBY = targetY(gateB);

      if (prefersReducedMotion) {
        if (isOpen && copilotDest) {
          setCatState('thinking');
          controls.set({ x: targetX(copilotDest), y: targetY(copilotDest), opacity: 1 });
        } else {
          setCatState('idle');
          controls.set({ x: launchX, y: launchY, opacity: 1 });
        }
        return;
      }

      if (isOpen) {
        // OPENING SEQUENCE
        controls.set({ x: launchX, y: launchY });
        maskControls.set({ clipPath: `inset(0px 0px 0px 0px)` });
        setCatVisible(true);
        setCatState('hover'); // Wake up
        
        // Gate A center is exactly at gateAAnchor, so offset left by 16px and top by 32px to center the 32x64 gate.
        setGateAPos({ x: gateAX + 4, y: gateAY - 12 });

        await new Promise(resolve => setTimeout(resolve, 100)); // Wake duration
        if (!isMounted) return;

        // Start Gate A
        setGateAState('closed');
        await new Promise(resolve => setTimeout(resolve, 50));

        // Cat starts running left
        setCatState('running_left');
        setGateAState('activating');

        // Run to Gate A
        await controls.start({
          x: gateAX + 20,
          y: gateAY,
          transition: { duration: 0.3, ease: "linear" }
        });
        if (!isMounted) return;

        setGateAState('open');

        // Enter Gate A (clipping left edge, which is the cat's front)
        controls.start({
          x: gateAX - 20,
          transition: { duration: 0.2, ease: "linear" }
        });
        await maskControls.start({
          clipPath: `inset(0px 0px 0px 40px)`,
          transition: { duration: 0.2, ease: "linear" }
        });
        
        if (!isMounted) return;
        setCatVisible(false);
        setGateAState('deactivating');
        
        // Wait for teleport pulse and sidebar to open
        await new Promise(resolve => setTimeout(resolve, 350));
        setGateAState('hidden');

        // Check the post-layout Copilot destination
        const currentCopilotDest = copilotCatAnchorRef.current?.getBoundingClientRect();
        if (!currentCopilotDest) return;
        const finalHeadX = targetX(currentCopilotDest);
        const finalHeadY = targetY(currentCopilotDest);

        setGateBPos({ x: gateBX + 4, y: gateBY - 12 });

        setGateBState('closed');
        await new Promise(resolve => setTimeout(resolve, 50));
        setGateBState('activating');
        await new Promise(resolve => setTimeout(resolve, 100));
        setGateBState('open');

        // Emerge from Gate B (running right)
        setCatState('running_right');
        
        // Position hidden behind gate B
        controls.set({ x: gateBX - 20, y: gateBY });
        setCatVisible(true);
        // Clip left edge so it appears to be coming out of the gate
        maskControls.set({ clipPath: `inset(0px 0px 0px 40px)` });

        controls.start({
          x: gateBX + 20,
          transition: { duration: 0.2, ease: "linear" }
        });
        await maskControls.start({
          clipPath: `inset(0px 0px 0px 0px)`,
          transition: { duration: 0.2, ease: "linear" }
        });

        setGateBState('deactivating');

        // Run left to right to final destination
        await controls.start({
          x: finalHeadX,
          y: finalHeadY,
          transition: { duration: 0.3, ease: "linear" }
        });
        
        setGateBState('hidden');
        setCatState('thinking'); // Idle inside Copilot

        if (onCatArrived) {
          onCatArrived();
        }
      } else {
        // INSTANT CLOSING (No Animation)
        setGateAState('hidden');
        setGateBState('hidden');
        setCatState('idle');
        controls.set({ x: launchX, y: launchY });
        maskControls.set({ clipPath: `inset(0px 0px 0px 0px)` });
        setCatVisible(false);
      }
    };

    animateCat();

    return () => {
      isMounted = false;
    };
  }, [isOpen, isRendered, launcherAnchorRef, gateAAnchorRef, gateBAnchorRef, copilotCatAnchorRef, controls, maskControls, prefersReducedMotion]);

  if (!isRendered) return null;

  return (
    <>
      <QuantumCatGate 
        state={gateAState} 
        className="fixed top-0 left-0 z-[10000]"
        style={{ transform: `translate(${gateAPos.x}px, ${gateAPos.y}px)` }}
      />
      <QuantumCatGate 
        state={gateBState} 
        className="fixed top-0 left-0 z-[10000]"
        style={{ transform: `translate(${gateBPos.x}px, ${gateBPos.y}px)` }}
      />
      {localVisible && (
        <motion.div
          animate={controls}
          className="fixed top-0 left-0 z-[9999] pointer-events-none w-10 h-10 text-qp-text"
          initial={false}
        >
          <motion.div animate={maskControls} className="w-full h-full">
            {catVisible && <SchrodingerCat state={catState} />}
          </motion.div>
        </motion.div>
      )}
    </>
  );
};
