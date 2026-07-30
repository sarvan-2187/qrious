import { useEffect, useState, useCallback, useMemo } from 'react';
import type { QuantumNewsArticle } from '../api/news';
import { fetchQuantumNews, forceSyncQuantumNews } from '../api/news';
import { ChevronLeft, ChevronRight, ExternalLink, Sparkles, Cpu, Code2, BookOpen, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

export interface QuantumNewsRadarProps {
  variant?: 'educator' | 'student';
  className?: string;
}

type FilterCategory = 'all' | 'hardware' | 'software' | 'research' | 'breakthrough';

const SCIENTIFIC_IMAGES = [
  "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1600&q=100", // Cryostat / Quantum Computer Hardware
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=100", // Semiconductor Wafer / Microchip
  "https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=1600&q=100", // Quantum Optics & Lasers
  "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=1600&q=100", // Subatomic Particle Tracks
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=100", // Deep Space Network & Entanglement
  "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1600&q=100", // Fiber Optics Quantum Network
  "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1600&q=100", // Cleanroom Microchip Fabrication
  "https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=1600&q=100", // Quantum Optics Lab Setup
  "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1600&q=100", // Atomic Spectroscopy & Physics Lab
  "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&q=100", // Quantum Server Hardware
];

const getScientificImage = (index: number): string => {
  return SCIENTIFIC_IMAGES[index % SCIENTIFIC_IMAGES.length];
};

export default function QuantumNewsRadar({ variant = 'educator', className = '' }: QuantumNewsRadarProps) {
  const { theme } = useTheme();
  const [articles, setArticles] = useState<QuantumNewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterCategory>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [batchOffset, setBatchOffset] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const loadNews = async (forceRefresh: boolean = false) => {
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      if (forceRefresh) {
        toast.info("Syncing live quantum feeds...");
        await forceSyncQuantumNews();
      }
      const data = await fetchQuantumNews(undefined, 50);
      setArticles(data);
      if (forceRefresh) {
        setBatchOffset(prev => prev + 8);
        setCurrentIndex(0);
        toast.success("Loaded latest quantum papers & news!");
      }
    } catch (err) {
      console.error('Failed to load quantum news:', err);
      if (forceRefresh) {
        // If force refresh failed to connect, just cycle local batch
        setBatchOffset(prev => prev + 8);
        setCurrentIndex(0);
        toast.info("Rotated to next batch of quantum stories.");
      } else {
        setError('Unable to load latest quantum paper feeds.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNews(false);
  }, []);

  // Reset current index when category tab changes
  useEffect(() => {
    setCurrentIndex(0);
    setBatchOffset(0);
  }, [activeTab]);

  // Filter articles client-side based on activeTab
  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      if (activeTab === 'all') return true;
      return article.category.toLowerCase() === activeTab;
    });
  }, [articles, activeTab]);

  // Limit display to 8 items, cycling through the pool on refresh
  const displayArticles = useMemo(() => {
    if (filteredArticles.length === 0) return [];
    const total = filteredArticles.length;
    const start = batchOffset % total;
    const count = Math.min(8, total);
    const sliced: QuantumNewsArticle[] = [];
    for (let i = 0; i < count; i++) {
      sliced.push(filteredArticles[(start + i) % total]);
    }
    return sliced;
  }, [filteredArticles, batchOffset]);

  const nextSlide = useCallback(() => {
    if (displayArticles.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % displayArticles.length);
  }, [displayArticles.length]);

  const prevSlide = useCallback(() => {
    if (displayArticles.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + displayArticles.length) % displayArticles.length);
  }, [displayArticles.length]);

  // Auto-slide effect
  useEffect(() => {
    if (isHovered || displayArticles.length <= 1) return;

    const interval = setInterval(() => {
      nextSlide();
    }, 3500); // Auto-slide every 3.5 seconds

    return () => clearInterval(interval);
  }, [isHovered, displayArticles.length, nextSlide, currentIndex]);

  const handleRefreshClick = () => {
    loadNews(true);
  };

  const getCategoryBadge = (category: string) => {
    const cat = category.toLowerCase();
    switch (cat) {
      case 'hardware':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 backdrop-blur-md shadow-sm">
            <Cpu className="w-3.5 h-3.5" /> Hardware
          </span>
        );
      case 'software':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md shadow-sm">
            <Code2 className="w-3.5 h-3.5" /> Software
          </span>
        );
      case 'breakthrough':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md shadow-sm">
            <Sparkles className="w-3.5 h-3.5" /> Breakthrough
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 backdrop-blur-md shadow-sm">
            <BookOpen className="w-3.5 h-3.5" /> Research
          </span>
        );
    }
  };

  const getSourceBadge = (source: string) => {
    const src = source.toLowerCase();
    let label = 'arXiv';
    let color = 'bg-rose-500/20 text-rose-300 border-rose-500/30';

    if (src === 'qiskit') {
      label = 'Qiskit / IBM';
      color = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    } else if (src === 'physorg') {
      label = 'Phys.org';
      color = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }

    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-md shadow-sm ${color}`}>
        {label}
      </span>
    );
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const currentArticle = displayArticles[currentIndex];

  return (
    <div className={cn(
      "p-8 rounded-[2rem] border shadow-md hover:shadow-lg transition-all duration-300 font-sans flex flex-col gap-6 relative hover:scale-[1.01]",
      theme === 'dark'
        ? "bg-zinc-950/50 border-white/10 hover:border-white/20 hover:bg-zinc-900/30"
        : "bg-white border-zinc-200 hover:border-zinc-300",
      className
    )}>
      <div className={cn(
        "pb-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4",
        theme === 'dark' ? "border-white/10" : "border-zinc-200"
      )}>
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-xl font-medium tracking-tight flex items-center gap-2 text-foreground">
              Recent Quantum News / Paper
              {variant === 'educator' && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-normal">
                  Recent Papers & Feeds
                </span>
              )}
            </h3>
            <p className={cn("text-xs mt-0.5", theme === 'dark' ? "text-zinc-400" : "text-zinc-500")}>
              {variant === 'educator' 
                ? 'Real-time quantum research, arXiv papers & breakthrough feeds' 
                : 'Today’s top breakthroughs across the quantum computing realm'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Slider Controls in Header */}
          {displayArticles.length > 1 && (
            <div className={cn(
              "flex items-center gap-1.5 p-1 rounded-lg border mr-2",
              theme === 'dark' ? "bg-white/5 border-white/10" : "bg-zinc-50 border-zinc-200"
            )}>
              <Button
                variant="ghost"
                size="icon"
                onClick={prevSlide}
                className="h-7 w-7 rounded-md hover:bg-secondary hover:text-emerald-500 transition-colors"
                title="Previous Story"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-mono px-1.5 font-medium text-muted-foreground">
                {currentIndex + 1} / {displayArticles.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={nextSlide}
                className="h-7 w-7 rounded-md hover:bg-secondary hover:text-emerald-500 transition-colors"
                title="Next Story"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefreshClick} 
            disabled={loading || refreshing}
            className="text-xs shadow-sm hover:border-emerald-500/40 hover:text-emerald-500 transition-all duration-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Syncing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      {variant === 'educator' && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(['all', 'hardware', 'software', 'research', 'breakthrough'] as FilterCategory[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all whitespace-nowrap",
                activeTab === tab
                  ? "bg-emerald-500 text-white shadow-sm"
                  : theme === 'dark'
                    ? "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
              )}
            >
              {tab === 'all' ? 'All Stories' : tab}
            </button>
          ))}
        </div>
      )}

      <div className="pt-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
            <p className="text-sm text-muted-foreground animate-pulse font-medium">
              Scanning quantum feeds & research databases...
            </p>
          </div>
        ) : error ? (
          <div className={cn(
            "text-center py-10 border rounded-xl p-6",
            theme === 'dark' ? "bg-red-500/5 border-red-500/20" : "bg-red-50/50 border-red-200"
          )}>
            <p className="text-sm text-red-500 font-medium mb-3">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadNews(true)}
              className="hover:border-emerald-500/40 hover:text-emerald-500 transition-all duration-300"
            >
              Try Again
            </Button>
          </div>
        ) : displayArticles.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No articles found for the selected category.</p>
          </div>
        ) : currentArticle ? (
          /* Inshorts-Style Slider Card */
          <div 
            className={cn(
              "relative group rounded-2xl border overflow-hidden shadow-lg transition-all duration-300 hover:scale-[1.01]",
              theme === 'dark'
                ? "bg-black border-white/10 hover:border-white/20 hover:bg-zinc-900/30"
                : "bg-zinc-50 border-zinc-200 hover:border-zinc-300"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 h-auto lg:h-[365px]">
              
              {/* Image Banner Section (Inshorts Visual Header) */}
              <div className="lg:col-span-4 relative h-[220px] lg:h-full overflow-hidden bg-muted shrink-0">
                <img
                  src={getScientificImage(currentIndex)}
                  alt={currentArticle.title}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/bloch_sphere.png';
                  }}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/40" />

                {/* Overlaid Badges on Image */}
                <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 z-10">
                  {getCategoryBadge(currentArticle.category)}
                  {getSourceBadge(currentArticle.source)}
                </div>

                <div className="absolute bottom-4 left-4 right-4 text-xs font-mono text-white/80 z-10 flex items-center justify-between">
                  <span>Published {formatDate(currentArticle.published_at)}</span>
                  <span className="bg-black/60 px-2 py-0.5 rounded border border-white/10">
                    Paper {currentIndex + 1} of {displayArticles.length}
                  </span>
                </div>
              </div>

              {/* Main Content Section */}
              <div className={cn(
                "lg:col-span-8 p-6 sm:p-8 flex flex-col justify-between",
                theme === 'dark' ? "bg-zinc-950/20" : "bg-card/40"
              )}>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-mono text-muted-foreground">
                      Source: <strong className="text-foreground capitalize">{currentArticle.source}</strong>
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {formatDate(currentArticle.published_at)}
                    </span>
                  </div>

                  <h3 className={cn(
                    "text-xl sm:text-2xl font-medium tracking-tight text-foreground mb-4 leading-snug transition-colors line-clamp-3",
                    theme === 'dark' ? "group-hover:text-zinc-200" : "group-hover:text-zinc-900"
                  )}>
                    {currentArticle.title}
                  </h3>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-6 font-normal line-clamp-4 lg:line-clamp-4">
                    {currentArticle.raw_summary}
                  </p>
                </div>

                {/* Bottom Footer Action Controls */}
                <div className={cn(
                  "flex items-center justify-end pt-4 border-t mt-auto",
                  theme === 'dark' ? "border-white/10" : "border-zinc-200"
                )}>
                  <a
                    href={currentArticle.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-medium shadow transition-all duration-300",
                      "bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/25 active:scale-95"
                    )}
                  >
                    Read Paper / Post <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

            </div>

            {/* Slider Progress Bar Indicator */}
            {displayArticles.length > 1 && (
              <div className="w-full bg-secondary/30 h-1">
                <div
                  className="bg-emerald-500 h-1 transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / displayArticles.length) * 100}%` }}
                />
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

