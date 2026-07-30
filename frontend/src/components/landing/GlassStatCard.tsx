import { cn } from '@/lib/utils';

interface GlassStatCardProps {
  metric: string;
  description: string;
  className?: string;
}

export default function GlassStatCard({ metric, description, className }: GlassStatCardProps) {
  return (
    <div 
      className={cn(
        "flex flex-col justify-center px-5 py-5 rounded-[1.5rem] transition-transform duration-300 hover:scale-105",
        className
      )}
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}
    >
      <div className="text-3xl font-semibold text-white tracking-tight">{metric}</div>
      <div className="text-sm text-white/60 mt-1">{description}</div>
    </div>
  );
}
