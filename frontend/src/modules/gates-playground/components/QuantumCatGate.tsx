import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export type QuantumGateState = 'hidden' | 'closed' | 'activating' | 'open' | 'deactivating';

interface QuantumCatGateProps {
  state: QuantumGateState;
  className?: string;
  style?: React.CSSProperties;
}

export const QuantumCatGate: React.FC<QuantumCatGateProps> = ({ state, className, style }) => {
  if (state === 'hidden') return null;

  return (
    <div className={cn("relative flex items-center justify-center w-8 h-16 pointer-events-none", className)} style={style}>
      <motion.div
        className="absolute w-2.5 h-16 bg-qp-card border rounded-full flex items-center justify-center overflow-hidden z-10"
        animate={{
          scaleY: state === 'closed' ? 0.1 : state === 'activating' ? 0.6 : state === 'open' ? 1 : state === 'deactivating' ? 0.3 : 0,
          opacity: state === 'closed' ? 0.5 : 1,
          boxShadow: state === 'open' 
            ? '0 0 15px 2px rgba(168, 85, 247, 0.6), inset 0 0 10px rgba(16, 185, 129, 0.5)'
            : state === 'activating'
            ? '0 0 8px 1px rgba(168, 85, 247, 0.3), inset 0 0 5px rgba(16, 185, 129, 0.2)'
            : '0 0 0px 0px rgba(0,0,0,0)',
          borderColor: state === 'open' ? 'rgba(168, 85, 247, 0.8)' : 'rgba(255,255,255,0.1)'
        }}
        transition={{ duration: 0.2 }}
      >
        <AnimatePresence>
          {state === 'open' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 w-full h-full"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-purple-500/20 via-emerald-500/40 to-purple-500/20 animate-pulse" />
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-emerald-400/80 shadow-[0_0_8px_rgba(16,185,129,1)]" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
