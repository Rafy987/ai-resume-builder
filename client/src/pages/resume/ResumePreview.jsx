import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, Pencil } from 'lucide-react';
import api from '../../utils/api';

// ── Print styles injected into <head> so only the paper renders on print ──
const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #resume-print-area,
  #resume-print-area * { visibility: visible !important; }
  #resume-print-area {
    position: fixed !important;
    inset: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    box-shadow: none !important;
    border-radius: 0 !important;
  }
  @page { margin: 0; size: A4; }
}
`;

export default function ResumePreview() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [resume,    setResume]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState(null);

  // ── Inject print styles once ──────────────────────────────────────────
  useEffect(() => {
    const tag = document.createElement('style');
    tag.id   = 'resume-print-styles';
    tag.textContent = PRINT_STYLE;
    document.head.appendChild(tag);
    return () => tag.remove();
  }, []);

  // ── Fetch resume ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await api.get(`/resumes/${id}`);
        setResume(res.data.data ?? res.data);
      } catch {
        setLoadError('Could not load resume. It may have been deleted or you may not have access.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handlePrint = () => window.print();

  // ── Loading ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ backgroundColor: 'var(--bg-base)' }}>
        <div className="flex items-center gap-3" style={{ color: '#475569' }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading resume…</span>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────
  if (loadError || !resume) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6"
           style={{ backgroundColor: 'var(--bg-base)' }}>
        <div className="text-center max-w-sm">
          <p className="text-sm mb-4" style={{ color: '#f87171' }}>
            {loadError ?? 'Resume not found.'}
          </p>
          <button onClick={() => navigate('/dashboard')}
                  className="text-sm font-medium transition-colors duration-150"
                  style={{ color: '#3b82f6' }}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Data shortcuts ────────────────────────────────────────────────────
  const pi      = resume.personalInfo ?? {};
  const expArr  = resume.experience   ?? [];
  const eduArr  = resume.education    ?? [];
  const skills  = resume.skills       ?? [];
  const summary = resume.aiSummary    ?? '';
  const contactParts = [pi.email, pi.phone, pi.location].filter(Boolean);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0e1b' }}>

      {/* ── Top toolbar (hidden on print) ──────────────────────────────── */}
      <div
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 print:hidden"
        style={{ background: '#111827', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-sm font-medium transition-colors duration-150"
          style={{ color: '#64748b' }}
          onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'}
          onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
        >
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>

        <span
          className="text-sm font-semibold truncate max-w-[240px]"
          style={{ color: '#e2e8f0' }}
        >
          {resume.title}
        </span>

        <div className="flex items-center gap-2.5">
          {/* Edit button */}
          <button
            onClick={() => navigate(`/builder/${id}`)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg
                       text-xs font-semibold transition-all duration-200 active:scale-[0.97]"
            style={{
              color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.09)',
              background: 'transparent',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; }}
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>

          {/* Download / Print button */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg
                       text-xs font-semibold text-white transition-all duration-200 active:scale-[0.97]"
            style={{
              background: 'linear-gradient(to right,#3b82f6,#06b6d4)',
              boxShadow: '0 0 16px rgba(59,130,246,0.30)',
            }}
            onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
            onMouseLeave={e => e.currentTarget.style.filter = 'none'}
          >
            <Download className="w-3.5 h-3.5" /> Download PDF
          </button>
        </div>
      </div>

      {/* ── Resume paper ───────────────────────────────────────────────── */}
      <div className="flex justify-center py-10 px-4 print:p-0 print:block">
        <div
          id="resume-print-area"
          className="w-full bg-white rounded-sm"
          style={{
            maxWidth: '794px',           /* A4 width at 96dpi */
            minHeight: '1123px',         /* A4 height at 96dpi */
            padding: '48px 56px',
            color: '#1e293b',
            fontFamily: "'Inter', sans-serif",
            fontSize: '13px',
            lineHeight: '1.6',
            boxShadow: '0 32px 80px rgba(0,0,0,0.55)',
          }}
        >
          {/* ── Header ── */}
          <div
            className="text-center mb-5 pb-5"
            style={{ borderBottom: '2px solid #1e40af' }}
          >
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: '2px' }}>
              {pi.fullName || resume.title}
            </h1>
            {resume.targetJobTitle && (
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#1d4ed8', marginBottom: '4px' }}>
                {resume.targetJobTitle}
              </p>
            )}
            {contactParts.length > 0 && (
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>
                {contactParts.join(' · ')}
              </p>
            )}
            {(pi.linkedIn || pi.github || pi.portfolio) && (
              <p style={{ fontSize: '12px', color: '#2563eb' }}>
                {[pi.linkedIn, pi.github, pi.portfolio].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          {/* ── Professional Summary ── */}
          {summary && (
            <section style={{ marginBottom: '20px' }}>
              <SectionTitle>Professional Summary</SectionTitle>
              <p style={{ fontSize: '12px', color: '#374151', lineHeight: '1.7' }}>{summary}</p>
            </section>
          )}

          {/* ── Experience ── */}
          {expArr.length > 0 && (
            <section style={{ marginBottom: '20px' }}>
              <SectionTitle>Experience</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {expArr.map((exp, i) => (
                  <div key={exp._id ?? i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                          {exp.jobTitle || 'Job Title'}
                        </p>
                        <p style={{ fontSize: '12px', color: '#1d4ed8', fontWeight: 500 }}>
                          {[exp.company, exp.location].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <p style={{ fontSize: '11px', color: '#64748b', flexShrink: 0, marginLeft: '8px' }}>
                        {[exp.startDate, exp.isCurrent ? 'Present' : exp.endDate].filter(Boolean).join(' – ')}
                      </p>
                    </div>
                    {/* AI bullets preferred, fall back to raw description */}
                    {exp.aiBullets?.length > 0 ? (
                      <ul style={{ marginTop: '6px', paddingLeft: '0', listStyle: 'none' }}>
                        {exp.aiBullets.map((b, bi) => (
                          <li key={bi} style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#374151', lineHeight: '1.65', marginBottom: '2px' }}>
                            <span style={{ color: '#3b82f6', flexShrink: 0, marginTop: '1px' }}>•</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    ) : exp.rawDescription ? (
                      <p style={{ marginTop: '5px', paddingLeft: '12px', fontSize: '12px', color: '#374151', lineHeight: '1.65' }}>
                        {exp.rawDescription}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Education ── */}
          {eduArr.length > 0 && (
            <section style={{ marginBottom: '20px' }}>
              <SectionTitle>Education</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {eduArr.map((edu, i) => (
                  <div key={edu._id ?? i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                        {edu.degree || 'Degree'}
                      </p>
                      <p style={{ fontSize: '12px', color: '#1d4ed8', fontWeight: 500 }}>
                        {[edu.institution, edu.location].filter(Boolean).join(' · ')}
                      </p>
                      {edu.gpa && (
                        <p style={{ fontSize: '11px', color: '#64748b' }}>GPA: {edu.gpa}</p>
                      )}
                    </div>
                    <p style={{ fontSize: '11px', color: '#64748b', flexShrink: 0, marginLeft: '8px' }}>
                      {[edu.startYear, edu.endYear].filter(Boolean).join(' – ')}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Skills ── */}
          {skills.length > 0 && (
            <section>
              <SectionTitle>Skills</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {skills.map((group, i) =>
                  group.items?.length > 0 ? (
                    <div key={group._id ?? i} style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#374151' }}>
                      {group.category && (
                        <span style={{ fontWeight: 700, color: '#0f172a', flexShrink: 0 }}>
                          {group.category}:
                        </span>
                      )}
                      <span>{group.items.join(', ')}</span>
                    </div>
                  ) : null
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Section title helper ──────────────────────────────────────────────────
function SectionTitle({ children }) {
  return (
    <p style={{
      fontSize: '10px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: '#64748b',
      borderBottom: '1px solid #e2e8f0',
      paddingBottom: '4px',
      marginBottom: '10px',
    }}>
      {children}
    </p>
  );
}
