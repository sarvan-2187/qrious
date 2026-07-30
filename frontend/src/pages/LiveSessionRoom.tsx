import { 
  LiveKitRoom, 
  GridLayout, 
  ParticipantTile, 
  RoomAudioRenderer, 
  ControlBar, 
  useTracks,
  useChat
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { joinLiveSession, endLiveSession } from '../api/liveSessions';
import { Button } from '@/components/ui/button';
import ParticipantSidebar from '@/components/ParticipantSidebar';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'sonner';
import { AlertCircle, LogOut, AlertOctagon, Radio, MessageSquarePlus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

function CustomVideoLayout() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );
  
  // If no one is publishing yet, we can fall back to a placeholder or let the grid be empty.
  // We'll let it be empty, or we can just filter tracks to only those that are published.

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-black/95 relative">
      <div className="flex-1 min-h-0 p-3 [&_.lk-participant-name]:!text-white [&_.lk-participant-name]:!font-semibold [&_.lk-participant-name]:!drop-shadow-md">
        <GridLayout tracks={tracks} className="w-full h-full gap-3">
          <ParticipantTile />
        </GridLayout>
      </div>
      <div className="flex-none p-3 bg-card/80 backdrop-blur-md border-t border-border/50 flex justify-center z-10 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.1)]">
        <ControlBar />
      </div>
    </div>
  );
}

export default function LiveSessionRoom() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [isEducator, setIsEducator] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWindowOpen, setIsWindowOpen] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    joinLiveSession(sessionId).then((res) => {
      setToken(res.token);
      setUrl(res.livekit_url);
      setIsEducator(res.is_educator);
    }).catch(err => {
      setError(err.message || 'Failed to join session');
    });
  }, [sessionId]);

  const handleEndSession = async () => {
    if (!sessionId || !window.confirm("Are you sure you want to end this session for everyone?")) return;
    const tId = toast.loading("Ending session...");
    try {
      await endLiveSession(sessionId);
      toast.success("Session ended successfully", { id: tId });
      navigate(-1); // Go back
    } catch (err: any) {
      toast.error(err.message || "Failed to end session", { id: tId });
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-background/95 backdrop-blur-sm p-4">
        <div className="max-w-md w-full bg-card/80 backdrop-blur-xl border border-destructive/20 p-8 rounded-2xl shadow-2xl flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Connection Failed</h2>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <Button onClick={() => navigate(-1)} size="lg" className="w-full sm:w-auto font-medium">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!token || !url) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-background relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative flex flex-col items-center space-y-6 z-10">
          <div className="relative w-20 h-20">
            {/* Outer spinning ring */}
            <div className="absolute inset-0 rounded-full border-[3px] border-primary/20" />
            <div className="absolute inset-0 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
            {/* Inner pulsing orb */}
            <div className="absolute inset-0 m-auto w-12 h-12 bg-primary/20 rounded-full animate-pulse flex items-center justify-center">
              <div className="w-6 h-6 bg-primary/40 rounded-full animate-ping" />
            </div>
          </div>
          <div className="flex flex-col items-center space-y-1">
            <h3 className="text-xl font-semibold tracking-tight text-foreground">Initializing Room</h3>
            <p className="text-sm text-muted-foreground font-medium animate-pulse">Establishing secure connection...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-[100dvh] bg-background overflow-hidden font-sans" data-lk-theme={theme === 'dark' ? "default" : undefined}>
      
      {/* Premium Header */}
      <header className="flex-none h-14 bg-card/80 backdrop-blur-md flex items-center justify-between px-6 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <img src="/apple-touch-icon.png" alt="Qrious" className="w-8 h-8 rounded-full opacity-90 transition-all" />
            <span className="font-sans text-xl tracking-tight text-foreground">Qrious</span>
          </div>
          <div className="h-4 w-px bg-border mx-2"></div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <span className="text-foreground text-sm font-bold tracking-wide">Live Classroom</span>
              <div className="flex items-center gap-1.5 bg-destructive/10 border border-destructive/20 px-2 py-0.5 rounded-full">
                <Radio className="w-3 h-3 text-destructive animate-pulse" />
                <span className="text-[10px] font-bold text-destructive tracking-wider uppercase">Live</span>
              </div>
            </div>
            <span className="text-emerald-500 text-[11px] font-medium flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              End-to-End Encrypted
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all duration-300 font-medium group"
          >
            <LogOut className="w-4 h-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
            Leave Room
          </Button>
          {isEducator && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleEndSession}
              className="font-medium shadow-sm hover:shadow-destructive/25 hover:bg-destructive/90 transition-all"
            >
              <AlertOctagon className="w-4 h-4 mr-2" />
              End Session for All
            </Button>
          )}
        </div>
      </header>
      <Separator />

      {/* Main Video Area with Sidebar */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {sessionEnded && (
          <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="max-w-md w-full bg-card border border-border/50 p-8 rounded-2xl shadow-2xl flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <AlertOctagon className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Session Ended</h2>
                <p className="text-muted-foreground">The educator has ended this live session. Thank you for participating!</p>
              </div>
              <Button onClick={() => navigate(-1)} size="lg" className="w-full sm:w-auto font-medium mt-4">
                Return to Course
              </Button>
            </div>
          </div>
        )}

        <LiveKitRoom 
          serverUrl={url} 
          token={token} 
          video 
          audio 
          connect 
          className="flex-1 flex overflow-hidden w-full h-full min-h-0 relative"
          onDisconnected={() => {
            if (!sessionEnded) {
               setSessionEnded(true);
            }
          }}
        >
          <RoomLogic 
            sessionId={sessionId} 
            isEducator={isEducator} 
            isWindowOpen={isWindowOpen} 
            setIsWindowOpen={setIsWindowOpen} 
          />
        </LiveKitRoom>
      </div>
    </div>
  );
}

function RoomLogic({ sessionId, isEducator, isWindowOpen, setIsWindowOpen }: any) {
  const chatState = useChat();

  return (
    <>
      <main className="flex-1 relative min-h-0 flex flex-col h-full w-full">
        <CustomVideoLayout />
        <RoomAudioRenderer />
      </main>
      
      {/* Floating Mac Window - Keep always mounted but visually hide to maintain state if needed, though useChat is now parented! */}
      <div style={{ display: isWindowOpen ? 'block' : 'none' }}>
        <ParticipantSidebar 
          sessionId={sessionId} 
          isEducator={isEducator} 
          onClose={() => setIsWindowOpen(false)} 
          chatState={chatState}
        />
      </div>

      {/* Floating Action Button */}
      {!isWindowOpen && (
        <div className="absolute bottom-6 right-6 z-40 animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300">
          <Button
            onClick={() => setIsWindowOpen(true)}
            className="w-14 h-14 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] hover:scale-110 active:scale-95 transition-all duration-300 bg-primary hover:bg-primary/90 flex items-center justify-center p-0 relative"
          >
            <MessageSquarePlus className="w-6 h-6 text-primary-foreground" />
            {chatState.chatMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-background animate-in zoom-in shadow-sm">
                {chatState.chatMessages.length > 99 ? '99+' : chatState.chatMessages.length}
              </span>
            )}
          </Button>
        </div>
      )}
    </>
  );
}
