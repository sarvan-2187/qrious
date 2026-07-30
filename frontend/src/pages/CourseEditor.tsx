import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ResourceUpload from './ResourceUpload';
import VideoOverviewGenerator from '../components/VideoOverviewGenerator';
import { FaCloudUploadAlt, FaFilm } from 'react-icons/fa';
import {
  getCourse, updateCourse, togglePublish, deleteCourse,
  createModule, updateModule, deleteModule,
  createLesson, updateLesson, deleteLesson, getLesson
} from '../api/courses';
import { listLiveSessions, createLiveSession, type LiveSession } from '../api/liveSessions';
import { deleteResource } from '../api/resources';
import type { Course, Module, Lesson } from '../api/courses';
import { useAuth } from '../context/AuthContext';

export default function CourseEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [titleDraft, setTitleDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [formatDraft, setFormatDraft] = useState('recorded');
  const [saving, setSaving] = useState(false);

  const [modules, setModules] = useState<Module[]>([]);
  const [lessonsByModule, setLessonsByModule] = useState<Record<string, Lesson[]>>({});
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newLessonTitleByModule, setNewLessonTitleByModule] = useState<Record<string, string>>({});
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingModuleTitle, setEditingModuleTitle] = useState('');

  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingLessonTitle, setEditingLessonTitle] = useState('');

  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [newLiveSessionTitle, setNewLiveSessionTitle] = useState('');
  const [newLiveSessionDate, setNewLiveSessionDate] = useState('');

  useEffect(() => {
    if (!id || !currentUser) return;
    (async () => {
      try {
        const c = await getCourse(id);
        if (c.owner_uid !== currentUser.uid) {
          setError('You do not have access to edit this course.');
          setLoading(false);
          return;
        }
        setCourse(c);
        setTitleDraft(c.title);
        setDescriptionDraft(c.description);
        setFormatDraft(c.format || 'recorded');
        
        // Modules and lessons are already returned nested from the backend!
        const mods = c.modules || [];
        setModules(mods);
        
        const lessonsMap: Record<string, Lesson[]> = {};
        mods.forEach(m => {
          lessonsMap[m.id] = m.lessons || [];
        });
        setLessonsByModule(lessonsMap);
        
        if (c.format !== 'recorded') {
          const sessions = await listLiveSessions(id);
          setLiveSessions(sessions);
        }
        
      } catch (err) {
        setError('Could not load this course.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, currentUser]);

  useEffect(() => {
    if (!selectedLessonId) {
      setSelectedLesson(null);
      return;
    }
    (async () => {
      try {
        const lessonData = await getLesson(selectedLessonId);
        setSelectedLesson(lessonData);
      } catch (err) {
        console.error("Failed to fetch lesson details for editing", err);
      }
    })();
  }, [selectedLessonId]);

  async function handleSaveDetails() {
    if (!id) return;
    setSaving(true);
    const toastId = toast.loading("Saving details...");
    try {
      const updated = await updateCourse(id, { title: titleDraft, description: descriptionDraft, format: formatDraft as any });
      setCourse(updated);
      toast.success("Course details saved!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save course details.", { id: toastId });
    } finally {
      setSaving(false);
    }
  }

  async function handlePublishToggle() {
    if (!id || !course) return;
    
    const hasEmptyModule = modules.some(m => (lessonsByModule[m.id] || []).length === 0);

    if (course.status === 'draft') {
      if (modules.length === 0) {
        toast.error('Add at least one module before publishing.');
        return;
      }
      if (hasEmptyModule) {
        toast.error('Every module needs at least one lesson before publishing.');
        return;
      }
    }

    const toastId = toast.loading(course.status === 'draft' ? "Publishing course..." : "Unpublishing course...");
    try {
      const updated = await togglePublish(id);
      setCourse(updated);
      toast.success(updated.status === 'published' ? "Course published!" : "Course unpublished!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to change course status.", { id: toastId });
    }
  }

  async function handleAddModule() {
    if (!id || !newModuleTitle.trim()) return;
    const nextOrder = modules.length > 0 ? Math.max(...modules.map(m => m.order)) + 1 : 1;
    
    const toastId = toast.loading("Adding module...");
    try {
      const mod = await createModule(id, newModuleTitle.trim(), nextOrder);
      setModules((prev) => [...prev, mod]);
      setLessonsByModule((prev) => ({ ...prev, [mod.id]: [] }));
      setNewModuleTitle('');
      toast.success("Module added", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to add module. Please try again.", { id: toastId });
    }
  }

  async function handleDeleteCourse() {
    if (!id) return;
    const toastId = toast.loading("Deleting course...");
    try {
      await deleteCourse(id);
      toast.success("Course deleted successfully", { id: toastId });
      navigate('/educator/courses');
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete course", { id: toastId });
    }
  }

  async function handleUpdateModule(moduleId: string) {
    if (!editingModuleTitle.trim()) return;
    const toastId = toast.loading("Updating module...");
    try {
      const updated = await updateModule(moduleId, { title: editingModuleTitle.trim() });
      setModules(prev => prev.map(m => m.id === moduleId ? updated : m));
      setEditingModuleId(null);
      toast.success("Module updated", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to update module.", { id: toastId });
    }
  }

  async function handleDeleteModule(moduleId: string) {
    const toastId = toast.loading("Deleting module...");
    try {
      await deleteModule(moduleId);
      setModules(prev => prev.filter(m => m.id !== moduleId));
      if (expandedModuleId === moduleId) setExpandedModuleId(null);
      toast.success("Module deleted", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete module.", { id: toastId });
    }
  }

  async function handleExpandModule(moduleId: string) {
    if (expandedModuleId === moduleId) {
      setExpandedModuleId(null);
      return;
    }
    setExpandedModuleId(moduleId);
  }

  async function handleAddLesson(moduleId: string) {
    const title = newLessonTitleByModule[moduleId]?.trim();
    if (!title) return;
    
    const existingLessons = lessonsByModule[moduleId] || [];
    const nextOrder = existingLessons.length > 0 ? Math.max(...existingLessons.map(l => l.order)) + 1 : 1;
    
    const toastId = toast.loading("Adding lesson...");
    try {
      const lesson = await createLesson(moduleId, title, nextOrder);
      setLessonsByModule((prev) => ({
        ...prev,
        [moduleId]: [...(prev[moduleId] || []), lesson],
      }));
      setNewLessonTitleByModule((prev) => ({ ...prev, [moduleId]: '' }));
      toast.success("Lesson added", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to add lesson.", { id: toastId });
    }
  }

  async function handleUpdateLesson(lessonId: string, moduleId: string) {
    if (!editingLessonTitle.trim()) return;
    const toastId = toast.loading("Updating lesson...");
    try {
      const updated = await updateLesson(lessonId, { title: editingLessonTitle.trim() });
      setLessonsByModule(prev => ({
        ...prev,
        [moduleId]: (prev[moduleId] || []).map(l => l.id === lessonId ? updated : l)
      }));
      setEditingLessonId(null);
      toast.success("Lesson updated", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to update lesson.", { id: toastId });
    }
  }

  async function handleDeleteLesson(lessonId: string, moduleId: string) {
    const toastId = toast.loading("Deleting lesson...");
    try {
      await deleteLesson(lessonId);
      setLessonsByModule(prev => ({
        ...prev,
        [moduleId]: (prev[moduleId] || []).filter(l => l.id !== lessonId)
      }));
      if (selectedLessonId === lessonId) {
        setSelectedLessonId(null);
        setSelectedLesson(null);
      }
      toast.success("Lesson deleted", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete lesson.", { id: toastId });
    }
  }

  async function refreshSelectedLesson() {
    if (!selectedLessonId) return;
    try {
      const lessonData = await getLesson(selectedLessonId);
      setSelectedLesson(lessonData);
    } catch (err) {
      console.error("Failed to refresh lesson details", err);
    }
  }

  async function handleDeleteResource(resourceId: string) {
    const toastId = toast.loading("Deleting resource...");
    try {
      await deleteResource(resourceId);
      if (selectedLesson) {
        setSelectedLesson({
          ...selectedLesson,
          resources: (selectedLesson.resources || []).filter((r: any) => r.resource_id !== resourceId)
        });
      }
      toast.success("Resource deleted", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete resource.", { id: toastId });
    }
  }

  async function handleCreateLiveSession() {
    if (!id || !newLiveSessionTitle || !newLiveSessionDate) return;
    const toastId = toast.loading("Creating live session...");
    try {
      const dateIso = new Date(newLiveSessionDate).toISOString();
      await createLiveSession(id, newLiveSessionTitle, dateIso);
      const sessions = await listLiveSessions(id);
      setLiveSessions(sessions);
      setNewLiveSessionTitle('');
      setNewLiveSessionDate('');
      toast.success("Live session scheduled!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to create live session", { id: toastId });
    }
  }

  async function handleStartSession(sessionId: string) {
    const toastId = toast.loading("Starting session...");
    try {
      const { startLiveSession } = await import('../api/liveSessions');
      await startLiveSession(sessionId);
      toast.success("Session started!", { id: toastId });
      navigate(`/live/${sessionId}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to start session", { id: toastId });
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
      <p className="text-lg text-muted-foreground animate-pulse font-medium">Loading course editor...</p>
    </div>
  );
  if (error || !course) return <div className="p-4 md:p-8 text-destructive">{error || 'Course not found.'}</div>;
  return (
    <div className="p-4 md:p-8 max-w-[1600px] w-full mx-auto min-h-screen lg:h-screen flex flex-col overflow-y-auto lg:overflow-hidden pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 mb-6 gap-4">
        <div className="flex items-center gap-3">
          <img src="/apple-touch-icon.png" alt="Qrious" className="w-8 h-8 rounded-full" />
          <h1 className="text-2xl md:text-3xl font-sans">Qrious Course Editor</h1>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-3 items-center w-full sm:w-auto">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="px-2 sm:px-4 py-2 border border-destructive text-destructive font-medium rounded hover:bg-destructive hover:text-destructive-foreground transition-colors text-xs sm:text-sm">
                Delete
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your course and remove all associated data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteCourse} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <button
            onClick={() => navigate(`/courses/${id}/preview`)}
            className="px-2 sm:px-4 py-2 rounded font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs sm:text-sm text-center"
          >
            Preview
          </button>
          <button
            onClick={handlePublishToggle}
            className={`px-2 sm:px-4 py-2 rounded font-medium text-xs sm:text-sm text-center ${course.status === 'published' ? 'bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
          >
            {course.status === 'published' ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 lg:min-h-0 p-1">
        {/* Left Column */}
        <div className="lg:col-span-1 flex flex-col gap-6 lg:h-full lg:min-h-0">
          <Card className="shrink-0">
        <CardHeader><CardTitle>Course Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input
            className="w-full bg-background"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            placeholder="Course title"
          />
          <Textarea
            className="w-full bg-background resize-none"
            value={descriptionDraft}
            onChange={(e) => setDescriptionDraft(e.target.value)}
            placeholder="Course description"
            rows={3}
          />
          <div className="space-y-2">
            <Label>Course Format</Label>
            <Select value={formatDraft} onValueChange={setFormatDraft}>
              <SelectTrigger className="w-full text-left [&>span]:truncate"><SelectValue placeholder="Select format..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recorded">Recorded only</SelectItem>
                <SelectItem value="live">Live only</SelectItem>
                <SelectItem value="both">Both — recorded curriculum + live sessions</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <button onClick={handleSaveDetails} disabled={saving} className="px-4 py-2 bg-primary text-primary-foreground rounded font-medium">
            {saving ? 'Saving...' : 'Save Details'}
          </button>
        </CardContent>
      </Card>

      <Card className="flex flex-col lg:flex-1 lg:min-h-0">
        <CardHeader className="shrink-0"><CardTitle>Curriculum Builder</CardTitle></CardHeader>
        <CardContent className="overflow-y-auto flex-1 space-y-4 pr-2 custom-scrollbar">
          {modules.map((mod) => (
            <div key={mod.id} className="border rounded p-3 bg-card">
              <div className="flex justify-between items-center w-full group">
                {editingModuleId === mod.id ? (
                  <div className="flex gap-2 flex-1 mr-4">
                    <Input 
                      className="bg-background flex-1 h-8" 
                      value={editingModuleTitle}
                      onChange={(e) => setEditingModuleTitle(e.target.value)}
                      autoFocus
                    />
                    <button onClick={() => handleUpdateModule(mod.id)} className="px-2 py-1 bg-primary text-primary-foreground text-sm rounded">Save</button>
                    <button onClick={() => setEditingModuleId(null)} className="px-2 py-1 bg-secondary text-secondary-foreground text-sm rounded">Cancel</button>
                  </div>
                ) : (
                  <button
                    className="font-semibold text-left flex-1"
                    onClick={() => handleExpandModule(mod.id)}
                  >
                    <span>{mod.title}</span>
                  </button>
                )}
                
                {editingModuleId !== mod.id && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); setEditingModuleTitle(mod.title); setEditingModuleId(mod.id); }} className="text-xs px-2 py-1 border rounded hover:bg-secondary">Edit</button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button onClick={(e) => e.stopPropagation()} className="text-xs px-2 py-1 border rounded text-destructive hover:bg-destructive/10">Delete</button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Module?</AlertDialogTitle>
                          <AlertDialogDescription>Are you sure you want to delete this module and all its lessons?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={(e) => { e.stopPropagation(); handleDeleteModule(mod.id); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <button onClick={() => handleExpandModule(mod.id)} className="w-8 text-center">{expandedModuleId === mod.id ? '▼' : '▶'}</button>
                  </div>
                )}
              </div>
              
              {expandedModuleId === mod.id && (
                <div className="pl-4 mt-4 space-y-2">
                  {(lessonsByModule[mod.id] || []).map((lesson) => (
                    <div key={lesson.id} className="group relative">
                      {editingLessonId === lesson.id ? (
                        <div className="flex gap-2 p-2">
                          <Input 
                            className="flex-1 bg-background h-8 text-sm" 
                            value={editingLessonTitle}
                            onChange={(e) => setEditingLessonTitle(e.target.value)}
                            autoFocus
                          />
                          <button onClick={() => handleUpdateLesson(lesson.id, mod.id)} className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded">Save</button>
                          <button onClick={() => setEditingLessonId(null)} className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <button
                            onClick={() => setSelectedLessonId(lesson.id)}
                            className={`block text-left flex-1 p-2 rounded transition-colors ${selectedLessonId === lesson.id ? 'bg-primary/20 font-medium' : 'hover:bg-secondary'}`}
                          >
                            {lesson.title}
                          </button>
                          <div className="flex gap-2 pr-2 opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 bg-gradient-to-l from-card via-card to-transparent pl-4">
                            <button onClick={(e) => { e.stopPropagation(); setEditingLessonTitle(lesson.title); setEditingLessonId(lesson.id); }} className="text-xs px-2 py-1 hover:text-primary">Edit</button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button onClick={(e) => e.stopPropagation()} className="text-xs px-2 py-1 text-destructive hover:bg-destructive/10 rounded">Delete</button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Lesson?</AlertDialogTitle>
                                  <AlertDialogDescription>Are you sure you want to delete this lesson and its resources?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={(e) => { e.stopPropagation(); handleDeleteLesson(lesson.id, mod.id); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="mt-3 pl-2 pb-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="px-3 py-1.5 bg-secondary text-secondary-foreground text-sm font-medium rounded whitespace-nowrap hover:bg-secondary/80">
                          + Add Lesson
                        </button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Lesson</DialogTitle>
                          <DialogDescription>Add a new lesson to this module.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <Label>Lesson Title</Label>
                          <Input
                            className="mt-2 bg-background"
                            placeholder="e.g. What is a Qubit?"
                            value={newLessonTitleByModule[mod.id] || ''}
                            onChange={(e) => setNewLessonTitleByModule((prev) => ({ ...prev, [mod.id]: e.target.value }))}
                            autoFocus
                          />
                        </div>
                        <DialogFooter>
                          <button onClick={() => handleAddLesson(mod.id)} className="px-4 py-2 bg-primary text-primary-foreground rounded font-medium">Add Lesson</button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className="mt-6 flex justify-center">
            <Dialog>
              <DialogTrigger asChild>
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded font-medium whitespace-nowrap">
                  + Add Module
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Module</DialogTitle>
                  <DialogDescription>Create a new section in your course curriculum.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label>Module Title</Label>
                  <Input
                    className="mt-2 bg-background"
                    placeholder="e.g. Introduction to Quantum Physics"
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    autoFocus
                  />
                </div>
                <DialogFooter>
                  <button onClick={handleAddModule} className="px-4 py-2 bg-primary text-primary-foreground rounded font-medium">Add Module</button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>

      {/* Right Column */}
      <div className="lg:col-span-2 flex flex-col lg:h-full lg:min-h-0 gap-6">
        <Card className={`flex flex-col lg:min-h-0 ${formatDraft !== 'recorded' ? 'lg:h-1/2' : 'lg:flex-1'}`}>
          <CardHeader className="shrink-0">
            <CardTitle>Lesson Resources</CardTitle>
          </CardHeader>
          <CardContent className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
        {selectedLessonId ? (
          <div className="space-y-6">
            {selectedLesson && selectedLesson.resources && selectedLesson.resources.length > 0 ? (
              <ul className="space-y-3">
                {selectedLesson.resources.map((res: any) => (
                  <li key={res.resource_id} className="p-4 border rounded bg-card flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-lg">{res.title}</h3>
                      <p className="text-sm text-muted-foreground">{res.description}</p>
                      <span className="inline-block mt-2 text-xs font-medium px-2 py-1 bg-secondary rounded uppercase">
                        {res.resource_type}
                      </span>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="px-4 py-2 bg-destructive text-destructive-foreground rounded font-medium text-sm whitespace-nowrap hover:bg-destructive/90">
                          Delete
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Resource?</AlertDialogTitle>
                          <AlertDialogDescription>Are you sure you want to delete this resource?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteResource(res.resource_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No resources in this lesson yet.</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="py-4 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 font-medium">
                    <FaCloudUploadAlt className="text-xl" /> Upload New Resource
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl p-0 border-none bg-transparent shadow-none">
                  <ResourceUpload lessonId={selectedLessonId} />
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <button className="py-4 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 font-medium">
                    <FaFilm className="text-xl" /> Generate Video Overview
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl p-0 border-none bg-transparent shadow-none">
                  <VideoOverviewGenerator
                    lessonId={selectedLessonId}
                    pdfResources={(selectedLesson?.resources || [])
                      .filter((r: any) => ['ppt', 'notes', 'cheatsheet'].includes(r.resource_type))
                      .map((r: any) => ({ resource_id: r.resource_id, title: r.title }))}
                    onGenerated={refreshSelectedLesson}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ) : (
            <p className="text-muted-foreground p-6 border border-dashed rounded text-center">Select a lesson from the Curriculum Builder to view and upload resources.</p>
          )}
          </CardContent>
        </Card>

        {formatDraft !== 'recorded' && (
          <Card className="flex flex-col mt-6 lg:h-1/2 lg:min-h-[300px]">
            <CardHeader className="shrink-0"><CardTitle>Live Sessions</CardTitle></CardHeader>
            <CardContent className="space-y-4 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col sm:flex-row gap-2 mb-4 items-stretch sm:items-center">
                <Input 
                  className="flex-1 bg-background w-full" 
                  placeholder="Session Topic/Title" 
                  value={newLiveSessionTitle} 
                  onChange={e => setNewLiveSessionTitle(e.target.value)} 
                />
                <Input 
                  type="datetime-local"
                  className="bg-background w-full sm:w-auto" 
                  value={newLiveSessionDate} 
                  onChange={e => setNewLiveSessionDate(e.target.value)} 
                />
                <button 
                  onClick={handleCreateLiveSession} 
                  disabled={!newLiveSessionTitle || !newLiveSessionDate}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded font-medium disabled:opacity-50 shrink-0 w-full sm:w-auto"
                >
                  Schedule
                </button>
              </div>
              
              <div className="space-y-3">
                {liveSessions.map(session => (
                  <div key={session.id} className="p-4 border rounded bg-card flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-lg">{session.title}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {new Date(session.scheduled_at).toLocaleString()} • Status: <span className="uppercase text-xs font-semibold px-2 py-0.5 bg-secondary text-secondary-foreground rounded ml-1">{session.status}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       {session.status === 'scheduled' && (
                         <AlertDialog>
                           <AlertDialogTrigger asChild>
                             <button className="px-3 py-1.5 bg-primary text-primary-foreground font-medium text-sm rounded hover:bg-primary/90">
                               Start Session
                             </button>
                           </AlertDialogTrigger>
                           <AlertDialogContent>
                             <AlertDialogHeader>
                               <AlertDialogTitle>Start Live Session?</AlertDialogTitle>
                               <AlertDialogDescription>Are you sure you want to start this live session now?</AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                               <AlertDialogCancel>Cancel</AlertDialogCancel>
                               <AlertDialogAction onClick={() => handleStartSession(session.id)}>Start</AlertDialogAction>
                             </AlertDialogFooter>
                           </AlertDialogContent>
                         </AlertDialog>
                       )}
                       {session.status === 'live' && (
                         <button onClick={() => navigate(`/live/${session.id}`)} className="px-3 py-1.5 bg-green-600 text-white font-medium text-sm rounded hover:bg-green-700">
                           Join Room
                         </button>
                       )}
                    </div>
                  </div>
                ))}
                {liveSessions.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground border border-dashed rounded bg-secondary/20">
                    No live sessions scheduled yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      </div>

    </div>
  );
}
