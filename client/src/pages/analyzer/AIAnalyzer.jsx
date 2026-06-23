import { useState, useRef } from 'react';
import {
  UploadCloud, AlertTriangle, CheckCircle,
  Check, XCircle, TrendingUp, Briefcase, Tag,
} from 'lucide-react';
import api from '../../utils/api';

// ── Keyframe injection (done once via a <style> tag in the JSX) ───────────
const STYLES = `
@keyframes scanDown {
  0%   { top: 0%;   opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}
@keyframes dotFade {
  0%, 100% { opacity: 0.2; }
  50%       { opacity: 1;   }
}
`;

// ── Score colour helper ───────────────────────────────────────────────────
function scoreColor(score) {
  if (score >= 80) return '#4ade80'; // green-400
  if (score >= 60) return '#facc15'; // yellow-400
  return '#f87171';                  // red-400
}

function marketFitColor(fit) {
  if (fit === 'High')   return '#4ade80';
  if (fit === 'Medium') return '#facc15';
  return '#f87171';
}

// ── Animated loading dots ─────────────────────────────────────────────────
function Dots() {
  return (
    <span className="inline-flex gap-0.5 ml-1">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            width: 4, height: 4,
            borderRadius: '50%',
            background: '#94a3b8',
            animation: `dotFade 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </span>
  );
}

// ── Circular SVG gauge ────────────────────────────────────────────────────
function ScoreGauge({ score }) {
  const r    = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color  = scoreColor(score);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 140 140" className="w-36 h-36">
        {/* Track */}
        <circle
          cx="70" cy="70" r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="10"
        />
        {/* Progress */}
        <circle
          cx="70" cy="70" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
          style={{
            transition: 'stroke-dashoffset 0.8s ease',
            filter: `drop-shadow(0 0 6px ${color}88)`,
          }}
        />
        {/* Centre label */}
        <text
          x="70" y="65"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontFamily="Inter, sans-serif"
          fontSize="26"
          fontWeight="900"
        >
          {score}%
        </text>
        <text
          x="70" y="87"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#64748b"
          fontFamily="Inter, sans-serif"
          fontSize="10"
          letterSpacing="1"
        >
          ATS SCORE
        </text>
      </svg>
    </div>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────
function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl p-6 ${className}`}
      style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
export default function AIAnalyzer() {
  const [phase,    setPhase]    = useState('idle');
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [results,  setResults]  = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef            = useRef(null);

  // ── File validation ─────────────────────────────────────────────────────
  const validateFile = (file) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowed.includes(file.type)) return 'Only PDF or DOCX files are supported.';
    if (file.size > 5 * 1024 * 1024)  return 'File size must be under 5MB.';
    return null;
  };

  // ── Upload & analyse ────────────────────────────────────────────────────
  const handleFileUpload = async (file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setErrorMsg(validationError);
      setPhase('error');
      return;
    }
    setFileName(file.name);
    setPhase('processing');
    setErrorMsg('');
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const res = await api.post('/analyzer/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        transformRequest: (data, headers) => {
          // Delete any preset common json configurations for this multi-part request block
          delete headers['Content-Type'];
          return data; // Let the browser seamlessly append its own FormData boundary
        },
      });
      const data = res.data.data ?? res.data;
      setResults(data);
      setPhase('results');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Analysis failed. Please try again.';
      setErrorMsg(msg);
      setPhase('error');
    }
  };

  // ── Drag & drop / input ─────────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };
  const handleDragOver  = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = ()  => setDragOver(false);
  const handleInputChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
  };
  const handleReset = () => {
    setPhase('idle');
    setResults(null);
    setFileName('');
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{STYLES}</style>

      <div
        className="min-h-screen p-6 md:p-10"
        style={{ background: '#0a0f1e', animation: 'fadeUp 0.5s ease forwards' }}
      >

        {/* ════════════════ IDLE ════════════════ */}
        {phase === 'idle' && (
          <div className="min-h-[70vh] flex flex-col items-center justify-center px-6">
            {/* Header */}
            <h1 className="text-3xl font-bold text-white text-center">AI Resume Analyzer</h1>
            <p className="text-slate-400 text-center max-w-xl mt-2 mb-10 text-sm leading-relaxed">
              Upload your resume and get an instant ATS score, market fit analysis,
              and AI-powered improvement suggestions.
            </p>

            {/* Dropzone */}
            <div className="w-full max-w-2xl">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl p-16 text-center border-2 border-dashed cursor-pointer transition-all duration-300"
                style={{
                  background:   dragOver ? 'rgba(99,102,241,0.05)' : '#111827',
                  borderColor:  dragOver ? 'rgba(99,102,241,0.70)' : 'rgba(99,102,241,0.30)',
                  transform:    dragOver ? 'scale(1.01)' : 'scale(1)',
                }}
              >
                {/* Icon */}
                <div
                  className="inline-flex items-center justify-center rounded-2xl p-4 mb-2"
                  style={{ background: 'rgba(99,102,241,0.10)' }}
                >
                  <UploadCloud className="w-16 h-16" style={{ color: '#818cf8' }} />
                </div>

                <h2 className="text-xl font-semibold text-white mt-2">
                  Drop your resume here
                </h2>
                <p className="text-slate-400 text-sm mt-1">or click to browse files</p>

                {/* CTA button */}
                <button
                  className="mt-8 px-8 py-3 rounded-xl font-semibold text-white
                             transition-all duration-200 active:scale-[0.97]"
                  style={{
                    background: 'linear-gradient(to right, #4f46e5, #3b82f6)',
                    boxShadow:  '0 0 20px rgba(79,70,229,0.35)',
                  }}
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                  onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                >
                  📁 Select Resume File
                </button>

                <p className="text-xs mt-4" style={{ color: '#475569' }}>
                  Supports PDF and DOCX · Max 5MB
                </p>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={handleInputChange}
              />
            </div>
          </div>
        )}

        {/* ════════════════ PROCESSING ════════════════ */}
        {phase === 'processing' && (
          <div className="min-h-[70vh] flex flex-col items-center justify-center px-6">
            {/* Document mockup with scanning line */}
            <div
              className="relative overflow-hidden rounded-xl mx-auto shadow-2xl"
              style={{
                width: 256, height: 320,
                background: '#111827',
                border: '1px solid rgba(255,255,255,0.10)',
              }}
            >
              {/* Placeholder text lines */}
              {[
                'w-3/4', 'w-full', 'w-5/6', 'w-full',
                'w-2/3', 'w-full', 'w-4/5', 'w-full',
              ].map((w, i) => (
                <div
                  key={i}
                  className={`${w} h-3 rounded mx-6 my-3`}
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                />
              ))}

              {/* Scanning line */}
              <div
                style={{
                  position: 'absolute',
                  left: 0, right: 0,
                  height: 2,
                  background: 'linear-gradient(90deg, transparent, #6366f1, #06b6d4, transparent)',
                  boxShadow: '0 0 12px #6366f1, 0 0 24px #06b6d4',
                  animation: 'scanDown 2s ease-in-out infinite',
                }}
              />
            </div>

            {/* File name */}
            <p className="text-slate-300 text-sm mt-6 font-medium">
              Analyzing: <span style={{ color: '#818cf8' }}>{fileName}</span>
            </p>

            {/* Status */}
            <p className="text-slate-400 text-sm mt-2 flex items-center gap-1">
              Scanning your resume <Dots />
            </p>

            {/* Progress steps */}
            <div className="mt-6 space-y-2">
              {[
                { label: 'Extracting text content',       state: 'done',    delay: '0s'    },
                { label: 'Scanning ATS keywords',         state: 'done',    delay: '0.4s'  },
                { label: 'Calculating market fit score',  state: 'loading', delay: '0.8s'  },
                { label: 'Generating gap analysis',       state: 'pending', delay: '1.2s'  },
              ].map(({ label, state, delay }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 text-xs"
                  style={{
                    color: state === 'pending' ? '#334155' : '#64748b',
                    animation: `fadeUp 0.4s ease both`,
                    animationDelay: delay,
                  }}
                >
                  {state === 'done' && (
                    <span
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: '#4f46e5' }}
                    >
                      <Check className="w-2 h-2 text-white" />
                    </span>
                  )}
                  {state === 'loading' && (
                    <svg
                      className="w-3.5 h-3.5 animate-spin shrink-0"
                      fill="none" viewBox="0 0 24 24"
                      style={{ color: '#818cf8' }}
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {state === 'pending' && (
                    <span
                      className="w-3.5 h-3.5 rounded-full border shrink-0"
                      style={{ borderColor: '#1e293b' }}
                    />
                  )}
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════ RESULTS ════════════════ */}
        {phase === 'results' && results && (
          <div>
            {/* Results header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white">Analysis Complete</h2>
                <p className="text-slate-400 text-sm mt-1">Resume: {fileName}</p>
              </div>
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                           text-sm font-medium text-slate-300 transition-all duration-200
                           active:scale-[0.97]"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                🔄 Analyze Another Document
              </button>
            </div>

            {/* ── Row 1: 3 stat chips ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {/* ATS Score chip */}
              <Card>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(99,102,241,0.15)' }}
                >
                  <svg className="w-5 h-5" style={{ color: '#818cf8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
                  </svg>
                </div>
                <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: '#475569' }}>ATS Score</p>
                <p className="text-4xl font-black mt-1" style={{ color: scoreColor(results.score) }}>
                  {results.score}%
                </p>
              </Card>

              {/* Domain chip */}
              <Card>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(59,130,246,0.12)' }}
                >
                  <Briefcase className="w-5 h-5" style={{ color: '#60a5fa' }} />
                </div>
                <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: '#475569' }}>Detected Domain</p>
                <p className="text-2xl font-bold text-white mt-1">{results.domain}</p>
              </Card>

              {/* Market Fit chip */}
              <Card>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(6,182,212,0.12)' }}
                >
                  <TrendingUp className="w-5 h-5" style={{ color: '#22d3ee' }} />
                </div>
                <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: '#475569' }}>Market Fit</p>
                <p className="text-2xl font-bold mt-1" style={{ color: marketFitColor(results.marketFit) }}>
                  {results.marketFit}
                </p>
              </Card>
            </div>

            {/* ── Row 2: Gauge + Gap Analysis ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Gauge + Summary */}
              <Card>
                <ScoreGauge score={results.score} />
                <div
                  className="rounded-xl p-4 mt-4"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <p className="text-slate-300 text-sm leading-relaxed">{results.summary}</p>
                </div>
              </Card>

              {/* Gap Analysis */}
              <Card>
                <h3 className="text-lg font-semibold text-white mb-4">AI Recommendations</h3>
                <div className="space-y-3">
                  {results.gapAnalysis?.map((gap, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-xl p-4"
                      style={{
                        background: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.20)',
                      }}
                    >
                      <AlertTriangle
                        className="w-4 h-4 shrink-0 mt-0.5"
                        style={{ color: '#fbbf24' }}
                      />
                      <p className="text-sm leading-relaxed" style={{ color: '#fde68a' }}>{gap}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* ── Row 3: Strengths + Keywords ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Strengths */}
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5" style={{ color: '#4ade80' }} />
                  <h3 className="text-lg font-semibold text-white">Strengths Found</h3>
                </div>
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  {results.strengths?.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 py-2.5">
                      <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#4ade80' }} />
                      <p className="text-sm" style={{ color: '#cbd5e1' }}>{s}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Keywords */}
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="w-5 h-5" style={{ color: '#60a5fa' }} />
                  <h3 className="text-lg font-semibold text-white">Keyword Analysis</h3>
                </div>

                {/* Found */}
                <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: '#475569' }}>
                  Found Keywords
                </p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {results.keywords?.found?.map((kw) => (
                    <span
                      key={kw}
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: 'rgba(74,222,128,0.10)',
                        border: '1px solid rgba(74,222,128,0.25)',
                        color: '#4ade80',
                      }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>

                {/* Missing */}
                <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: '#475569' }}>
                  Missing Keywords
                </p>
                <div className="flex flex-wrap gap-2">
                  {results.keywords?.missing?.map((kw) => (
                    <span
                      key={kw}
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: 'rgba(248,113,113,0.10)',
                        border: '1px solid rgba(248,113,113,0.25)',
                        color: '#f87171',
                      }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ════════════════ ERROR ════════════════ */}
        {phase === 'error' && (
          <div className="min-h-[70vh] flex flex-col items-center justify-center px-6">
            <div
              className="rounded-2xl p-12 text-center w-full max-w-md"
              style={{ background: '#111827', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <XCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#f87171' }} />
              <h3 className="text-xl font-bold text-white mb-2">Analysis Failed</h3>
              <p className="text-sm mb-8" style={{ color: '#f87171' }}>{errorMsg}</p>

              <button
                onClick={handleReset}
                className="w-full py-3 rounded-xl font-semibold text-white
                           transition-all duration-200 active:scale-[0.97]"
                style={{ background: '#4f46e5' }}
                onMouseEnter={e => e.currentTarget.style.background = '#4338ca'}
                onMouseLeave={e => e.currentTarget.style.background = '#4f46e5'}
              >
                🔄 Try Again
              </button>

              <button
                onClick={handleReset}
                className="block text-center text-sm mt-3 w-full transition-colors duration-150"
                style={{ color: '#64748b' }}
                onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'}
                onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
              >
                ← Back
              </button>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
