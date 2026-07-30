import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RoadmapTopic } from '../types/roadmap.types';
import { updateTopicProgress, fetchFlashcardsByCategory, submitFlashcardReview } from '../api';
import { TopicNotesModal } from '@/features/notes/components/TopicNotesModal';
import { 
  FaTimes, FaPlay, FaCheckCircle, FaClock, FaQuestionCircle, 
  FaLayerGroup, FaStickyNote, FaLock, 
  FaFilePdf, FaDownload, FaTv, FaRedo, FaTrophy, FaRocket, FaArrowRight, FaBrain
} from 'react-icons/fa';
import { toast } from 'sonner';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { generateLessonPdf } from '../utils/generateLessonPdf';
import { ScheduleReviewModal } from '@/components/ScheduleReviewModal';
import { apiClient as api } from '@/lib/apiClient';

interface TopicDetailModalProps {
  topic: RoadmapTopic | null;
  onClose: () => void;
  onStart: (slug: string) => Promise<void>;
  onComplete: (slug: string) => Promise<void>;
  allTopics: RoadmapTopic[];
}

export type StageTab = 'video' | 'quiz' | 'flashcards' | 'notes' | 'slides';

const getYoutubeEmbedUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('youtube.com/watch?v=')) {
    const id = url.split('v=')[1]?.split('&')[0];
    return `https://www.youtube.com/embed/${id}?autoplay=1&enablejsapi=1`;
  }
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1]?.split('?')[0];
    return `https://www.youtube.com/embed/${id}?autoplay=1&enablejsapi=1`;
  }
  return url;
};

const cleanSource = (source?: string) => {
  if (!source || source.includes('Amrita') || source.includes('23CSE463')) {
    return 'Qrious Quantum Lesson Plan';
  }
  return source;
};

const cleanTitle = (titleText?: string) => {
  if (!titleText) return '';
  return titleText.replace(/Amrita/gi, 'Qrious Quantum').replace(/\(?23CSE463\s*Lecture\s*\d+\)?/gi, '').trim();
};

export const TopicDetailModal: React.FC<TopicDetailModalProps> = ({
  topic,
  onClose,
  onStart,
  onComplete,
  allTopics
}) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(false);
  const [currentTopic, setCurrentTopic] = useState<RoadmapTopic | null>(topic);
  const [accumulatedSeconds, setAccumulatedSeconds] = useState<number>(0);

  // Notes Sidebar State
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Active Stage Tab
  const [activeStageTab, setActiveStageTab] = useState<StageTab>('video');

  // Active Video Selection
  const [selectedVideo, setSelectedVideo] = useState<{ title: string; url: string; source: string } | null>(null);

  // Flashcards state inside 3/4 stage
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [fcLoading, setFcLoading] = useState(false);
  const [fcIndex, setFcIndex] = useState(0);
  const [fcFlipped, setFcFlipped] = useState(false);
  const [fcXp, setFcXp] = useState(0);

  // Manual & automatic stage verification state (Video, Quiz, Flashcards, Notes, Slides)
  const [completedStages, setCompletedStages] = useState<{
    video?: boolean;
    quiz?: boolean;
    flashcards?: boolean;
    notes?: boolean;
    slides?: boolean;
  }>({});
  const [isMarkingReview, setIsMarkingReview] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    if (!topic) return;
    setCurrentTopic(topic);
    if (topic?.content_refs?.videos && topic.content_refs.videos.length > 0) {
      setSelectedVideo(topic.content_refs.videos[0]);
    }
    const saved = localStorage.getItem(`qrious_stages_${topic.slug}`);
    if (saved) {
      try { setCompletedStages(JSON.parse(saved)); } catch (e) { setCompletedStages({}); }
    } else {
      setCompletedStages({});
    }
  }, [topic]);

  const toggleStageCompletion = async (stage: 'video' | 'quiz' | 'flashcards' | 'notes' | 'slides', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentTopic) return;

    const nextState = {
      ...completedStages,
      [stage]: !completedStages[stage]
    };
    setCompletedStages(nextState);
    localStorage.setItem(`qrious_stages_${currentTopic.slug}`, JSON.stringify(nextState));

    const completedCount = ['video', 'quiz', 'flashcards', 'notes', 'slides'].filter(s => nextState[s as keyof typeof nextState]).length;
    const calculatedPct = Math.round((completedCount / 5) * 100);

    setCurrentTopic(prev => prev ? { 
      ...prev, 
      progress_pct: calculatedPct, 
      user_status: calculatedPct === 100 ? 'completed' : (prev.user_status === 'unlocked' ? 'in_progress' : prev.user_status) 
    } : null);

    toast.success(`${stage.charAt(0).toUpperCase() + stage.slice(1)} ${nextState[stage] ? 'marked as Completed ✓' : 'marked as Incomplete'}`);

    try {
      await updateTopicProgress(currentTopic.slug, 10, calculatedPct);
      if (calculatedPct === 100 && currentTopic.user_status !== 'completed') {
        window.dispatchEvent(new CustomEvent('xp_updated'));
      }
    } catch (err) {
      console.error("Failed to update stage progress", err);
    }
  };

  useEffect(() => {
    if (!topic) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [topic, onClose]);

  // Load flashcards when flashcards stage tab is active
  useEffect(() => {
    if (activeStageTab === 'flashcards' && currentTopic) {
      const category = currentTopic.content_refs?.flashcard_category || currentTopic.slug;
      setFcLoading(true);
      fetchFlashcardsByCategory(category)
        .then(res => {
          setFlashcards(res.data || []);
          setFcIndex(0);
          setFcFlipped(false);
        })
        .catch(() => toast.error('Failed to load flashcards deck.'))
        .finally(() => setFcLoading(false));
    }
  }, [activeStageTab, currentTopic]);

  // Active time-spent tracker & progress update for in_progress topics
  const handleTimeSpentTick = async (addedSeconds: number) => {
    if (!currentTopic || currentTopic.user_status !== 'in_progress') return;

    const targetSeconds = (currentTopic.estimated_minutes || 30) * 60;
    const newTotalSeconds = (accumulatedSeconds || (currentTopic as any).total_time_spent_seconds || 0) + addedSeconds;
    setAccumulatedSeconds(newTotalSeconds);

    const calculatedPct = Math.min(100, Math.round((newTotalSeconds / targetSeconds) * 100));

    try {
      const res = await updateTopicProgress(currentTopic.slug, addedSeconds, calculatedPct);
      if (res.data?.topic) {
        setCurrentTopic(res.data.topic);
        if (res.data.xp_awarded > 0) {
          toast.success(`🎉 Topic completed! +${res.data.xp_awarded} XP Awarded`);
          window.dispatchEvent(new CustomEvent('xp_updated'));
        }
      }
    } catch (err) {
      console.error("Failed to update topic time progress", err);
    }
  };

  if (!currentTopic) return null;

  const { slug, title, order_index, estimated_minutes, description, user_status, progress_pct, content_refs } = currentTopic;
  const canWatchVideo = user_status === 'in_progress' || user_status === 'completed';

  const currentTopicIndex = allTopics.findIndex(t => t.slug === currentTopic.slug);
  const nextTopic = currentTopicIndex >= 0 && currentTopicIndex < allTopics.length - 1 ? allTopics[currentTopicIndex + 1] : null;

  const handleGoToNextTopic = () => {
    if (!nextTopic) return;
    setCurrentTopic(nextTopic);
    setActiveStageTab('video');
    if (nextTopic.content_refs?.videos && nextTopic.content_refs.videos.length > 0) {
      setSelectedVideo(nextTopic.content_refs.videos[0]);
    } else {
      setSelectedVideo(null);
    }
    toast.success(`Navigated to Next Stage: "${nextTopic.title}"`);
  };

  const handleStart = async () => {
    try {
      setLoading(true);
      await onStart(slug);
      setCurrentTopic(prev => prev ? { ...prev, user_status: 'in_progress', progress_pct: 0 } : null);
      toast.success(`Topic "${title}" started! Lessons unlocked.`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to start topic');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      await onComplete(slug);
      setCurrentTopic(prev => prev ? { ...prev, user_status: 'completed', progress_pct: 100 } : null);
      toast.success(`Topic "${title}" completed! +50 XP Awarded.`);
      window.dispatchEvent(new CustomEvent('xp_updated'));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to complete topic');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadMaterial = (mat: { title: string; url: string; type: string }) => {
    if (mat.url) {
      window.open(mat.url, '_blank');
      toast.success(`Opening ${mat.title}`);
      return;
    }

    if (['quantum-computation-overview', 'review-linear-algebra', 'dirac-notation', 'hilbert-spaces-inner-product', 'qcomm-foundations-recap', 'qcomm-no-cloning-theorem'].includes(slug) && mat.type === 'PDF Slide Deck') {
      const pdfUrl = `/slides/${slug}.pdf`;
      window.open(pdfUrl, '_blank');
      toast.success(`Opening ${mat.title}`);
      return;
    }

    try {
      generateLessonPdf(title, slug, mat.type || 'PDF Slide Deck');
      toast.success(`Downloaded ${mat.title}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF document');
    }
  };

  const handleFlashcardReview = async (quality: number) => {
    const card = flashcards[fcIndex];
    if (!card) return;
    try {
      const res = await submitFlashcardReview(card._id, quality);
      const gained = res.data?.xp_gained ?? res.data?.xp_awarded ?? 5;
      if (gained > 0) {
        setFcXp(prev => prev + gained);
        window.dispatchEvent(new CustomEvent('xp_updated'));
      }
      setFcFlipped(false);
      setFcIndex(prev => prev + 1);
    } catch (err) {
      toast.error('Failed to submit review');
    }
  };

  const handleMarkForReview = async (date: string) => {
    if (!currentTopic) return;
    try {
      setIsMarkingReview(true);
      await api.post('/api/v1/reviews/mark', {
        target_id: currentTopic.slug,
        target_type: 'roadmap',
        title: currentTopic.title,
        scheduled_date: date
      });
      toast.success('Marked for review', { duration: 1000 });
      window.dispatchEvent(new Event('review_marked'));
    } catch (err: any) {
      if (err.response?.data?.message === "Already marked for review") {
        toast.info(`"${currentTopic.title}" is already scheduled.`);
      } else {
        toast.error('Failed to schedule review');
      }
    } finally {
      setIsMarkingReview(false);
    }
  };

  const pdfSlideUrl = ['quantum-computation-overview', 'review-linear-algebra', 'dirac-notation', 'hilbert-spaces-inner-product', 'qcomm-foundations-recap', 'qcomm-no-cloning-theorem'].includes(slug)
    ? `/slides/${slug}.pdf`
    : `https://qrious-quantum.s3.amazonaws.com/materials/${slug}-slides.pdf`;

  return (
    <>
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/40 backdrop-blur-md animate-fade-in font-sans cursor-pointer overflow-hidden"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-[96vw] max-w-[1700px] h-[92vh] max-h-[920px] border rounded-[2rem] shadow-2xl overflow-hidden font-sans cursor-default transition-all duration-300 flex flex-col",
          isDark ? "bg-zinc-950/95 border-white/10 text-white" : "bg-white/95 border-zinc-200 text-zinc-900"
        )}
      >
        {/* Top Header Bar */}
        <div className={cn(
          "flex items-center justify-between p-4 sm:px-6 border-b shrink-0",
          isDark ? "border-white/10" : "border-zinc-200"
        )}>
          <div className="flex items-center gap-3.5 min-w-0">
            <div className={cn(
              "w-11 h-11 rounded-2xl border flex items-center justify-center font-mono text-base font-bold shrink-0 shadow-sm",
              isDark ? "bg-black border-white/10 text-emerald-400" : "bg-zinc-50 border-zinc-200 text-emerald-600"
            )}>
              {order_index.toString().padStart(2, '0')}
            </div>

            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-sans tracking-tight truncate font-normal">
                {title}
              </h2>
              <div className="flex items-center gap-2 mt-0.5 text-xs font-sans">
                <span className={cn("flex items-center gap-1 px-2.5 py-0.5 rounded-full border font-mono text-[10px]", isDark ? "bg-black border-white/10 text-zinc-400" : "bg-zinc-50 border-zinc-200 text-zinc-600")}>
                  <FaClock className="text-emerald-500" /> {estimated_minutes} min
                </span>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[9px] border font-mono font-medium",
                  user_status === 'completed' || user_status === 'in_progress'
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                    : isDark ? "bg-black border-white/10 text-zinc-400" : "bg-zinc-100 border-zinc-200 text-zinc-600"
                )}>
                  {user_status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowScheduleModal(true)}
              disabled={isMarkingReview}
              className={cn(
                "px-3 py-1.5 rounded-xl border flex items-center justify-center transition-colors cursor-pointer text-xs font-mono font-medium gap-1.5 shadow-sm shrink-0",
                isDark ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20" : "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"
              )}
              title="Add to Spaced Repetition Daily Reviews"
            >
              <FaBrain className="text-sm" />
              <span className="hidden sm:inline">Mark for Review</span>
            </button>
            {/* Modal Close Button */}
            <button
              onClick={onClose}
              className={cn(
                "w-9 h-9 rounded-xl border flex items-center justify-center transition-colors cursor-pointer",
                isDark ? "bg-black border-white/10 text-zinc-400 hover:text-white" : "bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900"
              )}
            >
              <FaTimes className="text-sm" />
            </button>
          </div>
        </div>

        {/* 2-COLUMN THEATRE STAGE LAYOUT (3/4 Stage + 1/4 Control Sidebar) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          
          {/* 🖥️ LEFT MAIN STAGE (3/4 WIDTH ~ 75%) */}
          <div className={cn(
            isEditingNotes ? "lg:w-[55%]" : "lg:w-[75%]",
            "flex flex-col border-r overflow-hidden min-h-[420px] transition-all duration-300",
            isDark ? "border-white/10 bg-black/80" : "border-zinc-200 bg-zinc-50"
          )}>
            {/* Stage Top Navigation Bar */}
            <div className={cn(
              "p-3 px-4 border-b flex items-center justify-between overflow-x-auto gap-2 shrink-0 scrollbar-none",
              isDark ? "border-white/10 bg-zinc-950 text-white" : "border-zinc-200 bg-zinc-100 text-zinc-800"
            )}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveStageTab('video')}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all cursor-pointer",
                    activeStageTab === 'video'
                      ? "bg-emerald-500 text-white shadow"
                      : isDark ? "bg-zinc-900 text-zinc-400 hover:text-white" : "bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900"
                  )}
                >
                  <FaTv /> <span>Video Lecture</span>
                </button>

                <button
                  onClick={() => setActiveStageTab('quiz')}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all cursor-pointer",
                    activeStageTab === 'quiz'
                      ? "bg-emerald-500 text-white shadow"
                      : isDark ? "bg-zinc-900 text-zinc-400 hover:text-white" : "bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900"
                  )}
                >
                  <FaQuestionCircle /> <span>Quantum Quiz</span>
                </button>

                <button
                  onClick={() => setActiveStageTab('flashcards')}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all cursor-pointer",
                    activeStageTab === 'flashcards'
                      ? "bg-emerald-500 text-white shadow"
                      : isDark ? "bg-zinc-900 text-zinc-400 hover:text-white" : "bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900"
                  )}
                >
                  <FaLayerGroup /> <span>Flashcards</span>
                </button>

                <button
                  onClick={() => setIsEditingNotes(!isEditingNotes)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all cursor-pointer",
                    isEditingNotes
                      ? "bg-emerald-500 text-white shadow"
                      : isDark ? "bg-zinc-900 text-zinc-400 hover:text-white" : "bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900"
                  )}
                >
                  <FaStickyNote /> <span>Notes</span>
                </button>

                <button
                  onClick={() => setActiveStageTab('slides')}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all cursor-pointer",
                    activeStageTab === 'slides'
                      ? "bg-emerald-500 text-white shadow"
                      : isDark ? "bg-zinc-900 text-zinc-400 hover:text-white" : "bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900"
                  )}
                >
                  <FaFilePdf /> <span>Slides & PDF</span>
                </button>
              </div>

              <span className="text-[11px] font-mono text-emerald-500 font-medium hidden md:inline">
                3/4 Stage Active
              </span>
            </div>

            {/* Stage Viewer Area */}
            <div className={cn(
              "flex-1 relative overflow-hidden p-4",
              activeStageTab === 'notes' ? "flex flex-row gap-4 items-stretch" : "flex flex-col justify-center items-center"
            )}>
              
              {/* TAB 1: 🎥 VIDEO PLAYER */}
              {(activeStageTab === 'video' || activeStageTab === 'notes') && (
                <div className={cn(
                  "h-full flex flex-col",
                  activeStageTab === 'notes' ? "w-[60%]" : "w-full"
                )}>
                  {canWatchVideo && selectedVideo ? (
                    <div className={cn("relative w-full h-full rounded-2xl overflow-hidden shadow-2xl flex flex-col border", isDark ? "bg-black border-white/10" : "bg-white border-zinc-200")}>
                      <iframe
                        src={getYoutubeEmbedUrl(selectedVideo.url)}
                        title={selectedVideo.title}
                        className="w-full flex-1 border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                      <div className={cn(
                        "p-3 border-t flex items-center justify-between text-xs font-mono shrink-0",
                        isDark ? "bg-zinc-950 border-white/10 text-zinc-400" : "bg-zinc-100 border-zinc-200 text-zinc-600"
                      )}>
                        <span className={cn("truncate font-sans font-medium", isDark ? "text-white" : "text-zinc-900")}>{cleanTitle(selectedVideo.title)}</span>
                        <span className="text-emerald-500 text-[11px]">Source: {cleanSource(selectedVideo.source)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className={cn(
                      "w-full h-full rounded-2xl border flex flex-col items-center justify-center p-8 text-center",
                      isDark ? "bg-zinc-950 border-white/10" : "bg-white border-zinc-200 shadow-sm"
                    )}>
                      <FaLock className="text-4xl text-amber-500 mb-3" />
                      <h3 className={cn("text-xl font-sans mb-2", isDark ? "text-white" : "text-zinc-900")}>Video Lesson Locked</h3>
                      <p className={cn("text-xs font-sans max-w-sm mb-6", isDark ? "text-zinc-400" : "text-zinc-600")}>
                        Please click "Start Topic" in the sidebar to unlock video explainers and interactive study tools.
                      </p>
                      <button
                        onClick={handleStart}
                        disabled={loading}
                        className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-mono text-xs font-medium shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <FaPlay /> Start Topic Now
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: 🧩 QUANTUM QUIZ */}
              {activeStageTab === 'quiz' && (
                <div className={cn(
                  "w-full h-full max-w-2xl border rounded-2xl p-8 flex flex-col justify-between my-auto shadow-2xl overflow-y-auto",
                  isDark ? "bg-zinc-950 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
                )}>
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center text-2xl">
                        <FaQuestionCircle />
                      </div>
                      <div>
                        <h3 className={cn("text-2xl font-sans font-normal", isDark ? "text-white" : "text-zinc-900")}>{title} Quantum Quiz</h3>
                        <span className="text-xs font-mono text-emerald-500 font-medium">Mastery Assessment • Earn +XP Rewards</span>
                      </div>
                    </div>

                    <p className={cn("text-sm font-sans leading-relaxed mb-6", isDark ? "text-zinc-300" : "text-zinc-600")}>
                      Test your conceptual knowledge of {title} with algorithmically evaluated quantum questions, Dirac notation problems, and matrix operators.
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className={cn("p-4 rounded-xl border", isDark ? "bg-black border-white/10" : "bg-zinc-50 border-zinc-200")}>
                        <span className={cn("text-[10px] font-mono uppercase block", isDark ? "text-zinc-500" : "text-zinc-400")}>Questions</span>
                        <span className={cn("text-lg font-mono font-bold", isDark ? "text-white" : "text-zinc-900")}>5 Core Problems</span>
                      </div>
                      <div className={cn("p-4 rounded-xl border", isDark ? "bg-black border-white/10" : "bg-zinc-50 border-zinc-200")}>
                        <span className={cn("text-[10px] font-mono uppercase block", isDark ? "text-zinc-500" : "text-zinc-400")}>XP Award</span>
                        <span className="text-lg font-mono text-emerald-500 font-bold">+50 XP Bonus</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/quiz/${slug}`)}
                    className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm font-sans shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FaPlay /> Launch Interactive Quiz Module
                  </button>
                </div>
              )}

              {/* TAB 3: 🗂️ FLASHCARDS */}
              {activeStageTab === 'flashcards' && (
                <div className={cn(
                  "w-full h-full max-w-2xl border rounded-2xl p-6 sm:p-8 flex flex-col justify-between my-auto shadow-2xl overflow-y-auto",
                  isDark ? "bg-zinc-950 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
                )}>
                  <div className={cn("flex items-center justify-between pb-4 border-b", isDark ? "border-white/10" : "border-zinc-200")}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center text-xl">
                        <FaLayerGroup />
                      </div>
                      <div>
                        <h3 className={cn("text-lg font-sans font-normal", isDark ? "text-white" : "text-zinc-900")}>{title} Flashcards</h3>
                        <span className="text-[10px] font-mono text-emerald-500 font-medium">SM-2 Spaced Repetition</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full font-medium">
                      +{fcXp} XP Session
                    </span>
                  </div>

                  {fcLoading ? (
                    <div className="py-16 text-center text-xs font-mono text-zinc-400 animate-pulse">
                      Loading flashcards deck...
                    </div>
                  ) : flashcards.length === 0 ? (
                    <div className="py-16 text-center text-xs font-mono text-zinc-400">
                      No flashcards available for this topic yet.
                    </div>
                  ) : fcIndex >= flashcards.length ? (
                    <div className="py-12 text-center space-y-4">
                      <FaTrophy className="text-4xl text-amber-400 mx-auto" />
                      <h4 className={cn("text-xl font-sans", isDark ? "text-white" : "text-zinc-900")}>Deck Review Complete!</h4>
                      <p className="text-xs font-mono text-zinc-400">You completed all cards in this category.</p>
                      <button
                        onClick={() => setFcIndex(0)}
                        className="px-6 py-2 rounded-xl bg-emerald-500 text-white font-mono text-xs font-medium cursor-pointer"
                      >
                        <FaRedo className="inline mr-1" /> Review Again
                      </button>
                    </div>
                  ) : (
                    <div className="my-auto py-6">
                      <div className="text-xs font-mono text-zinc-400 text-center mb-3">
                        Card {fcIndex + 1} of {flashcards.length}
                      </div>

                      {/* 3D Flip Card Container */}
                      <div 
                        className="w-full h-[220px] sm:h-[240px] [perspective:1000px] cursor-pointer my-2 select-none"
                        onClick={() => setFcFlipped(!fcFlipped)}
                      >
                        <div 
                          className={cn(
                            "relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d]",
                            fcFlipped && "[transform:rotateY(180deg)]"
                          )}
                        >
                          {/* FRONT FACE (QUESTION) */}
                          <div 
                            className={cn(
                              "absolute inset-0 w-full h-full [backface-visibility:hidden] [-webkit-backface-visibility:hidden] p-6 rounded-2xl border flex flex-col justify-between items-center text-center shadow-md transition-colors",
                              isDark ? "bg-black border-white/10 text-white hover:border-emerald-500/50" : "bg-zinc-50 border-zinc-200 text-zinc-900 hover:border-emerald-500/50"
                            )}
                          >
                            <span className="text-[10px] font-mono text-emerald-500 font-medium uppercase tracking-widest block">
                              Question (Click to Reveal)
                            </span>
                            <p className="text-base sm:text-lg font-sans leading-relaxed my-auto font-normal">
                              {flashcards[fcIndex].question || flashcards[fcIndex].front}
                            </p>
                            <span className="text-[11px] font-mono text-zinc-400">
                              Click card to flip ↻
                            </span>
                          </div>

                          {/* BACK FACE (ANSWER) */}
                          <div 
                            className={cn(
                              "absolute inset-0 w-full h-full [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)] p-6 rounded-2xl border flex flex-col justify-between items-center text-center shadow-md transition-colors",
                              isDark ? "bg-zinc-900 border-emerald-500/40 text-white" : "bg-emerald-50/60 border-emerald-300 text-zinc-900"
                            )}
                          >
                            <span className="text-[10px] font-mono text-emerald-500 font-medium uppercase tracking-widest block">
                              Answer (Click to Flip)
                            </span>
                            <p className="text-base sm:text-lg font-sans leading-relaxed my-auto font-normal">
                              {flashcards[fcIndex].answer || flashcards[fcIndex].back}
                            </p>
                            <span className="text-[11px] font-mono text-emerald-500">
                              Rate recall difficulty below ↓
                            </span>
                          </div>
                        </div>
                      </div>

                      {fcFlipped && (
                        <div className="flex items-center gap-2 mt-4">
                          <button
                            onClick={() => handleFlashcardReview(1)}
                            className="flex-1 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-mono hover:bg-red-500/20 transition-colors"
                          >
                            Hard (1)
                          </button>
                          <button
                            onClick={() => handleFlashcardReview(3)}
                            className="flex-1 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-mono hover:bg-amber-500/20 transition-colors"
                          >
                            Good (3)
                          </button>
                          <button
                            onClick={() => handleFlashcardReview(5)}
                            className="flex-1 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-mono hover:bg-emerald-500/20 transition-colors"
                          >
                            Easy (+XP)
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={cn("pt-4 border-t flex items-center justify-between text-xs font-mono text-zinc-400", isDark ? "border-white/10" : "border-zinc-200")}>
                    <span>Click card body to flip</span>
                    <span>Progress: {Math.round(((fcIndex) / Math.max(1, flashcards.length)) * 100)}%</span>
                  </div>
                </div>
              )}



              {/* TAB 5: 📄 SLIDES & PDF */}
              {activeStageTab === 'slides' && (
                <div className="w-full h-full flex flex-col">
                  <div className={cn(
                    "relative w-full h-full rounded-2xl overflow-hidden border shadow-2xl flex flex-col",
                    isDark ? "bg-black border-white/10" : "bg-white border-zinc-200"
                  )}>
                    <iframe
                      src={pdfSlideUrl}
                      title={`${title} Lecture Slides PDF`}
                      className={cn("w-full flex-1 border-0", isDark ? "bg-zinc-900" : "bg-zinc-100")}
                    />
                    <div className={cn(
                      "p-3 border-t flex items-center justify-between text-xs font-mono shrink-0",
                      isDark ? "bg-zinc-950 border-white/10 text-zinc-400" : "bg-zinc-100 border-zinc-200 text-zinc-600"
                    )}>
                      <span className={cn("font-sans font-medium", isDark ? "text-white" : "text-zinc-900")}>{title} - Lecture Slide Notes.pdf</span>
                      <button
                        onClick={() => handleDownloadMaterial({ title: `${title} - Slides.pdf`, url: pdfSlideUrl, type: 'PDF Slide Deck' })}
                        className="px-3 py-1 rounded-lg bg-emerald-500 text-white text-xs font-mono flex items-center gap-1 hover:bg-emerald-600 transition-colors cursor-pointer"
                      >
                        <FaDownload /> Download PDF
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* 🎛️ RIGHT CONTROL SIDEBAR */}
          <div className={cn(
            isEditingNotes ? "lg:w-[45%]" : "lg:w-[25%]",
            "flex p-5 sm:p-6 flex-col justify-between overflow-y-auto min-w-[280px] transition-all duration-300",
            isDark ? "bg-zinc-950/90 text-white" : "bg-white text-zinc-900"
          )}>
            <div className="space-y-6">
              {/* Topic Overview / Notes Editor */}
              {isEditingNotes ? (
                <div className="flex-1 flex flex-col min-h-[400px]">
                  <TopicNotesModal
                    topicSlug={slug}
                    topicTitle={title}
                    isOpen={true}
                    inline={true}
                    onClose={() => setIsEditingNotes(false)}
                  />
                </div>
              ) : (
                <div>
                  <h4 className={cn("text-xs font-mono uppercase tracking-wider mb-2", isDark ? "text-zinc-400" : "text-zinc-600")}>
                    Topic Description
                  </h4>
                  <p className={cn("text-xs leading-relaxed font-sans", isDark ? "text-zinc-300" : "text-zinc-700")}>
                    {description}
                  </p>
                </div>
              )}

              {/* Interactive Study Tools (Live 3/4 Stage Switcher) */}
              <div className="space-y-2">
                <h4 className={cn("text-xs font-mono uppercase tracking-wider mb-2.5 flex items-center justify-between", isDark ? "text-zinc-400" : "text-zinc-600")}>
                  <span>3/4 Stage Switcher</span>
                  <span className="text-[10px] text-emerald-500 font-normal">Select View</span>
                </h4>

                <button
                  onClick={() => {
                    if (!canWatchVideo) {
                      toast.error("Click 'Start Topic' to unlock video!");
                      return;
                    }
                    setActiveStageTab('video');
                  }}
                  className={cn(
                    "w-full p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-2 text-xs font-sans font-medium transition-all text-left cursor-pointer group",
                    activeStageTab === 'video'
                      ? (isDark ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "bg-emerald-50 border-emerald-300 text-emerald-700")
                      : isDark ? "bg-black border-white/10 text-zinc-300 hover:border-emerald-500/40" : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <FaTv className="text-emerald-500 shrink-0" />
                    <span>Trusted Video Explainer</span>
                  </div>
                  <button
                    type="button"
                    title={completedStages.video ? "Click to mark Video as incomplete" : "Click to manually verify Video completion"}
                    onClick={(e) => toggleStageCompletion('video', e)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors border shrink-0",
                      completedStages.video
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-bold"
                        : "bg-zinc-800/40 border-zinc-700 text-zinc-400 hover:text-white"
                    )}
                  >
                    {completedStages.video ? <FaCheckCircle className="text-emerald-400 text-[11px]" /> : <div className="w-2.5 h-2.5 rounded-sm border border-zinc-500" />}
                    <span>{completedStages.video ? "Done" : "Verify"}</span>
                  </button>
                </button>

                <button
                  onClick={() => setActiveStageTab('quiz')}
                  className={cn(
                    "w-full p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-2 text-xs font-sans font-medium transition-all text-left cursor-pointer group",
                    activeStageTab === 'quiz'
                      ? (isDark ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "bg-emerald-50 border-emerald-300 text-emerald-700")
                      : isDark ? "bg-black border-white/10 text-zinc-300 hover:border-emerald-500/40" : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <FaQuestionCircle className="text-emerald-500 shrink-0" />
                    <span>Quantum Quiz</span>
                  </div>
                  <button
                    type="button"
                    title={completedStages.quiz ? "Click to mark Quiz as incomplete" : "Click to manually verify Quiz completion"}
                    onClick={(e) => toggleStageCompletion('quiz', e)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors border shrink-0",
                      completedStages.quiz
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-bold"
                        : "bg-zinc-800/40 border-zinc-700 text-zinc-400 hover:text-white"
                    )}
                  >
                    {completedStages.quiz ? <FaCheckCircle className="text-emerald-400 text-[11px]" /> : <div className="w-2.5 h-2.5 rounded-sm border border-zinc-500" />}
                    <span>{completedStages.quiz ? "Done" : "Verify"}</span>
                  </button>
                </button>

                <button
                  onClick={() => setActiveStageTab('flashcards')}
                  className={cn(
                    "w-full p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-2 text-xs font-sans font-medium transition-all text-left cursor-pointer group",
                    activeStageTab === 'flashcards'
                      ? (isDark ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "bg-emerald-50 border-emerald-300 text-emerald-700")
                      : isDark ? "bg-black border-white/10 text-zinc-300 hover:border-emerald-500/40" : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <FaLayerGroup className="text-emerald-500 shrink-0" />
                    <span>Flashcards Deck</span>
                  </div>
                  <button
                    type="button"
                    title={completedStages.flashcards ? "Click to mark Flashcards as incomplete" : "Click to manually verify Flashcards completion"}
                    onClick={(e) => toggleStageCompletion('flashcards', e)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors border shrink-0",
                      completedStages.flashcards
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-bold"
                        : "bg-zinc-800/40 border-zinc-700 text-zinc-400 hover:text-white"
                    )}
                  >
                    {completedStages.flashcards ? <FaCheckCircle className="text-emerald-400 text-[11px]" /> : <div className="w-2.5 h-2.5 rounded-sm border border-zinc-500" />}
                    <span>{completedStages.flashcards ? "Done" : "Verify"}</span>
                  </button>
                </button>

                <button
                  onClick={() => setIsEditingNotes(!isEditingNotes)}
                  className={cn(
                    "w-full p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-2 text-xs font-sans font-medium transition-all text-left cursor-pointer group",
                    isEditingNotes
                      ? (isDark ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "bg-emerald-50 border-emerald-300 text-emerald-700")
                      : isDark ? "bg-black border-white/10 text-zinc-300 hover:border-emerald-500/40" : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <FaStickyNote className="text-emerald-500 shrink-0" />
                    <span>Personal Topic Notes</span>
                  </div>
                  <button
                    type="button"
                    title={completedStages.notes ? "Click to mark Notes as incomplete" : "Click to manually verify Notes completion"}
                    onClick={(e) => toggleStageCompletion('notes', e)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors border shrink-0",
                      completedStages.notes
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-bold"
                        : "bg-zinc-800/40 border-zinc-700 text-zinc-400 hover:text-white"
                    )}
                  >
                    {completedStages.notes ? <FaCheckCircle className="text-emerald-400 text-[11px]" /> : <div className="w-2.5 h-2.5 rounded-sm border border-zinc-500" />}
                    <span>{completedStages.notes ? "Done" : "Verify"}</span>
                  </button>
                </button>

                <button
                  onClick={() => setActiveStageTab('slides')}
                  className={cn(
                    "w-full p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-2 text-xs font-sans font-medium transition-all text-left cursor-pointer group",
                    activeStageTab === 'slides'
                      ? (isDark ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "bg-emerald-50 border-emerald-300 text-emerald-700")
                      : isDark ? "bg-black border-white/10 text-zinc-300 hover:border-emerald-500/40" : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <FaFilePdf className="text-emerald-500 shrink-0" />
                    <span>Lecture Slides PDF</span>
                  </div>
                  <button
                    type="button"
                    title={completedStages.slides ? "Click to mark Slides as incomplete" : "Click to manually verify Slides completion"}
                    onClick={(e) => toggleStageCompletion('slides', e)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors border shrink-0",
                      completedStages.slides
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-bold"
                        : "bg-zinc-800/40 border-zinc-700 text-zinc-400 hover:text-white"
                    )}
                  >
                    {completedStages.slides ? <FaCheckCircle className="text-emerald-400 text-[11px]" /> : <div className="w-2.5 h-2.5 rounded-sm border border-zinc-500" />}
                    <span>{completedStages.slides ? "Done" : "Verify"}</span>
                  </button>
                </button>
              </div>

              {/* Progress bar with stage verification stats */}
              <div className={cn("p-4 rounded-xl border space-y-2", isDark ? "bg-black border-white/10" : "bg-zinc-50 border-zinc-200")}>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-500 font-medium">Topic Progress</span>
                  <span className="text-emerald-500 font-bold">{progress_pct || 0}%</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden bg-zinc-800">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                    style={{ width: `${progress_pct || 0}%` }} 
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-0.5">
                  <span>Stage Verification</span>
                  <span className="text-emerald-400 font-bold">
                    {['video', 'quiz', 'flashcards', 'notes', 'slides'].filter(s => completedStages[s as keyof typeof completedStages]).length}/5 Done
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-white/10 space-y-2 mt-4">
              {user_status === 'unlocked' && (
                <button
                  onClick={handleStart}
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-mono text-xs font-medium shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FaPlay /> Start Topic
                </button>
              )}

              {user_status === 'in_progress' && (
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-mono text-xs font-medium shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FaCheckCircle /> Mark Completed (+50 XP)
                </button>
              )}

              {user_status === 'completed' && (
                <div className="py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono text-center flex items-center justify-center gap-2">
                  <FaCheckCircle /> Topic Mastered!
                </div>
              )}

              {/* ➡️ Move to Next Topic Button */}
              {nextTopic && (
                <button
                  onClick={handleGoToNextTopic}
                  className={cn(
                    "w-full py-2.5 px-3 rounded-xl font-sans text-xs font-medium transition-all flex items-center justify-between gap-2 cursor-pointer shadow-sm border",
                    user_status === 'completed'
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/20"
                      : isDark
                        ? "bg-black border-white/10 text-zinc-300 hover:border-emerald-500/50 hover:text-white"
                        : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:border-emerald-500/50 hover:text-zinc-900"
                  )}
                  title={`Navigate to Stage ${nextTopic.order_index}: ${nextTopic.title}`}
                >
                  <span className="truncate">Next: {nextTopic.title}</span>
                  <FaArrowRight className="text-xs shrink-0 text-emerald-400" />
                </button>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
    <ScheduleReviewModal 
      isOpen={showScheduleModal}
      onClose={() => setShowScheduleModal(false)}
      onConfirm={handleMarkForReview}
      itemName={title}
    />
    </>
  );
};
