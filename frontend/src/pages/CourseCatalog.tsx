import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '../context/AuthContext';
import { listPublishedCourses, listEnrolledCourses, getCourseProgress, listEducatorCourses } from '../api/courses';
import { CertificateGenerator } from '../components/CertificateGenerator';
import type { Course } from '../api/courses';

export default function CourseCatalog() {
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [completedCourses, setCompletedCourses] = useState<Course[]>([]);
  const [myTeachings, setMyTeachings] = useState<Course[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        let role = null;
        if (currentUser) {
          try {
            const token = await currentUser.getIdToken();
            const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
            const res = await fetch(`${API_URL}/api/user/me`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
              const data = await res.json();
              role = data.role;
              setUserRole(role);
            }
          } catch (e) {}
        }

        const [publishedData, enrolledData] = await Promise.all([
          listPublishedCourses(),
          listEnrolledCourses()
        ]);
        setCourses(publishedData);
        setEnrolledCourses(enrolledData);
        
        // Fetch progress for enrolled courses to identify completed ones
        const progressPromises = enrolledData.map(c => getCourseProgress(c.id).catch(() => null));
        const progressResults = await Promise.all(progressPromises);
        
        const completed = enrolledData.filter((_, idx) => {
           const p = progressResults[idx];
           return p && p.progress_percentage === 100;
        });
        setCompletedCourses(completed);

        if (role === 'educator') {
          try {
            const teachings = await listEducatorCourses();
            setMyTeachings(teachings);
          } catch (e) {
            console.error(e);
          }
        }
      } catch (err) {
        console.error("Error fetching courses", err);
      } finally {
        setLoading(false);
      }
    };
    if (currentUser) fetchCourses();
  }, [currentUser]);

  return (
    <div className="p-6 md:p-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Course Catalog</h1>
      
      <Tabs defaultValue="enrolled" className="w-full">
        <TabsList className={`mb-6 flex w-full max-w-3xl justify-start sm:grid overflow-x-auto h-auto sm:h-10 p-1 ${userRole === 'educator' ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
          <TabsTrigger value="enrolled">My Enrolled Courses</TabsTrigger>
          <TabsTrigger value="all">All Courses</TabsTrigger>
          <TabsTrigger value="certificates">My Certificates</TabsTrigger>
          {userRole === 'educator' && <TabsTrigger value="teachings">My Teachings</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="enrolled" className="mt-0 space-y-4">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="hover:shadow-lg transition-shadow border-border/50">
                  <CardHeader><Skeleton className="h-6 w-3/4 mb-2" /></CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-5/6 mb-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : enrolledCourses.length === 0 ? (
            <div className="text-center py-20 bg-muted/20 rounded-lg border border-dashed border-border">
              <p className="text-muted-foreground">You are not enrolled in any courses yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Check out the 'All Courses' tab to discover something new.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {enrolledCourses.map(c => (
                <Card key={c.id} className="hover:shadow-lg transition-shadow border-primary/20">
                  <CardHeader>
                    <CardTitle>
                      <Link to={`/courses/${c.id}`} className="text-primary hover:underline">{c.title}</Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground line-clamp-3">{c.description}</p>
                    <div className="mt-4 flex items-center text-primary text-sm font-semibold">
                      Continue Learning <span className="ml-2">→</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="all" className="mt-0 space-y-4">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="hover:shadow-lg transition-shadow border-border/50">
                  <CardHeader><Skeleton className="h-6 w-3/4 mb-2" /></CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-5/6 mb-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-20 bg-muted/20 rounded-lg border border-dashed border-border">
              <p className="text-muted-foreground">No published courses available right now.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {courses.map(c => (
                <Card key={c.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle>
                      <Link to={`/courses/${c.id}`} className="text-foreground hover:text-primary transition-colors">{c.title}</Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground line-clamp-3">{c.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="certificates" className="mt-0 space-y-8">
          {loading ? (
             <div className="flex justify-center py-20">
               <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
             </div>
          ) : completedCourses.length === 0 ? (
            <div className="text-center py-20 bg-muted/20 rounded-lg border border-dashed border-border">
              <p className="text-muted-foreground">You don't have any certificates yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Complete a course to earn your first certificate!</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedCourses.map(c => (
                <Dialog key={c.id}>
                  <DialogTrigger asChild>
                    <Card className="hover:shadow-lg transition-shadow border-primary/20 cursor-pointer group">
                      <CardHeader>
                        <CardTitle className="group-hover:text-primary transition-colors">{c.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground line-clamp-2">{c.description}</p>
                        <div className="mt-4 flex items-center text-primary text-sm font-semibold">
                          View Certificate <span className="ml-2">→</span>
                        </div>
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl border-border/50 bg-background/95 backdrop-blur p-1 sm:p-6 overflow-x-auto">
                    <CertificateGenerator
                      studentName={currentUser?.displayName || (currentUser as any)?.full_name || 'Student'}
                      courseName={c.title}
                      completionDate={new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    />
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          )}
        </TabsContent>

        {userRole === 'educator' && (
          <TabsContent value="teachings" className="mt-0 space-y-4">
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="hover:shadow-lg transition-shadow border-border/50">
                    <CardHeader><Skeleton className="h-6 w-3/4 mb-2" /></CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-5/6 mb-2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : myTeachings.length === 0 ? (
              <div className="text-center py-20 bg-muted/20 rounded-lg border border-dashed border-border">
                <p className="text-muted-foreground">You haven't created any courses yet.</p>
                <Link to="/educator/courses" className="text-primary hover:underline mt-2 inline-block">Go to Educator Dashboard to create one</Link>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myTeachings.map(c => (
                  <Card key={c.id} className="hover:shadow-lg transition-shadow border-primary/20">
                    <CardHeader>
                      <CardTitle>
                        <Link to={`/courses/${c.id}`} className="text-primary hover:underline">{c.title}</Link>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground line-clamp-3">{c.description}</p>
                      <div className="mt-4 flex items-center text-primary text-sm font-semibold">
                        View Course <span className="ml-2">→</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
