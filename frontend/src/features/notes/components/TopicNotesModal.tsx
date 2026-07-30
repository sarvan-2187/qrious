import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchNotes, createNote, updateNote, deleteNote, uploadAttachment, fetchFolders } from '../api';
import type { Note, NoteFolder } from '../types/note.types';
import { NoteEditor } from './NoteEditor';
import { FaStickyNote, FaTimes, FaExpandAlt, FaCompressAlt, FaMinus, FaPlus } from 'react-icons/fa';
import { toast } from 'sonner';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface TopicNotesModalProps {
  topicSlug: string;
  topicTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export const TopicNotesModal: React.FC<TopicNotesModalProps> = ({
  topicSlug,
  topicTitle,
  isOpen,
  onClose
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [isFloating, setIsFloating] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 650, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // Fetch folders & notes for this topic
  const { data: foldersData } = useQuery({
    queryKey: ['note-folders'],
    queryFn: fetchFolders,
    enabled: isOpen
  });

  const { data: notesData, refetch: refetchTopicNotes } = useQuery({
    queryKey: ['topic-notes', topicSlug],
    queryFn: () => fetchNotes(undefined, topicSlug),
    enabled: isOpen
  });

  const folders: NoteFolder[] = foldersData?.data || [];
  const topicNotes: Note[] = notesData?.data || [];

  useEffect(() => {
    if (topicNotes.length > 0 && !activeNoteId) {
      setActiveNoteId(topicNotes[0]._id);
    }
  }, [topicNotes, activeNoteId]);

  const activeNote = topicNotes.find((n) => n._id === activeNoteId) || null;

  // Draggable logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isFloating) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = Math.max(10, Math.min(window.innerWidth - 300, e.clientX - dragStartRef.current.x));
      const newY = Math.max(10, Math.min(window.innerHeight - 100, e.clientY - dragStartRef.current.y));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!isOpen) return null;

  const handleCreateTopicNote = async () => {
    try {
      const res = await createNote({
        title: `${topicTitle} - Notes`,
        content_markdown: `# ${topicTitle}\n\n- Key Concept 1\n- Key Concept 2\n\n\`\`\`python\n# Qiskit Code Example\n\`\`\``,
        topic_slug: topicSlug
      });
      toast.success(`Note created for ${topicTitle}!`);
      refetchTopicNotes();
      setActiveNoteId(res.data._id);
    } catch (err) {
      toast.error('Failed to create note.');
    }
  };

  const handleSaveNote = async (updatedPayload: Partial<Note>) => {
    if (!activeNoteId) return;
    await updateNote(activeNoteId, updatedPayload);
    refetchTopicNotes();
  };

  const handleDeleteNote = async (noteId: string) => {
    await deleteNote(noteId);
    toast.success('Note deleted.');
    setActiveNoteId(null);
    refetchTopicNotes();
  };

  const handleUploadImage = async (file: File): Promise<string> => {
    const res = await uploadAttachment(file);
    return res.data.url;
  };

  // Render Minimized Floating Pill
  if (isFloating && isMinimized) {
    return (
      <div
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        className={cn(
          "fixed z-[60] border shadow-2xl rounded-2xl p-3 flex items-center gap-3 font-sans cursor-pointer animate-fade-in backdrop-blur-md",
          isDark ? "bg-zinc-950 border-emerald-500/40 text-white" : "bg-white border-emerald-500/30 text-zinc-900"
        )}
        onClick={() => setIsMinimized(false)}
      >
        <div className={cn(
          "w-8 h-8 rounded-xl border flex items-center justify-center text-sm",
          isDark ? "bg-black border-white/10 text-emerald-400" : "bg-zinc-50 border-zinc-200 text-emerald-600"
        )}>
          <FaStickyNote />
        </div>
        <div>
          <h4 className="text-xs font-sans font-medium">{topicTitle} Notes</h4>
          <span className="text-[10px] text-emerald-500 font-mono">Click to expand</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={cn(
            "ml-2 p-1 rounded-lg transition-colors",
            isDark ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-zinc-900"
          )}
        >
          <FaTimes className="text-xs" />
        </button>
      </div>
    );
  }

  // Content Body
  const modalBody = (
    <div className="flex flex-col h-full space-y-4 font-sans">
      {/* Topic Note Switcher / Creator Header */}
      <div className={cn(
        "flex items-center justify-between gap-3 p-3 rounded-2xl border backdrop-blur-md",
        isDark ? "bg-black/60 border-white/10" : "bg-zinc-50 border-zinc-200"
      )}>
        <div className="flex items-center gap-2 overflow-x-auto">
          {topicNotes.map((n) => (
            <button
              key={n._id}
              onClick={() => setActiveNoteId(n._id)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-sans transition-all whitespace-nowrap font-medium",
                activeNoteId === n._id
                  ? "bg-emerald-500 text-white shadow-sm"
                  : isDark
                    ? "bg-black border border-white/10 text-zinc-400 hover:text-white"
                    : "bg-white border border-zinc-200 text-zinc-700 hover:text-zinc-900"
              )}
            >
              {n.title}
            </button>
          ))}
        </div>

        <button
          onClick={handleCreateTopicNote}
          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors shadow-sm"
        >
          <FaPlus className="text-[10px]" /> + New Note
        </button>
      </div>

      {/* Main Note Editor inside Modal */}
      {activeNote ? (
        <div className="flex-1 min-h-[420px]">
          <NoteEditor
            key={activeNote._id}
            note={activeNote}
            folders={folders}
            onSaveNote={handleSaveNote}
            onDeleteNote={handleDeleteNote}
            onUploadImage={handleUploadImage}
          />
        </div>
      ) : (
        <div className={cn(
          "py-16 text-center rounded-3xl border p-8 font-sans space-y-3",
          isDark ? "bg-black/40 border-white/10" : "bg-zinc-50 border-zinc-200"
        )}>
          <div className={cn(
            "w-14 h-14 rounded-2xl border flex items-center justify-center text-2xl mx-auto shadow-sm",
            isDark ? "bg-black border-white/10 text-emerald-400" : "bg-white border-zinc-200 text-emerald-600"
          )}>
            <FaStickyNote />
          </div>
          <h3 className="text-lg font-sans tracking-tight">No Notes for {topicTitle}</h3>
          <p className={cn("text-xs max-w-xs mx-auto font-sans leading-relaxed", isDark ? "text-zinc-400" : "text-zinc-600")}>
            Create a personal note to write explanations, Qiskit code snippets, and ideas for this topic.
          </p>
          <button
            onClick={handleCreateTopicNote}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-medium shadow transition-colors"
          >
            + Create Note for {topicTitle}
          </button>
        </div>
      )}
    </div>
  );

  // Floating Mode Render
  if (isFloating) {
    return (
      <div
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        className={cn(
          "fixed z-[60] w-[640px] max-w-[92vw] h-[580px] border shadow-2xl rounded-3xl p-5 flex flex-col font-sans backdrop-blur-xl animate-fade-in",
          isDark ? "bg-zinc-950/95 border-white/10 text-white" : "bg-white/95 border-zinc-200 text-zinc-900"
        )}
      >
        {/* Draggable Header */}
        <div
          onMouseDown={handleMouseDown}
          className={cn(
            "flex items-center justify-between cursor-move pb-3 border-b mb-4 select-none",
            isDark ? "border-white/10" : "border-zinc-200"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "w-8 h-8 rounded-xl border flex items-center justify-center text-sm shadow-sm",
              isDark ? "bg-black border-white/10 text-emerald-400" : "bg-zinc-50 border-zinc-200 text-emerald-600"
            )}>
              <FaStickyNote />
            </div>
            <div>
              <h3 className="text-sm font-sans font-medium">{topicTitle} Notes</h3>
              <span className="text-[10px] text-emerald-500 font-mono">Floating Draggable Window</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className={cn(
                "p-1.5 rounded-lg border transition-colors",
                isDark ? "bg-black border-white/10 text-zinc-400 hover:text-white" : "bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900"
              )}
              title="Minimize Window"
            >
              <FaMinus />
            </button>
            <button
              onClick={() => setIsFloating(false)}
              className={cn(
                "p-1.5 rounded-lg border transition-colors",
                isDark ? "bg-black border-white/10 text-emerald-400 hover:text-emerald-300" : "bg-zinc-100 border-zinc-200 text-emerald-600 hover:text-emerald-700"
              )}
              title="Dock as Modal"
            >
              <FaCompressAlt />
            </button>
            <button
              onClick={onClose}
              className={cn(
                "p-1.5 rounded-lg border transition-colors",
                isDark ? "bg-black border-white/10 text-zinc-400 hover:text-red-400" : "bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-red-600"
              )}
              title="Close Notes"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">{modalBody}</div>
      </div>
    );
  }

  // Standard Center Modal Mode Render
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in font-sans">
      <div className={cn(
        "relative w-full max-w-4xl max-h-[90vh] border rounded-[2rem] p-6 sm:p-8 shadow-none flex flex-col overflow-y-auto font-sans",
        isDark ? "bg-zinc-950/95 border-white/10 text-white" : "bg-white/95 border-zinc-200 text-zinc-900"
      )}>
        {/* Modal Header */}
        <div className={cn(
          "flex items-center justify-between pb-4 border-b mb-4",
          isDark ? "border-white/10" : "border-zinc-200"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-2xl border flex items-center justify-center text-lg shadow-sm",
              isDark ? "bg-black border-white/10 text-emerald-400" : "bg-zinc-50 border-zinc-200 text-emerald-600"
            )}>
              <FaStickyNote />
            </div>
            <div>
              <h2 className="text-xl font-sans tracking-tight">{topicTitle} Notes</h2>
              <span className="text-[10px] font-mono text-emerald-500 uppercase font-semibold">Personal Topic Notebook</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFloating(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
              title="Pop out as floating draggable window"
            >
              <FaExpandAlt className="text-xs" /> Pop Out Window
            </button>
            <button
              onClick={onClose}
              className={cn(
                "w-9 h-9 rounded-full border flex items-center justify-center transition-colors",
                isDark ? "bg-black border-white/10 text-zinc-400 hover:text-white" : "bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900"
              )}
            >
              <FaTimes className="text-sm" />
            </button>
          </div>
        </div>

        {modalBody}
      </div>
    </div>
  );
};

