import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import StudyRooms from "./pages/StudyRooms";
import Quizzes from "./pages/Quizzes";
import Planner from "./pages/Planner";
import AIAssistant from "./pages/AIAssistant";
import Materials from "./pages/Materials";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Animations from "./pages/Animations";
import Experiments from "./pages/Experiments";
import TeacherDashboard from "./pages/TeacherDashboard";
import LevelQuiz from "./pages/LevelQuiz";
import Login from "./pages/Login";
import Puzzles from "./pages/Puzzles";
import ClassSelect from "./pages/ClassSelect";
import ClassDashboard from "./pages/ClassDashboard";

const queryClient = new QueryClient();

// Protected route wrapper
function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: "teacher" | "student" }) {
  const { user, isLoading, isTeacher, selectedClass } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Teachers must select a class first
  if (isTeacher && !selectedClass) {
    return <Navigate to="/class-select" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Class selection route wrapper (only for teachers without selected class)
function ClassSelectRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isTeacher, selectedClass } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Only teachers can access this page
  if (!isTeacher) {
    return <Navigate to="/" replace />;
  }

  // If already selected a class, go to dashboard
  if (selectedClass) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Public route wrapper (redirects if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isTeacher, selectedClass } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    // If teacher without selected class, go to class select
    if (isTeacher && !selectedClass) {
      return <Navigate to="/class-select" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/class-select" element={
        <ClassSelectRoute>
          <ClassSelect />
        </ClassSelectRoute>
      } />
      <Route path="*" element={
        <ProtectedRoute>
          <DashboardLayout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/rooms" element={<StudyRooms />} />
              <Route path="/quizzes" element={<Quizzes />} />
              <Route path="/puzzles" element={<Puzzles />} />
              <Route path="/planner" element={<Planner />} />
              <Route path="/assistant" element={<AIAssistant />} />
              <Route path="/materials" element={<Materials />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/animations" element={<Animations />} />
              <Route path="/experiments" element={<Experiments />} />
              <Route path="/teacher" element={
                <ProtectedRoute requiredRole="teacher">
                  <TeacherDashboard />
                </ProtectedRoute>
              } />
              <Route path="/teacher/class/:classId/dashboard" element={
                <ProtectedRoute requiredRole="teacher">
                  <ClassDashboard />
                </ProtectedRoute>
              } />
              <Route path="/levels" element={<LevelQuiz />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </DashboardLayout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
