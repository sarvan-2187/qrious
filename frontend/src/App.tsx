import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import LearnerOnboarding from './pages/LearnerOnboarding';
import FacultyOnboarding from './pages/FacultyOnboarding';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import ResourceLibrary from './pages/ResourceLibrary';
import VideoPlayerPage from './pages/VideoPlayerPage';
import DocumentViewerPage from './pages/DocumentViewerPage';
import NotFound from './pages/NotFound';
import CourseCatalog from './pages/CourseCatalog';
import CourseDetail from './pages/CourseDetail';
import EducatorDashboard from './pages/EducatorDashboard';
import CourseEditor from './pages/CourseEditor';
import CourseViewer from './pages/CourseViewer';
import LiveSessionRoom from './pages/LiveSessionRoom';
import Settings from './pages/Settings';
import ProfilePage from './pages/ProfilePage';
import AlgorithmExplorerLandingPage from './modules/algorithm-explorer/pages/AlgorithmExplorerLandingPage';
import AlgorithmDetailPage from './modules/algorithm-explorer/pages/AlgorithmDetailPage';
import ConstellationPage from './modules/algorithm-constellation/pages/ConstellationPage';
import GatesPlaygroundPage from './modules/gates-playground/pages/GatesPlaygroundPage';
import QRoutePage from './modules/qroute/pages/QRoutePage';
import QRouteJobDetailPage from './modules/qroute/pages/QRouteJobDetailPage';
import PuzzlesLandingPage from './modules/quantum-puzzles/pages/PuzzlesLandingPage';
import PuzzlePage from './modules/quantum-puzzles/pages/PuzzlePage';
import BlochSphereVisualizer from './components/bloch/BlochSphereVisualizer';
import AppLayout from './components/AppLayout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoadmapPage } from './features/roadmap/pages/RoadmapPage';
import { QuizPage } from './features/quiz/pages/QuizPage';
import { QuizReviewPage } from './features/quiz/pages/QuizReviewPage';
import { NotesPage } from './features/notes/pages/NotesPage';
import { AnalyticsPage } from './features/analytics/pages/AnalyticsPage';
import { AssessmentPage } from './features/analytics/pages/AssessmentPage';
import VideoOverviewChatPage from './pages/VideoOverviewChatPage';
import QBookLibraryPage from './modules/qbook/pages/QBookLibraryPage';
import QBookEditorPage from './modules/qbook/pages/QBookEditorPage';
import QStudioLibraryPage from './modules/qstudio/pages/QStudioLibraryPage';
import QStudioStudySpacePage from './modules/qstudio/pages/QStudioStudySpacePage';
import QStudioLocalOnlyPage from './modules/qstudio/pages/QStudioLocalOnlyPage';
import { PomodoroProvider } from './features/focus/context/PomodoroContext';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});


// Protected Route Wrapper
function ProtectedRoute({ children, allowedRole }: { children: React.ReactNode, allowedRole?: 'educator' | 'learner' }) {
  const { currentUser, loading } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  
  useEffect(() => {
    if (!currentUser) {
      setRoleLoading(false);
      return;
    }
    
    let isMounted = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const fetchRole = async () => {
      try {
        const token = await currentUser.getIdToken();
        const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        const response = await fetch(`${API_URL}/api/user/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: controller.signal
        });
        if (response.ok && isMounted) {
          const data = await response.json();
          setUserRole(data.role);
        } else if (response.status === 404 && isMounted) {
          if (!window.location.pathname.startsWith('/onboarding')) {
            window.location.href = '/onboarding/learner';
          }
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          return;
        }
        console.error(e);
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) setRoleLoading(false);
      }
    };
    
    fetchRole();
    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [currentUser, allowedRole]);

  if (loading || roleLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-foreground text-lg font-medium animate-pulse">Checking access...</p>
      </div>
    );
  }
  
  if (!currentUser) return <Navigate to="/login" replace />;
  
  if (allowedRole && userRole && userRole !== allowedRole) {
    return <Navigate to="/courses" replace />;
  }
  
  return children;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <Router>
              <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/onboarding/learner" element={
                <ProtectedRoute>
                  <LearnerOnboarding />
                </ProtectedRoute>
              } />
              <Route path="/onboarding/faculty" element={
                <ProtectedRoute>
                  <FacultyOnboarding />
                </ProtectedRoute>
              } />
              
              {/* Dashboard Routes with Sidebar Layout */}
              <Route element={<PomodoroProvider><AppLayout /></PomodoroProvider>}>
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/roadmap" element={
                  <ProtectedRoute>
                    <RoadmapPage />
                  </ProtectedRoute>
                } />
                <Route path="/analytics" element={
                  <ProtectedRoute>
                    <AnalyticsPage />
                  </ProtectedRoute>
                } />
                <Route path="/analytics/assessment/:type" element={
                  <ProtectedRoute>
                    <AssessmentPage />
                  </ProtectedRoute>
                } />
                <Route path="/quiz/:topicSlug" element={
                  <ProtectedRoute>
                    <QuizPage />
                  </ProtectedRoute>
                } />
                <Route path="/quiz/review/:attemptId" element={
                  <ProtectedRoute>
                    <QuizReviewPage />
                  </ProtectedRoute>
                } />
                <Route path="/notes" element={
                  <ProtectedRoute>
                    <NotesPage />
                  </ProtectedRoute>
                } />
                <Route path="/flashcards" element={
                  <ProtectedRoute>
                    <Navigate to="/roadmap" replace />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                } />
                <Route path="/educator/courses" element={
                  <ProtectedRoute allowedRole="educator">
                    <EducatorDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/courses" element={
                  <ProtectedRoute>
                    <CourseCatalog />
                  </ProtectedRoute>
                } />
                <Route path="/resources" element={
                  <ProtectedRoute allowedRole="educator">
                    <ResourceLibrary />
                  </ProtectedRoute>
                } />
                
                {/* Quantathon Phase 1 Routes */}
                <Route path="/playground" element={
                  <ProtectedRoute>
                    <GatesPlaygroundPage />
                  </ProtectedRoute>
                } />
                <Route path="/puzzles" element={
                  <ProtectedRoute>
                    <PuzzlesLandingPage />
                  </ProtectedRoute>
                } />
                <Route path="/puzzles/:id" element={
                  <ProtectedRoute>
                    <PuzzlePage />
                  </ProtectedRoute>
                } />
                <Route path="/algorithms" element={
                  <ProtectedRoute allowedRole="educator">
                    <AlgorithmExplorerLandingPage />
                  </ProtectedRoute>
                } />
                <Route path="/algorithms/:slug" element={
                  <ProtectedRoute allowedRole="educator">
                    <AlgorithmDetailPage />
                  </ProtectedRoute>
                } />
                <Route path="/constellation" element={
                  <ProtectedRoute allowedRole="learner">
                    <ConstellationPage />
                  </ProtectedRoute>
                } />
                <Route path="/constellation/:slug" element={
                  <ProtectedRoute allowedRole="learner">
                    <AlgorithmDetailPage />
                  </ProtectedRoute>
                } />
                <Route path="/video-overview" element={
                  <ProtectedRoute>
                    <VideoOverviewChatPage />
                  </ProtectedRoute>
                } />
                <Route path="/qbook" element={
                  <ProtectedRoute>
                    <QBookLibraryPage />
                  </ProtectedRoute>
                } />
                <Route path="/qbook/:notebookId" element={
                  <ProtectedRoute>
                    <QBookEditorPage />
                  </ProtectedRoute>
                } />
                <Route path="/qstudio" element={
                  <ProtectedRoute>
                    {import.meta.env.PROD ? <QStudioLocalOnlyPage /> : <QStudioLibraryPage />}
                  </ProtectedRoute>
                } />
                <Route path="/qstudio/:studySpaceId" element={
                  <ProtectedRoute>
                    {import.meta.env.PROD ? <QStudioLocalOnlyPage /> : <QStudioStudySpacePage />}
                  </ProtectedRoute>
                } />
                <Route path="/bloch" element={
                  <ProtectedRoute>
                    <BlochSphereVisualizer />
                  </ProtectedRoute>
                } />
                <Route path="/qroute" element={
                  <ProtectedRoute>
                    <QRoutePage />
                  </ProtectedRoute>
                } />
                <Route path="/qroute/jobs/:jobId" element={
                  <ProtectedRoute>
                    <QRouteJobDetailPage />
                  </ProtectedRoute>
                } />
              </Route>

              {/* Standalone Protected Routes */}
              <Route path="/courses/:id" element={
                <ProtectedRoute>
                  <CourseDetail />
                </ProtectedRoute>
              } />
              <Route path="/courses/:id/view" element={
                <ProtectedRoute>
                  <CourseViewer />
                </ProtectedRoute>
              } />
              <Route path="/live/:sessionId" element={
                <ProtectedRoute>
                  <LiveSessionRoom />
                </ProtectedRoute>
              } />
              <Route path="/courses/:id/preview" element={
                <ProtectedRoute allowedRole="educator">
                  <CourseViewer />
                </ProtectedRoute>
              } />
              <Route path="/educator/courses/:id" element={
                <ProtectedRoute allowedRole="educator">
                  <CourseEditor />
                </ProtectedRoute>
              } />
              <Route path="/resources/video/:id" element={
                <ProtectedRoute>
                  <VideoPlayerPage />
                </ProtectedRoute>
              } />
              <Route path="/resources/document/:id" element={
                <ProtectedRoute>
                  <DocumentViewerPage />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </AuthProvider>
        </TooltipProvider>
        <Toaster 
          richColors 
          position="top-right" 
          toastOptions={{
            style: { fontFamily: 'var(--font-sans)' }
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
