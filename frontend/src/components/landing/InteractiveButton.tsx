import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InteractiveButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  icon?: ReactNode;
  showArrow?: boolean;
}

export default function InteractiveButton({ 
  children, 
  onClick, 
  className, 
  icon = <ArrowRight className="w-5 h-5 text-white" />,
  showArrow = true
}: InteractiveButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex items-center justify-between bg-white rounded-full text-zinc-900 font-medium transition-all duration-300 hover:scale-105",
        showArrow ? "gap-3 sm:gap-4 pl-4 sm:pl-6 pr-1 sm:pr-2 py-1 sm:py-2" : "px-4 sm:px-6 py-2 sm:py-2.5",
        className
      )}
    >
      <span className="truncate">{children}</span>
      {showArrow && (
        <div className="flex shrink-0 items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-zinc-900 rounded-full transition-colors duration-300 group-hover:bg-zinc-700">
          {icon}
        </div>
      )}
    </button>
  );
}
