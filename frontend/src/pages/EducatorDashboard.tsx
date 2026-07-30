import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { createCourse, listEducatorCourses } from '../api/courses';
import type { Course } from '../api/courses';

export default function EducatorDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadCourses() {
      try {
        const educatorCourses = await listEducatorCourses();
        setCourses(educatorCourses);
      } catch (err) {
        console.error('Failed to load educator courses:', err);
        setError('Unable to load your courses. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    if (currentUser) {
      loadCourses();
    }
  }, [currentUser]);

  async function handleCreateCourse() {
    setCreating(true);
    setError('');

    try {
      const course = await createCourse('Untitled course', '');
      navigate(`/courses/${course.id}/edit`);
    } catch (err) {
      console.error('Failed to create course:', err);
      setError('Unable to create the course. Please try again.');
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground md:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium text-primary">Educator workspace</p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              My courses
            </h1>
            <p className="mt-2 text-muted-foreground">
              Create, edit, and publish your learning content.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCreateCourse}
            disabled={creating}
            className="inline-flex w-fit items-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? 'Creating course...' : '+ Create course'}
          </button>
        </header>

        {error && (
          <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-muted-foreground">
            Loading your courses...
          </div>
        ) : courses.length === 0 ? (
          <section className="rounded-2xl border border-border bg-card px-6 py-16 text-center">
            <div className="mb-4 text-4xl">✍️</div>
            <h2 className="text-xl font-semibold">Create your first course</h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              Start with a title, then add modules, lessons, and learning resources.
            </p>
            <button
              type="button"
              onClick={handleCreateCourse}
              disabled={creating}
              className="mt-6 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {creating ? 'Creating...' : 'Create course'}
            </button>
          </section>
        ) : (
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.id}/edit`}
                className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      course.status === 'published'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {course.status}
                  </span>
                </div>

                <h2 className="text-xl font-semibold transition-colors group-hover:text-primary">
                  {course.title}
                </h2>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  {course.description || 'No course description yet.'}
                </p>

                <span className="mt-6 inline-block text-sm font-semibold text-primary">
                  Edit course →
                </span>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}