import { useState, useEffect } from 'react';
import { getDownloadUrl } from '../api/resources';

interface VideoResourcePlayerProps {
  resourceId: string;
  title: string;
  fetchUrl?: (id: string) => Promise<{ download_url: string }>;
}

export function VideoResourcePlayer({ resourceId, title, fetchUrl = getDownloadUrl }: VideoResourcePlayerProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [retried, setRetried] = useState(false);
  const [fatalError, setFatalError] = useState(false);

  useEffect(() => {
    // Reset state if resourceId changes
    setSrc(null);
    setRetried(false);
    setFatalError(false);
    
    fetchUrl(resourceId)
      .then((res) => setSrc(res.download_url))
      .catch((err) => {
        console.error("Failed to fetch initial video URL:", err);
        setFatalError(true);
      });
  }, [resourceId]);

  async function handleError() {
    if (!retried) {
      setRetried(true);
      try {
        const res = await fetchUrl(resourceId);
        setSrc(res.download_url);
      } catch (err) {
        console.error("Failed to retry fetching video URL:", err);
        setFatalError(true);
      }
    } else {
      setFatalError(true);
    }
  }

  if (fatalError) {
    return (
      <div className="w-full h-full bg-black/90 flex flex-col items-center justify-center text-white p-6 text-center rounded-xl">
        <div className="w-12 h-12 mb-4 text-destructive">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold mb-2">Video Unavailable</h3>
        <p className="text-white/70">
          We couldn't load this video. The secure link may have expired or you might be offline.
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  if (!src) {
    return (
      <div className="w-full h-full bg-black/90 flex flex-col items-center justify-center rounded-xl">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-white/70 mt-4 animate-pulse">Loading video...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black flex items-center justify-center rounded-xl overflow-hidden shadow-lg relative">
      <video 
        className="w-full h-full object-contain" 
        src={src} 
        title={title} 
        controls
        playsInline 
        crossOrigin="anonymous"
        onError={handleError}
        controlsList="nodownload"
      />
    </div>
  );
}
