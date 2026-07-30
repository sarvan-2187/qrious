import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FaRocket, FaCode, FaAtom, FaGithub } from 'react-icons/fa';

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground transition-colors duration-300">
      <div className="max-w-3xl text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        <div className="flex justify-center gap-4 mb-6 text-primary">
          <FaAtom className="w-12 h-12 animate-pulse" />
          <FaRocket className="w-12 h-12" />
          <FaCode className="w-12 h-12" />
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
          Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Qrious</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed">
          Embark on a journey through the quantum realm. Connect, learn, and build the future with a community of curious minds.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-8">
          <Button asChild size="lg" className="text-lg px-8 py-6 rounded-full">
            <Link to="/login">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 rounded-full">
            <a href="https://github.com" target="_blank" rel="noreferrer">
              <FaGithub className="mr-2" /> View Source
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
