import React from 'react';
import { FaRobot, FaTimes, FaRegCopy } from 'react-icons/fa';
import { toast } from 'sonner';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface AiNotesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: 'summarize' | 'generate_quiz' | null;
  resultText: string | null;
  loading: boolean;
}

export const AiNotesPanel: React.FC<AiNotesPanelProps> = ({
  isOpen,
  onClose,
  actionType,
  resultText,
  loading
}) => {
  const { theme } = useTheme();

  if (!isOpen) return null;

  const handleCopy = () => {
    if (resultText) {
      navigator.clipboard.writeText(resultText);
      toast.success('Copied AI result to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in font-sans">
      <div className={cn(
        "relative w-full max-w-lg border rounded-[2rem] p-6 sm:p-8 shadow-none font-sans",
        theme === 'dark' ? "bg-zinc-950/95 border-white/10 text-white" : "bg-white/95 border-zinc-200 text-zinc-900"
      )}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className={cn(
            "absolute top-5 right-5 w-9 h-9 rounded-full border flex items-center justify-center transition-colors",
            theme === 'dark' ? "bg-black border-white/10 text-zinc-400 hover:text-white" : "bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900"
          )}
        >
          <FaTimes className="text-sm" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          {/* Icon badge §1.5 */}
          <div className={cn(
            "w-12 h-12 rounded-2xl border flex items-center justify-center shadow-sm text-lg",
            theme === 'dark' ? "bg-black border-white/10 text-emerald-400" : "bg-zinc-50 border-zinc-200 text-emerald-600"
          )}>
            <FaRobot />
          </div>
          <div>
            <h3 className="text-lg font-sans tracking-tight">
              {actionType === 'summarize' ? 'AI Note Summary' : 'Generated Quiz Questions'}
            </h3>
            <span className="text-[10px] font-mono text-emerald-500 uppercase font-semibold">Powered by Groq LLM</span>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className={cn("text-xs font-mono animate-pulse", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>Analyzing note text with quantum LLM...</p>
          </div>
        ) : resultText ? (
          <div className="space-y-4">
            <div className={cn(
              "border p-4 rounded-2xl max-h-80 overflow-y-auto font-sans text-xs leading-relaxed whitespace-pre-line",
              theme === 'dark' ? "bg-black border-white/10 text-zinc-300" : "bg-zinc-50 border-zinc-200 text-zinc-700"
            )}>
              {resultText}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={handleCopy}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors border",
                  theme === 'dark' ? "bg-white/10 border-white/10 text-zinc-300 hover:text-white" : "bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-zinc-900"
                )}
              >
                <FaRegCopy /> Copy Result
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-emerald-500 text-white rounded-lg shadow hover:bg-emerald-600 font-medium text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
