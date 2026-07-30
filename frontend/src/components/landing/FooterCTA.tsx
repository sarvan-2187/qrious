import { Link } from 'react-router-dom';
import InteractiveButton from './InteractiveButton';
import NoiseOverlay from './NoiseOverlay';

export default function FooterCTA() {
  return (
    <section className="relative mt-8 py-32 px-6 rounded-[1.5rem] md:rounded-[2.5rem] bg-zinc-950 overflow-hidden flex flex-col items-center justify-center text-center border border-white/10">
      {/* Noise Overlay */}
      <NoiseOverlay />
      
      {/* Dark glass panel styling */}
      <div className="absolute inset-0 z-0"
        style={{
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(20px)',
        }}
      />
      
      <div className="relative z-10 max-w-2xl flex flex-col items-center">
        <h2 className="text-4xl md:text-6xl font-sans text-white mb-10 tracking-tight">
          Quantum computing, without the PhD.
        </h2>
        
        <Link to="/login">
          <InteractiveButton className="text-lg py-3 pl-8 pr-3 h-14">
            Launch Qrious — it's free
          </InteractiveButton>
        </Link>
      </div>
    </section>
  );
}
