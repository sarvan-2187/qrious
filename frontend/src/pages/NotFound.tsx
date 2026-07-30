import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FaGhost } from 'react-icons/fa';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground text-center transition-colors duration-300">
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-700 max-w-md">
        <FaGhost className="w-24 h-24 mx-auto text-muted-foreground animate-pulse" />
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">404</span>
        </h1>
        <h2 className="text-2xl font-semibold">Page Not Found</h2>
        <p className="text-lg text-muted-foreground leading-relaxed">
          It looks like you've wandered into an unexplored quantum superposition. This page doesn't exist in our current universe!
        </p>
        <div className="pt-6">
          <Button asChild size="lg" className="rounded-full px-8 h-12 text-lg">
            <Link to="/">Return Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
