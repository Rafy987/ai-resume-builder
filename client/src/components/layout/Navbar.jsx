import { useNavigate, Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  // Build avatar initials from the user's name
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : null;

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Brand ── */}
          <Link
            to="/dashboard"
            className="flex items-center gap-2 select-none"
          >
            {/* Logo mark */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75" />
              </svg>
            </div>
            <span className="text-base font-bold text-gray-900 tracking-tight">ResumeAI</span>
          </Link>

          {/* ── Right side ── */}
          {user ? (
            <div className="flex items-center gap-3">
              {/* Avatar + name */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-sm">
                  <span className="text-xs font-semibold text-white leading-none">{initials}</span>
                </div>
                <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-[140px] truncate">
                  {user.name}
                </span>
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px h-5 bg-slate-200" />

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                           text-sm font-medium text-slate-500
                           border border-slate-200 bg-white
                           hover:text-red-600 hover:border-red-200 hover:bg-red-50
                           active:scale-[0.97] transition-all duration-150
                           focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                aria-label="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            /* Guest state — show sign-in link */
            <Link
              to="/login"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Sign in
            </Link>
          )}

        </div>
      </div>
    </nav>
  );
}
