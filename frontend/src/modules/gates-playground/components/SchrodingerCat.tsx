import React, { useState, useEffect } from 'react';

export type SchrodingerCatState = 
  | 'idle' 
  | 'hover' 
  | 'running_left' 
  | 'running_up'
  | 'running_down'
  | 'running_right'
  | 'thinking' 
  | 'alert';

interface SchrodingerCatProps {
  state: SchrodingerCatState;
  className?: string;
}

const stateToFrames: Record<SchrodingerCatState, string[]> = {
  idle: ['sleep1.png', 'sleep2.png'],
  hover: ['awake.png'],
  running_left: ['left1.png', 'left2.png'],
  running_up: ['up1.png', 'up2.png'],
  running_down: ['down1.png', 'down2.png'],
  running_right: ['right1.png', 'right2.png'],
  thinking: ['scratch1.png', 'scratch2.png'],
  alert: ['up1.png', 'up2.png']
};

export const SchrodingerCat: React.FC<SchrodingerCatProps> = ({ state, className }) => {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const frames = stateToFrames[state] || stateToFrames.idle;
    setFrameIndex(0); // Reset animation cycle when state changes
    
    // Different states have different animation speeds
    let speed = 250;
    if (state.startsWith('running_')) speed = 150;
    if (state === 'thinking') speed = 200;
    if (state === 'idle') speed = 500;

    const interval = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % frames.length);
    }, speed);

    return () => clearInterval(interval);
  }, [state]);

  const frames = stateToFrames[state] || stateToFrames.idle;
  const currentFrame = frames[frameIndex];

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* 
        [image-rendering:pixelated] ensures the pixel art stays sharp when scaled up.
      */}
      <img 
        src={`/neko/${currentFrame}`} 
        alt={`Schrödinger Cat - ${state}`} 
        className="w-full h-full object-contain [image-rendering:pixelated] drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]" 
      />
    </div>
  );
};
