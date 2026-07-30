import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Library } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiClient } from '../lib/apiClient';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

const AlgorithmExplorerLandingPage: React.FC = () => {
  const [algorithms, setAlgorithms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchAlgorithms = async () => {
      try {
        const response = await apiClient.get('/api/v1/algorithms');
        setAlgorithms(response.data);
      } catch (error) {
        console.error("Error fetching algorithms", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAlgorithms();
  }, []);

  return (
    <div className={cn(
      "min-h-screen py-24 px-6 md:px-16 w-full transition-colors duration-300",
      theme === 'dark' ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-900"
    )}>
      <div className="max-w-[1600px] mx-auto">
        <motion.h1 
          className="text-4xl md:text-5xl font-sans tracking-tight mb-16 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Algorithm Explorer
        </motion.h1>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div 
                key={idx} 
                className={cn(
                  "p-8 rounded-[2rem] border shadow-sm h-[250px] animate-pulse",
                  theme === 'dark' ? "bg-zinc-950/50 border-white/10" : "bg-white border-zinc-200"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl mb-6",
                  theme === 'dark' ? "bg-white/10" : "bg-zinc-200"
                )} />
                <div className={cn(
                  "h-6 w-3/4 rounded mb-4",
                  theme === 'dark' ? "bg-white/10" : "bg-zinc-200"
                )} />
                <div className={cn(
                  "h-4 w-1/2 rounded",
                  theme === 'dark' ? "bg-white/5" : "bg-zinc-100"
                )} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {algorithms.length > 0 ? (
              algorithms.map((algo, index) => (
                <Link key={index} to={`/algorithms/${algo.slug}`}>
                  <motion.div 
                    className={cn(
                      "p-8 rounded-[2rem] border overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col h-full",
                      theme === 'dark' 
                        ? "bg-zinc-950/50 border-white/10 hover:border-emerald-500/50 hover:bg-white/5" 
                        : "bg-white border-zinc-200 hover:border-emerald-500/30"
                    )}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl border flex items-center justify-center mb-6 shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:text-emerald-500",
                      theme === 'dark' ? "bg-black border-white/10 text-zinc-400" : "bg-zinc-50 border-zinc-200 text-zinc-700"
                    )}>
                      <Library className="w-6 h-6" />
                    </div>
                    
                    <h2 className="text-2xl font-semibold mb-3">{algo.name}</h2>
                    <p className={cn(
                      "mb-8 flex-1 leading-relaxed text-sm",
                      theme === 'dark' ? "text-zinc-400" : "text-zinc-500"
                    )}>
                      Interactive walkthrough for {algo.name}
                    </p>

                    <div className="inline-flex items-center gap-2 text-emerald-500 font-medium transition-colors w-fit text-sm">
                      Explore <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </motion.div>
                </Link>
              ))
            ) : (
              <p className={cn(
                "col-span-1 sm:col-span-2 lg:col-span-3 text-center py-12",
                theme === 'dark' ? "text-zinc-500" : "text-zinc-400"
              )}>
                No algorithms available yet.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlgorithmExplorerLandingPage;
