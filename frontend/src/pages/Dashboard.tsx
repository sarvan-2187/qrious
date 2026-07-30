import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { listEnrolledCourses } from '../api/courses';
import type { Course } from '../api/courses';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCourses() {
      try {
        const enrolledCourses = await listEnrolledCourses();
        setCourses(enrolledCourses);
      } catch (error) {
        console.error('Failed to load enrolled courses:', error);
      } finally {
        setLoading(false);
      }
    }

    if (currentUser) {
      loadCourses();
    }
  }, [currentUser]);

  const firstName = currentUser?.displayName?.split(' ')[0] || 'Learner';

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground md:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium text-primary">My learning space</p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Welcome back, {firstName}.
            </h1>
            <p className="mt-2 text-muted-foreground">
              Continue learning from where you left off.
            </p>
          </div>

          <Link
            to="/courses"
            className="inline-flex w-fit items-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Browse courses
          </Link>
        </header>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground">
            Loading your courses...
          </div>
        ) : courses.length === 0 ? (
          <section className="rounded-2xl border border-border bg-card px-6 py-16 text-center">
            <div className="mb-4 text-4xl">📚</div>
            <h2 className="text-xl font-semibold">No enrolled courses yet</h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              Explore the course catalog and enroll in a course to begin learning.
            </p>
            <Link
              to="/courses"
              className="mt-6 inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Explore courses
            </Link>
          </section>
        ) : (
          <section>
            <h2 className="mb-5 text-xl font-semibold">Continue learning</h2>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  to={`/courses/${course.id}`}
                  className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
                >
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">
                    Enrolled course
                  </p>
                  <h3 className="text-xl font-semibold transition-colors group-hover:text-primary">
                    {course.title}
                  </h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {course.description || 'No course description available.'}
                  </p>
                  <span className="mt-6 inline-block text-sm font-semibold text-primary">
                    Continue learning →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}