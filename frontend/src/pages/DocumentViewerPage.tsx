import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DocumentViewer } from '../components/DocumentViewer';
import { getResource, getViewUrl, getDownloadUrl } from '../api/resources';
import type { Resource } from '../api/resources';
import { FaArrowLeft, FaDownload } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function DocumentViewerPage() {
  const { id } = useParams<{ id: string }>();
  const [resource, setResource] = useState<Resource | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const loadData = async () => {
      try {
        const res = await getResource(id);
        setResource(res);
        const { view_url } = await getViewUrl(id);
        setViewUrl(view_url);
      } catch (err: any) {
        setError(err.message || "Failed to load document");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [id]);

  const handleDownload = async () => {
    if (!resource) return;
    try {
      setDownloading(true);
      const { download_url } = await getDownloadUrl(resource.resource_id);
      const a = document.createElement('a');
      a.href = download_url;
      a.download = resource.filename;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Failed to download resource: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !resource || !viewUrl) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-destructive mb-4">Error Loading Document</h2>
        <p className="text-muted-foreground">{error || "Document not found"}</p>
        <Link to="/dashboard" className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-md">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Sleek Top Bar */}
      <div className="flex items-center px-6 py-4 bg-card shrink-0 shadow-sm z-10">
        <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors mr-6">
          <FaArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">{resource.title}</h1>
          <p className="text-sm text-muted-foreground">{resource.description}</p>
        </div>
        
        <div className="ml-auto flex items-center gap-6">
          <Button 
            onClick={handleDownload} 
            disabled={downloading}
            className="hidden sm:flex"
          >
            {downloading ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
              <FaDownload className="mr-2" />
            )}
            Download PDF
          </Button>
          
          <Link to="/" className="flex items-center gap-3 text-lg font-sans text-foreground/50 hover:text-foreground transition-colors border-l border-border pl-6">
            <img src="/apple-touch-icon.png" alt="Qrious Logo" className="w-6 h-6 rounded-full grayscale opacity-70" />
            Qrious
          </Link>
        </div>
      </div>
      <Separator />

      {/* Main Document Area */}
      <div className="flex-1 overflow-hidden bg-muted/30">
        <DocumentViewer fileUrl={viewUrl} />
      </div>
    </div>
  );
}
