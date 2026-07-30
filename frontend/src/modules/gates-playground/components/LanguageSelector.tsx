import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Language = 'openqasm2' | 'qiskit' | 'cirq';

interface LanguageOption {
  value: Language;
  label: string;
  version: string;
  badge: string;
  enabled: boolean;
  tooltip: string | null;
  badgeClass: string;
  dotClass: string;
}

const LANGUAGES: LanguageOption[] = [
  {
    value: 'openqasm2',
    label: 'OpenQASM',
    version: '2.0',
    badge: 'QASM',
    enabled: true,
    tooltip: null,
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40',
    dotClass: 'bg-emerald-500 dark:bg-emerald-400',
  },
  {
    value: 'qiskit',
    label: 'Qiskit',
    version: '1.4.0',
    badge: 'PY',
    enabled: true,
    tooltip: null,
    badgeClass: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/40',
    dotClass: 'bg-violet-500 dark:bg-violet-400',
  },
  {
    value: 'cirq',
    label: 'CIRQ',
    version: '',
    badge: 'SOON',
    enabled: false,
    tooltip: 'CIRQ support coming soon',
    badgeClass: 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-700/40 dark:text-zinc-500 dark:border-zinc-600/30',
    dotClass: 'bg-zinc-400 dark:bg-zinc-600',
  },
];

interface LanguageSelectorProps {
  selectedLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageChange,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = LANGUAGES.find(l => l.value === selectedLanguage) ?? LANGUAGES[0];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div ref={containerRef} className="relative select-none" id="language-selector">

      {/* ── Trigger ── */}
      <button
        id="language-selector-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${selected.label}`}
        onClick={() => setOpen(p => !p)}
        className={cn(
          'flex items-center gap-2 pl-2 pr-2.5 py-[5px] rounded-lg text-xs',
          'border transition-all duration-150 active:scale-[0.97] focus:outline-none',
          open
            ? 'bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/20 shadow-sm'
            : 'bg-transparent dark:bg-white/5 border-border hover:bg-black/5 dark:hover:bg-white/10 hover:border-black/10 dark:hover:border-white/20',
        )}
      >
        {/* badge */}
        <span className={cn('text-[9px] font-mono font-medium px-1.5 py-[3px] rounded border tracking-wide', selected.badgeClass)}>
          {selected.badge}
        </span>
        {/* name + version */}
        <span className="font-mono text-foreground leading-none whitespace-nowrap">
          {selected.label}
          {selected.version && (
            <span className="text-muted-foreground ml-1">{selected.version}</span>
          )}
        </span>
        <ChevronDown className={cn('w-3 h-3 text-muted-foreground transition-transform duration-200 shrink-0', open && 'rotate-180')} />
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div
          role="listbox"
          aria-label="Select quantum language"
          className={cn(
            'absolute top-full mt-2 left-0 z-[100] w-52 overflow-hidden',
            'bg-background border border-border rounded-xl',
            'shadow-[0_12px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.7)]',
            'animate-in fade-in-0 slide-in-from-top-1 duration-150',
          )}
        >

          {/* rows */}
          <div className="p-1.5 space-y-0.5">
            {LANGUAGES.map(lang => {
              const isActive = lang.value === selectedLanguage;
              return (
                <div
                  key={lang.value}
                  role="option"
                  aria-selected={isActive}
                  aria-disabled={!lang.enabled}
                  title={lang.tooltip ?? undefined}
                  onClick={() => {
                    if (!lang.enabled) return;
                    onLanguageChange(lang.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-100 group',
                    lang.enabled
                      ? isActive
                        ? 'bg-black/5 dark:bg-white/8 cursor-pointer'
                        : 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/6'
                      : 'cursor-not-allowed opacity-40',
                  )}
                >
                  {/* badge pill */}
                  <span className={cn('text-[9px] font-mono font-medium px-1.5 py-[3px] rounded border tracking-wide shrink-0', lang.badgeClass)}>
                    {lang.badge}
                  </span>

                  {/* name + version */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-[12px] font-mono leading-none',
                      isActive ? 'text-foreground' : lang.enabled ? 'text-muted-foreground group-hover:text-foreground' : 'text-muted-foreground/50',
                    )}>
                      {lang.label}
                      {lang.version && (
                        <span className={cn('ml-1 text-[10px]', isActive ? 'text-muted-foreground' : 'text-muted-foreground/50')}>
                          {lang.version}
                        </span>
                      )}
                    </p>
                    {!lang.enabled && (
                      <p className="text-[9px] font-mono text-muted-foreground/50 leading-none mt-0.5">Coming soon</p>
                    )}
                  </div>

                  {/* right indicator */}
                  {lang.enabled ? (
                    isActive
                      ? <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', lang.dotClass)} />
                      : null
                  ) : (
                    <Lock className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* footer */}
          <div className="px-3 pb-2 pt-1 border-t border-border">
            <p className="text-[9px] font-mono text-muted-foreground/60">CIRQ Coming Soon ...</p>
          </div>
        </div>
      )}
    </div>
  );
};
