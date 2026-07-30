import NoiseOverlay from './NoiseOverlay';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';

const steps = [
  { num: '01', text: 'Build your circuit on the gate canvas' },
  { num: '02', text: 'Simulate instantly on Qiskit Aer' },
  { num: '03', text: 'Visualize the state on the Bloch sphere' },
  { num: '04', text: 'Export as OpenQASM for any quantum platform' },
];

export default function WorkflowBlock() {
  return (
    <section className="bg-zinc-900 py-32 rounded-[1.5rem] md:rounded-[2.5rem] mt-8 px-6 md:px-16 w-full text-white overflow-hidden relative border border-white/10">
      {/* Noise Overlay */}
      <NoiseOverlay />
      
      {/* Grayscale grid lineart overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '4rem 4rem'
        }}
      />

      <div className="relative z-10 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* Left Column: Numbered steps */}
        <div className="flex flex-col gap-6">
          <motion.h2 
            className="text-3xl md:text-5xl font-sans tracking-tight mb-8"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            From concept to code in seconds.
          </motion.h2>
          {steps.map((step, idx) => (
            <motion.div 
              key={idx} 
              className="flex items-center gap-6 p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
            >
              <div className="text-2xl font-bold text-emerald-400 font-mono">{step.num}</div>
              <div className="text-lg text-white/90">{step.text}</div>
            </motion.div>
          ))}
        </div>

        {/* Right Column: 3D transformed mock-up */}
        <motion.div 
          className="relative lg:perspective-[1200px] flex items-center justify-center p-8 mt-12 lg:mt-0"
          initial={{ opacity: 0, scale: 0.9, rotateY: 20 }}
          whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div 
            className="w-full max-w-lg rounded-2xl border border-white/20 p-6 shadow-2xl relative bg-zinc-950/40 backdrop-blur-xl lg:transform lg:-rotate-y-12 lg:rotate-x-6 lg:rotate-z-3 transition-transform duration-500 hover:rotate-0"
            style={{
              transformStyle: 'preserve-3d'
            }}
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="ml-4 text-xs font-mono text-zinc-500">export.qasm</span>
            </div>
            <Separator className="mb-6 bg-white/10" />
            
            <pre className="text-emerald-400 font-mono text-sm sm:text-base overflow-hidden">
              <code>{`OPENQASM 2.0;
include "qelib1.inc";

qreg q[3];
creg c[3];

h q[0];
cx q[0], q[1];
cx q[1], q[2];
measure q -> c;`}</code>
            </pre>

            {/* Bouncing Status Tag */}
            <div className="absolute -bottom-4 -right-4 bg-emerald-500 text-zinc-950 font-bold px-4 py-2 rounded-full text-sm shadow-lg animate-bounce border border-emerald-400/50 flex items-center gap-2">
              Simulation complete <span className="text-lg leading-none">✓</span>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
