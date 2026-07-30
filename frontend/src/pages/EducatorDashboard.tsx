import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { listEducatorCourses, createCourse } from '../api/courses';
import type { Course } from '../api/courses';
import QuantumNewsRadar from '../components/QuantumNewsRadar';


export default function EducatorDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await listEducatorCourses();
        setCourses(data);
      } catch (err) {
        console.error("Error fetching courses", err);
      } finally {
        setLoading(false);
      }
    };
    if (currentUser) fetchCourses();
  }, [currentUser]);

  const handleCreateCourse = async () => {
    const toastId = toast.loading("Creating new course...");
    try {
      const course = await createCourse("New Draft Course", "Description goes here");
      toast.success("Course created successfully!", { id: toastId });
      navigate(`/educator/courses/${course.id}`);
    } catch (err) {
      console.error("Error creating course", err);
      toast.error("Failed to create course.", { id: toastId });
    }
  };

  return (
    <div className="p-4 md:p-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 mt-2 md:mt-4 gap-5 md:gap-4">
        <div className="flex items-center gap-3 md:gap-4 w-full">
          <img src="/apple-touch-icon.png" alt="Qrious" className="w-12 h-12 md:w-16 md:h-16 rounded-full shadow-md shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl md:text-3xl font-sans tracking-tight truncate">Educator Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base truncate">Manage and create your immersive courses.</p>
          </div>
        </div>
        <Button onClick={handleCreateCourse} size="lg" className="w-full md:w-auto shadow-lg hover:shadow-primary/25 transition-all shrink-0">
          + Create New Course
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-4 space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-lg text-muted-foreground animate-pulse font-medium">Loading your courses...</p>
          </div>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-24 bg-card border border-border/50 rounded-3xl shadow-sm">
          <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">📚</span>
          </div>
          <h3 className="text-2xl font-bold mb-2">No courses yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">You haven't created any courses. Start building your first immersive quantum experience now.</p>
          <Button onClick={handleCreateCourse} variant="secondary">Create Your First Course</Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courses.map(c => (
            <Link key={c.id} to={`/educator/courses/${c.id}`} className="block group">
              <Card className="h-full border-border/40 bg-card hover:bg-card/80 hover:shadow-xl hover:border-primary/20 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-full font-bold ${c.status === 'published' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-secondary text-secondary-foreground'}`}>
                      {c.status}
                    </span>
                  </div>
                  <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors line-clamp-2">
                    {c.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <p className="text-sm text-muted-foreground mb-6 line-clamp-3 leading-relaxed">{c.description || "No description provided."}</p>
                  
                  <div className="flex items-center text-primary text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                    Open Editor <span className="ml-2">→</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Quantum News Radar Section */}
      <QuantumNewsRadar variant="educator" className="mt-10" />
    </div>
  );
}
