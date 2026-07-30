import React, { useEffect, useState, useMemo } from 'react';
import { useAlgorithmApi } from '../hooks/useAlgorithmApi';
import type { AlgorithmSummary } from '../hooks/useAlgorithmApi';
import { AlgorithmCard } from '../components/AlgorithmCard';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Search, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LEVEL_TITLES: Record<number, string> = {
  1: "Level 1: Quantum Foundations",
  2: "Level 2: First Quantum Algorithms",
  3: "Level 3: Core Quantum Primitives",
  4: "Level 4: Major Quantum Algorithms",
  5: "Level 5: Quantum Communication & Cryptography",
  6: "Level 6: Variational & Optimization",
  7: "Level 7: Quantum Machine Learning",
  8: "Level 8: Quantum Error Correction",
  9: "Level 9: Advanced Quantum Computing"
};

const AlgorithmExplorerLandingPage: React.FC = () => {
  const { listAlgorithms, loading, error } = useAlgorithmApi();
  const [algorithms, setAlgorithms] = useState<AlgorithmSummary[]>([]);
  const { theme } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');

  useEffect(() => {
    const fetchAlgs = async () => {
      try {
        const data = await listAlgorithms();
        setAlgorithms(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAlgs();
  }, [listAlgorithms]);

  const categories = useMemo(() => {
    const cats = new Set(algorithms.map(a => a.category).filter(Boolean));
    return ['All', ...Array.from(cats)];
  }, [algorithms]);

  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];

  const filteredAlgorithms = useMemo(() => {
    return algorithms.filter(alg => {
      const matchesSearch = alg.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (alg.shortDescription && alg.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesDifficulty = filterDifficulty === 'All' || alg.difficulty.toLowerCase().includes(filterDifficulty.toLowerCase());
      const matchesCategory = filterCategory === 'All' || alg.category === filterCategory;
      return matchesSearch && matchesDifficulty && matchesCategory;
    });
  }, [algorithms, searchQuery, filterDifficulty, filterCategory]);

  const groupedAlgorithms = useMemo(() => {
    const groups: Record<number, AlgorithmSummary[]> = {};
    filteredAlgorithms.forEach(alg => {
      const lvl = alg.learningLevel || 1;
      if (!groups[lvl]) groups[lvl] = [];
      groups[lvl].push(alg);
    });
    
    // Sort each level so 'coming_soon' is at the bottom
    Object.keys(groups).forEach(key => {
      const lvl = parseInt(key);
      groups[lvl].sort((a, b) => {
        if (a.status === 'coming_soon' && b.status !== 'coming_soon') return 1;
        if (a.status !== 'coming_soon' && b.status === 'coming_soon') return -1;
        return 0;
      });
    });
    
    return groups;
  }, [filteredAlgorithms]);

  return (
    <div className={cn(
      "w-full h-full transition-colors duration-300 py-12 px-6 md:px-12",
      theme === 'dark' ? "text-white" : "text-zinc-900"
    )}>
      <div className="max-w-[1600px] mx-auto flex flex-col gap-12">
        <div className="flex flex-col gap-4 max-w-3xl">
          <motion.h1 
            className="text-4xl md:text-5xl font-sans tracking-tight"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Algorithm Explorer
          </motion.h1>
          <motion.p 
            className={cn("text-lg", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Discover the foundational algorithms that power quantum computing. Learn the theory, mathematics, and run interactive demos in this progressive encyclopedia.
          </motion.p>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center w-full">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search algorithms..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all",
                theme === 'dark' ? "bg-zinc-900/50 border-zinc-800 text-white placeholder-zinc-500" : "bg-white border-zinc-200 text-zinc-900"
              )}
            />
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-48">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                <SelectTrigger className={cn(
                  "w-full pl-9 pr-4 py-3 h-12 rounded-xl border focus:outline-none",
                  theme === 'dark' ? "bg-zinc-900/50 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900"
                )}>
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900"}>
                  {difficulties.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="relative flex-1 md:w-56">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className={cn(
                  "w-full pl-9 pr-4 py-3 h-12 rounded-xl border focus:outline-none",
                  theme === 'dark' ? "bg-zinc-900/50 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900"
                )}>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900"}>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div 
                key={idx} 
                className={cn(
                  "p-8 rounded-[2rem] border shadow-sm h-[250px] animate-pulse",
                  theme === 'dark' ? "bg-zinc-950/50 border-white/10" : "bg-white border-zinc-200"
                )}
              />
            ))}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-100/10 border border-red-500/20 text-red-500 rounded-lg">{error}</div>
        )}

        {!loading && !error && Object.keys(groupedAlgorithms).length === 0 && (
          <div className="text-center py-24 text-zinc-500">
            No algorithms found matching your criteria.
          </div>
        )}

        {!loading && !error && Object.keys(groupedAlgorithms).sort().map((levelStr) => {
          const level = parseInt(levelStr);
          const algosInLevel = groupedAlgorithms[level];
          return (
            <div key={level} className="flex flex-col gap-6">
              <h2 className={cn(
                "text-2xl font-semibold border-b pb-4",
                theme === 'dark' ? "border-zinc-800 text-zinc-200" : "border-zinc-200 text-zinc-800"
              )}>
                {LEVEL_TITLES[level] || `Level ${level}`}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {algosInLevel.map((alg) => (
                  <AlgorithmCard key={alg.slug} algorithm={alg} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlgorithmExplorerLandingPage;
