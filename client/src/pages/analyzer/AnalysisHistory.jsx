import { useState, useEffect, useCallback } from 'react';
import { History, RefreshCw, FileText, TrendingUp, AlertCircle } from 'lucide-react';
import api from '../../utils/api';

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtBytes(bytes) {
  if (!bytes || bytes === 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function scoreColor(score) {
  if (score >= 80) return '#4ade80';
  if (score >= 60) return '#facc15';
  return '#f87171';
}

function marketFitBadge(fit) {
  const map = {
    High:   { bg: 'rgba(74,222,128,0.10)',  border: 'rgba(74,222,128,0.25)',  color: '#4ade80' },
    Medium: { bg: 'rgba(250,204,21,0.10)',  border: 'rgba(250,204,21,0.25)',  color: '#facc15' },
    Low:    { bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.25)', color: '#f87171' },
  };
  return map[fit] ?? map.Low;
}

// ── Sub-components ────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[260, 80, 100, 80, 100].map((w, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 rounded" style={{ width: w, background: 'rgba(255,255,255,0.06)' }} />
        </td>
      ))}
    </tr>
  );
}

function EmptyState() {
  return (
    <tr>
      <td colSpan={5}>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.20)' }}
          >
            <FileText className="w-7 h-7" style={{ color: '#818cf8' }} />
          </div>
          <p className="text-base font-semibold text-white">No scans yet</p>
          <p className="text-sm" style={{ color: '#475569' }}>
            Upload a resume in the AI Analyzer to see your history here.
          </p>
        </div>
      </td>
    </tr>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function AnalysisHistory() {
  const [analyses, setAnalyses] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/analyzer/history');
      setAnalyses(res.data.data?.analyses ?? res.data.data ?? []);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to load analysis history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => { await fetchHistory(); })();
  }, [fetchHistory]);

  return (
    <div
      className="min-h-screen px-6 lg:px-8 py-8"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.15)' }}
          >
            <History className="w-5 h-5" style={{ color: '#818cf8' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Scan History</h1>
            <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
              All your AI resume analysis runs
            </p>
          </div>
        </div>

        <button
          onClick={fetchHistory}
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
      </div>

      {/* ── Error banner ─────────────────────────────────────────────── */}
      {error && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm mb-6"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: '#f87171' }}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={fetchHistory}
            className="text-xs font-semibold underline underline-offset-2 shrink-0 hover:opacity-75"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Summary chips ─────────────────────────────────────────────── */}
      {!loading && !error && (
        <div className="flex flex-wrap gap-3 mb-6">
          <div
            className="px-4 py-2 rounded-xl text-sm"
            style={{
              background: 'rgba(99,102,241,0.10)',
              border: '1px solid rgba(99,102,241,0.20)',
              color: '#a5b4fc',
            }}
          >
            <span className="font-bold text-white">{analyses.length}</span>
            &nbsp;total scan{analyses.length !== 1 ? 's' : ''}
          </div>

          {analyses.length > 0 && (
            <div
              className="px-4 py-2 rounded-xl text-sm"
              style={{
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.20)',
                color: '#6ee7b7',
              }}
            >
              Avg score&nbsp;
              <span className="font-bold text-white">
                {Math.round(analyses.reduce((s, a) => s + (a.atsScore ?? 0), 0) / analyses.length)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['File Name', 'ATS Score', 'Domain', 'Market Fit', 'Scanned On'].map(h => (
                  <th
                    key={h}
                    className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: '#475569' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading && [0, 1, 2, 3, 4].map(i => <SkeletonRow key={i} />)}

              {!loading && analyses.length === 0 && <EmptyState />}

              {!loading && analyses.map((a) => {
                const badge = marketFitBadge(a.marketFit);
                return (
                  <tr
                    key={a._id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    className="transition-colors duration-150 hover:bg-white/[0.02]"
                  >
                    {/* File name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(99,102,241,0.12)' }}
                        >
                          <FileText className="w-4 h-4" style={{ color: '#818cf8' }} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[220px]" style={{ color: '#e2e8f0' }}>
                            {a.fileName ?? '—'}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
                            {fmtBytes(a.fileSize)}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* ATS Score */}
                    <td className="px-5 py-4">
                      <span
                        className="text-base font-bold"
                        style={{ color: scoreColor(a.atsScore ?? 0) }}
                      >
                        {a.atsScore ?? '—'}%
                      </span>
                    </td>

                    {/* Domain */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 shrink-0" style={{ color: '#60a5fa' }} />
                        <span style={{ color: '#cbd5e1' }}>{a.detectedDomain || '—'}</span>
                      </div>
                    </td>

                    {/* Market Fit */}
                    <td className="px-5 py-4">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{
                          background: badge.bg,
                          border: `1px solid ${badge.border}`,
                          color: badge.color,
                        }}
                      >
                        {a.marketFit ?? '—'}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4" style={{ color: '#64748b' }}>
                      {fmtDate(a.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
