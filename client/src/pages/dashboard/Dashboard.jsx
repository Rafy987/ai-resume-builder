import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
// ── Static widget data (not from API) ────────────────────────────────────
const AI_INSIGHTS = [
  { dot: '#10b981', color: '#6ee7b7', text: 'Resume score improved by 12% this week' },
  { dot: '#f59e0b', color: '#fcd34d', text: 'Add more production React keywords'     },
  { dot: '#ef4444', color: '#fca5a5', text: 'Missing professional summary section'   },
  { dot: '#3b82f6', color: '#93c5fd', text: 'Quantify your backend achievements'     },
];

const ACTIVITY = [
  { label: 'ATS Analysis Completed',             time: '2 hours ago', dot: '#10b981' },
  { label: 'Created "Software Engineer Resume"', time: 'Yesterday',   dot: '#3b82f6' },
  { label: 'Updated Full Stack Profile',         time: '5 days ago',  dot: '#06b6d4' },
  { label: 'Account created',                    time: 'Jun 4, 2026', dot: '#475569' },
];


// ── Spinner (reused in modal button) ─────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-white/80 shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Scroll progress bar ───────────────────────────────────────────────────
function ScrollProgress() {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = document.getElementById('dash-scroll');
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      setWidth(scrollHeight <= clientHeight ? 0 : (scrollTop / (scrollHeight - clientHeight)) * 100);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-[2px] z-[9999] pointer-events-none">
      <div
        className="h-full transition-all duration-75"
        style={{ width: `${width}%`, background: 'linear-gradient(to right, #3b82f6, #06b6d4)' }}
      />
    </div>
  );
}

// ── Create Resume Modal ───────────────────────────────────────────────────
function CreateModal({ newTitle, setNewTitle, creating, onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 animate-fade-up"
        style={{
          background: '#111827',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        }}
      >
        <h2 className="text-xl font-bold text-white mb-1">Name Your Resume</h2>
        <p className="text-sm mb-6" style={{ color: '#64748b' }}>
          Give it a clear title so you can find it easily.
        </p>

        <input
          autoFocus
          type="text"
          placeholder="e.g. Senior Frontend Engineer — Google"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onConfirm()}
          className="auth-input mb-6"
          style={{ paddingLeft: '16px' }}
        />

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.97]"
            style={{ color: '#94a3b8', border: '1px solid rgba(255,255,255,0.09)', background: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = '#e2e8f0'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#94a3b8'; }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={creating || !newTitle.trim()}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl
                       text-sm font-semibold text-white transition-all duration-200 active:scale-[0.97]
                       disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(to right,#3b82f6,#06b6d4)',
              boxShadow: '0 0 20px rgba(59,130,246,0.3)',
            }}
            onMouseEnter={e => { if (!creating) e.currentTarget.style.filter = 'brightness(1.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
          >
            {creating ? <><Spinner /> Creating…</> : 'Create Resume →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  // ── State ────────────────────────────────────────────────────────────────
  const [showModal,  setShowModal]  = useState(false);
  const [newTitle,   setNewTitle]   = useState('');
  const [creating,   setCreating]   = useState(false);

  // ── Analyzer stats state ─────────────────────────────────────────────────
  const [analyzerStats,        setAnalyzerStats]        = useState(null);
  const [analyzerStatsLoading, setAnalyzerStatsLoading] = useState(true);

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  // ── Fetch analyzer stats ─────────────────────────────────────────────────
  const fetchAnalyzerStats = useCallback(async () => {
    try {
      setAnalyzerStatsLoading(true);
      const res = await api.get('/analyzer/stats');
      setAnalyzerStats(res.data.data ?? null);
    } catch {
      setAnalyzerStats(null);
    } finally {
      setAnalyzerStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalyzerStats();
  }, [fetchAnalyzerStats]);

  // ── Create handler ───────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      setCreating(true);
      const res     = await api.post('/resumes', { title: newTitle.trim() });
      const created = res.data.data ?? res.data;
      setShowModal(false);
      setNewTitle('');
      navigate(`/builder/${created._id}`);
    } catch {
      alert('Could not create resume. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const openModal  = () => setShowModal(true);
  const closeModal = () => { setShowModal(false); setNewTitle(''); };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <ScrollProgress />

      {showModal && (
        <CreateModal
          newTitle={newTitle}
          setNewTitle={setNewTitle}
          creating={creating}
          onConfirm={handleCreate}
          onCancel={closeModal}
        />
      )}

      <div
        id="dash-scroll"
        className="min-h-screen px-6 lg:px-8 py-8 overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-base)' }}
      >

        {/* ── Hero banner ─────────────────────────────────────────────── */}
        <div
          className="relative overflow-hidden rounded-2xl px-8 py-8 mb-8 animate-fade-up delay-0 hero-dots"
          style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #1a1040 100%)' }}
        >
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl pointer-events-none"
               style={{ background: 'rgba(59,130,246,0.15)' }} />
          <div className="absolute bottom-0 left-1/3 w-40 h-40 rounded-full blur-2xl pointer-events-none"
               style={{ background: 'rgba(6,182,212,0.10)' }} />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: '#64748b' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Welcome back,{' '}
                <span className="text-gradient-blue-cyan">{firstName}</span>! 👋
              </h1>
              <p className="mt-2 text-sm max-w-md" style={{ color: '#94a3b8' }}>
                Create ATS-optimized resumes and land more corporate interviews.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 shrink-0">
              <button
                onClick={openModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold
                           text-white transition-all duration-200 active:scale-[0.97]"
                style={{ background: '#3b82f6', boxShadow: '0 0 20px rgba(59,130,246,0.35)' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#2563eb'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#3b82f6'; }}
              >
                <Plus className="w-4 h-4" />
                Create New Resume
              </button>

              <button
                onClick={() => navigate('/analyzer')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold
                           transition-all duration-200 active:scale-[0.97]"
                style={{ color: '#06b6d4', border: '1px solid #06b6d4', background: 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(6,182,212,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span className="animate-pulse-dot w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <Sparkles className="w-4 h-4" />
                Run AI Audit
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats row ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          {[
            {
              label: 'Resumes Scanned',
              value: analyzerStatsLoading ? '—' : String(analyzerStats?.totalScans ?? 0),
              sub: analyzerStats?.totalScans === 0 || analyzerStats == null
                ? 'No scans yet'
                : `${analyzerStats.totalScans} AI analysis run${analyzerStats.totalScans !== 1 ? 's' : ''}`,
              iconBg: 'rgba(59,130,246,0.12)',
              valueGradient: 'linear-gradient(to right,#3b82f6,#06b6d4)',
              delay: 'delay-1',
              icon: (
                <svg className="w-5 h-5" style={{ color: '#3b82f6' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              ),
              extra: analyzerStats?.totalScans > 0 ? (
                <button
                  onClick={() => navigate('/history')}
                  className="text-xs font-semibold underline underline-offset-2 mt-1 transition-colors duration-150"
                  style={{ color: '#06b6d4' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#22d3ee'}
                  onMouseLeave={e => e.currentTarget.style.color = '#06b6d4'}
                >
                  View history →
                </button>
              ) : null,
            },
            {
              label: 'Avg. ATS Score',
              value: analyzerStatsLoading
                ? '—'
                : analyzerStats?.totalScans
                  ? `${analyzerStats.averageAtsScore}%`
                  : 'N/A',
              sub: analyzerStats?.topDomain
                ? `Top domain: ${analyzerStats.topDomain}`
                : 'Across all scans',
              iconBg: 'rgba(245,158,11,0.12)',
              valueGradient: 'linear-gradient(to right,#10b981,#06b6d4)',
              delay: 'delay-2',
              icon: (
                <svg className="w-5 h-5" style={{ color: '#f59e0b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              ),
              extra: null,
            },
            {
              label: 'Current Plan',
              value: user?.plan ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1) : 'Free',
              sub: null,
              iconBg: 'rgba(139,92,246,0.12)',
              valueGradient: 'linear-gradient(to right,#8b5cf6,#a78bfa)',
              delay: 'delay-3',
              icon: (
                <svg className="w-5 h-5" style={{ color: '#8b5cf6' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              ),
              extra: (
                <button className="text-xs font-semibold underline underline-offset-2 mt-1 transition-colors duration-150"
                  style={{ color: '#06b6d4' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#22d3ee'}
                  onMouseLeave={e => e.currentTarget.style.color = '#06b6d4'}
                >
                  Upgrade →
                </button>
              ),
            },
          ].map(({ label, value, sub, extra, iconBg, icon, valueGradient, delay }) => (
            <div
              key={label}
              className={`glass-card rounded-2xl px-6 py-5 flex items-center gap-4 animate-fade-up ${delay}`}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: iconBg }}>
                {icon}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>{label}</p>
                <p className="text-2xl font-bold mt-0.5 leading-none"
                   style={{ background: valueGradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {value}
                </p>
                {sub   && <p className="text-xs mt-1 truncate" style={{ color: '#475569' }}>{sub}</p>}
                {extra}
              </div>
            </div>
          ))}
        </div>

        {/* ── Main 2-col layout ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_288px] gap-7">

          {/* LEFT: quick actions */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold" style={{ color: '#e2e8f0' }}>Quick Actions</h2>
            </div>

            <div className="flex justify-start">
              {/* Create New Resume — primary action card */}
              <button
                onClick={openModal}
                className="group flex flex-col items-center justify-center gap-3
                           min-h-[200px] w-full max-w-xs rounded-2xl p-6
                           card-hover active:scale-[0.99] transition-all duration-200
                           focus:outline-none animate-fade-up delay-4"
                style={{
                  border: '2px dashed rgba(59,130,246,0.30)',
                  background: 'rgba(59,130,246,0.03)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.background  = 'rgba(59,130,246,0.07)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(59,130,246,0.30)';
                  e.currentTarget.style.background  = 'rgba(59,130,246,0.03)';
                }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center
                              group-hover:scale-110 transition-transform duration-200"
                  style={{
                    background: 'linear-gradient(135deg,#3b82f6,#06b6d4)',
                    boxShadow: '0 0 20px rgba(59,130,246,0.40)',
                  }}
                >
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold transition-colors duration-200" style={{ color: '#94a3b8' }}>
                    Create New Resume
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#475569' }}>AI-assisted from scratch</p>
                </div>
              </button>
            </div>
          </div>

          {/* RIGHT: widgets */}
          <div className="space-y-5">

            {/* AI Insights */}
            <div className="glass-card rounded-2xl overflow-hidden animate-fade-up delay-2">
              <div className="px-5 py-4 flex items-center gap-2"
                   style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <Sparkles className="w-4 h-4" style={{ color: '#8b5cf6' }} />
                <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>AI Insights</h3>
              </div>
              <div className="px-5 py-4 space-y-2.5">
                {AI_INSIGHTS.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-default
                               transition-all duration-150 hover:opacity-90"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <span
                      className="mt-1 w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.dot, boxShadow: `0 0 6px ${item.dot}` }}
                    />
                    <span className="text-xs leading-snug" style={{ color: item.color }}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Market Fit Breakdown (live from analyzer stats) */}
            {!analyzerStatsLoading && analyzerStats?.marketFitBreakdown?.length > 0 && (
              <div className="glass-card rounded-2xl overflow-hidden animate-fade-up delay-2">
                <div className="px-5 py-4 flex items-center gap-2"
                     style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <svg className="w-4 h-4" style={{ color: '#10b981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                  <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Market Fit Breakdown</h3>
                </div>
                <div className="px-5 py-4 space-y-3">
                  {analyzerStats.marketFitBreakdown.map(({ marketFit, count }) => {
                    const total = analyzerStats.totalScans || 1;
                    const pct   = Math.round((count / total) * 100);
                    const colorMap = { High: '#4ade80', Medium: '#facc15', Low: '#f87171' };
                    const barColor = colorMap[marketFit] ?? '#94a3b8';
                    return (
                      <div key={marketFit}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span style={{ color: '#cbd5e1' }}>{marketFit}</span>
                          <span style={{ color: '#475569' }}>{count} scan{count !== 1 ? 's' : ''} · {pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: barColor, boxShadow: `0 0 6px ${barColor}66` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="glass-card rounded-2xl overflow-hidden animate-fade-up delay-3">
              <div className="px-5 py-4 flex items-center gap-2"
                   style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <Clock className="w-4 h-4" style={{ color: '#475569' }} />
                <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Recent Activity</h3>
              </div>
              <div className="px-5 py-4">
                <ol className="relative ml-2 space-y-4"
                    style={{ borderLeft: '1px solid rgba(255,255,255,0.07)' }}>
                  {ACTIVITY.map((item, i) => (
                    <li key={i} className="pl-5 relative">
                      <span
                        className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2"
                        style={{
                          backgroundColor: item.dot,
                          borderColor: 'var(--bg-base)',
                          boxShadow: `0 0 6px ${item.dot}66`,
                        }}
                      />
                      <p className="text-xs font-medium leading-snug" style={{ color: '#cbd5e1' }}>
                        {item.label}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: '#475569' }}>{item.time}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}


