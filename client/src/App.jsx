import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/layout/Sidebar';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/dashboard/Dashboard';
import ResumeBuilder from './pages/resume/ResumeBuilder';
import ResumePreview from './pages/resume/ResumePreview';
import MyResumes from './pages/resume/MyResumes';
import AIAnalyzer from './pages/analyzer/AIAnalyzer';
import AnalysisHistory from './pages/analyzer/AnalysisHistory';
import Settings from './pages/settings/Settings';
import CoverLetterGenerator from './pages/cover-letter/CoverLetterGenerator';
import InterviewPrep from './pages/interview/InterviewPrep';

const AUTH_ROUTES = ['/login', '/register'];

function AppLayout() {
  const { pathname } = useLocation();
  const { hydrated } = useAuth();
  const isAuthPage = AUTH_ROUTES.includes(pathname);

  // Auth pages: full-screen, no chrome — render immediately (no token needed)
  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    );
  }

  // Block app routes until the startup token check finishes.
  // This prevents the dashboard from firing GET /resumes before the
  // Authorization header is ready, which would cause a spurious 401.
  if (!hydrated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-base)' }}
      >
        <div className="flex items-center gap-3" style={{ color: '#334155' }}>
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    );
  }

  // App pages: sidebar + scrollable main canvas
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg-base)' }}>
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <Routes>
          <Route path="/"              element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/resumes"       element={<MyResumes />} />
          <Route path="/builder"       element={<ResumeBuilder />} />
          <Route path="/builder/:id"   element={<ResumeBuilder />} />
          <Route path="/preview/:id"   element={<ResumePreview />} />
          <Route path="/analyzer"      element={<AIAnalyzer />} />
          <Route path="/cover-letter"    element={<CoverLetterGenerator />} />
          <Route path="/interview-prep"  element={<InterviewPrep />} />
          <Route path="/history"       element={<AnalysisHistory />} />
          <Route path="/settings"      element={<Settings />} />
          <Route path="*"              element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout />
      </Router>
    </AuthProvider>
  );
}
