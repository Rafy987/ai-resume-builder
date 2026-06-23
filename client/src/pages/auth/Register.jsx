import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';

// ── Icon helpers ─────────────────────────────────────────────────────────
function IconUser() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}
function IconEnvelope() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}
function IconEye({ off }) {
  return off ? (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-white/80" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Input field wrapper ───────────────────────────────────────────────────
function InputField({ id, name, type, autoComplete, value, onChange, placeholder, icon, hasError, rightSlot }) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#475569' }}>
        {icon}
      </span>
      <input
        id={id} name={name} type={type}
        autoComplete={autoComplete}
        required value={value} onChange={onChange}
        placeholder={placeholder}
        className={`auth-input${hasError ? ' error' : ''}`}
        style={{ paddingRight: rightSlot ? '44px' : '16px' }}
      />
      {rightSlot && (
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightSlot}</span>
      )}
    </div>
  );
}

// ── Password strength calculator ──────────────────────────────────────────
function getStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8)              score++;
  if (/[A-Z]/.test(pw))           score++;
  if (/[0-9]/.test(pw))           score++;
  if (/[^A-Za-z0-9]/.test(pw))    score++;
  if (score <= 1) return { score, label: 'Weak',   color: '#ef4444', pct: 25  };
  if (score === 2) return { score, label: 'Fair',   color: '#f59e0b', pct: 50  };
  if (score === 3) return { score, label: 'Good',   color: '#3b82f6', pct: 75  };
  return            { score, label: 'Strong', color: '#10b981', pct: 100 };
}

// ── Left decorative panel ─────────────────────────────────────────────────
function LeftPanel() {
  const features = [
    'AI-generated professional summaries',
    'ATS keyword optimization',
    'Export to PDF in one click',
  ];
  const stats = [
    { value: '50K+', label: 'Resumes built'  },
    { value: '94%',  label: 'ATS pass rate'  },
    { value: '4.9★', label: 'User rating'    },
  ];
  return (
    <div
      className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-center px-14 py-16"
      style={{ backgroundColor: '#0a0f1e' }}
    >
      {/* Radial glow */}
      <div
        className="absolute bottom-0 left-0 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-1/4 right-0 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)' }}
      />

      {/* Floating cards */}
      <div className="absolute top-16 right-10 float-1 pointer-events-none">
        <div
          className="rounded-xl px-4 py-3 text-xs font-medium"
          style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.22)', color: '#6ee7b7', whiteSpace: 'nowrap' }}
        >
          ✓ Profile 92% complete
        </div>
      </div>
      <div className="absolute bottom-28 right-6 float-2 pointer-events-none">
        <div
          className="rounded-xl px-4 py-3 text-xs font-medium"
          style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', color: '#93c5fd', whiteSpace: 'nowrap' }}
        >
          🚀 Resume ready to send
        </div>
      </div>
      <div className="absolute top-1/2 right-14 float-3 pointer-events-none">
        <div
          className="rounded-xl px-4 py-3 text-xs font-medium"
          style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: '#c4b5fd', whiteSpace: 'nowrap' }}
        >
          🤖 AI keywords injected
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-md">
        <div className="flex items-center gap-2.5 mb-12">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', boxShadow: '0 0 20px rgba(59,130,246,0.4)' }}
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75" />
            </svg>
          </div>
          <span className="text-xl font-bold text-gradient-blue-cyan">ResumeAI</span>
        </div>

        <h2 className="text-3xl font-bold text-white leading-tight mb-4">
          Your career starts<br />
          <span className="text-gradient-blue-cyan">here</span>
        </h2>
        <p className="text-sm mb-10" style={{ color: '#64748b' }}>
          Build ATS-optimized resumes with the power of AI.
        </p>

        <div className="space-y-4 mb-10">
          {features.map((f) => (
            <div key={f} className="flex items-center gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}
              >
                <svg className="w-2.5 h-2.5" style={{ color: '#3b82f6' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <span className="text-sm" style={{ color: '#94a3b8' }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map(({ value, label }) => (
            <div
              key={label}
              className="rounded-2xl p-4 text-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="text-lg font-bold text-gradient-blue-cyan">{value}</div>
              <div className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
export default function Register() {
  const navigate = useNavigate();

  // ── existing state (unchanged) ──
  const [form, setForm]       = useState({ fullName: '', email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  // ── UI-only state ──
  const [showPw, setShowPw]   = useState(false);
  const [agreed, setAgreed]   = useState(false);
  const [shaking, setShaking] = useState(false);

  const strength = getStrength(form.password);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  // ── existing submit logic (unchanged) ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
      setError(msg);
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg-base)' }}>
      <LeftPanel />

      {/* ── Right: form panel ── */}
      <div
        className="flex-1 flex items-center justify-center px-6 py-10"
        style={{ backgroundColor: 'var(--bg-base)' }}
      >
        <div className="w-full max-w-sm auth-fade-in">

          {/* Brand (mobile only) */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', boxShadow: '0 0 16px rgba(59,130,246,0.4)' }}
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75" />
              </svg>
            </div>
            <span className="text-base font-bold text-gradient-blue-cyan">ResumeAI</span>
          </div>

          {/* Form card */}
          <div
            className={`rounded-2xl p-8 ${shaking ? 'shake' : ''}`}
            style={{
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
            }}
          >
            {/* Card logo row */}
            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm font-bold text-gradient-blue-cyan">ResumeAI</span>
            </div>

            <h1 className="text-xl font-bold text-white mb-1">Create your account</h1>
            <p className="text-sm mb-6" style={{ color: '#64748b' }}>
              Start building smarter resumes today
            </p>

            {/* Error banner */}
            {error && (
              <div
                className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}
              >
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Full name */}
              <div>
                <label htmlFor="fullName" className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#94a3b8' }}>
                  Full name
                </label>
                <InputField
                  id="fullName" name="fullName" type="text"
                  autoComplete="name"
                  value={form.fullName} onChange={handleChange}
                  placeholder="Jane Smith"
                  icon={<IconUser />}
                  hasError={false}
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#94a3b8' }}>
                  Email address
                </label>
                <InputField
                  id="email" name="email" type="email"
                  autoComplete="email"
                  value={form.email} onChange={handleChange}
                  placeholder="jane@example.com"
                  icon={<IconEnvelope />}
                  hasError={false}
                />
              </div>

              {/* Password + strength bar */}
              <div>
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#94a3b8' }}>
                  Password
                </label>
                <InputField
                  id="password" name="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password} onChange={handleChange}
                  placeholder="Min 8 chars, upper, lower, number, symbol"
                  icon={<IconLock />}
                  hasError={false}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="transition-colors duration-150"
                      style={{ color: '#475569' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
                      onMouseLeave={e => e.currentTarget.style.color = '#475569'}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      <IconEye off={showPw} />
                    </button>
                  }
                />

                {/* Strength bar */}
                {form.password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[25, 50, 75, 100].map((seg) => (
                        <div
                          key={seg}
                          className="strength-bar flex-1"
                          style={{
                            background: strength.pct >= seg ? strength.color : 'rgba(255,255,255,0.08)',
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] font-medium" style={{ color: strength.color }}>
                      {strength.label}
                    </p>
                  </div>
                )}
              </div>

              {/* Terms checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <div className="relative mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center transition-all duration-200"
                    style={{
                      background: agreed ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${agreed ? '#3b82f6' : 'rgba(255,255,255,0.15)'}`,
                    }}
                    onClick={() => setAgreed(!agreed)}
                  >
                    {agreed && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
                  I agree to the{' '}
                  <span className="underline underline-offset-2 cursor-pointer" style={{ color: '#94a3b8' }}>Terms of Service</span>
                  {' '}and{' '}
                  <span className="underline underline-offset-2 cursor-pointer" style={{ color: '#94a3b8' }}>Privacy Policy</span>
                </span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg text-sm font-semibold text-white
                           flex items-center justify-center gap-2
                           transition-all duration-200 active:scale-[0.98]
                           disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: loading ? 'rgba(59,130,246,0.5)' : 'linear-gradient(to right,#3b82f6,#06b6d4)',
                  boxShadow: loading ? 'none' : '0 0 24px rgba(59,130,246,0.35)',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
              >
                {loading ? <><Spinner /> Creating account…</> : 'Create account'}
              </button>
            </form>

            {/* Footer */}
            <p className="mt-5 text-center text-sm" style={{ color: '#64748b' }}>
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold transition-colors duration-150"
                style={{ color: '#06b6d4' }}
                onMouseEnter={e => e.currentTarget.style.color = '#22d3ee'}
                onMouseLeave={e => e.currentTarget.style.color = '#06b6d4'}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
