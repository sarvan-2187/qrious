import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useAlgorithmApi } from '../hooks/useAlgorithmApi';
import type { AlgorithmBase, QuickInfo, AlgorithmSummary } from '../hooks/useAlgorithmApi';
import { markAlgorithmExplored } from '../../algorithm-constellation/hooks/useConstellationState';
import { TheoryPanel } from '../components/TheoryPanel';
import { FaArrowLeft, FaExternalLinkAlt, FaInfoCircle, FaChevronDown, FaChevronUp, FaBookOpen, FaBrain } from 'react-icons/fa';
import { apiClient as api } from '@/lib/apiClient';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { EmbeddedPlayground } from '../components/EmbeddedPlayground';
import { CircuitCanvas } from '../../gates-playground/components/CircuitCanvas';
import { ScheduleReviewModal } from '@/components/ScheduleReviewModal';

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <h2 className="text-2xl font-bold mt-12 mb-6 text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-3">
    {title}
  </h2>
);

const QuickInfoSidebar: React.FC<{ info: QuickInfo, allAlgorithms: AlgorithmSummary[] }> = ({ info, allAlgorithms }) => {
  return (
    <div className="bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sticky top-8">
      <h3 className="text-lg font-bold mb-6 text-slate-800 dark:text-slate-200 uppercase tracking-wider text-sm">Quick Information</h3>
      
      <div className="flex flex-col gap-4 text-sm">
        <div>
          <span className="text-slate-500 dark:text-zinc-500 block mb-1">Difficulty</span>
          <span className="font-medium text-slate-800 dark:text-slate-200">{info.difficulty || 'N/A'}</span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-zinc-500 block mb-1">Category</span>
          <span className="font-medium text-slate-800 dark:text-slate-200">{info.category || 'N/A'}</span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-zinc-500 block mb-1">Circuit Type</span>
          <span className="font-medium text-slate-800 dark:text-slate-200">{info.circuitType || 'N/A'}</span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-zinc-500 block mb-1">Hardware Suitability</span>
          <span className="font-medium text-slate-800 dark:text-slate-200">{info.hardwareSuitability || 'N/A'}</span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-zinc-500 block mb-1">Output Type</span>
          <span className="font-medium text-slate-800 dark:text-slate-200">{info.outputType || 'N/A'}</span>
        </div>
        
        {info.prerequisites?.length > 0 && info.prerequisites[0] !== "" && (
          <div className="mt-2">
            <span className="text-slate-500 dark:text-zinc-500 block mb-2">Prerequisites</span>
            <div className="flex flex-wrap gap-2">
              {info.prerequisites.map((p, i) => (
                <span key={i} className="bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 px-2 py-1 rounded text-xs">{p}</span>
              ))}
            </div>
          </div>
        )}

        {info.mainConcepts?.length > 0 && info.mainConcepts[0] !== "" && (
          <div className="mt-2">
            <span className="text-slate-500 dark:text-zinc-500 block mb-2">Main Concepts</span>
            <div className="flex flex-wrap gap-2">
              {info.mainConcepts.map((c, i) => (
                <span key={i} className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 px-2 py-1 rounded text-xs">{c}</span>
              ))}
            </div>
          </div>
        )}

        {info.relatedAlgorithms?.length > 0 && info.relatedAlgorithms[0] !== "" && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
            <span className="text-slate-500 dark:text-zinc-500 block mb-2">Related Algorithms</span>
            <div className="flex flex-col gap-2">
              {info.relatedAlgorithms.map((r, i) => {
                const alg = allAlgorithms.find(a => a.slug === r || a.name.toLowerCase() === r.toLowerCase());
                const title = r;
                
                if (!alg) {
                  return (
                    <span key={i} className="text-slate-400 dark:text-zinc-600 flex items-center text-xs cursor-not-allowed" title="Not Found">
                      {title} <span className="ml-2 text-[10px] bg-slate-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded uppercase font-semibold">Not Found</span>
                    </span>
                  );
                }
                
                if (alg.status === 'coming_soon') {
                  return (
                    <span key={i} className="text-slate-400 dark:text-zinc-500 flex items-center text-xs cursor-not-allowed" title="Coming Soon">
                      {alg.name} <span className="ml-2 text-[10px] bg-orange-500/10 text-orange-500 border border-orange-500/30 px-1.5 py-0.5 rounded uppercase font-semibold">Coming Soon</span>
                    </span>
                  );
                }
                
                return (
                  <Link key={i} to={`/algorithms/${alg.slug}`} className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center text-xs">
                    {alg.name} <FaExternalLinkAlt className="ml-1 opacity-50" size={10} />
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AlgorithmDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { getAlgorithm, listAlgorithms, loading, error } = useAlgorithmApi();
  const [algorithm, setAlgorithm] = useState<AlgorithmBase | null>(null);
  const [allAlgorithms, setAllAlgorithms] = useState<AlgorithmSummary[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isMarkingReview, setIsMarkingReview] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const isConstellation = location.pathname.startsWith('/constellation');
  const backLink = isConstellation ? '/constellation' : '/algorithms';
  const backText = isConstellation ? 'Back to Constellation' : 'Back to Explorer';

  useEffect(() => {
    const fetchAlg = async () => {
      if (!slug) return;
      try {
        const data = await getAlgorithm(slug);
        setAlgorithm(data);
        markAlgorithmExplored(slug);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAlg();
  }, [slug, getAlgorithm]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const data = await listAlgorithms();
        setAllAlgorithms(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAll();
  }, [listAlgorithms]);

  const handleOpenScheduleModal = () => {
    setShowScheduleModal(true);
  };

  const handleMarkForReview = async (date: string) => {
    if (!algorithm || !slug) return;
    try {
      setIsMarkingReview(true);
      await api.post('/api/v1/reviews/mark', {
        target_id: slug,
        target_type: 'algorithm',
        title: algorithm.name,
        scheduled_date: date
      });
      toast.success('Marked for review', { duration: 1000 });
      window.dispatchEvent(new Event('review_marked'));
    } catch (err: any) {
      if (err.response?.data?.message === "Already marked for review") {
        toast.info(`"${algorithm.name}" is already scheduled.`);
      } else {
        toast.error('Failed to schedule review');
      }
    } finally {
      setIsMarkingReview(false);
    }
  };

  if (loading || (!algorithm && !error)) {
    return (
      <div className="container mx-auto p-8 flex justify-center items-center h-64">
        <span className="text-slate-500 animate-pulse text-lg">Loading algorithm details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <Link to={backLink} className="inline-flex items-center text-emerald-500 hover:text-emerald-600 mb-6 font-medium transition-colors">
          <FaArrowLeft className="mr-2" /> {backText}
        </Link>
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>
      </div>
    );
  }

  if (!algorithm) return null;

  const { content, quickInfo } = algorithm;

  return (
    <div className="max-w-[1600px] mx-auto px-6 md:px-12 py-12 flex flex-col gap-12">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <Link to={backLink} className="inline-flex items-center text-emerald-500 hover:text-emerald-400 mb-6 font-medium transition-colors">
            <FaArrowLeft className="mr-2" /> {backText}
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">{algorithm.name}</h1>
          {algorithm.shortDescription && (
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
              {algorithm.shortDescription}
            </p>
          )}
        </div>
        
        <button
          onClick={handleOpenScheduleModal}
          disabled={isMarkingReview}
          className="px-4 py-2.5 rounded-xl border flex items-center justify-center transition-colors cursor-pointer text-sm font-mono font-medium gap-2 shadow-sm shrink-0 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
          title="Add to Spaced Repetition Daily Reviews"
        >
          <FaBrain />
          <span>Mark for Review</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 items-start">
        {/* Main Content Area */}
        <div className="lg:col-span-3 flex flex-col">
          
          {content.overview && (
            <div className="mb-8">
              <SectionHeader title="1. Overview" />
              <TheoryPanel markdown={content.overview} />
            </div>
          )}

          {content.whyNeeded && (
            <div className="mb-8">
              <SectionHeader title="2. Why Do We Need It?" />
              <TheoryPanel markdown={content.whyNeeded} />
            </div>
          )}

          {content.classicalIntuition && (
            <div className="mb-8">
              <SectionHeader title="3. Classical Intuition" />
              <TheoryPanel markdown={content.classicalIntuition} />
            </div>
          )}

          {content.quantumIdea && (
            <div className="mb-8">
              <SectionHeader title="4. Quantum Idea" />
              <TheoryPanel markdown={content.quantumIdea} />
            </div>
          )}

          {content.conceptsUsed && (
            <div className="mb-8">
              <SectionHeader title="5. Quantum Concepts Used" />
              <TheoryPanel markdown={content.conceptsUsed} />
            </div>
          )}

          {content.inputsOutputs && (
            <div className="mb-8">
              <SectionHeader title="6. Inputs and Outputs" />
              <TheoryPanel markdown={content.inputsOutputs} />
            </div>
          )}

          {content.stepByStep && (
            <div className="mb-8">
              <SectionHeader title="7. Step-by-Step Working" />
              <TheoryPanel markdown={content.stepByStep} />
            </div>
          )}

          {content.circuitExplanation && (
            <div className="mb-8">
              <SectionHeader title="8. Circuit Explanation" />
              {algorithm.example_circuit && (
                <div className="my-6 rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 p-4 overflow-x-auto">
                   <h4 className="text-sm font-semibold text-slate-500 dark:text-zinc-500 mb-4 uppercase tracking-wider">Interactive Circuit Viewer</h4>
                   <CircuitCanvas
                     qubits={algorithm.example_circuit.num_qubits || 2}
                     cbits={algorithm.example_circuit.num_qubits || 2}
                     gates={algorithm.example_circuit.gates || []}
                     addGate={() => {}}
                     updateGate={() => {}}
                     removeGate={() => {}}
                     readOnly
                   />
                </div>
              )}
              <TheoryPanel markdown={content.circuitExplanation} />
            </div>
          )}
          
          {content.mathematicalExplanation && (
            <div className="mb-8">
              <SectionHeader title="9. Mathematical Explanation" />
              <TheoryPanel markdown={content.mathematicalExplanation} />
            </div>
          )}

          {content.tryItYourself && (
            <div id="try-it-yourself" className="my-12">
              <SectionHeader title="10. Try it Yourself" />
              <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
                <TheoryPanel markdown={content.tryItYourself} />
                
                <div className="mt-8 mb-6">
                  <EmbeddedPlayground 
                    initialQubits={algorithm.example_circuit?.num_qubits || 2} 
                    initialGates={algorithm.example_circuit?.gates || []} 
                    algorithmId={algorithm.slug} 
                    algorithmName={algorithm.name}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Advanced Details Accordion */}
          <div className="mt-12 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-zinc-900/20">
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-6 bg-slate-100 dark:bg-zinc-900/80 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors text-left"
            >
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Advanced Mathematical Details</h3>
                <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">Deep dive into complexity, speedups, and formal applications.</p>
              </div>
              {showAdvanced ? <FaChevronUp className="text-slate-500" /> : <FaChevronDown className="text-slate-500" />}
            </button>
            
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 md:p-10 flex flex-col gap-10">
                    
                    {content.workedExample && (
                      <div>
                        <h4 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-200">11. Worked Example</h4>
                        <TheoryPanel markdown={content.workedExample} />
                      </div>
                    )}

                    {content.measurement && (
                      <div>
                        <h4 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-200">12. Measurement</h4>
                        <TheoryPanel markdown={content.measurement} />
                      </div>
                    )}

                    {content.complexity && (
                      <div>
                        <h4 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-200">13. Complexity</h4>
                        <TheoryPanel markdown={content.complexity} />
                      </div>
                    )}

                    {content.speedupSource && (
                      <div>
                        <h4 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-200">14. Speedup Source</h4>
                        <TheoryPanel markdown={content.speedupSource} />
                      </div>
                    )}
                    
                    {content.realWorldAnalogy && (
                      <div>
                        <h4 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-200">15. Real-World Analogy</h4>
                        <TheoryPanel markdown={content.realWorldAnalogy} />
                      </div>
                    )}
                    
                    {content.applications && (
                      <div>
                        <h4 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-200">16. Applications</h4>
                        <TheoryPanel markdown={content.applications} />
                      </div>
                    )}
                    
                    {content.advantages && (
                      <div>
                        <h4 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-200">17. Advantages</h4>
                        <TheoryPanel markdown={content.advantages} />
                      </div>
                    )}
                    
                    {content.limitations && (
                      <div>
                        <h4 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-200">18. Limitations</h4>
                        <TheoryPanel markdown={content.limitations} />
                      </div>
                    )}
                    
                    {content.hardwareRequirements && (
                      <div>
                        <h4 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-200">19. Hardware Requirements</h4>
                        <TheoryPanel markdown={content.hardwareRequirements} />
                      </div>
                    )}
                    
                    {content.relatedAlgorithmsDetail && (
                      <div>
                        <h4 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-200">20. Related Algorithms Detailed</h4>
                        <TheoryPanel markdown={content.relatedAlgorithmsDetail} />
                      </div>
                    )}

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
        </div>
        
        {/* Sidebar */}
        <div className="lg:col-span-1 relative">
          <QuickInfoSidebar info={quickInfo} allAlgorithms={allAlgorithms} />
        </div>
      </div>

      <ScheduleReviewModal 
        isOpen={showScheduleModal} 
        onClose={() => setShowScheduleModal(false)}
        onConfirm={handleMarkForReview}
        itemName={algorithm?.name || 'Algorithm'}
      />
    </div>
  );
};

export default AlgorithmDetailPage;
