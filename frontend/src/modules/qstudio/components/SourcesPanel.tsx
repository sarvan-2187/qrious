import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaFileAlt, FaFilePdf, FaPlus, FaRedo, FaTrash, FaUpload } from 'react-icons/fa';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { useQStudioApi } from '../hooks/useQStudioApi';
import type { Source } from '../types';

interface SourcesPanelProps {
  studySpaceId: string;
  onSourcesChanged: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export const SourcesPanel: React.FC<SourcesPanelProps> = ({ studySpaceId, onSourcesChanged, collapsed, onToggleCollapsed }) => {
  const { theme } = useTheme();
  const { listSources, addTextSource, uploadPdfSource, deleteSource, reindexSource } = useQStudioApi();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [pastedText, setPastedText] = useState('');
  const [adding, setAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Sources whose auto-index we've already kicked off this session — a plain
  // ref (not state) so it survives re-renders/polls without itself
  // triggering one, and doesn't re-fire after a successful/failed result.
  const autoIndexTriggered = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    try {
      setSources(await listSources(studySpaceId));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [listSources, studySpaceId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Q&A indexing runs in the background (rag/pipeline.py::index_source) —
  // poll while anything is still "processing" so the indicator below flips to
  // ready/failed without a manual reload, same POLL_INTERVAL_MS as the other
  // output-status polls (AudioOverviewOutputCard etc).
  useEffect(() => {
    if (!sources.some((s) => s.rag_status === 'processing')) return;
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [sources, refresh]);

  // Backfill: a source added before Q&A indexing existed (or whose indexing
  // trigger was somehow missed) sits at rag_status="not_indexed" forever —
  // nothing re-triggers it on its own. Auto-reindex it once, silently, the
  // first time it shows up here, so Q&A "just works" without a manual step.
  useEffect(() => {
    const usable = sources.filter((s) => s.status !== 'pending' && s.rag_status === 'not_indexed');
    for (const source of usable) {
      if (autoIndexTriggered.current.has(source.id)) continue;
      autoIndexTriggered.current.add(source.id);
      setSources((prev) => prev.map((s) => (s.id === source.id ? { ...s, rag_status: 'processing' } : s)));
      reindexSource(source.id).catch((err) => {
        console.error(err);
        setSources((prev) => prev.map((s) => (s.id === source.id ? { ...s, rag_status: 'failed' } : s)));
      });
    }
  }, [sources, reindexSource]);

  const handleRetryIndex = async (id: string) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, rag_status: 'processing', rag_error: null } : s)));
    try {
      await reindexSource(id);
    } catch (err) {
      console.error(err);
      refresh();
    }
  };

  const handleAddText = async () => {
    if (!pastedText.trim() || adding) return;
    setAdding(true);
    try {
      await addTextSource(studySpaceId, pastedText.trim());
      setPastedText('');
      await refresh();
      onSourcesChanged();
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAdding(true);
    try {
      await uploadPdfSource(studySpaceId, file);
      await refresh();
      onSourcesChanged();
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
    try {
      await deleteSource(id);
      onSourcesChanged();
    } catch (err) {
      console.error(err);
      refresh();
    }
  };

  const pdfCount = sources.filter((s) => s.kind === 'pdf').length;
  const textCount = sources.filter((s) => s.kind === 'text').length;

  if (collapsed) {
    return (
      <div className={cn(
        "w-14 shrink-0 rounded-[2rem] border shadow-sm flex flex-col items-center gap-3 py-4",
        theme === 'dark' ? "bg-zinc-950/50 border-white/10" : "bg-white border-zinc-200",
      )}>
        <button
          onClick={onToggleCollapsed}
          title="Expand Sources panel"
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0",
            theme === 'dark' ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100",
          )}
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>

        {sources.length > 0 && (
          <>
            <div className={cn("w-8 h-px shrink-0", theme === 'dark' ? "bg-white/10" : "bg-zinc-200")} />
            <div
              title={`${pdfCount} PDF${pdfCount === 1 ? '' : 's'}`}
              className={cn("flex flex-col items-center gap-0.5 shrink-0", theme === 'dark' ? "text-zinc-400" : "text-zinc-500")}
            >
              <FaFilePdf className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[10px] font-mono">×{pdfCount}</span>
            </div>
            <div
              title={`${textCount} pasted text source${textCount === 1 ? '' : 's'}`}
              className={cn("flex flex-col items-center gap-0.5 shrink-0", theme === 'dark' ? "text-zinc-400" : "text-zinc-500")}
            >
              <FaFileAlt className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] font-mono">×{textCount}</span>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "w-full lg:w-[280px] shrink-0 rounded-[2rem] border shadow-sm p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4",
      theme === 'dark' ? "bg-zinc-950/50 border-white/10" : "bg-white border-zinc-200",
    )}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight uppercase text-emerald-500">Sources</h2>
          {sources.length > 0 && (
            <p className={cn("text-xs mt-0.5", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
              {sources.length} source{sources.length === 1 ? '' : 's'}
              {' — '}
              {pdfCount} PDF{pdfCount === 1 ? '' : 's'}, {textCount} text
            </p>
          )}
        </div>
        <button
          onClick={onToggleCollapsed}
          title="Collapse Sources panel"
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0",
            theme === 'dark' ? "text-zinc-500 hover:text-white hover:bg-white/5" : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100",
          )}
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      <div className={cn(
        "p-3 rounded-2xl border flex flex-col gap-2",
        theme === 'dark' ? "bg-black/40 border-white/10" : "bg-zinc-50 border-zinc-200",
      )}>
        <textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder="Paste text to use as a source..."
          rows={3}
          className={cn(
            "w-full resize-none rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/40",
            theme === 'dark' ? "bg-black border-white/10 placeholder:text-zinc-500 text-white" : "bg-white border-zinc-200 text-zinc-900",
          )}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAddText}
            disabled={adding || !pastedText.trim()}
            className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <FaPlus className="w-3 h-3" /> Add text
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={adding}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 border",
              theme === 'dark' ? "border-white/10 text-zinc-300 hover:text-white" : "border-zinc-200 text-zinc-700 hover:text-zinc-900",
            )}
          >
            <FaUpload className="w-3 h-3" /> Upload PDF
          </button>
          <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
        </div>
        {adding && (
          <p className={cn("text-xs", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>Adding source…</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {loading && (
          <p className={cn("text-sm", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>Loading sources…</p>
        )}
        {!loading && sources.length === 0 && (
          <p className={cn("text-sm", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
            No sources yet — paste text or upload a PDF to ground your generations.
          </p>
        )}
        {sources.map((source) => (
          <div
            key={source.id}
            className={cn(
              "flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-sm",
              theme === 'dark' ? "bg-black/40 border-white/10" : "bg-white border-zinc-200",
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              {source.kind === 'pdf'
                ? <FaFilePdf className="text-red-400 shrink-0" />
                : <FaFileAlt className="text-blue-400 shrink-0" />}
              <span className="truncate">{source.kind === 'pdf' ? source.filename : 'Pasted text'}</span>
              {source.status === 'pending' && (
                <span className="text-[10px] uppercase text-amber-500 shrink-0">processing…</span>
              )}
              {source.status !== 'pending' && source.rag_status === 'processing' && (
                <span className="text-[10px] uppercase text-amber-500 shrink-0" title="Indexing for Q&A">indexing…</span>
              )}
              {source.status !== 'pending' && source.rag_status === 'failed' && (
                <span className="text-[10px] uppercase text-red-500 shrink-0" title={source.rag_error || 'Q&A indexing failed'}>
                  index failed
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {source.status !== 'pending' && source.rag_status === 'failed' && (
                <button
                  onClick={() => handleRetryIndex(source.id)}
                  title="Retry indexing for Q&A"
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                    theme === 'dark' ? "text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10" : "text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50",
                  )}
                >
                  <FaRedo className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => handleDelete(source.id)}
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                  theme === 'dark' ? "text-zinc-500 hover:text-red-400 hover:bg-red-500/10" : "text-zinc-400 hover:text-red-500 hover:bg-red-50",
                )}
              >
                <FaTrash className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
