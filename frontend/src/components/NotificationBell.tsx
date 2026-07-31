import React, { useState, useEffect, useRef } from 'react';
import { FaBell, FaCheck, FaArrowRight, FaBroadcastTower } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { apiClient as api } from '@/lib/apiClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { fetchLiveSessionNotifications, type LiveSessionNotification } from '@/api/liveSessions';

interface ReviewItem {
  _id: string;
  target_id: string;
  target_type: string;
  title: string;
  next_review: string;
}

// Live sessions poll on an interval (not just on mount, unlike review
// reminders) since "your class just went live" is time-sensitive — a student
// sitting on the dashboard should see it without needing to reload the page.
const LIVE_SESSION_POLL_MS = 25_000;
const DISMISSED_LIVE_SESSIONS_KEY = 'dismissedLiveSessionsV1';

export const NotificationBell: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [dueReviews, setDueReviews] = useState<ReviewItem[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSessionNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    const dismissedKeyFor = (item: LiveSessionNotification) => `${item._id}_${item.started_at}`;

    const fetchLiveSessions = async () => {
      try {
        const items = await fetchLiveSessionNotifications();
        const dismissedStr = localStorage.getItem(DISMISSED_LIVE_SESSIONS_KEY) || '[]';
        let dismissedIds: string[] = [];
        try {
          dismissedIds = JSON.parse(dismissedStr);
        } catch (e) {}
        setLiveSessions(items.filter((item) => !dismissedIds.includes(dismissedKeyFor(item))));
      } catch (error) {
        console.error("Failed to fetch live session notifications", error);
      }
    };

    fetchLiveSessions();
    const intervalId = setInterval(fetchLiveSessions, LIVE_SESSION_POLL_MS);
    return () => clearInterval(intervalId);
  }, [currentUser]);

  useEffect(() => {
    const fetchDueReviews = async () => {
      if (!currentUser) return;
      
      try {
        const res = await api.get('/api/v1/reviews/due');
        const items = res.data?.data || [];
        
        // Filter out dismissed items from localStorage
        const dismissedStr = localStorage.getItem('dismissedReviewsV2') || '[]';
        let dismissedIds: string[] = [];
        try {
          dismissedIds = JSON.parse(dismissedStr);
        } catch(e) {}
        
        const filtered = items.filter((item: ReviewItem) => {
          const uniqueKey = `${item._id}_${item.next_review}`;
          return !dismissedIds.includes(uniqueKey);
        });
        setDueReviews(filtered);
      } catch (error) {
        console.error("Failed to fetch due reviews", error);
      }
    };
    fetchDueReviews();

    // Listen for manual reviews being added to update instantly
    const handleRefresh = () => fetchDueReviews();
    window.addEventListener('review_marked', handleRefresh);
    return () => window.removeEventListener('review_marked', handleRefresh);
  }, [currentUser]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = (item: ReviewItem, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Save to local storage
    const dismissedStr = localStorage.getItem('dismissedReviewsV2') || '[]';
    let dismissedIds: string[] = [];
    try {
      dismissedIds = JSON.parse(dismissedStr);
    } catch(e) {}
    
    const uniqueKey = `${item._id}_${item.next_review}`;
    if (!dismissedIds.includes(uniqueKey)) {
      dismissedIds.push(uniqueKey);
    }
    localStorage.setItem('dismissedReviewsV2', JSON.stringify(dismissedIds));
    
    // Remove from UI
    setDueReviews(prev => prev.filter(r => r._id !== item._id));
  };

  const handleDismissLiveSession = (item: LiveSessionNotification, e: React.MouseEvent) => {
    e.stopPropagation();

    const dismissedStr = localStorage.getItem(DISMISSED_LIVE_SESSIONS_KEY) || '[]';
    let dismissedIds: string[] = [];
    try {
      dismissedIds = JSON.parse(dismissedStr);
    } catch (e) {}

    const uniqueKey = `${item._id}_${item.started_at}`;
    if (!dismissedIds.includes(uniqueKey)) {
      dismissedIds.push(uniqueKey);
    }
    localStorage.setItem(DISMISSED_LIVE_SESSIONS_KEY, JSON.stringify(dismissedIds));

    setLiveSessions(prev => prev.filter(s => s._id !== item._id));
  };

  const handleJoinLiveSession = (item: LiveSessionNotification) => {
    setIsOpen(false);
    navigate(`/live/${item._id}`);
  };

  const handleGoToCourse = (item: ReviewItem) => {
    setIsOpen(false);
    if (item.target_type === 'roadmap') {
      navigate(`/roadmap?topic=${item.target_id}`); 
    } else if (item.target_type === 'algorithm') {
      navigate(`/algorithms/${item.target_id}`);
    } else {
      navigate('/roadmap');
    }
  };

  const hasUnread = dueReviews.length > 0 || liveSessions.length > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 shadow-sm border",
          theme === 'dark' 
            ? "bg-zinc-900/60 border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-900" 
            : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
        )}
      >
        <FaBell className="text-sm" />
        {hasUnread && (
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background" />
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className={cn(
          "absolute right-0 mt-2 w-80 rounded-xl shadow-xl border overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200",
          theme === 'dark' ? "bg-zinc-950 border-white/10" : "bg-white border-zinc-200"
        )}>
          <div className={cn(
            "px-4 py-3 border-b text-sm font-semibold font-sans",
            theme === 'dark' ? "border-white/10 text-white" : "border-zinc-200 text-zinc-900"
          )}>
            Notifications
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {!hasUnread ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500 font-sans">
                No new notifications
              </div>
            ) : (
              <div className="flex flex-col">
                {liveSessions.map(item => (
                  <div
                    key={item._id}
                    className={cn(
                      "px-4 py-3 border-b last:border-b-0 hover:bg-zinc-100/5 transition-colors group cursor-pointer",
                      theme === 'dark' ? "border-white/5 bg-red-500/[0.03]" : "border-zinc-100 hover:bg-zinc-50 bg-red-50/40"
                    )}
                    onClick={() => handleJoinLiveSession(item)}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                          </span>
                          <span className="text-[10px] font-mono font-bold text-red-500 uppercase tracking-wider">Live Now</span>
                        </div>
                        <p className={cn("text-sm font-medium mb-0.5 font-sans", theme === 'dark' ? "text-zinc-200" : "text-zinc-800")}>
                          {item.title}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-mono">
                          {item.course_title}
                        </p>
                      </div>
                      <FaBroadcastTower className="text-red-500 text-sm shrink-0 mt-0.5" />
                    </div>
                    <div className="flex justify-end gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleDismissLiveSession(item, e)}
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-zinc-200/50 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 transition-colors"
                      >
                        <FaCheck /> Dismiss
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleJoinLiveSession(item); }}
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                      >
                        Join Now <FaArrowRight className="text-[9px]" />
                      </button>
                    </div>
                  </div>
                ))}
                {dueReviews.map(item => (
                  <div 
                    key={item._id} 
                    className={cn(
                      "px-4 py-3 border-b last:border-b-0 hover:bg-zinc-100/5 transition-colors group cursor-pointer",
                      theme === 'dark' ? "border-white/5" : "border-zinc-100 hover:bg-zinc-50"
                    )}
                    onClick={() => handleGoToCourse(item)}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <p className={cn("text-sm font-medium mb-1 font-sans", theme === 'dark' ? "text-zinc-200" : "text-zinc-800")}>
                          Review Due: {item.title}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                          {item.target_type}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => handleMarkAsRead(item, e)}
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-zinc-200/50 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 transition-colors"
                      >
                        <FaCheck /> Mark as Read
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGoToCourse(item);
                        }}
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                      >
                        Go <FaArrowRight className="text-[9px]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
