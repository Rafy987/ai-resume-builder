import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, FileText, Sparkles, Settings, History, FileSignature, BrainCircuit } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard'        },
  { to: '/resumes',         icon: FileText,        label: 'My Resumes'       },
  { to: '/analyzer',        icon: Sparkles,        label: 'AI Analyzer'      },
  { to: '/cover-letter',    icon: FileSignature,   label: 'Cover Letter'     },
  { to: '/interview-prep',  icon: BrainCircuit,    label: 'Interview Prep'   },
  { to: '/history',         icon: History,         label: 'Scan History'     },
  { to: '/settings',        icon: Settings,        label: 'Settings'         },
];

export default function Sidebar() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '??';

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  return (
    <aside
      className="hidden md:flex flex-col w-64 shrink-0 sticky top-0 h-screen"
      style={{
        backgroundColor: 'var(--bg-base)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      {/* ── Brand ───────────────────────────────────────────────────── */}
      <div className="px-6 pt-7 pb-6" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {/* Glow blob behind logo */}
        <div
          className="absolute w-24 h-8 rounded-full blur-2xl pointer-events-none -translate-x-2"
          style={{ background: 'rgba(59,130,246,0.18)' }}
        />
        <div className="relative flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
              boxShadow: '0 0 16px rgba(59,130,246,0.45)',
            }}
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75" />
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight text-gradient-blue-cyan">ResumeAI</span>
        </div>
      </div>

      {/* ── Navigation ──────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
               ${isActive ? 'nav-active' : 'nav-inactive hover:text-slate-300'}`
            }
            style={({ isActive }) => isActive
              ? { background: 'rgba(59,130,246,0.08)', borderLeft: '3px solid #3b82f6', color: '#93c5fd' }
              : { borderLeft: '3px solid transparent' }
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className="w-[18px] h-[18px] shrink-0 transition-colors duration-200"
                  style={{ color: isActive ? '#60a5fa' : '#475569' }}
                />
                <span>{label}</span>
                {isActive && (
                  <span
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: '#3b82f6' }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── User + Logout ───────────────────────────────────────────── */}
      <div className="px-3 pb-5 pt-4 space-y-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        {/* User profile row */}
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}
          >
            <span className="text-xs font-bold text-white leading-none">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate leading-tight" style={{ color: '#e2e8f0' }}>
              {user?.name ?? 'User'}
            </p>
            <span
              className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize mt-0.5"
              style={{ background: 'rgba(139,92,246,0.18)', color: '#c4b5fd' }}
            >
              {user?.plan ?? 'Free'}
            </span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                     transition-all duration-200 group"
          style={{ color: '#64748b' }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#f87171';
            e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#64748b';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0 transition-colors duration-200" />
          Logout
        </button>
      </div>
    </aside>
  );
}
