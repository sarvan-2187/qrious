import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchFolders,
  createFolder,
  deleteFolder,
  fetchNotes,
  createNote,
  updateNote,
  deleteNote,
  uploadAttachment
} from '../api';
import type { Note, NoteFolder, CreateNotePayload } from '../types/note.types';
import { NoteEditor, EmptyNoteEditorState } from '../components/NoteEditor';
import {
  FaPlus,
  FaSearch,
  FaFolder,
  FaTrash,
  FaTimes,
  FaClock
} from 'react-icons/fa';
import { toast } from 'sonner';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export const NotesPage: React.FC = () => {
  const { theme } = useTheme();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // Folder modal state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#10b981');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Query 1: Folders
  const { data: foldersData, refetch: refetchFolders } = useQuery({
    queryKey: ['note-folders'],
    queryFn: fetchFolders
  });

  // Query 2: Notes
  const { data: notesData, isLoading: isNotesLoading, refetch: refetchNotes } = useQuery({
    queryKey: ['notes-list', searchQuery],
    queryFn: () => fetchNotes(undefined, undefined, searchQuery)
  });

  const folders: NoteFolder[] = foldersData?.data || [];
  const allNotes: Note[] = notesData?.data || [];
  const uncategorizedNotes = allNotes.filter((n) => !n.folder_id);

  // Auto-select first folder
  useEffect(() => {
    if (!selectedFolderId) {
      if (folders.length > 0) setSelectedFolderId(folders[0]._id);
      else if (uncategorizedNotes.length > 0) setSelectedFolderId('uncategorized');
    }
  }, [folders, uncategorizedNotes.length, selectedFolderId]);

  const displayedNotes = selectedFolderId === 'uncategorized' 
    ? uncategorizedNotes 
    : allNotes.filter((n) => n.folder_id === selectedFolderId);

  // Automatically select first note in the current folder
  useEffect(() => {
    if (displayedNotes.length > 0 && !displayedNotes.some(n => n._id === activeNoteId)) {
      setActiveNoteId(displayedNotes[0]._id);
    } else if (displayedNotes.length === 0) {
      setActiveNoteId(null);
    }
  }, [displayedNotes, activeNoteId]);

  const activeNote = allNotes.find((n) => n._id === activeNoteId) || null;

  // Handlers
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      setIsCreatingFolder(true);
      await createFolder({ name: newFolderName.trim(), color: newFolderColor });
      toast.success('Folder created!');
      setNewFolderName('');
      setIsFolderModalOpen(false);
      refetchFolders();
    } catch (err: any) {
      toast.error('Failed to create folder.');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    await deleteFolder(folderId);
    toast.success('Folder deleted. Contained notes remain in All Notes.');
    if (selectedFolderId === folderId) setSelectedFolderId(null);
    refetchFolders();
    refetchNotes();
  };

  const handleCreateNote = async () => {
    if (!selectedFolderId && selectedFolderId !== 'uncategorized' && folders.length === 0) {
      toast.error('Please create a folder first.');
      return;
    }
    try {
      const payload: CreateNotePayload = {
        title: 'Untitled Quantum Note',
        content_markdown: '# Untitled Quantum Note\n\nStart typing your quantum study notes here...',
        folder_id: selectedFolderId === 'uncategorized' ? undefined : (selectedFolderId || undefined),
        tags: ['quantum']
      };
      const res = await createNote(payload);
      toast.success('New note created!');
      refetchNotes();
      if (res.data?._id) {
        setActiveNoteId(res.data._id);
      }
    } catch (err: any) {
      toast.error('Failed to create new note.');
    }
  };

  const handleUpdateNote = async (updatedPayload: Partial<Note>) => {
    if (!activeNoteId) return;
    try {
      await updateNote(activeNoteId, updatedPayload);
      refetchNotes();
    } catch (err: any) {
      console.error(err);
      toast.error('Autosave failed.');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      toast.success('Note deleted.');
      if (activeNoteId === noteId) {
        setActiveNoteId(null);
      }
      refetchNotes();
    } catch (err: any) {
      toast.error('Failed to delete note.');
    }
  };

  const handleUploadImage = async (file: File): Promise<string> => {
    if (!activeNoteId) throw new Error('No active note selected');
    const res = await uploadAttachment(file);
    return res.data.url;
  };

  return (
    <div className={cn(
      "w-full h-full transition-colors duration-300 py-12 px-6 md:px-12",
      theme === 'dark' ? "text-white" : "text-zinc-900"
    )}>
      <div className="max-w-[1600px] mx-auto flex flex-col gap-12">
        {/* Header Hero Section §1.2 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-4 max-w-3xl">
            <motion.h1
              className="text-4xl md:text-5xl font-sans tracking-tight font-normal"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Personal Quantum Notes
            </motion.h1>
            <motion.p
              className={cn("text-lg", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Organize your quantum research, circuit observations, and study notes in one place.
            </motion.p>
          </div>
        </div>

        {/* Master-Detail 2-Panel Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDEBAR (4 Cols): Search -> Folders -> Notes List -> Create Note Button */}
          <div className={cn(
            "lg:col-span-4 p-6 rounded-[2rem] border overflow-hidden transition-all duration-300 flex flex-col gap-6 shadow-sm",
            theme === 'dark' ? "bg-zinc-950/50 border-white/10" : "bg-white border-zinc-200"
          )}>
            
            {/* 1. Search Quantum Notes (TOP) */}
            <div>
              <label className={cn("block text-[11px] font-mono font-semibold uppercase tracking-wider mb-2", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
                Search Quantum Notes
              </label>
              <div className="relative">
                <FaSearch className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 text-xs", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search titles, tags, or content..."
                  className={cn(
                    "w-full pl-9 pr-8 py-2.5 border rounded-xl text-xs outline-none transition-colors font-sans",
                    theme === 'dark'
                      ? "bg-black border-white/10 text-white focus:border-emerald-500 placeholder:text-zinc-600"
                      : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-emerald-500 placeholder:text-zinc-400"
                  )}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className={cn("absolute right-3 top-1/2 -translate-y-1/2", theme === 'dark' ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-400 hover:text-zinc-600")}
                  >
                    <FaTimes className="text-xs" />
                  </button>
                )}
              </div>
            </div>

            {/* 2. Folders & Notebooks Selector Filter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={cn("text-[11px] font-mono font-semibold uppercase tracking-wider", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
                  Folders & Notebooks
                </span>
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(true)}
                  className="text-[11px] font-sans font-medium text-emerald-500 hover:text-emerald-600 flex items-center gap-1"
                >
                  <FaPlus className="text-[9px]" /> New Folder
                </button>
              </div>

              {/* Folder Pills Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {uncategorizedNotes.length > 0 && (
                  <button
                    onClick={() => setSelectedFolderId('uncategorized')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium font-sans whitespace-nowrap transition-colors flex items-center gap-1.5",
                      selectedFolderId === 'uncategorized'
                        ? "bg-emerald-500 text-white shadow-sm"
                        : theme === 'dark'
                          ? "bg-black border border-white/10 text-zinc-400 hover:text-white"
                          : "bg-zinc-100 border border-zinc-200 text-zinc-700 hover:text-zinc-900"
                    )}
                  >
                    <FaFolder className="text-[11px]" style={{ color: '#9ca3af' }} />
                    <span>Uncategorized</span>
                  </button>
                )}

                {folders.map((f) => (
                  <div 
                    key={f._id} 
                    className={cn(
                      "relative group shrink-0 flex items-center rounded-lg text-xs font-medium font-sans whitespace-nowrap transition-colors",
                      selectedFolderId === f._id
                        ? "bg-emerald-500 text-white shadow-sm"
                        : theme === 'dark'
                          ? "bg-black border border-white/10 text-zinc-400 hover:text-white"
                          : "bg-zinc-100 border border-zinc-200 text-zinc-700 hover:text-zinc-900"
                    )}
                  >
                    <button
                      onClick={() => setSelectedFolderId(f._id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-l-lg"
                    >
                      <FaFolder style={{ color: f.color || '#10b981' }} className="text-[11px]" />
                      <span>{f.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(f._id);
                      }}
                      className={cn(
                        "opacity-0 group-hover:opacity-100 transition-opacity p-1.5 pl-0 pr-2.5",
                        selectedFolderId === f._id ? "text-white/80 hover:text-white" : "text-zinc-500 hover:text-red-500"
                      )}
                      title="Delete folder"
                    >
                      <FaTimes className="text-[9px]" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Notes List (MIDDLE) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className={cn("text-[11px] font-mono font-semibold uppercase tracking-wider", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
                  Notes List ({displayedNotes.length})
                </span>
              </div>

              <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                {isNotesLoading ? (
                  <div className={cn("py-12 text-center text-xs font-mono", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
                    Loading notes...
                  </div>
                ) : displayedNotes.length === 0 ? (
                  <div className={cn("py-10 text-center rounded-2xl border p-4", theme === 'dark' ? "bg-black/40 border-white/10" : "bg-zinc-50 border-zinc-200")}>
                    <p className={cn("text-xs font-sans", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>No notes match your search or folder filter.</p>
                  </div>
                ) : (
                  displayedNotes.map((n) => {
                    const isActive = activeNoteId === n._id;
                    const folderMatch = folders.find((f) => f._id === n.folder_id);
                    return (
                      <div
                        key={n._id}
                        onClick={() => setActiveNoteId(n._id)}
                        className={cn(
                          "group p-4 rounded-2xl border transition-all cursor-pointer relative",
                          isActive
                            ? theme === 'dark'
                              ? "bg-white/10 border-emerald-500/50 text-white"
                              : "bg-zinc-100 border-emerald-500/40 text-zinc-900 shadow-sm"
                            : theme === 'dark'
                              ? "bg-black/40 border-white/5 hover:border-white/10 text-zinc-400 hover:text-zinc-200"
                              : "bg-zinc-50 border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:text-zinc-900"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <h4 className="text-xs truncate font-sans flex items-center gap-2">
                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                            {n.title}
                          </h4>
                          {folderMatch && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center gap-1 shrink-0">
                              <FaFolder className="text-[9px]" style={{ color: folderMatch.color }} />
                              {folderMatch.name}
                            </span>
                          )}
                        </div>

                        <p className={cn("text-[11px] font-sans line-clamp-2 leading-relaxed mb-2", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
                          {n.content_markdown?.replace(/[#*`$]/g, '') || 'Empty note content...'}
                        </p>

                        <div className={cn("flex items-center justify-between text-[10px] font-mono", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
                          <span className="flex items-center gap-1">
                            <FaClock className="text-[9px]" />
                            {new Date(n.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNote(n._id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-500 transition-opacity p-1"
                            title="Delete Note"
                          >
                            <FaTrash className="text-[10px]" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 4. Creating New Note Button (BELOW NOTES LIST) */}
            <div className={cn("pt-4 border-t", theme === 'dark' ? "border-white/10" : "border-zinc-200")}>
              <button
                onClick={handleCreateNote}
                className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-sans font-medium text-xs transition-colors flex items-center justify-center gap-2 shadow"
              >
                <FaPlus className="text-xs" /> Create New Note
              </button>
            </div>

          </div>

          {/* RIGHT WORKSPACE (8 Cols): Sleek Note Editor */}
          <div className="lg:col-span-8 min-h-[640px] flex flex-col">
            {activeNote ? (
              <NoteEditor
                key={activeNote._id}
                note={activeNote}
                folders={folders}
                onSaveNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
                onUploadImage={handleUploadImage}
              />
            ) : (
              <EmptyNoteEditorState onCreateNote={handleCreateNote} />
            )}
          </div>
        </div>
      </div>

      {/* Modal: New Folder Creation */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
          <div className={cn(
            "relative w-full max-w-sm border rounded-[2rem] p-6 shadow-2xl space-y-4 font-sans",
            theme === 'dark' ? "bg-zinc-950 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
          )}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-sans tracking-tight flex items-center gap-2">
                <FaFolder className="text-emerald-500" /> Create New Folder
              </h3>
              <button onClick={() => setIsFolderModalOpen(false)} className={theme === 'dark' ? "text-zinc-500 hover:text-white" : "text-zinc-400 hover:text-zinc-900"}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className={cn("block text-xs font-mono uppercase mb-1", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>Folder Name</label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Quantum Algorithms"
                  className={cn(
                    "w-full px-3 py-2 border rounded-lg text-xs outline-none font-sans",
                    theme === 'dark' ? "bg-black border-white/10 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"
                  )}
                />
              </div>

              <div>
                <label className={cn("block text-xs font-mono uppercase mb-1", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>Badge Color Accent</label>
                <input
                  type="color"
                  value={newFolderColor}
                  onChange={(e) => setNewFolderColor(e.target.value)}
                  className="w-full h-10 rounded-lg cursor-pointer bg-transparent border-0"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className={cn("px-4 py-2 rounded-lg text-xs font-medium", theme === 'dark' ? "bg-white/10 text-zinc-300" : "bg-zinc-100 text-zinc-700")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFolder}
                  className="px-5 py-2 bg-emerald-500 text-white rounded-lg shadow hover:bg-emerald-600 text-xs font-medium transition-colors"
                >
                  {isCreatingFolder ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
