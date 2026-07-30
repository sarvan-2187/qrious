import { useParticipants, useLocalParticipant } from '@livekit/components-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, Video, VideoOff, Hand, Users, MessageSquare, Send, Settings2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { grantPublishPermission, revokePublishPermission, updateAllPermissions } from '../api/liveSessions';
import { toast } from 'sonner';
import { useState, useRef, useEffect } from 'react';

function CustomChat({ chatState }: { chatState: any }) {
  const { chatMessages, send, isSending } = chatState;
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      try {
        await send(message);
        setMessage('');
      } catch (err) {
        console.error("Failed to send message", err);
      }
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-card w-full h-full relative">
      <div className="flex-1 overflow-y-auto p-4 space-y-5 scroll-smooth" ref={scrollRef}>
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 gap-3">
            <MessageSquare className="w-10 h-10 opacity-20" />
            <p className="text-sm font-medium">No messages yet</p>
          </div>
        ) : (
          chatMessages.map((msg: any, i: number) => (
            <div key={i} className="flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-baseline gap-2 mb-1.5 ml-1">
                <span className="text-[13px] text-primary tracking-tight">
                  {msg.from?.name || msg.from?.identity}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground/70">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-[13.5px] bg-accent/60 p-3 rounded-2xl rounded-tl-sm border border-border/40 text-foreground w-fit max-w-[90%] shadow-sm leading-relaxed">
                {msg.message}
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="p-3 bg-card/80 backdrop-blur-md border-t border-border/50 relative z-10">
        <form onSubmit={handleSend} className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <Input 
              type="text" 
              placeholder="Type a message..." 
              className="w-full bg-background/50 rounded-2xl px-4 py-5 text-[13.5px] shadow-inner transition-all duration-200"
              value={message}
              onChange={e => setMessage(e.target.value)}
              disabled={isSending}
            />
          </div>
          <Button 
            type="submit" 
            disabled={isSending || !message.trim()} 
            className="rounded-full shrink-0 w-10 h-10 p-0 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 active:scale-95" 
            variant="default"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function ParticipantSidebar({ sessionId, isEducator, onClose, chatState }: { sessionId: string, isEducator: boolean, onClose: () => void, chatState: any }) {
  const participants = useParticipants().filter(p => !p.identity.startsWith('EG_'));
  const { localParticipant } = useLocalParticipant();
  const [activeTab, setActiveTab] = useState<'participants' | 'chat'>('participants');

  const handleAllowToSpeak = async (identity: string) => {
    try {
      await grantPublishPermission(sessionId, identity);
      toast.success("Permission granted");
    } catch (err: any) {
      toast.error(err.message || "Failed to grant permission");
    }
  };

  const handleRevokeToSpeak = async (identity: string) => {
    try {
      await revokePublishPermission(sessionId, identity);
      toast.success("Permission revoked");
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke permission");
    }
  };

  const handleGlobalToggle = async (allow: boolean) => {
    const tId = toast.loading(allow ? "Unmuting all students..." : "Muting all students...");
    try {
      await updateAllPermissions(sessionId, allow);
      toast.success(allow ? "All students can now speak!" : "All students muted.", { id: tId });
    } catch (err: any) {
      toast.error(err.message || "Failed to update global permissions", { id: tId });
    }
  };

  return (
    <div className="absolute inset-x-0 bottom-0 md:inset-auto md:bottom-20 md:right-6 w-full md:w-[360px] h-[50vh] md:h-[550px] max-h-[80vh] bg-card/95 backdrop-blur-2xl border border-white/10 dark:border-white/5 rounded-t-2xl md:rounded-2xl flex flex-col z-50 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in slide-in-from-bottom-8 md:zoom-in-95 duration-200">
      
      {/* Mac Window Title Bar */}
      <div className="h-12 bg-black/5 dark:bg-white/5 flex items-center px-4 shrink-0 cursor-default">
        <div className="flex gap-2 w-16">
          <button onClick={onClose} className="w-3 h-3 rounded-full bg-[#ff5f56] hover:bg-[#ff5f56]/80 flex items-center justify-center group transition-colors shadow-sm">
            <span className="opacity-0 group-hover:opacity-100 text-black/60 text-[8px] leading-none">×</span>
          </button>
          <button className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:bg-[#ffbd2e]/80 transition-colors shadow-sm"></button>
          <button className="w-3 h-3 rounded-full bg-[#27c93f] hover:bg-[#27c93f]/80 transition-colors shadow-sm"></button>
        </div>
        <div className="flex-1 text-center text-[13px] font-semibold text-foreground/70 tracking-tight">
          Qrious Controls
        </div>
        <div className="w-16"></div> {/* Spacer for centering */}
      </div>
      <Separator className="bg-border/50" />

      <div className="p-3 bg-card/50 backdrop-blur-sm z-20 flex gap-2">
        <Button 
          variant={activeTab === 'participants' ? 'default' : 'ghost'} 
          className="flex-1 rounded-full text-xs font-semibold tracking-wide"
          onClick={() => setActiveTab('participants')}
        >
          <Users className="w-3.5 h-3.5 mr-1.5" />
          Participants ({participants.length})
        </Button>
        <Button 
          variant={activeTab === 'chat' ? 'default' : 'ghost'} 
          className="flex-1 rounded-full text-xs font-semibold tracking-wide"
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
          Chat
        </Button>
      </div>
      <Separator className="bg-border/50" />
      
      {activeTab === 'participants' ? (
      <ScrollArea className="flex-1 p-3">
        {isEducator && (
          <div className="mb-4 bg-accent/30 p-3 rounded-xl border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-foreground/80 flex items-center gap-1.5 uppercase tracking-wider">
                <Settings2 className="w-3.5 h-3.5" /> Room Controls
              </span>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-[11px] h-8 bg-background shadow-sm hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30 transition-all"
                onClick={() => handleGlobalToggle(true)}
              >
                <ShieldCheck className="w-3 h-3 mr-1.5" /> Allow All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-[11px] h-8 bg-background shadow-sm hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
                onClick={() => handleGlobalToggle(false)}
              >
                <ShieldAlert className="w-3 h-3 mr-1.5" /> Mute All
              </Button>
            </div>
          </div>
        )}
        <div className="space-y-1">
          {participants.map((p) => {
            const isLocal = p.identity === localParticipant.identity;
            
            let canSpeak = false;
            try {
              if (p.metadata) {
                const meta = JSON.parse(p.metadata);
                canSpeak = !!meta.canSpeak;
              }
            } catch(e) {}
            
            return (
              <div key={p.identity} className="flex items-center justify-between group p-2 hover:bg-accent/50 rounded-xl transition-all duration-200 border border-transparent hover:border-border/50 cursor-default">
                <div className="flex items-center gap-3">
                  <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary shadow-inner border border-primary/20 group-hover:scale-105 transition-transform">
                    {p.name?.charAt(0) || p.identity.charAt(0)}
                    {isLocal && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background"></div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold leading-none group-hover:text-primary transition-colors flex items-center gap-1">
                      {p.name || p.identity}
                      {isLocal && <span className="text-muted-foreground font-normal text-xs">(You)</span>}
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-1.5 font-medium">
                      {canSpeak ? "Speaker" : "Viewer"}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                  {canSpeak ? (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5 bg-background/50 p-1.5 rounded-md border border-border/50 shadow-sm">
                        {p.isMicrophoneEnabled ? <Mic className="w-3.5 h-3.5 text-emerald-500" /> : <MicOff className="w-3.5 h-3.5 text-destructive" />}
                        {p.isCameraEnabled ? <Video className="w-3.5 h-3.5 text-emerald-500" /> : <VideoOff className="w-3.5 h-3.5 text-destructive" />}
                      </div>
                      {isEducator && !isLocal && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 w-7 p-0 flex items-center justify-center rounded-md"
                          onClick={() => handleRevokeToSpeak(p.identity)}
                          title="Revoke Mic & Screen Share"
                        >
                          <MicOff className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    isEducator && !isLocal && (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="h-7 text-[11px] px-2.5 font-medium hover:bg-primary hover:text-primary-foreground transition-colors shadow-sm"
                        onClick={() => handleAllowToSpeak(p.identity)}
                        title="Grant Mic & Screen Share"
                      >
                        <Hand className="w-3 h-3 mr-1.5" />
                        Allow
                      </Button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      ) : (
        <CustomChat chatState={chatState} />
      )}
    </div>
  );
}
