import React from 'react';
import type { DomainConfig } from '../types/roadmap.types';
import { AVAILABLE_DOMAINS } from '../types/roadmap.types';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { FaLock, FaCheckCircle } from 'react-icons/fa';

interface DomainSelectorProps {
  selectedDomain: string;
  onSelectDomain: (domainId: string) => void;
  userXp?: number;
  userPretestScore?: number;
}

export const DomainSelector: React.FC<DomainSelectorProps> = ({
  selectedDomain,
  onSelectDomain,
  userXp = 0,
  userPretestScore = 0,
}) => {
  return (
    <TooltipProvider>
      <div className="w-full mb-8 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Quantum Field & Domain:
            </span>
            <Badge variant="outline" className="text-[11px] border-emerald-500/30 text-emerald-400 bg-emerald-950/20">
              Multi-Domain Active
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            Current XP: <span className="font-mono text-emerald-400 font-semibold">{userXp} XP</span>
          </span>
        </div>

        {/* Scrollable Domain Tab List */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
          {AVAILABLE_DOMAINS.map((domain: DomainConfig) => {
            const isLocked = domain.isLocked && userXp < domain.requiredXp;
            const isSelected = selectedDomain === domain.id;

            return (
              <Tooltip key={domain.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => !isLocked && onSelectDomain(domain.id)}
                    disabled={isLocked}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-300 relative group text-left whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-500/25 scale-[1.02]'
                        : isLocked
                        ? 'bg-muted/20 border-border/40 text-muted-foreground opacity-60 cursor-not-allowed'
                        : 'bg-card/60 border-border/60 text-foreground hover:bg-card hover:border-emerald-500/40'
                    }`}
                  >
                    <span className="font-sans font-semibold tracking-tight">{domain.name}</span>

                    {isLocked ? (
                      <span className="ml-1 text-amber-400 flex items-center gap-1 text-xs font-mono bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                        <FaLock className="text-[10px]" /> Lock
                      </span>
                    ) : null}
                  </button>
                </TooltipTrigger>
                
                <TooltipContent side="bottom" className="max-w-xs p-3 bg-zinc-900 border-zinc-800 text-zinc-100 shadow-xl rounded-xl space-y-1.5">
                  <div className="font-semibold text-xs flex items-center justify-between">
                    <span>{domain.name}</span>
                    {isLocked ? (
                      <span className="text-amber-400 flex items-center gap-1 text-[10px] font-mono">
                        <FaLock className="text-[10px]" /> Level Locked
                      </span>
                    ) : (
                      <span className="text-emerald-400 text-[10px] font-mono">Unlocked</span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-snug">{domain.description}</p>
                  
                  {isLocked && (
                    <div className="pt-1.5 border-t border-zinc-800 text-[10px] text-amber-300 space-y-0.5 font-mono">
                      <p className="flex items-center gap-1 font-semibold">
                        <FaLock className="text-[10px]" /> Unlock Requirements:
                      </p>
                      <ul className="list-disc list-inside text-zinc-400 space-y-0.5 pl-1">
                        <li>Reach <span className="text-amber-300 font-semibold">{domain.requiredXp} XP</span> (You have {userXp} XP)</li>
                        {domain.prerequisiteDomainName && (
                          <li>Complete prerequisite: <span className="text-zinc-200">{domain.prerequisiteDomainName}</span></li>
                        )}
                        {domain.requiredPretestScore && (
                          <li>Pre-test Score &ge; <span className="text-amber-300 font-semibold">{domain.requiredPretestScore}%</span></li>
                        )}
                      </ul>
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
};
