import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BrainCircuit, ChevronDown, Printer, FileText,
  Sparkles, AlertCircle, CheckCircle, Lightbulb,
  Code2, Users, RefreshCw, BookOpen,
} from 'lucide-react';
import api from '../../utils/api';

// ─── Difficulty badge ─────────────────────────────────────────────────────
const DIFF_STYLE = {
  Easy:   { bg: 'rgba(74,222,128,0.10)', color: '#4ade80', border: 'rgba(74,222,128,0.25)' },
  Medium: { bg: 'rgba(251,191,36,0.10)', color: '#fbbf24', border: 'rgba(251,191,36,0.25)' },
  Hard:   { bg: 'rgba(248,113,113,0.10)', color: '#f87171', border: 'rgba(248,113,113,0.25)' },
};

function DiffBadge({ level }) {
  const s = DIFF_STYLE[level] || DIFF_STYLE.Medium;
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {level}
    </span>
  );
}

// ─── Accordion item ───────────────────────────────────────────────────────
function AccordionItem({ index, question, idealAnswer, hint, difficulty, type }) {
  const [open, setOpen] = useState(false);
  const typeColor = type === 'technical' ? '#60a5fa' : '#c4b5fd';
  const typeBg    = type === 'technical' ? 'rgba(59,130,246,0.08)' : 'rgba(139,92,246,0.08)';

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: open ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${open ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      {/* Question row — clickable */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 px-5 py-4 text-left transition-colors duration-150"
        style={{ background: 'transparent' }}
      >
        {/* Number bubble */}
        <span
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mt-0.5"
          style={{ background: typeBg, color: typeColor }}
        >
          {index}
        </span>

        {/* Question text */}
        <span className="flex-1 text-sm font-medium leading-snug pr-2" style={{ color: '#e2e8f0' }}>
          {question}
        </span>

        {/* Right side: badge + chevron */}
        <div className="flex-shrink-0 flex items-center gap-2 mt-0.5">
          <DiffBadge level={difficulty} />
          <ChevronDown
            className="w-4 h-4 transition-transform duration-200"
            style={{
              color: '#475569',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </div>
      </button>

      {/* Answer panel — slide open */}
      {open && (
        <div className="px-5 pb-5 pt-1 space-y-4 animate-fade-up">
          {/* Ideal Answer */}
          <div
            className="rounded-xl p-4"
            style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.12)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 shrink-0" style={{ color: '#60a5fa' }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#60a5fa' }}>
                Ideal Answer Structure
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#cbd5e1' }}>
              {idealAnswer}
            </p>
          </div>

          {/* Pro tip */}
          <div
            className="rounded-xl p-4"
            style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.12)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 shrink-0" style={{ color: '#fbbf24' }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#fbbf24' }}>
                Recruiter Hint
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#fde68a' }}>
              {hint}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Question section (Technical / Behavioral) ────────────────────────────
function QuestionSection({ title, icon: Icon, iconColor, questions, type }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: type === 'technical' ? 'rgba(59,130,246,0.12)' : 'rgba(139,92,246,0.12)' }}
        >
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
        </div>
        <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>{title}</h3>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full ml-1"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#64748b' }}
        >
          {questions.length} questions
        </span>
      </div>

      <div className="space-y-2">
        {questions.map((q, i) => (
          <AccordionItem
            key={i}
            index={i + 1}
            type={type}
            question={q.question}
            idealAnswer={q.idealAnswer}
            hint={q.hint}
            difficulty={q.difficulty}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Resume selector card ─────────────────────────────────────────────────
function ResumeCard({ resume, selected, onSelect }) {
  const skills = (resume.skills || []).flatMap(s => s.items || []).slice(0, 3);
  return (
    <button
      onClick={() => onSelect(resume._id)}
      className="w-full text-left px-4 py-3.5 rounded-xl transition-all duration-200"
      style={{
        background: selected ? 'rgba(59,130,246,0.10)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${selected ? 'rgba(59,130,246,0.40)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: selected ? '0 0 0 2px rgba(59,130,246,0.20)' : 'none',
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-sm font-semibold leading-tight" style={{ color: selected ? '#93c5fd' : '#e2e8f0' }}>
          {resume.title || 'Untitled Resume'}
        </p>
        {selected && (
          <span
            className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(59,130,246,0.20)', color: '#60a5fa' }}
          >
            Selected
          </span>
        )}
      </div>
      {resume.targetJobTitle && (
        <p className="text-xs mb-1.5" style={{ color: '#64748b' }}>
          {resume.targetJobTitle}
        </p>
      )}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {skills.map(s => (
            <span
              key={s}
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#64748b' }}
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

// ─── Loading shimmer ──────────────────────────────────────────────────────
function Shimmer() {
  const lines = [
    'w-3/4','w-full','w-5/6','w-4/5','w-full',
    'w-2/3','w-full','w-5/6','w-full','w-3/4',
  ];
  return (
    <div className="space-y-2.5 animate-pulse pt-2">
      {lines.map((w, i) => (
        <div key={i} className={`h-3 rounded-full ${w}`} style={{ background: 'rgba(255,255,255,0.07)' }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
export default function InterviewPrep() {
  const [resumes,      setResumes]      = useState([]);
  const [selectedId,   setSelectedId]   = useState('');
  const [loadingRes,   setLoadingRes]   = useState(true);
  const [generating,   setGenerating]   = useState(false);
  const [result,       setResult]       = useState(null);
  const [error,        setError]        = useState('');
  const prevTitle                       = useRef('');

  // Fetch user's resumes on mount — auto-select the most recent
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingRes(true);
        const res = await api.get('/resumes');
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setResumes(list);
        if (list.length > 0) setSelectedId(list[0]._id);
      } catch {
        setError('Could not load your resumes. Please refresh.');
      } finally {
        setLoadingRes(false);
      }
    };
    load();
  }, []);

  // Generate questions
  const handleGenerate = useCallback(async () => {
    if (!selectedId) return;
    setGenerating(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post('/analyzer/interview-prep', { resumeId: selectedId });
      setResult(res.data?.data ?? null);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [selectedId]);

  // Print handler — injects temporary style, hides #root, shows #interview-print
  const handlePrint = useCallback(() => {
    if (!result) return;

    // Build print HTML
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const renderBlock = (q, i) =>
      '<div class="ip-q-block">' +
        '<div class="ip-q-number">' + (i + 1 < 10 ? '0' + (i + 1) : i + 1) + '</div>' +
        '<div class="ip-q-text">' + q.question.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>' +
        '<span class="ip-difficulty">' + q.difficulty + '</span>' +
        '<div class="ip-answer-label">Ideal Answer Structure</div>' +
        '<div class="ip-answer-text">' + q.idealAnswer.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>' +
        '<div class="ip-answer-label">Recruiter Hint</div>' +
        '<div class="ip-hint-text">' + q.hint.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>' +
        '<hr class="ip-divider" />' +
      '</div>';

    const techBlocks = (result.technicalQuestions || []).map(renderBlock).join('');
    const behBlocks  = (result.behavioralQuestions || []).map(renderBlock).join('');

    const el = document.getElementById('interview-print');
    if (el) {
      el.innerHTML =
        '<div class="ip-print-doc">' +
          '<div class="ip-doc-header">' +
            '<div class="ip-doc-title">Mock Interview Prep — ' + (result.resumeTitle || 'Resume') + '</div>' +
            '<div class="ip-doc-meta">Candidate: ' + (result.candidateName || '') +
            ' &nbsp;|&nbsp; Target Role: ' + (result.targetRole || '') +
            ' &nbsp;|&nbsp; Generated: ' + today + '</div>' +
          '</div>' +
          '<div class="ip-section-heading">Technical Questions</div>' +
          techBlocks +
          '<div class="ip-section-heading">Behavioral Questions</div>' +
          behBlocks +
          '<div class="ip-footer">' +
            '<span>Generated with ResumeAI Mock Interview Prep</span>' +
            '<span>' + today + '</span>' +
          '</div>' +
        '</div>';
    }

    const styleEl = document.createElement('style');
    styleEl.id = 'ip-print-override';
    styleEl.textContent = [
      '@media print {',
      '  body > *:not(#interview-print) { display: none !important; }',
      '  #interview-print { display: block !important; background: #fff !important; }',
      '}',
    ].join('\n');
    document.head.appendChild(styleEl);

    prevTitle.current = document.title;
    document.title    = 'InterviewPrep_ResumeAI';

    const cleanup = () => {
      document.title = prevTitle.current;
      styleEl.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
  }, [result]);

  // Mount print node outside #root
  useEffect(() => {
    if (!document.getElementById('interview-print')) {
      const el = document.createElement('div');
      el.id = 'interview-print';
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
    }
    return () => {
      const node = document.getElementById('interview-print');
      if (node) node.remove();
    };
  }, []);

  const hasResult    = !!result;
  const canGenerate  = !!selectedId && !generating;

  return (
    <div
      className="min-h-screen p-6 md:p-10"
      style={{ background: '#0a0f1e', animation: 'fadeUp 0.45s ease forwards' }}
    >
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(139,92,246,0.12)' }}
          >
            <BrainCircuit className="w-5 h-5" style={{ color: '#c4b5fd' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#e2e8f0' }}>
              AI Interview Prep
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#475569' }}>
              Custom mock questions generated from your actual resume
            </p>
          </div>
        </div>

        {hasResult && (
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#e2e8f0'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; }}
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save PDF
          </button>
        )}
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ══ LEFT — Resume selector + generate ══ (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Resume picker card */}
          <div
            className="rounded-2xl p-5"
            style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 rounded-full" style={{ background: 'linear-gradient(#c4b5fd,#8b5cf6)' }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#64748b' }}>
                Select Resume
              </span>
            </div>

            {loadingRes ? (
              <div className="space-y-3">
                {[0, 1].map(i => (
                  <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                ))}
              </div>
            ) : resumes.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: '#334155' }} />
                <p className="text-sm" style={{ color: '#475569' }}>No resumes found.</p>
                <p className="text-xs mt-1" style={{ color: '#334155' }}>
                  Create a resume first in the Resume Builder.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {resumes.map(r => (
                  <ResumeCard
                    key={r._id}
                    resume={r}
                    selected={selectedId === r._id}
                    onSelect={setSelectedId}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-[0.97]"
            style={
              canGenerate
                ? {
                    background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)',
                    color: '#fff',
                    boxShadow: '0 4px 24px rgba(124,58,237,0.40)',
                  }
                : {
                    background: 'rgba(139,92,246,0.10)',
                    color: '#475569',
                    cursor: 'not-allowed',
                  }
            }
            onMouseEnter={e => { if (canGenerate) e.currentTarget.style.filter = 'brightness(1.10)'; }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
          >
            {generating ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating Questions…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Mock Questions
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div
              className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: '#f87171' }}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Tips card */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.12)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 shrink-0" style={{ color: '#c4b5fd' }} />
              <span className="text-xs font-semibold" style={{ color: '#c4b5fd' }}>
                How to use Interview Prep
              </span>
            </div>
            <ul className="space-y-2">
              {[
                'Select a resume with filled-in experience and skills for best results.',
                'Click a question to expand its ideal answer structure.',
                'Use the Recruiter Hint to understand what the interviewer is evaluating.',
                'Print or save as PDF for offline study sessions.',
              ].map(tip => (
                <li key={tip} className="flex items-start gap-2 text-xs" style={{ color: '#64748b' }}>
                  <span className="mt-0.5" style={{ color: '#8b5cf6' }}>·</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ══ RIGHT — Q&A panel ══ (3 cols) */}
        <div
          className="lg:col-span-3 rounded-2xl flex flex-col"
          style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {/* Panel header */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4" style={{ color: '#475569' }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#64748b' }}>
                Question Bank
              </span>
              {hasResult && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}
                >
                  {(result.technicalQuestions?.length || 0) + (result.behavioralQuestions?.length || 0)} Questions
                </span>
              )}
            </div>

            {hasResult && (
              <button
                onClick={() => { setResult(null); setError(''); }}
                className="flex items-center gap-1.5 text-xs transition-colors duration-150"
                style={{ color: '#475569' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#94a3b8'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#475569'; }}
              >
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>

          {/* Panel body */}
          <div className="flex-1 p-6 overflow-y-auto">

            {/* Idle */}
            {!hasResult && !generating && !error && (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}
                >
                  <BrainCircuit className="w-9 h-9" style={{ color: '#7c3aed' }} />
                </div>
                <p className="text-base font-semibold mb-1" style={{ color: '#334155' }}>
                  Ready to prep your interview
                </p>
                <p className="text-sm max-w-xs" style={{ color: '#1e293b' }}>
                  Select a resume on the left and click Generate to get personalised questions.
                </p>
              </div>
            )}

            {/* Loading shimmer */}
            {generating && (
              <div>
                <div className="flex items-center gap-2 mb-5 text-sm" style={{ color: '#8b5cf6' }}>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analysing your resume and crafting questions…
                </div>
                <Shimmer />
              </div>
            )}

            {/* Results */}
            {hasResult && (
              <div className="animate-fade-up">
                {/* Meta row */}
                <div
                  className="flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl mb-6"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {[
                    { label: result.candidateName, bg: 'rgba(139,92,246,0.15)', text: '#c4b5fd' },
                    { label: result.targetRole,    bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa' },
                    { label: result.resumeTitle,   bg: 'rgba(255,255,255,0.06)', text: '#64748b' },
                  ].filter(m => m.label).map(m => (
                    <span
                      key={m.label}
                      className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: m.bg, color: m.text }}
                    >
                      {m.label}
                    </span>
                  ))}
                </div>

                {/* Technical */}
                <QuestionSection
                  title="Technical Questions"
                  icon={Code2}
                  iconColor="#60a5fa"
                  questions={result.technicalQuestions || []}
                  type="technical"
                />

                {/* Behavioral */}
                <QuestionSection
                  title="Behavioral Questions"
                  icon={Users}
                  iconColor="#c4b5fd"
                  questions={result.behavioralQuestions || []}
                  type="behavioral"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
