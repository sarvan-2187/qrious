import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Maximize2, Pencil, X } from 'lucide-react';
import { FaBrain, FaFileAlt, FaFilm, FaGraduationCap, FaHeadphones, FaImages, FaLayerGroup, FaNewspaper, FaShapes } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useQStudioApi } from '../hooks/useQStudioApi';
import { SourcesPanel } from '../components/SourcesPanel';
import { StudioPanel } from '../components/StudioPanel';
import { MindMapModal } from '../components/MindMapModal';
import { FlashcardsReviewer } from '../components/FlashcardsReviewer';
import { BriefingDocViewer } from '../components/BriefingDocViewer';
import { StudyGuideViewer } from '../components/StudyGuideViewer';
import { BlogPostViewer } from '../components/BlogPostViewer';
import { VideoOverviewOutputCard } from '../components/VideoOverviewOutputCard';
import { VideoOverviewGenerateForm } from '../components/VideoOverviewGenerateForm';
import { AudioOverviewOutputCard } from '../components/AudioOverviewOutputCard';
import { AudioOverviewGenerateForm } from '../components/AudioOverviewGenerateForm';
import { SlidesOutputCard } from '../components/SlidesOutputCard';
import { SlidesGenerateForm } from '../components/SlidesGenerateForm';
import { AnimationOverviewOutputCard } from '../components/AnimationOverviewOutputCard';
import { AnimationOverviewGenerateForm } from '../components/AnimationOverviewGenerateForm';
import { SourceChatPanel } from '../components/SourceChatPanel';
import { OUTPUT_TYPE_LABELS } from '../types';
import type {
  BlogPostResult,
  BriefingResult,
  FlashcardsResult,
  MindMapResult,
  Output,
  OutputType,
  SlideTheme,
  StudyGuideResult,
  StudySpace,
  VideoOverviewPointerResult,
  VoiceKey,
} from '../types';
import type { VideoTemplate, VoiceGender } from '@/api/videoOverviews';

const OUTPUT_ICONS: Record<OutputType, React.ReactNode> = {
  mindmap: <FaBrain />,
  flashcards: <FaLayerGroup />,
  briefing: <FaFileAlt />,
  study_guide: <FaGraduationCap />,
  blog_post: <FaNewspaper />,
  video: <FaFilm />,
  audio: <FaHeadphones />,
  slides: <FaImages />,
  animation: <FaShapes />,
};

const QStudioStudySpacePage: React.FC = () => {
  const { theme } = useTheme();
  const { studySpaceId } = useParams<{ studySpaceId: string }>();
  const { getStudySpace, renameStudySpace, listOutputs, generateOutput } = useQStudioApi();
  const [studySpace, setStudySpace] = useState<StudySpace | null>(null);
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [generating, setGenerating] = useState<OutputType | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<OutputType | null>(null);
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  const [studioCollapsed, setStudioCollapsed] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  // Video is the one output type whose "Regenerate" should re-open the config form
  // (theme + narrator voice) instead of silently reusing the last-used params —
  // toggled open by the top Regenerate button, closed on a fresh selection/cancel/
  // successful generate.
  const [videoConfigOpen, setVideoConfigOpen] = useState(false);
  // Same reasoning as videoConfigOpen — Animation's "Regenerate" should also
  // re-open the narrator-voice (including "no narration") form rather than
  // silently reusing whatever voice was picked last time.
  const [animationConfigOpen, setAnimationConfigOpen] = useState(false);
  // Mind Map opens as a full-screen modal rather than the small inline
  // ReactFlow box the workspace card used to render directly — a pan/zoom
  // node graph needs more room than a 420px card. The workspace card still
  // shows a launcher in its place so closing the modal doesn't strand the
  // user on an empty panel.
  const [mindMapOpen, setMindMapOpen] = useState(false);

  const refreshOutputs = useCallback(async () => {
    if (!studySpaceId) return;
    try {
      setOutputs(await listOutputs(studySpaceId));
    } catch (err) {
      console.error(err);
    }
  }, [listOutputs, studySpaceId]);

  useEffect(() => {
    if (!studySpaceId) return;
    getStudySpace(studySpaceId).then(setStudySpace).catch(console.error);
    refreshOutputs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studySpaceId]);

  const latestOutputByType = (type: OutputType) =>
    outputs.filter((o) => o.type === type).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  const handleGenerate = async (type: OutputType, params: Record<string, unknown> = {}) => {
    if (!studySpaceId || generating) return;
    setGenerating(type);
    setGenerateError(null);
    try {
      await generateOutput(studySpaceId, type, params);
      await refreshOutputs();
      setSelectedType(type);
      setVideoConfigOpen(false);
      setAnimationConfigOpen(false);
    } catch (err: any) {
      setGenerateError(err.response?.data?.detail || err.message || 'Generation failed.');
    } finally {
      setGenerating(null);
    }
  };

  const handleSelect = (type: OutputType) => {
    setVideoConfigOpen(false);
    setAnimationConfigOpen(false);
    const output = latestOutputByType(type);
    if (output) {
      setSelectedType(type);
    } else if (type === 'video' || type === 'audio' || type === 'slides' || type === 'animation') {
      // Video needs a theme + narrator voice, Audio needs voice choices, Slides
      // needs a theme choice, Animation needs a narrator voice — all four show
      // a form instead of one-click generating like the other output types.
      setSelectedType(type);
    } else {
      handleGenerate(type);
    }
  };

  const startEditingTitle = () => {
    setTitleDraft(studySpace?.title || '');
    setEditingTitle(true);
  };

  const cancelEditingTitle = () => {
    setEditingTitle(false);
    setTitleDraft('');
  };

  const saveTitle = async () => {
    const trimmed = titleDraft.trim();
    if (!studySpaceId || !trimmed || trimmed === studySpace?.title) {
      cancelEditingTitle();
      return;
    }
    setSavingTitle(true);
    try {
      const updated = await renameStudySpace(studySpaceId, trimmed);
      setStudySpace(updated);
      cancelEditingTitle();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingTitle(false);
    }
  };

  const selectedOutput = selectedType ? latestOutputByType(selectedType) : undefined;

  // Auto-open the full-screen modal whenever a ready mind map becomes the
  // selection — covers both picking an existing one from the Studio panel
  // and finishing a fresh generation (handleGenerate selects the type once
  // the job completes).
  useEffect(() => {
    if (selectedType === 'mindmap' && selectedOutput?.status === 'ready') {
      setMindMapOpen(true);
    }
  }, [selectedType, selectedOutput?.status]);

  return (
    <div className={cn(
      "w-full h-full transition-colors duration-300 py-6 px-4 md:px-6",
      theme === 'dark' ? "text-white" : "text-zinc-900",
    )}>
      <div className="max-w-[1800px] mx-auto flex flex-col gap-4 h-full">
        <div className="flex items-center gap-3">
          <Link
            to="/qstudio"
            className={cn(
              "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors",
              theme === 'dark' ? "bg-zinc-950/50 border-white/10 text-zinc-400 hover:text-white" : "bg-white border-zinc-200 text-zinc-500 hover:text-zinc-900",
            )}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          {editingTitle ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); saveTitle(); }
                  if (e.key === 'Escape') { e.preventDefault(); cancelEditingTitle(); }
                }}
                disabled={savingTitle}
                className={cn(
                  "text-2xl md:text-3xl font-sans tracking-tight bg-transparent border-b outline-none flex-1 min-w-0 disabled:opacity-50",
                  theme === 'dark' ? "border-white/20 focus:border-emerald-500/60" : "border-zinc-300 focus:border-emerald-500/60",
                )}
              />
              <button
                onClick={saveTitle}
                disabled={savingTitle}
                title="Save"
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors disabled:opacity-50",
                  theme === 'dark' ? "text-emerald-400 hover:bg-white/5" : "text-emerald-600 hover:bg-zinc-100",
                )}
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={cancelEditingTitle}
                disabled={savingTitle}
                title="Cancel"
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors disabled:opacity-50",
                  theme === 'dark' ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100",
                )}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <motion.div
              className="flex items-center gap-2 group min-w-0"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-2xl md:text-3xl font-sans tracking-tight truncate">
                {studySpace?.title || 'Untitled study space'}
              </h1>
              <button
                onClick={startEditingTitle}
                title="Rename study space"
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
                  theme === 'dark' ? "text-zinc-500 hover:text-white hover:bg-white/5" : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100",
                )}
              >
                <Pencil className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </div>

        {generateError && (
          <div className="p-4 bg-red-100/10 border border-red-500/20 text-red-500 rounded-lg text-sm">
            {generateError}
          </div>
        )}

        {/*
          Fixed, viewport-relative height rather than flex-1/min-h — this app's root layout
          (components/ui/sidebar.tsx's SidebarProvider) uses `min-h-svh`, a FLOOR not a ceiling,
          so any ancestor chain built only from flex-1/h-full never actually becomes shorter
          than its content; the whole page just grows and the browser scrolls it as one unit,
          and overflow-y-auto lower down never gets a chance to activate. Setting an explicit
          height here (a real viewport calc, not a percentage) sidesteps that: 200px accounts
          for the sticky top header (h-14/56px) + this page's own top padding/title row/gap
          above this row (tightened along with the padding/gap values below — keep this in
          sync if those change again). Each of the three panels below scrolls independently
          within this fixed height, matching NotebookLM's three-pane layout.
        */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch h-[calc(100dvh-200px)] min-h-[500px]">
          {/* Sources */}
          {studySpaceId && (
            <SourcesPanel
              studySpaceId={studySpaceId}
              onSourcesChanged={refreshOutputs}
              collapsed={sourcesCollapsed}
              onToggleCollapsed={() => setSourcesCollapsed((prev) => !prev)}
            />
          )}

          {/* Workspace */}
          <div className={cn(
            "flex-1 min-w-0 h-full rounded-[2rem] border shadow-sm p-5",
            theme === 'dark' ? "bg-zinc-950/50 border-white/10" : "bg-white border-zinc-200",
          )}>
            {!selectedType && studySpaceId && (
              <SourceChatPanel studySpaceId={studySpaceId} />
            )}

            {selectedType && (
              <div className="flex flex-col gap-5 h-full min-h-0">
                <div className="flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedType(null)}
                      title="Back to Q&A"
                      className={cn(
                        "w-10 h-10 rounded-2xl border flex items-center justify-center transition-colors shrink-0",
                        theme === 'dark' ? "bg-black border-white/10 text-zinc-400 hover:text-emerald-400" : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:text-emerald-600",
                      )}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <span className={cn("text-base", theme === 'dark' ? "text-zinc-400" : "text-zinc-500")}>
                      {OUTPUT_ICONS[selectedType]}
                    </span>
                    <h3 className="font-semibold text-lg">{OUTPUT_TYPE_LABELS[selectedType]}</h3>
                  </div>
                  {selectedOutput && selectedOutput.status !== 'generating'
                    && !(selectedType === 'video' && videoConfigOpen)
                    && !(selectedType === 'animation' && animationConfigOpen) && (
                    <button
                      onClick={() => {
                        if (selectedType === 'video') {
                          // Video's regenerate re-opens the theme/voice form rather than
                          // silently reusing the last-used config — see videoConfigOpen.
                          setVideoConfigOpen(true);
                        } else if (selectedType === 'animation') {
                          // Same reasoning — re-open the voice form (see animationConfigOpen).
                          setAnimationConfigOpen(true);
                        } else {
                          handleGenerate(selectedType, selectedOutput.params);
                        }
                      }}
                      disabled={generating === selectedType}
                      className={cn(
                        "text-xs font-medium transition-colors disabled:opacity-50",
                        theme === 'dark' ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900",
                      )}
                    >
                      {generating === selectedType ? 'Regenerating…' : 'Regenerate'}
                    </button>
                  )}
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
                  {selectedOutput?.status === 'failed' && (
                    <div className="text-sm text-red-500">{selectedOutput.error || 'Generation failed.'}</div>
                  )}

                  {selectedOutput?.status === 'ready' && selectedType === 'mindmap' && (
                    <button
                      onClick={() => setMindMapOpen(true)}
                      className={cn(
                        "w-full flex flex-col items-center justify-center gap-3 rounded-2xl border py-16 text-center transition-colors",
                        theme === 'dark' ? "bg-black border-white/10 hover:border-emerald-500/30" : "bg-zinc-50 border-zinc-200 hover:border-emerald-500/30",
                      )}
                    >
                      <Maximize2 className={cn("w-6 h-6", theme === 'dark' ? "text-emerald-400" : "text-emerald-600")} />
                      <span className="text-sm font-medium">Open Mind Map</span>
                    </button>
                  )}
                  {selectedOutput?.status === 'ready' && selectedType === 'flashcards' && (
                    <FlashcardsReviewer outputId={selectedOutput.id} result={selectedOutput.result as FlashcardsResult} />
                  )}
                  {selectedOutput?.status === 'ready' && selectedType === 'briefing' && (
                    <BriefingDocViewer result={selectedOutput.result as BriefingResult} title={studySpace?.title} />
                  )}
                  {selectedOutput?.status === 'ready' && selectedType === 'study_guide' && (
                    <StudyGuideViewer result={selectedOutput.result as StudyGuideResult} title={studySpace?.title} />
                  )}
                  {selectedOutput?.status === 'ready' && selectedType === 'blog_post' && (
                    <BlogPostViewer result={selectedOutput.result as BlogPostResult} title={studySpace?.title} />
                  )}
                  {selectedType === 'video' && (!selectedOutput || videoConfigOpen) && (
                    <VideoOverviewGenerateForm
                      generating={generating === 'video'}
                      defaultTemplate={(selectedOutput?.params.template as VideoTemplate) || 'minimal_dark'}
                      defaultVoice={(selectedOutput?.params.voice as VoiceGender) || 'female'}
                      onGenerate={(template: VideoTemplate, voice: VoiceGender) =>
                        handleGenerate('video', { template, voice })
                      }
                      onCancel={selectedOutput ? () => setVideoConfigOpen(false) : undefined}
                    />
                  )}
                  {!videoConfigOpen && selectedOutput?.status === 'ready' && selectedType === 'video' && (
                    <VideoOverviewOutputCard
                      videoOverviewId={(selectedOutput.result as VideoOverviewPointerResult).video_overview_id}
                    />
                  )}

                  {selectedType === 'audio' && !selectedOutput && (
                    <AudioOverviewGenerateForm
                      generating={generating === 'audio'}
                      onGenerate={(voiceA: VoiceKey, voiceB: VoiceKey) =>
                        handleGenerate('audio', { voice_a: voiceA, voice_b: voiceB })
                      }
                    />
                  )}
                  {selectedType === 'audio' && selectedOutput && (
                    <AudioOverviewOutputCard outputId={selectedOutput.id} onSettled={refreshOutputs} />
                  )}

                  {selectedType === 'slides' && !selectedOutput && (
                    <SlidesGenerateForm
                      generating={generating === 'slides'}
                      onGenerate={(theme: SlideTheme) => handleGenerate('slides', { theme })}
                    />
                  )}
                  {selectedType === 'slides' && selectedOutput && (
                    <SlidesOutputCard outputId={selectedOutput.id} onSettled={refreshOutputs} />
                  )}

                  {selectedType === 'animation' && (!selectedOutput || animationConfigOpen) && (
                    <AnimationOverviewGenerateForm
                      generating={generating === 'animation'}
                      defaultVoice={(selectedOutput?.params.voice as 'female' | 'male' | null | undefined) ?? 'female'}
                      defaultAnimationTheme={(selectedOutput?.params.theme as SlideTheme | undefined) ?? 'minimal_dark'}
                      onGenerate={(voice: 'female' | 'male' | null, animationTheme: SlideTheme) =>
                        handleGenerate('animation', { voice, theme: animationTheme })
                      }
                      onCancel={selectedOutput ? () => setAnimationConfigOpen(false) : undefined}
                    />
                  )}
                  {selectedType === 'animation' && !animationConfigOpen && selectedOutput && (
                    <AnimationOverviewOutputCard outputId={selectedOutput.id} onSettled={refreshOutputs} />
                  )}
                </div>
              </div>
            )}

            {mindMapOpen && selectedType === 'mindmap' && selectedOutput?.status === 'ready' && (
              <MindMapModal
                result={selectedOutput.result as MindMapResult}
                onClose={() => setMindMapOpen(false)}
              />
            )}
          </div>

          {/* Studio */}
          <StudioPanel
            outputs={outputs}
            generating={generating}
            selectedType={selectedType}
            onSelect={handleSelect}
            collapsed={studioCollapsed}
            onToggleCollapsed={() => setStudioCollapsed((prev) => !prev)}
          />
        </div>
      </div>
    </div>
  );
};

export default QStudioStudySpacePage;
