import React, { useEffect, useRef, useState } from 'react';
import { FaFileAlt, FaFilePdf, FaPaperPlane, FaTrash } from 'react-icons/fa';
import { Sparkles } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { useQStudioApi } from '../hooks/useQStudioApi';
import type { RagCitation, RagMessage, Source } from '../types';

interface SourceChatPanelProps {
  studySpaceId: string;
}

const CitationChips: React.FC<{ citations: RagCitation[] }> = ({ citations }) => {
  const { theme } = useTheme();
  if (citations.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {citations.map((c) => (
        <span
          key={c.citation_id}
          title={c.snippet}
          className={cn(
            "text-[10px] px-2 py-0.5 rounded-full border font-mono cursor-help",
            theme === 'dark' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700",
          )}
        >
          {c.source_name}{c.page != null ? ` p.${c.page}` : ''}
        </span>
      ))}
    </div>
  );
};

export const SourceChatPanel: React.FC<SourceChatPanelProps> = ({ studySpaceId }) => {
  const { theme } = useTheme();
  const { listQaMessages, askQuestion, clearQaMessages, listSources } = useQStudioApi();
  const [messages, setMessages] = useState<RagMessage[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [asking, setAsking] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoadingHistory(true);
    Promise.all([listQaMessages(studySpaceId), listSources(studySpaceId)])
      .then(([msgs, srcs]) => {
        setMessages(msgs);
        setSources(srcs);
      })
      .catch(console.error)
      .finally(() => setLoadingHistory(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studySpaceId]);

  // Indexing (including SourcesPanel's own auto-reindex backfill for sources
  // added before Q&A existed) runs in the background — poll while any source
  // isn't settled yet so the input unlocks the moment rag_status flips to
  // ready, without needing a manual page reload.
  useEffect(() => {
    if (!sources.some((s) => s.rag_status === 'processing' || s.rag_status === 'not_indexed')) return;
    const timer = setInterval(() => {
      listSources(studySpaceId).then(setSources).catch(console.error);
    }, 3000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources, studySpaceId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, asking]);

  const readySources = sources.filter((s) => s.rag_status === 'ready');

  const toggleSource = (id: string) => {
    setSelectedSourceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleAsk = async () => {
    const question = input.trim();
    if (!question || asking) return;
    setAsking(true);
    setError(null);
    setInput('');
    const optimisticUser: RagMessage = {
      id: `local-${Date.now()}-u`, study_space_id: studySpaceId, owner_uid: '',
      role: 'user', content: question, citations: [], created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    try {
      const response = await askQuestion(studySpaceId, question, selectedSourceIds.length ? selectedSourceIds : undefined);
      const assistantMessage: RagMessage = {
        id: `local-${Date.now()}-a`, study_space_id: studySpaceId, owner_uid: '',
        role: 'assistant', content: response.answer, citations: response.citations,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to get an answer.');
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
      setInput(question);
    } finally {
      setAsking(false);
    }
  };

  const handleClear = async () => {
    setMessages([]);
    try {
      await clearQaMessages(studySpaceId);
    } catch (err) {
      console.error(err);
    }
  };

  if (loadingHistory) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className={cn("text-sm", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>Loading conversation…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      {readySources.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <span className={cn("text-[10px] uppercase tracking-wider mr-1", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
            Ask across
          </span>
          {readySources.map((s) => {
            const active = selectedSourceIds.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggleSource(s.id)}
                className={cn(
                  "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors",
                  active
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : theme === 'dark' ? "border-white/10 text-zinc-400 hover:text-white" : "border-zinc-200 text-zinc-600 hover:text-zinc-900",
                )}
              >
                {s.kind === 'pdf' ? <FaFilePdf className="w-3 h-3" /> : <FaFileAlt className="w-3 h-3" />}
                {s.kind === 'pdf' ? s.filename : 'Pasted text'}
              </button>
            );
          })}
          {selectedSourceIds.length === 0 && (
            <span className={cn("text-[10px]", theme === 'dark' ? "text-zinc-600" : "text-zinc-400")}>(all sources)</span>
          )}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-16">
            <div className={cn(
              "w-14 h-14 rounded-2xl border flex items-center justify-center",
              theme === 'dark' ? "bg-black border-white/10 text-emerald-400" : "bg-zinc-50 border-zinc-200 text-emerald-600",
            )}>
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-lg font-medium">Ask about your sources</p>
            <p className={cn("max-w-sm text-sm", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
              {readySources.length > 0
                ? "Answers are grounded in the sources on the left, with citations back to exactly where each claim came from."
                : "Add a source and wait for it to finish indexing, then ask a question — answers cite exactly where each claim came from."}
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={cn("flex min-w-0", m.role === 'user' ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] min-w-0 rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap break-words",
                m.role === 'user'
                  ? "bg-emerald-500 text-white"
                  : theme === 'dark' ? "bg-black/60 border border-white/10 text-zinc-100" : "bg-zinc-50 border border-zinc-200 text-zinc-900",
              )}
            >
              {m.content}
              {m.role === 'assistant' && <CitationChips citations={m.citations} />}
            </div>
          </div>
        ))}

        {asking && (
          <div className="flex justify-start">
            <div className={cn(
              "rounded-2xl px-4 py-3 text-sm",
              theme === 'dark' ? "bg-black/60 border border-white/10 text-zinc-400" : "bg-zinc-50 border border-zinc-200 text-zinc-500",
            )}>
              Thinking…
            </div>
          </div>
        )}
      </div>

      {error && <div className="text-xs text-red-500 shrink-0">{error}</div>}

      <div className="flex items-center gap-2 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
          placeholder={readySources.length > 0 ? "Ask a question about your sources…" : "Add a source to start asking questions…"}
          disabled={asking || readySources.length === 0}
          className={cn(
            "flex-1 rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/40 disabled:opacity-50",
            theme === 'dark' ? "bg-black border-white/10 placeholder:text-zinc-500 text-white" : "bg-white border-zinc-200 text-zinc-900",
          )}
        />
        <button
          onClick={handleAsk}
          disabled={asking || !input.trim() || readySources.length === 0}
          title="Ask"
          className="w-10 h-10 shrink-0 rounded-xl bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors disabled:opacity-50"
        >
          <FaPaperPlane className="w-3.5 h-3.5" />
        </button>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            title="Clear conversation"
            className={cn(
              "w-10 h-10 shrink-0 rounded-xl border flex items-center justify-center transition-colors",
              theme === 'dark' ? "border-white/10 text-zinc-500 hover:text-red-400" : "border-zinc-200 text-zinc-400 hover:text-red-500",
            )}
          >
            <FaTrash className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
