import React, { useState, useMemo } from 'react';
import { Search, GripVertical, ChevronDown, ChevronRight, Hash } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { COMPONENTS } from '../constants/components';
import type { ComponentSpec, ComponentKind } from '../constants/components';
import type { PlacedComponent } from '../hooks/useBuildState';

interface ComponentTrayProps {
  onPlace: (component: PlacedComponent) => void;
  onInspect: (spec: ComponentSpec) => void;
  currentStep: string;
}

const CATEGORY_LABELS: Record<ComponentKind, string> = {
  attenuator: 'Attenuators',
  twpa: 'Quantum Amplifiers',
  hemt: 'Cryo Amplifiers',
  circulator: 'Circulators & Isolators',
  filter: 'Microwave Filters'
};

export const ComponentTray: React.FC<ComponentTrayProps> = ({ onInspect }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    attenuator: true,
    twpa: true,
    hemt: true,
    circulator: true,
    filter: true
  });

  const toggleCat = (cat: string) => {
    setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const filteredComponents = useMemo(() => {
    return COMPONENTS.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const componentsByCat = useMemo(() => {
    return filteredComponents.reduce((acc, comp) => {
      acc[comp.kind] = acc[comp.kind] || [];
      acc[comp.kind].push(comp);
      return acc;
    }, {} as Record<string, ComponentSpec[]>);
  }, [filteredComponents]);

  // Drag start handler for native HTML5 drag and drop
  const handleDragStart = (e: React.DragEvent, spec: ComponentSpec) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ componentId: spec.id }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="flex flex-col h-full font-sans">
      
      {/* Search Bar */}
      <div className="relative mb-4 shrink-0">
        <Search className={cn("absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-zinc-500" : "text-zinc-400")} />
        <input 
          type="text"
          placeholder="Search components..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className={cn(
            "w-full pl-9 pr-3 py-2 rounded-md text-xs outline-none border transition-colors",
            isDark 
              ? "bg-zinc-900 border-zinc-800 text-zinc-200 focus:border-zinc-700 placeholder-zinc-500" 
              : "bg-white border-zinc-200 text-zinc-800 focus:border-zinc-300 placeholder-zinc-400"
          )}
        />
      </div>

      {filteredComponents.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 opacity-50">
           <Hash className="w-8 h-8 mb-2 text-zinc-500" />
           <p className="text-xs text-zinc-500 font-medium">No components found</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {Object.entries(componentsByCat).map(([kind, specs]) => {
            const isExpanded = expandedCats[kind] ?? true;
            const categoryName = CATEGORY_LABELS[kind as ComponentKind] || kind;
            return (
              <div key={kind} className="space-y-1.5">
                {/* Category Header */}
                <button 
                  onClick={() => toggleCat(kind)}
                  className="w-full flex items-center justify-between py-1 group cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 group-hover:text-zinc-400 transition-colors">
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    {categoryName}
                  </div>
                  <span className="text-[10px] font-mono text-zinc-600 bg-zinc-800/50 px-1.5 rounded">{specs.length}</span>
                </button>

                {/* Tiles */}
                {isExpanded && (
                  <div className="space-y-1.5">
                    {specs.map(comp => (
                      <div 
                        key={comp.id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, comp)}
                        onClick={() => onInspect(comp)}
                        className={cn(
                          "flex items-stretch border rounded-md transition-all shadow-sm cursor-grab active:cursor-grabbing overflow-hidden group",
                          isDark 
                            ? "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800" 
                            : "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                        )}
                        title={`Drag to Cryostat or Click to Inspect: ${comp.name}`}
                      >
                        {/* Drag Handle Area */}
                        <div className={cn(
                          "w-6 flex items-center justify-center border-r shrink-0 transition-colors",
                          isDark ? "bg-zinc-900/80 border-zinc-800 text-zinc-600 group-hover:text-zinc-400" : "bg-zinc-50 border-zinc-200 text-zinc-400 group-hover:text-zinc-500"
                        )}>
                           <GripVertical className="w-3.5 h-3.5" />
                        </div>
                        
                        {/* Component Info */}
                        <div className="flex-1 p-2 min-w-0">
                          <h3 className={cn("text-xs font-semibold truncate", isDark ? "text-zinc-200" : "text-zinc-800")}>
                            {comp.name}
                          </h3>
                          
                          {/* Quick Badges */}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {comp.attenuationDb !== undefined && (
                              <span className="text-[9px] font-mono px-1 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                -{comp.attenuationDb}dB
                              </span>
                            )}
                            {comp.gainDb !== undefined && (
                              <span className="text-[9px] font-mono px-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-900">
                                +{comp.gainDb}dB
                              </span>
                            )}
                            {comp.noiseTempK !== undefined && (
                              <span className="text-[9px] font-mono px-1 rounded bg-sky-950 text-sky-400 border border-sky-900">
                                {comp.noiseTempK}K noise
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
