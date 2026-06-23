import { useState, useRef, useEffect, useCallback } from 'react';
import {
  FileSignature, Sparkles, Copy, Check, Building2,
  Briefcase, AlignLeft, RotateCcw, ChevronRight,
  Download, Printer,
} from 'lucide-react';
import api from '../../utils/api';

// ── Label ─────────────────────────────────────────────────────────────────
function Label({ children }) {
  return (
    <label
      className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
      style={{ color: '#475569' }}
    >
      {children}
    </label>
  );
}

// ── Text input ────────────────────────────────────────────────────────────
function InputField({ icon: Icon, placeholder, value, onChange, maxLength }) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${focused ? 'rgba(99,102,241,0.55)' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.10)' : 'none',
      }}
    >
      <Icon className="w-4 h-4 shrink-0" style={{ color: focused ? '#818cf8' : '#475569' }} />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        maxLength={maxLength}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="flex-1 bg-transparent outline-none text-sm"
        style={{ color: '#e2e8f0' }}
      />
    </div>
  );
}

// ── Textarea ──────────────────────────────────────────────────────────────
function TextAreaField({ placeholder, value, onChange }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      rows={6}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none transition-all duration-200"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${focused ? 'rgba(99,102,241,0.55)' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.10)' : 'none',
        color: '#e2e8f0',
      }}
    />
  );
}

// ── Loading shimmer ───────────────────────────────────────────────────────
function Shimmer() {
  const rows = ['w-3/4','w-full','w-5/6','w-full','w-2/3','w-full','w-full','w-4/5','w-full','w-2/3','w-full','w-5/6','w-3/4'];
  return (
    <div className="space-y-3 animate-pulse">
      {rows.map((w, i) => (
        <div key={i} className={`h-3 rounded-full ${w}`} style={{ background: 'rgba(255,255,255,0.07)' }} />
      ))}
    </div>
  );
}

// ── Letter preview (screen only) ──────────────────────────────────────────
function LetterPreview({ text }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed" style={{ color: '#cbd5e1' }}>
      {text.split('\n').map((para, i) =>
        para.trim() ? <p key={i}>{para}</p> : <div key={i} className="h-2" />
      )}
    </div>
  );
}

// ── Toolbar action button ─────────────────────────────────────────────────
function ActionButton({ icon: Icon, label, onClick, disabled, active, activeStyle, idleStyle, hoverStyle }) {
  const [hovered, setHovered] = useState(false);

  const style = active
    ? activeStyle
    : disabled
      ? { ...idleStyle, opacity: 0.32, cursor: 'not-allowed' }
      : hovered
        ? { ...idleStyle, ...hoverStyle }
        : idleStyle;

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseEnter={() => { if (!disabled) setHovered(true); }}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap"
      style={style}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
export default function CoverLetterGenerator() {
  const [company,  setCompany]  = useState('');
  const [role,     setRole]     = useState('');
  const [jobDesc,  setJobDesc]  = useState('');
  const [phase,    setPhase]    = useState('idle'); // idle | loading | done | error
  const [letter,   setLetter]   = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied,   setCopied]   = useState(false);
  const copyTimeout = useRef(null);
  const prevTitle   = useRef('');

  const canGenerate = company.trim() && role.trim() && jobDesc.trim();
  const hasLetter   = phase === 'done' && !!letter;

  // Word / char counts computed outside JSX to avoid regex-in-JSX parse issues
  const wordCount = hasLetter ? letter.trim().split(' ').filter(Boolean).length : 0;
  const charCount = hasLetter ? letter.length : 0;

  // ── Generate ────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!canGenerate) return;
    setPhase('loading');
    setErrorMsg('');
    setLetter('');
    try {
      const res = await api.post('/analyzer/cover-letter', {
        company:        company.trim(),
        role:           role.trim(),
        jobDescription: jobDesc.trim(),
      });
      setLetter(res.data?.data?.coverLetter ?? '');
      setPhase('done');
    } catch (err) {
      setErrorMsg(err?.response?.data?.message ?? 'Generation failed. Please try again.');
      setPhase('error');
    }
  };

  // ── Reset ────────────────────────────────────────────────────────────
  const handleReset = () => {
    setPhase('idle'); setLetter(''); setErrorMsg('');
    setCompany(''); setRole(''); setJobDesc(''); setCopied(false);
  };

  // ── Copy ─────────────────────────────────────────────────────────────
  const handleCopy = () => {
    if (!letter) return;
    navigator.clipboard.writeText(letter).then(() => {
      setCopied(true);
      clearTimeout(copyTimeout.current);
      copyTimeout.current = setTimeout(() => setCopied(false), 2500);
    });
  };

  // ── Mount print container as a direct body child (outside #root) ─────
  // Required so `body > *:not(#cover-letter-print)` can hide #root cleanly.
  useEffect(() => {
    let el = document.getElementById('cover-letter-print');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cover-letter-print';
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
    }
    return () => {
      const node = document.getElementById('cover-letter-print');
      if (node) node.remove();
    };
  }, []);

  // ── Keep print container content in sync ─────────────────────────────
  useEffect(() => {
    const el = document.getElementById('cover-letter-print');
    if (!el) return;

    if (!hasLetter) {
      el.innerHTML = '';
      return;
    }

    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    // Build escaped paragraph HTML — done here (not in JSX) to avoid regex issues
    const paragraphsHtml = letter
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => {
        const escaped = line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        return '<p>' + escaped + '</p>';
      })
      .join('');

    el.innerHTML =
      '<div class="cl-print-document">' +
        '<div class="cl-header">' +
          '<div class="cl-header-role">' + role + ' \u00b7 ' + today + '</div>' +
          '<div class="cl-header-company">' + company + '</div>' +
        '</div>' +
        '<div class="cl-body">' + paragraphsHtml + '</div>' +
        '<div class="cl-footer">' +
          '<span>Generated with ResumeAI</span>' +
          '<span>Cover_Letter_ResumeAI.pdf</span>' +
        '</div>' +
      '</div>';
  }, [hasLetter, letter, company, role]);

  // ── Print / Download PDF ─────────────────────────────────────────────
  // Injects a temporary <style> that hides #root and reveals the print div,
  // then calls window.print(). Cleans up via afterprint.
  const triggerPrint = useCallback(() => {
    if (!hasLetter) return;

    const styleEl = document.createElement('style');
    styleEl.id = 'cl-print-override';
    styleEl.textContent = [
      '@media print {',
      '  body > *:not(#cover-letter-print) { display: none !important; }',
      '  #cover-letter-print {',
      '    display: block !important;',
      '    position: static !important;',
      '    width: 100% !important;',
      '    background: #ffffff !important;',
      '    color: #000000 !important;',
      '  }',
      '}',
    ].join('\n');
    document.head.appendChild(styleEl);

    prevTitle.current = document.title;
    document.title    = 'Cover_Letter_ResumeAI';

    const cleanup = () => {
      document.title = prevTitle.current;
      styleEl.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);

    window.print();
  }, [hasLetter]);

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen p-6 md:p-10"
      style={{ background: '#0a0f1e', animation: 'fadeUp 0.45s ease forwards' }}
    >
      {/* ── Page header ────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(99,102,241,0.12)' }}
          >
            <FileSignature className="w-5 h-5" style={{ color: '#818cf8' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#e2e8f0' }}>
              AI Cover Letter Generator
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#475569' }}>
              Fill in the details and get a tailored cover letter in seconds
            </p>
          </div>
        </div>

        {phase !== 'idle' && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200"
            style={{ color: '#64748b', border: '1px solid rgba(255,255,255,0.07)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent'; }}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Start Over
          </button>
        )}
      </div>

      {/* ── Two-column layout ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ══ LEFT — form ════════════════════════════════════════════ */}
        <div
          className="rounded-2xl p-6 flex flex-col gap-5"
          style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-4 rounded-full" style={{ background: 'linear-gradient(#818cf8,#6366f1)' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#64748b' }}>
              Job Details
            </span>
          </div>

          <div>
            <Label>Company Name</Label>
            <InputField
              icon={Building2}
              placeholder="e.g. Google, OpenAI, Stripe…"
              value={company}
              onChange={setCompany}
              maxLength={80}
            />
          </div>

          <div>
            <Label>Job Role / Title</Label>
            <InputField
              icon={Briefcase}
              placeholder="e.g. Senior Frontend Engineer"
              value={role}
              onChange={setRole}
              maxLength={80}
            />
          </div>

          <div className="flex-1">
            <Label>Job Description</Label>
            <TextAreaField
              placeholder="Paste the job description here — responsibilities, requirements, nice-to-haves…"
              value={jobDesc}
              onChange={setJobDesc}
            />
            <p className="text-xs mt-1.5 text-right" style={{ color: '#334155' }}>
              {jobDesc.length} chars
            </p>
          </div>

          {/* Generate */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || phase === 'loading'}
            className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97]"
            style={
              canGenerate && phase !== 'loading'
                ? { background: 'linear-gradient(135deg,#4f46e5,#6366f1)', color: '#fff', boxShadow: '0 4px 24px rgba(99,102,241,0.35)' }
                : { background: 'rgba(99,102,241,0.12)', color: '#475569', cursor: 'not-allowed' }
            }
            onMouseEnter={e => { if (canGenerate && phase !== 'loading') e.currentTarget.style.filter = 'brightness(1.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
          >
            {phase === 'loading' ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate with AI
                <ChevronRight className="w-4 h-4 ml-auto opacity-60" />
              </>
            )}
          </button>

          {/* Tips */}
          <div
            className="rounded-xl p-4"
            style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}
          >
            <p className="text-xs font-semibold mb-2" style={{ color: '#818cf8' }}>
              💡 Tips for best results
            </p>
            <ul className="space-y-1">
              {[
                'Paste the full job description for maximum relevance',
                'Include specific tech stack or tools mentioned in the role',
                'The more detail you provide, the more personalised the letter',
              ].map(tip => (
                <li key={tip} className="flex items-start gap-2 text-xs" style={{ color: '#475569' }}>
                  <span style={{ color: '#4f46e5' }}>·</span> {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ══ RIGHT — preview ════════════════════════════════════════ */}
        <div
          className="rounded-2xl flex flex-col"
          style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {/* Toolbar */}
          <div
            className="flex items-center justify-between px-6 py-4 gap-3 flex-wrap"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2 shrink-0">
              <AlignLeft className="w-4 h-4" style={{ color: '#475569' }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#64748b' }}>
                Preview
              </span>
              {hasLetter && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}
                >
                  Ready
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <ActionButton
                icon={copied ? Check : Copy}
                label={copied ? 'Copied!' : 'Copy'}
                onClick={handleCopy}
                disabled={!hasLetter}
                active={copied}
                activeStyle={{ background: 'rgba(74,222,128,0.14)', color: '#4ade80' }}
                idleStyle={{ background: 'rgba(99,102,241,0.10)', color: '#818cf8' }}
                hoverStyle={{ background: 'rgba(99,102,241,0.22)' }}
              />
              <ActionButton
                icon={Printer}
                label="Print"
                onClick={triggerPrint}
                disabled={!hasLetter}
                idleStyle={{ background: 'rgba(6,182,212,0.08)', color: '#22d3ee' }}
                hoverStyle={{ background: 'rgba(6,182,212,0.18)' }}
              />
              <ActionButton
                icon={Download}
                label="Download PDF"
                onClick={triggerPrint}
                disabled={!hasLetter}
                idleStyle={
                  hasLetter
                    ? { background: 'linear-gradient(135deg,#4f46e5,#6366f1)', color: '#fff', boxShadow: '0 2px 12px rgba(99,102,241,0.30)' }
                    : { background: 'rgba(255,255,255,0.04)', color: '#334155' }
                }
                hoverStyle={{ filter: 'brightness(1.14)' }}
              />
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 px-6 py-5 overflow-y-auto" style={{ minHeight: '480px' }}>

            {phase === 'idle' && (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}
                >
                  <FileSignature className="w-7 h-7" style={{ color: '#4f46e5' }} />
                </div>
                <p className="text-sm font-medium" style={{ color: '#334155' }}>
                  Your cover letter will appear here
                </p>
                <p className="text-xs mt-1" style={{ color: '#1e293b' }}>
                  Fill in the form on the left and click Generate
                </p>
              </div>
            )}

            {phase === 'loading' && (
              <div>
                <div className="mb-6 space-y-2 animate-pulse">
                  <div className="h-3 w-1/3 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }} />
                  <div className="h-3 w-1/2 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
                </div>
                <Shimmer />
                <div className="flex items-center gap-2 mt-6 text-xs" style={{ color: '#4f46e5' }}>
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Writing your personalised cover letter…
                </div>
              </div>
            )}

            {phase === 'done' && letter && (
              <div className="animate-fade-up">
                <div className="flex flex-wrap items-center gap-2 mb-5">
                  {[
                    { label: company, bg: 'rgba(99,102,241,0.15)', text: '#818cf8' },
                    { label: role,    bg: 'rgba(6,182,212,0.12)',   text: '#22d3ee' },
                  ].map(({ label, bg, text }) => (
                    <span
                      key={label}
                      className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: bg, color: text }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
                <LetterPreview text={letter} />
              </div>
            )}

            {phase === 'error' && (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}
                >
                  <span className="text-2xl">⚠️</span>
                </div>
                <p className="text-sm font-medium" style={{ color: '#f87171' }}>Generation Failed</p>
                <p className="text-xs mt-1 max-w-xs" style={{ color: '#64748b' }}>{errorMsg}</p>
                <button
                  onClick={() => setPhase('idle')}
                  className="mt-5 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
                  style={{ background: 'rgba(239,68,68,0.10)', color: '#f87171' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.10)'; }}
                >
                  ← Try Again
                </button>
              </div>
            )}
          </div>

          {/* Footer stats */}
          {hasLetter && (
            <div
              className="px-6 py-3 flex items-center justify-between"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              <span className="text-xs" style={{ color: '#334155' }}>
                {wordCount} words
              </span>
              <span className="text-xs" style={{ color: '#334155' }}>
                {charCount} characters
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
