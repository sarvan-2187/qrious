import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { VideoResourcePlayer } from '../components/VideoResourcePlayer';
import { getResource } from '../api/resources';
import type { Resource } from '../api/resources';
import { FaArrowLeft } from 'react-icons/fa';

export default function VideoPlayerPage() {
  const { id } = useParams<{ id: string }>();
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getResource(id)
      .then(res => setResource(res))
      .catch(err => setError(err.message || "Failed to load resource metadata"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <h2 className="text-2xl font-bold text-destructive mb-4">Error Loading Video</h2>
        <p className="text-white/70">{error || "Resource not found"}</p>
        <Link to="/dashboard" className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-md">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col overflow-hidden">
      {/* Sleek Dark Top Bar */}
      <div className="bg-black text-white p-4 flex items-center shadow-md z-10 relative">
        <Link to="/dashboard" className="text-white/70 hover:text-white transition-colors mr-6">
          <FaArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">{resource.title}</h1>
          <p className="text-sm text-white/50">{resource.description}</p>
        </div>
        <div className="ml-auto">
          <Link to="/" className="flex items-center gap-3 text-lg font-sans text-white opacity-50 hover:opacity-100 transition-opacity">
            <img src="/apple-touch-icon.png" alt="Qrious Logo" className="w-6 h-6 rounded-full" />
            Qrious
          </Link>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 flex flex-col items-center justify-center bg-black/95 relative w-full overflow-hidden">
        <div className="w-full max-w-[1600px] h-full flex flex-col justify-center">
          <VideoResourcePlayer resourceId={resource.resource_id} title={resource.title} />
        </div>
      </div>
    </div>
  );
}
