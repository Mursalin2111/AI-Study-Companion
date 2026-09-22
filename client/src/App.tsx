import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { LanguageProvider } from './context/LanguageContext.js';
import { NotificationProvider } from './context/NotificationContext.js';
import { Layout } from './components/Layout.js';

// Views
import { LoginView } from './views/LoginView.js';
import { RegisterView } from './views/RegisterView.js';
import { DashboardView } from './views/DashboardView.js';
import { SubjectsView } from './views/SubjectsView.js';
import { SubjectDetailView } from './views/SubjectDetailView.js';
import { MaterialsView } from './views/MaterialsView.js';
import { MaterialDetailView } from './views/MaterialDetailView.js';
import { AskAIView } from './views/AskAIView.js';
import { FlashcardsView } from './views/FlashcardsView.js';
import { QuizzesView } from './views/QuizzesView.js';
import { QuizActiveView } from './views/QuizActiveView.js';
import { StudyPlannerView } from './views/StudyPlannerView.js';
import { NotesView } from './views/NotesView.js';
import { ProgressAnalyticsView } from './views/ProgressAnalyticsView.js';
import { AdminView } from './views/AdminView.js';
import { SettingsView } from './views/SettingsView.js';
import { Sparkles, Loader2 } from 'lucide-react';

const FullPageLoader: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
    <div className="relative flex items-center justify-center mb-4">
      <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 flex items-center justify-center animate-pulse">
        <Sparkles className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
      </div>
      <Loader2 className="w-16 h-16 text-indigo-600 dark:text-indigo-400 animate-spin absolute" />
    </div>
    <p className="text-sm font-medium tracking-wide text-slate-500 dark:text-slate-400">
      Loading AI Study Companion...
    </p>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <NotificationProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Auth Routes */}
                <Route
                  path="/login"
                  element={
                    <PublicOnlyRoute>
                      <LoginView />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <PublicOnlyRoute>
                      <RegisterView />
                    </PublicOnlyRoute>
                  }
                />

                {/* Protected Student / Teacher App Routes */}
                <Route
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/" element={<DashboardView />} />
                  <Route path="/subjects" element={<SubjectsView />} />
                  <Route path="/subjects/:id" element={<SubjectDetailView />} />
                  <Route path="/materials" element={<MaterialsView />} />
                  <Route path="/materials/:id" element={<MaterialDetailView />} />
                  <Route path="/ask-ai" element={<AskAIView />} />
                  <Route path="/flashcards" element={<FlashcardsView />} />
                  <Route path="/quizzes" element={<QuizzesView />} />
                  <Route path="/quizzes/:id" element={<QuizActiveView />} />
                  <Route path="/study-plan" element={<StudyPlannerView />} />
                  <Route path="/notes" element={<NotesView />} />
                  <Route path="/progress" element={<ProgressAnalyticsView />} />
                  <Route
                    path="/admin"
                    element={
                      <AdminRoute>
                        <AdminView />
                      </AdminRoute>
                    }
                  />
                  <Route path="/settings" element={<SettingsView />} />
                </Route>

                {/* Fallback route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </NotificationProvider>
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};
export default App;
