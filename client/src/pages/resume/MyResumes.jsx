import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Eye, Pencil, Download, Trash2,
  Clock, RefreshCw, FileText, AlertCircle,
} from 'lucide-react';
import api from '../../utils/api';

// ── Accent colours cycling across cards ──────────────────────────────────
const ACCENTS = [
  { from: '#3b82f6', to: '#06b6d4' },
  { from: '#8b5cf6', to: '#7c3aed' },
  { from: '#10b981', to: '#0d9488' },
  { from: '#f59e0b', to: '#ef4444' },
];

// ── Circular ATS score ring ───────────────────────────────────────────────
function ScoreRing({ score }) {
  const r    = 22;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 90 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
        <circle
          cx="28" cy="28" r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.6s ease', filter: `drop-shadow(0 0 4px ${color}88)` }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-xs font-bold"
        style={{ color }}
      >
        {score}%
      </span>
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      className="rounded-2xl overflow-hidden animate-pulse"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', minHeight: '200px' }}
    >
      <div className="h-[3px] w-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
      <div className="p-5 space-y-3">
        <div className="flex justify-between gap-3">
          <div className="h-4 rounded-lg flex-1" style={{ background: 'rgba(255,255,255,0.07)' }} />
          <div className="w-14 h-14 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>
        <div className="flex gap-2">
          {[48, 36, 52].map(w => (
            <div key={w} className="h-5 rounded-full" style={{ width: w, background: 'rgba(255,255,255,0.05)' }} />
          ))}
        </div>
        <div className="h-3 w-32 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="flex gap-2 pt-2">
          <div className="flex-1 h-8 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }} />
          <div className="flex-1 h-8 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }} />
          <div className="w-8 h-8 rounded-lg"   style={{ background: 'rgba(255,255,255,0.05)' }} />
          <div className="w-8 h-8 rounded-lg"   style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>
      </div>
    </div>
  );
}

// ── Resume card ───────────────────────────────────────────────────────────
function ResumeCard({ resume, accentFrom, accentTo, badges, updatedAt, onEdit, onPreview, onDownload, onDelete, delay }) {
  return (
    <div
      className={`group flex flex-col rounded-2xl overflow-hidden card-hover animate-fade-up ${delay}`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    >
      {/* Accent bar */}
      <div
        className="h-[3px] w-full shrink-0"
        style={{ background: `linear-gradient(to right, ${accentFrom}, ${accentTo})` }}
      />

      <div className="flex flex-col flex-1 p-5">
        {/* Title + score ring */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3
            className="text-sm font-semibold leading-snug line-clamp-2 flex-1 pt-1"
            style={{ color: '#e2e8f0' }}
          >
            {resume.title}
          </h3>
          <ScoreRing score={resume.atsScore ?? 0} />
        </div>

        {/* Skill badges */}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {badges.map((b) => (
              <span
                key={b}
                className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                style={{
                  background: 'rgba(59,130,246,0.10)',
                  border: '1px solid rgba(59,130,246,0.25)',
                  color: '#93c5fd',
                }}
              >
                {b}
              </span>
            ))}
          </div>
        )}

        {/* Last updated */}
        <div className="flex items-center gap-1.5 text-[11px] mb-4 mt-auto" style={{ color: '#475569' }}>
          <Clock className="w-3 h-3 shrink-0" />
          Last Updated: {updatedAt}
        </div>

        {/* Action dock */}
        <div
          className="flex items-center gap-2 pt-3"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          {/* Preview */}
          <button
            onClick={onPreview}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg
                       text-[11px] font-semibold transition-all duration-200 active:scale-[0.97]"
            style={{ color: '#94a3b8', border: '1px solid rgba(255,255,255,0.09)', background: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = '#e2e8f0'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#94a3b8'; }}
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>

          {/* Edit */}
          <button
            onClick={onEdit}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg
                       text-[11px] font-semibold text-white transition-all duration-200 active:scale-[0.97]"
            style={{ background: '#3b82f6', boxShadow: '0 0 12px rgba(59,130,246,0.30)' }}
            onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
            onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>

          {/* Download */}
          <button
            onClick={onDownload}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 active:scale-[0.97]"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#475569' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.15)'; e.currentTarget.style.color = '#60a5fa'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#475569'; }}
            aria-label="Download PDF"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          <button
            onClick={onDelete}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 active:scale-[0.97]"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#475569' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#f87171'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#475569'; }}
            aria-label="Delete resume"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────
function EmptyState({ onCreateClick }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.20)' }}
      >
        <FileText className="w-7 h-7" style={{ color: '#60a5fa' }} />
      </div>
      <p className="text-base font-semibold text-white">No resumes yet</p>
      <p className="text-sm text-center max-w-xs" style={{ color: '#475569' }}>
        Create your first ATS-optimized resume and start landing more interviews.
      </p>
      <button
        onClick={onCreateClick}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                   text-white transition-all duration-200 active:scale-[0.97] mt-2"
        style={{ background: '#3b82f6', boxShadow: '0 0 20px rgba(59,130,246,0.35)' }}
        onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
        onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}
      >
        <Plus className="w-4 h-4" />
        Create New Resume
      </button>
    </div>
  );
}

// ── Spinner for create button ─────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-white/80 shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
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
        className="w-full max-w-md rounded-2xl p-8"
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
export default function MyResumes() {
  const navigate = useNavigate();

  const [resumes,   setResumes]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newTitle,  setNewTitle]  = useState('');
  const [creating,  setCreating]  = useState(false);

  // ── Fetch all resumes for the logged-in user ─────────────────────────────
  const fetchResumes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/resumes');
      const list = res.data.data ?? res.data;
      setResumes(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to load resumes. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resume? This cannot be undone.')) return;
    try {
      await api.delete(`/resumes/${id}`);
      setResumes(prev => prev.filter(r => r._id !== id));
    } catch {
      alert('Could not delete resume. Please try again.');
    }
  };

  // ── Create ────────────────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
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
        className="min-h-screen px-6 lg:px-8 py-8"
        style={{ backgroundColor: 'var(--bg-base)' }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-white">My Resumes</h1>
            <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
              {loading ? 'Loading…' : `${resumes.length} document${resumes.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchResumes}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                         transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
              style={{ color: '#94a3b8', border: '1px solid rgba(255,255,255,0.09)', background: 'transparent' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              onClick={openModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                         text-white transition-all duration-200 active:scale-[0.97]"
              style={{ background: '#3b82f6', boxShadow: '0 0 20px rgba(59,130,246,0.35)' }}
              onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
              onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}
            >
              <Plus className="w-4 h-4" />
              New Resume
            </button>
          </div>
        </div>

        {/* ── Error banner ────────────────────────────────────────────── */}
        {error && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm mb-6"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: '#f87171' }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              onClick={fetchResumes}
              className="text-xs font-semibold underline underline-offset-2 shrink-0 hover:opacity-75"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Grid ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

          {/* Loading skeletons */}
          {loading && [0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}

          {/* Empty state — shown only when loaded and truly empty */}
          {!loading && resumes.length === 0 && (
            <EmptyState onCreateClick={openModal} />
          )}

          {/* Resume cards */}
          {!loading && resumes.map((resume, i) => {
            const accent    = ACCENTS[i % ACCENTS.length];
            const badges    = resume.skills?.flatMap(s => s.items).slice(0, 4) ?? [];
            const updatedAt = new Date(resume.updatedAt).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            });

            return (
              <ResumeCard
                key={resume._id}
                resume={resume}
                accentFrom={accent.from}
                accentTo={accent.to}
                badges={badges}
                updatedAt={updatedAt}
                delay={`delay-${Math.min(i + 1, 6)}`}
                onEdit={()     => navigate(`/builder/${resume._id}`)}
                onPreview={()  => navigate(`/preview/${resume._id}`)}
                onDownload={()  => window.open(`/preview/${resume._id}`, '_blank', 'noopener,noreferrer')}
                onDelete={()   => handleDelete(resume._id)}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}
