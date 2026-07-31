import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getCourse, completeLesson, getCourseProgress } from '../api/courses';
import { listLiveSessions, type LiveSession, getLiveSessionDownloadUrl } from '../api/liveSessions';
import type { Course } from '../api/courses';
import { getViewUrl } from '../api/resources';
import { useAuth } from '../context/AuthContext';
import { FaArrowLeft, FaArrowRight, FaRegCircle, FaPlayCircle, FaFileAlt, FaChevronDown, FaChevronUp, FaFlask } from 'react-icons/fa';
import { Separator } from '@/components/ui/separator';
import { VideoResourcePlayer } from '../components/VideoResourcePlayer';
import { DocumentViewer } from '../components/DocumentViewer';
import { InteractiveCourseLab } from '@/components/InteractiveCourseLab';
import { Progress } from "@/components/ui/progress";
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarGroup, SidebarTrigger, SidebarInset, SidebarRail } from "@/components/ui/sidebar";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type FlatResource = {
  moduleId: string;
  moduleTitle: string;
  lessonId: string;
  lessonTitle: string;
  resourceId: string;
  resourceTitle: string;
  resourceType: string;
  description: string;
  index: number;
};

export default function CourseViewer() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();


  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<{ progress_percentage: number, completed: number, total: number } | null>(null);
  
  const [activeResourceId, setActiveResourceId] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);

  // Fetch course
  useEffect(() => {
    if (!id || !currentUser) return;

    // See CourseDetail.tsx's fetchCourse for why this guard exists —
    // StrictMode double-invokes this effect in dev, and without it a stale
    // in-flight request from a superseded mount/id change can race the
    // current one and clobber state with an outdated result.
    let cancelled = false;

    Promise.all([
      getCourse(id),
      getCourseProgress(id).catch(() => null),
      listLiveSessions(id).catch(() => [])
    ]).then(([courseData, progressData, sessions]) => {
      if (cancelled) return;
      setCourse(courseData);
      if (progressData) setProgress(progressData);
      if (courseData.format !== 'recorded') setLiveSessions(sessions);

      // Auto-expand first module
      if (courseData.modules && courseData.modules.length > 0) {
        setExpandedModules({ [courseData.modules[0].id]: true });
      }
    }).catch(err => {
      if (cancelled) return;
      setError(err.message || 'Failed to load course');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [id, currentUser]);

  // Flatten resources for easy navigation (Next/Prev)
  const flatList = useMemo(() => {
    if (!course?.modules) return [];
    const list: FlatResource[] = [];
    let idx = 0;
    for (const mod of course.modules) {
      if (!mod.lessons) continue;
      for (const les of mod.lessons) {
        if (!les.resources) continue;
        for (const res of les.resources) {
          list.push({
            moduleId: mod.id,
            moduleTitle: mod.title,
            lessonId: les.id,
            lessonTitle: les.title,
            resourceId: res.resource_id,
            resourceTitle: res.title,
            resourceType: res.resource_type,
            description: res.description,
            index: idx++
          });
        }
      }
    }
    
    // Add recorded live sessions to flatList
    if (course.format !== 'recorded') {
      const recordedSessions = liveSessions.filter(s => s.status === 'recording_ready');
      for (const s of recordedSessions) {
        list.push({
          moduleId: 'live-sessions',
          moduleTitle: 'Live Sessions',
          lessonId: s.id,
          lessonTitle: 'Live Session Recording',
          resourceId: `live-${s.id}`,
          resourceTitle: s.title,
          resourceType: 'live_session_recording',
          description: `Recorded on ${new Date(s.scheduled_at).toLocaleString()}`,
          index: idx++
        });
      }
    }
    
    return list;
  }, [course, liveSessions]);

  // Set initial active resource if not set
  useEffect(() => {
    if (flatList.length > 0 && !activeResourceId) {
      setActiveResourceId(flatList[0].resourceId);
    }
  }, [flatList, activeResourceId]);

  const activeIndex = flatList.findIndex(r => r.resourceId === activeResourceId);
  const activeResource = activeIndex >= 0 ? flatList[activeIndex] : null;

  const handleNext = () => {
    if (activeIndex >= 0 && activeIndex < flatList.length - 1) {
      setActiveResourceId(flatList[activeIndex + 1].resourceId);
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      setActiveResourceId(flatList[activeIndex - 1].resourceId);
    }
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const markLessonComplete = async (lessonId: string) => {
    const toastId = toast.loading("Marking lesson complete...");
    try {
      await completeLesson(lessonId);
      // Refresh progress
      if (id) {
        const p = await getCourseProgress(id);
        setProgress(p);
      }
      toast.success("Lesson marked complete!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark lesson complete.", { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-lg text-muted-foreground animate-pulse font-medium">Loading course viewer...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground">
        <h2 className="text-2xl font-bold text-destructive mb-4">Course Unavailable</h2>
        <p className="text-muted-foreground">{error || "Course not found"}</p>
        <Link to="/dashboard" className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-md">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isOwnerPreview = currentUser?.uid === course?.owner_uid;

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans w-full">
        
        {/* SIDEBAR */}
        <Sidebar>
          <SidebarHeader className="p-4">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 text-sm font-medium">
            <FaArrowLeft /> Back to Dashboard
          </Link>
          <h2 className="mt-4 font-bold text-xl leading-tight">{course.title}</h2>
          {progress && !isOwnerPreview && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{progress.completed} / {progress.total} items</span>
                <span>{Math.round(progress.progress_percentage)}%</span>
              </div>
              <Progress value={progress.progress_percentage} className="h-2" />
            </div>
          )}
        </SidebarHeader>
        <Separator />

        <SidebarContent className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {course.modules?.map((mod, idx) => (
             <div key={mod.id}>
             <SidebarGroup className="p-0 rounded-none">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    className="w-full text-left p-4 hover:bg-secondary transition-colors flex justify-between items-center group"
                    onClick={() => toggleModule(mod.id)}
                  >
                    <div>
                      <div className="text-xs text-primary font-bold uppercase tracking-wider">Module {idx + 1}</div>
                      <div className="font-semibold mt-1 text-[15px] group-hover:text-primary transition-colors">{mod.title}</div>
                    </div>
                    {expandedModules[mod.id] ? <FaChevronUp className="text-muted-foreground text-xs" /> : <FaChevronDown className="text-muted-foreground text-xs" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Toggle Module</TooltipContent>
              </Tooltip>
              
              {expandedModules[mod.id] && mod.lessons?.map((lesson) => (
                <div key={lesson.id} className="bg-secondary/20 pb-2">
                  <div className="px-4 py-2 text-[13px] font-bold text-muted-foreground bg-secondary/40 tracking-wide uppercase">
                    {lesson.title}
                  </div>
                  {lesson.resources?.map((res) => {
                    const isActive = activeResourceId === res.resource_id;
                    const isVideo = res.resource_type === 'video';
                    return (
                      <button
                        key={res.resource_id}
                        onClick={() => setActiveResourceId(res.resource_id)}
                        className={`w-full text-left pl-8 pr-4 py-3 flex items-start gap-3 transition-colors ${isActive ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-secondary/50 border-l-2 border-transparent'}`}
                      >
                        <div className="mt-[2px]">
                          {isVideo ? (
                            <FaPlayCircle className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                          ) : res.resource_type === 'interactive_lab' || res.resource_type === 'gates_playground' ? (
                            <FaFlask className={isActive ? 'text-emerald-500' : 'text-muted-foreground'} />
                          ) : (
                            <FaFileAlt className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm ${isActive ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                            {res.title}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 capitalize flex items-center gap-1">
                            {res.resource_type}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {(!lesson.resources || lesson.resources.length === 0) && (
                    <div className="px-8 py-3 text-xs text-muted-foreground italic">No resources</div>
                  )}
                  {!isOwnerPreview && (
                    <div className="px-8 mt-2 pb-2">
                      <button 
                        onClick={() => markLessonComplete(lesson.id)}
                        className="text-[11px] font-medium uppercase tracking-wider flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <FaRegCircle /> Mark complete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </SidebarGroup>
            <Separator />
            </div>
          ))}
          
          {course.format !== 'recorded' && liveSessions.length > 0 && (
            <SidebarGroup className="p-0 border-t-4 border-secondary mt-2 rounded-none">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    className="w-full text-left p-4 hover:bg-secondary transition-colors flex justify-between items-center group"
                    onClick={() => toggleModule('live-sessions')}
                  >
                    <div>
                      <div className="text-xs text-primary font-bold uppercase tracking-wider">Extra</div>
                      <div className="font-semibold mt-1 text-[15px] group-hover:text-primary transition-colors">Live Sessions</div>
                    </div>
                    {expandedModules['live-sessions'] ? <FaChevronUp className="text-muted-foreground text-xs" /> : <FaChevronDown className="text-muted-foreground text-xs" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Toggle Live Sessions</TooltipContent>
              </Tooltip>
              
              {expandedModules['live-sessions'] && (
                <div className="bg-secondary/10 pb-2">
                  {liveSessions.map((session) => {
                    if (session.status !== 'recording_ready') return null;
                    const resId = `live-${session.id}`;
                    const isActive = activeResourceId === resId;
                    return (
                      <button
                        key={resId}
                        onClick={() => setActiveResourceId(resId)}
                        className={`w-full text-left pl-8 pr-4 py-3 flex items-start gap-3 transition-colors ${isActive ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-secondary/50 border-l-2 border-transparent'}`}
                      >
                        <div className="mt-[2px]">
                          <FaPlayCircle className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm ${isActive ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                            {session.title}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 capitalize flex items-center gap-1">
                            Recording
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {liveSessions.filter(s => s.status === 'recording_ready').length === 0 && (
                    <div className="px-8 py-3 text-xs text-muted-foreground italic">No recordings available</div>
                  )}
                </div>
              )}
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarRail />
      </Sidebar>

      {/* MAIN CONTENT AREA */}
      <SidebarInset className="flex-1 flex flex-col overflow-hidden relative bg-background">
        
        {/* Top Navbar */}
        <div className="h-16 flex items-center px-4 justify-between shrink-0 bg-background z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <SidebarTrigger className="text-muted-foreground hover:bg-secondary rounded-md" />
                </div>
              </TooltipTrigger>
              <TooltipContent>Toggle Sidebar</TooltipContent>
            </Tooltip>
            
            {activeResource && (
              <Breadcrumb className="min-w-0 mx-2 flex-1">
                <BreadcrumbList className="flex-nowrap overflow-hidden">
                  <BreadcrumbItem className="hidden sm:block shrink-0 max-w-[150px] md:max-w-[300px]">
                    <BreadcrumbPage className="text-muted-foreground truncate block">{activeResource.moduleTitle}</BreadcrumbPage>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden sm:block shrink-0" />
                  <BreadcrumbItem className="min-w-0">
                    <BreadcrumbPage className="font-semibold truncate block">{activeResource.lessonTitle}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
             <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-sans text-lg transition-colors">
                <img src="/apple-touch-icon.png" alt="Qrious Logo" className="w-6 h-6 rounded-full shrink-0" />
                <span className="hidden sm:inline">Qrious</span>
             </Link>
          </div>
        </div>

        {isOwnerPreview && (
          <div className="bg-secondary/50 text-sm text-center py-2 text-muted-foreground">
            You're previewing this course as the instructor.
          </div>
        )}

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto flex flex-col relative custom-scrollbar p-2 md:p-6">
          {activeResource ? (
            <div className="w-full max-w-[1200px] mx-auto h-full flex flex-col">
                 {activeResource.resourceType === 'interactive_lab' || activeResource.resourceType === 'gates_playground' ? (
                   <InteractiveCourseLab taskInstructions={activeResource.description || "Construct and simulate the quantum circuit for this lesson task."} />
                 ) : (
                   <div className="w-full flex-1 relative min-h-[500px] flex flex-col bg-card rounded-xl overflow-hidden shadow-2xl border border-border">
                     {activeResource.resourceType === 'video' ? (
                       <VideoResourcePlayer resourceId={activeResource.resourceId} title={activeResource.resourceTitle} />
                     ) : activeResource.resourceType === 'live_session_recording' ? (
                       <VideoResourcePlayer 
                         resourceId={activeResource.lessonId} 
                         title={activeResource.resourceTitle}
                         fetchUrl={getLiveSessionDownloadUrl}
                       />
                     ) : (
                       <DocumentViewerWrapper resourceId={activeResource.resourceId} />
                     )}
                   </div>
                 )}
               
               {/* Resource Metadata & Next Button Row */}
               <div className="w-full mt-4 md:mt-6 bg-card rounded-xl p-4 md:p-6 border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shrink-0">
                 <div className="min-w-0 w-full md:w-auto">
                   <h1 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight truncate">{activeResource.resourceTitle}</h1>
                   <p className="text-muted-foreground mt-1 md:mt-2 text-sm line-clamp-2">{activeResource.description}</p>
                 </div>
                 
                 <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end shrink-0">
                   <button 
                     disabled={activeIndex <= 0} 
                     onClick={handlePrev}
                     className="px-4 py-2 border border-border text-foreground rounded-md disabled:opacity-30 disabled:cursor-not-allowed hover:bg-secondary transition-colors font-medium text-sm flex-1 md:flex-none text-center"
                   >
                     Previous
                   </button>
                   <button 
                     disabled={activeIndex >= flatList.length - 1}
                     onClick={handleNext}
                     className="px-4 md:px-6 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors font-semibold text-sm shadow-md flex items-center justify-center gap-2 flex-1 md:flex-none"
                   >
                     Next <FaArrowRight className="hidden sm:inline" />
                   </button>
                 </div>
               </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg font-medium">
              {flatList.length === 0 ? 'No content available in this course.' : 'Select an item from the sidebar to begin.'}
            </div>
          )}
        </div>
      </SidebarInset>
    </div>
    </SidebarProvider>
  );
}

// Wrapper to fetch URL for document viewer
function DocumentViewerWrapper({ resourceId }: { resourceId: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    setUrl(null);
    getViewUrl(resourceId).then(res => setUrl(res.view_url)).catch(() => {});
  }, [resourceId]);

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-card space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse font-medium">Loading document...</p>
      </div>
    );
  }

  return <DocumentViewer fileUrl={url} />;
}
