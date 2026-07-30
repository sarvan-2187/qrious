import React, { useState } from 'react';
import type { NoteFolder } from '../types/note.types';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { FaFolder, FaFolderOpen, FaPlus, FaTrash, FaSearch, FaRegFileAlt } from 'react-icons/fa';

interface FolderTreeProps {
  folders: NoteFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string, color: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalNotesCount: number;
}

export const FolderTree: React.FC<FolderTreeProps> = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  searchQuery,
  onSearchChange,
  totalNotesCount
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#10b981');
  const [loading, setLoading] = useState(false);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      setLoading(true);
      await onCreateFolder(newFolderName.trim(), newFolderColor);
      setNewFolderName('');
      setIsCreating(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn(
      "w-full border rounded-3xl p-4 sm:p-6 font-sans flex flex-col gap-4 shadow-sm backdrop-blur-xl transition-all duration-300",
      isDark ? "bg-zinc-950/50 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
    )}>
      {/* Search Bar */}
      <div className="relative">
        <FaSearch className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 text-xs", isDark ? "text-zinc-500" : "text-zinc-400")} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search quantum notes..."
          className={cn(
            "w-full pl-9 pr-3 py-2 border rounded-xl text-xs outline-none transition-colors font-sans",
            isDark
              ? "bg-black border-white/10 text-white focus:border-emerald-500 placeholder:text-zinc-600"
              : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-emerald-500 placeholder:text-zinc-400"
          )}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <span className={cn("text-xs font-mono uppercase font-semibold", isDark ? "text-zinc-500" : "text-zinc-400")}>
          Folders & Notebooks
        </span>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="text-xs font-sans font-medium text-emerald-500 hover:text-emerald-600 flex items-center gap-1 transition-colors"
        >
          <FaPlus className="text-[10px]" /> <span className="text-[11px] font-medium font-sans">New</span>
        </button>
      </div>

      {/* Inline Create Folder Form */}
      {isCreating && (
        <form onSubmit={handleCreateSubmit} className={cn(
          "p-3 rounded-2xl border space-y-2",
          isDark ? "bg-black border-emerald-500/40" : "bg-zinc-50 border-emerald-500/30"
        )}>
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name (e.g. Entanglement)"
            autoFocus
            className={cn(
              "w-full border text-xs p-2 rounded-xl outline-none font-sans",
              isDark ? "bg-zinc-950 border-white/10 text-white focus:border-emerald-500" : "bg-white border-zinc-200 text-zinc-900 focus:border-emerald-500"
            )}
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {['#10b981', '#06b6d4', '#a855f7', '#f59e0b', '#ec4899'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewFolderColor(c)}
                  className={`w-5 h-5 rounded-full border ${newFolderColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className={cn("text-xs font-sans", isDark ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-600 hover:text-zinc-900")}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !newFolderName.trim()}
                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Folders Navigation List */}
      <div className="space-y-1 overflow-y-auto max-h-72">
        {/* All Notes */}
        <button
          type="button"
          onClick={() => onSelectFolder(null)}
          className={cn(
            "w-full p-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition-colors",
            selectedFolderId === null
              ? "bg-emerald-500 text-white shadow-sm"
              : isDark
                ? "hover:bg-white/5 text-zinc-400 hover:text-white"
                : "hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900"
          )}
        >
          <div className="flex items-center gap-2.5">
            <FaRegFileAlt className={selectedFolderId === null ? "text-white" : "text-emerald-500"} />
            <span>All Notes</span>
          </div>
          <span className={cn(
            "text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold",
            selectedFolderId === null
              ? "bg-white/20 text-white"
              : isDark
                ? "bg-black border border-white/10 text-zinc-400"
                : "bg-zinc-100 border border-zinc-200 text-zinc-600"
          )}>
            {totalNotesCount}
          </span>
        </button>

        {/* Custom Folders */}
        {folders.map((folder) => {
          const isSelected = selectedFolderId === folder._id;
          return (
            <div
              key={folder._id}
              onClick={() => onSelectFolder(folder._id)}
              className={cn(
                "group w-full p-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer",
                isSelected
                  ? "bg-emerald-500 text-white shadow-sm"
                  : isDark
                    ? "hover:bg-white/5 text-zinc-400 hover:text-white"
                    : "hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900"
              )}
            >
              <div className="flex items-center gap-2.5 truncate mr-2">
                {isSelected ? (
                  <FaFolderOpen className="text-white" />
                ) : (
                  <FaFolder style={{ color: folder.color || '#10b981' }} />
                )}
                <span className="truncate">{folder.name}</span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFolder(folder._id);
                }}
                className={cn(
                  "opacity-0 group-hover:opacity-100 p-1 transition-opacity hover:text-red-500",
                  isSelected ? "text-white/80" : "text-zinc-500"
                )}
                title="Delete folder (notes remain saved)"
              >
                <FaTrash className="text-[10px]" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

