import React, { useState } from 'react';
import { FaTimes, FaCalendarAlt } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';

interface ScheduleReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: string) => void;
  itemName: string;
}

export const ScheduleReviewModal: React.FC<ScheduleReviewModalProps> = ({ isOpen, onClose, onConfirm, itemName }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // Default to today
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<string>(today.toISOString().split('T')[0]);

  if (!isOpen) return null;

  // Calculate min and max dates (today to +7 days)
  const minDate = new Date();
  const minDateString = minDate.toISOString().split('T')[0];

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 7);
  const maxDateString = maxDate.toISOString().split('T')[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(selectedDate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={cn(
        "relative w-full max-w-sm rounded-2xl shadow-2xl p-6 border flex flex-col animate-in fade-in zoom-in-95 duration-200",
        isDark ? "bg-zinc-950 border-white/10" : "bg-white border-zinc-200"
      )}>
        <button
          onClick={onClose}
          className={cn(
            "absolute top-4 right-4 p-2 rounded-full transition-colors",
            isDark ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
          )}
        >
          <FaTimes />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className={cn("p-2.5 rounded-xl", isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-600")}>
            <FaCalendarAlt className="text-xl" />
          </div>
          <h2 className={cn("text-lg font-bold font-sans", isDark ? "text-white" : "text-zinc-900")}>Schedule Review</h2>
        </div>

        <p className={cn("text-sm mb-6", isDark ? "text-zinc-400" : "text-zinc-600")}>
          When would you like to review <strong>{itemName}</strong>? We will remind you when you log in.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-zinc-400")}>
              Select Date (up to 7 days)
            </label>
            <input
              type="date"
              required
              min={minDateString}
              max={maxDateString}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ colorScheme: isDark ? 'dark' : 'light' }}
              className={cn(
                "w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-mono",
                "[&::-webkit-calendar-picker-indicator]:cursor-pointer hover:[&::-webkit-calendar-picker-indicator]:opacity-100",
                isDark 
                  ? "bg-zinc-900 border-white/10 text-white [&::-webkit-calendar-picker-indicator]:opacity-70" 
                  : "bg-zinc-50 border-zinc-200 text-zinc-900 [&::-webkit-calendar-picker-indicator]:opacity-50"
              )}
            />
          </div>

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border",
                isDark 
                  ? "bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-800" 
                  : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
            >
              Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
