import { useState } from 'react';
import {
  Settings as SettingsIcon,
  User,
  ShieldCheck,
  Mail,
  Check,
  Zap,
  Building2,
  Sparkles,
  Crown,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

// ─── Reusable field ──────────────────────────────────────────────────────────
function Field({ label, value, type = 'text', readOnly = true }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>
        {label}
      </label>
      <input
        type={type}
        defaultValue={value}
        readOnly={readOnly}
        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: readOnly ? '#94a3b8' : '#e2e8f0',
          cursor: readOnly ? 'not-allowed' : 'text',
        }}
      />
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────
function Section({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl p-6 ${className}`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    >
      {children}
    </div>
  );
}

// ─── Section heading ─────────────────────────────────────────────────────────
function SectionHeading({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: 'rgba(59,130,246,0.10)' }}
      >
        <Icon className="w-4 h-4" style={{ color: '#60a5fa' }} />
      </div>
      <div>
        <h2 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>{title}</h2>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────
function Divider() {
  return <div className="my-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />;
}

// ─── Pricing card data ───────────────────────────────────────────────────────
const PLANS = [
  {
    key: 'free',
    name: 'Free Starter',
    price: '$0',
    period: 'forever',
    icon: Zap,
    iconColor: '#94a3b8',
    accent: 'rgba(148,163,184,0.12)',
    border: 'rgba(148,163,184,0.15)',
    glow: 'rgba(148,163,184,0.06)',
    badge: null,
    cta: 'Current Plan',
    ctaDisabled: true,
    features: [
      '3 AI Resume Analyses / month',
      'Basic ATS Score',
      '1 Resume Template',
      'PDF Export',
      'Community Support',
    ],
    missing: ['Unlimited Analyses', 'Priority Support', 'Advanced Templates'],
  },
  {
    key: 'pro',
    name: 'Pro Recruiter',
    price: '$12',
    period: 'per month',
    icon: Crown,
    iconColor: '#60a5fa',
    accent: 'rgba(59,130,246,0.10)',
    border: 'rgba(59,130,246,0.35)',
    glow: 'rgba(59,130,246,0.08)',
    badge: 'Most Popular',
    badgeBg: 'linear-gradient(135deg,#3b82f6,#06b6d4)',
    cta: 'Upgrade Now',
    ctaDisabled: false,
    gradient: 'linear-gradient(135deg,#3b82f6,#06b6d4)',
    features: [
      'Unlimited AI Resume Analyses',
      'Full ATS Score Breakdown',
      '20+ Premium Templates',
      'Job-Fit Market Analysis',
      'Priority Email Support',
      'PDF & DOCX Export',
    ],
    missing: [],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: '$49',
    period: 'per month',
    icon: Building2,
    iconColor: '#c4b5fd',
    accent: 'rgba(139,92,246,0.10)',
    border: 'rgba(139,92,246,0.30)',
    glow: 'rgba(139,92,246,0.07)',
    badge: 'For Teams',
    badgeBg: 'rgba(139,92,246,0.20)',
    badgeColor: '#c4b5fd',
    cta: 'Contact Sales',
    ctaDisabled: false,
    gradient: 'linear-gradient(135deg,#8b5cf6,#6366f1)',
    features: [
      'Everything in Pro',
      'Unlimited Team Members',
      'Bulk Resume Processing',
      'Custom Branding & Domain',
      'Dedicated Account Manager',
      'SLA & Uptime Guarantee',
    ],
    missing: [],
  },
];

// ─── Pricing card ────────────────────────────────────────────────────────────
function PricingCard({ plan, isCurrentPlan }) {
  const Icon = plan.icon;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex flex-col rounded-2xl p-6 transition-all duration-300"
      style={{
        background: hovered
          ? `linear-gradient(160deg, ${plan.accent}, rgba(17,24,39,0.95))`
          : 'var(--bg-card)',
        border: `1px solid ${hovered ? plan.border : 'rgba(255,255,255,0.07)'}`,
        boxShadow: hovered ? `0 24px 60px ${plan.glow}` : 'none',
        transform: hovered ? 'translateY(-4px)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Badge */}
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span
            className="text-[11px] font-semibold px-3 py-1 rounded-full whitespace-nowrap"
            style={{
              background: plan.badgeBg,
              color: plan.badgeColor ?? '#fff',
              boxShadow: plan.key === 'pro' ? '0 4px 14px rgba(59,130,246,0.4)' : 'none',
            }}
          >
            {plan.badge}
          </span>
        </div>
      )}

      {/* Plan header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: plan.accent, border: `1px solid ${plan.border}` }}
        >
          <Icon className="w-5 h-5" style={{ color: plan.iconColor }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>{plan.name}</p>
          <p className="text-xs" style={{ color: '#475569' }}>
            {plan.key === 'free' ? 'Get started for free' : plan.key === 'pro' ? 'For active job seekers' : 'For hiring teams'}
          </p>
        </div>
      </div>

      {/* Price */}
      <div className="mb-5">
        <div className="flex items-end gap-1">
          <span
            className="text-3xl font-bold tracking-tight"
            style={{
              background: plan.gradient ?? 'none',
              WebkitBackgroundClip: plan.gradient ? 'text' : 'unset',
              WebkitTextFillColor: plan.gradient ? 'transparent' : '#e2e8f0',
              backgroundClip: plan.gradient ? 'text' : 'unset',
              color: plan.gradient ? undefined : '#e2e8f0',
            }}
          >
            {plan.price}
          </span>
          <span className="text-xs pb-1.5" style={{ color: '#475569' }}>/ {plan.period}</span>
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-2.5 mb-6 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: '#94a3b8' }}>
            <Check
              className="w-4 h-4 mt-0.5 shrink-0"
              style={{ color: plan.key === 'free' ? '#64748b' : plan.iconColor }}
            />
            {f}
          </li>
        ))}
        {plan.missing.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm line-through" style={{ color: '#334155' }}>
            <span className="w-4 h-4 mt-0.5 shrink-0 flex items-center justify-center">
              <span className="w-3 h-px block" style={{ background: '#334155' }} />
            </span>
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        disabled={plan.ctaDisabled}
        onClick={() => {/* TODO: integrate payment */}}
        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
        style={
          plan.ctaDisabled
            ? {
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#475569',
                cursor: 'default',
              }
            : {
                background: plan.gradient,
                color: '#fff',
                boxShadow: plan.key === 'pro' ? '0 4px 20px rgba(59,130,246,0.35)' : '0 4px 20px rgba(139,92,246,0.25)',
              }
        }
      >
        {plan.ctaDisabled && isCurrentPlan ? (
          <span className="flex items-center justify-center gap-1.5">
            <Check className="w-4 h-4" /> {plan.cta}
          </span>
        ) : (
          plan.cta
        )}
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Settings() {
  const { user } = useAuth();
  const [emailSent, setEmailSent] = useState(false);
  const [sending, setSending] = useState(false);
  // null | { type: 'success' | 'error', message: string }
  const [toast, setToast] = useState(null);

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '??';

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSendVerification = async () => {
    if (!user?.email) {
      showToast('error', 'No email address found on your account.');
      return;
    }

    setSending(true);
    try {
      const res = await api.post('/auth/request-password-reset', { email: user.email });
      setEmailSent(true);
      showToast('success', res.data?.message ?? 'Reset link sent! Check your inbox.');
      setTimeout(() => setEmailSent(false), 5000);
    } catch (err) {
      const msg =
        err.response?.data?.message ??
        'Failed to send the reset link. Please try again.';
      showToast('error', msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto animate-fade-up">

      {/* ── Toast notification ─────────────────────────────────────── */}
      {toast && (
        <div
          className="fixed top-5 right-5 z-50 flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl transition-all duration-300"
          style={{
            background: toast.type === 'success' ? 'rgba(20,83,45,0.95)' : 'rgba(127,29,29,0.95)',
            border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            maxWidth: '360px',
            backdropFilter: 'blur(12px)',
          }}
        >
          {toast.type === 'success'
            ? <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#4ade80' }} />
            : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#f87171' }} />
          }
          <p className="text-sm leading-snug" style={{ color: toast.type === 'success' ? '#bbf7d0' : '#fecaca' }}>
            {toast.message}
          </p>
        </div>
      )}

      {/* ── Page header ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(59,130,246,0.10)' }}
        >
          <SettingsIcon className="w-5 h-5" style={{ color: '#60a5fa' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#e2e8f0' }}>Account Settings</h1>
          <p className="text-sm mt-0.5" style={{ color: '#475569' }}>
            Manage your profile, security, and subscription
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 1 — Account & Security
      ════════════════════════════════════════════════════════════ */}
      <Section className="mb-6">

        {/* Profile */}
        <SectionHeading icon={User} title="Profile Information" subtitle="Your name and email address" />

        {/* Avatar + name row */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-lg"
            style={{ background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', boxShadow: '0 0 20px rgba(59,130,246,0.3)' }}
          >
            {initials}
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: '#e2e8f0' }}>{user?.name ?? '—'}</p>
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{user?.email ?? '—'}</p>
            <span
              className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize mt-1.5"
              style={{ background: 'rgba(139,92,246,0.18)', color: '#c4b5fd' }}
            >
              {user?.plan ?? 'Free'} Plan
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name"      value={user?.name  ?? ''} />
          <Field label="Email Address"  value={user?.email ?? ''} type="email" />
        </div>

        <Divider />

        {/* Security */}
        <SectionHeading
          icon={ShieldCheck}
          title="Security & Password"
          subtitle="Keep your account protected"
        />

        <div
          className="rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.12)' }}
        >
          {/* Text */}
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: 'rgba(59,130,246,0.12)' }}
            >
              <Mail className="w-4 h-4" style={{ color: '#60a5fa' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: '#cbd5e1' }}>Change Password</p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: '#64748b', maxWidth: '38ch' }}>
                To change your password, click the button to receive a secure
                password-reset verification link on your registered email.
              </p>
            </div>
          </div>

          {/* Button */}
          <div className="shrink-0">
            {emailSent ? (
              <div
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}
              >
                <Check className="w-4 h-4" />
                Link Sent!
              </div>
            ) : (
              <button
                onClick={handleSendVerification}
                disabled={sending}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap"
                style={{
                  background: sending ? 'rgba(59,130,246,0.12)' : 'linear-gradient(135deg,#3b82f6,#06b6d4)',
                  color: sending ? '#60a5fa' : '#fff',
                  boxShadow: sending ? 'none' : '0 4px 16px rgba(59,130,246,0.3)',
                  border: sending ? '1px solid rgba(59,130,246,0.2)' : 'none',
                  opacity: sending ? 0.8 : 1,
                }}
              >
                {sending ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Send Verification Link
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════════
          SECTION 2 — Upgrade Plan
      ════════════════════════════════════════════════════════════ */}
      <Section>
        {/* Header */}
        <div className="flex items-start gap-3 mb-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: 'rgba(139,92,246,0.12)' }}
          >
            <Sparkles className="w-4 h-4" style={{ color: '#c4b5fd' }} />
          </div>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Upgrade Your Plan</h2>
            <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
              Choose the plan that fits your job search
            </p>
          </div>
        </div>

        {/* Subtle gradient strip */}
        <div
          className="h-px w-full mb-6"
          style={{ background: 'linear-gradient(to right, rgba(139,92,246,0.3), rgba(59,130,246,0.3), transparent)' }}
        />

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
          {PLANS.map((plan) => (
            <PricingCard key={plan.key} plan={plan} isCurrentPlan={plan.key === (user?.plan ?? 'free')} />
          ))}
        </div>

        {/* Fine print */}
        <p className="text-xs text-center mt-5" style={{ color: '#334155' }}>
          All plans include a 7-day free trial. Cancel anytime. Prices in USD.
        </p>
      </Section>
    </div>
  );
}
