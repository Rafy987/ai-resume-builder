import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Plus, Trash2,
  Sparkles, Save, Loader2, ArrowLeft,
} from 'lucide-react';
import api from '../../utils/api';

// ── Constants ────────────────────────────────────────────────────────────
const TABS = ['Profile', 'Experience', 'Education', 'Skills', 'Projects', 'Certificates'];

const EMPTY_EXPERIENCE = {
  jobTitle: '', company: '', location: '',
  startDate: '', endDate: '', isCurrent: false,
  rawDescription: '', aiBullets: [],
};

const EMPTY_EDUCATION = {
  degree: '', institution: '', location: '',
  startYear: '', endYear: '', gpa: '',
};

const EMPTY_SKILL_GROUP = { category: '', items: [] };

const EMPTY_PROJECT = {
  title: '', technologies: [], link: '', description: '', aiDescription: '',
};

const EMPTY_CERTIFICATION = {
  name: '', issuer: '', issueDate: '', credentialId: '',
};

// ── Debounce hook ─────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Reusable dark input components ────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
             style={{ color: '#475569' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={onChange}
      placeholder={placeholder}
      className="builder-input"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value ?? ''}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="builder-input"
    />
  );
}

// ── Section heading in left panel ────────────────────────────────────────
function SectionHeading({ children }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-widest mb-4"
        style={{ color: '#3b82f6' }}>
      {children}
    </h3>
  );
}

// ── AI button ─────────────────────────────────────────────────────────────
function AiButton({ onClick, loading, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                 text-xs font-semibold transition-all duration-200 active:scale-[0.97]
                 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: 'rgba(139,92,246,0.15)',
        border: '1px solid rgba(139,92,246,0.30)',
        color: '#c4b5fd',
      }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(139,92,246,0.25)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.15)'; }}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
      {children}
    </button>
  );
}

// ── Add-item button ───────────────────────────────────────────────────────
function AddButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                 text-xs font-semibold transition-all duration-200 active:scale-[0.97]"
      style={{
        border: '1px dashed rgba(59,130,246,0.35)',
        color: '#60a5fa',
        background: 'rgba(59,130,246,0.04)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = 'rgba(59,130,246,0.09)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.35)'; e.currentTarget.style.background = 'rgba(59,130,246,0.04)'; }}
    >
      <Plus className="w-3.5 h-3.5" /> {children}
    </button>
  );
}

// ── Remove-item button ────────────────────────────────────────────────────
function RemoveButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-7 h-7 flex items-center justify-center rounded-lg
                 transition-all duration-150 active:scale-[0.97] shrink-0"
      style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────
function Divider() {
  return <div className="my-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />;
}

// ─────────────────────────────────────────────────────────────────────────
// TAB PANELS
// ─────────────────────────────────────────────────────────────────────────

// ── Profile tab ───────────────────────────────────────────────────────────
function ProfileTab({ data, onChange, aiSummary, onAiGenerate, aiLoading }) {
  const pi = data.personalInfo ?? {};

  const setField = (field) => (e) =>
    onChange({ ...data, personalInfo: { ...pi, [field]: e.target.value } });

  return (
    <div className="space-y-4">
      <SectionHeading>Personal Information</SectionHeading>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Full Name">
          <Input value={pi.fullName} onChange={setField('fullName')} placeholder="e.g. Dr. Kamran Malik" />
        </Field>
        <Field label="Email">
          <Input value={pi.email} onChange={setField('email')} placeholder="e.g. kamran.malik@example.com" type="email" />
        </Field>
        <Field label="Phone">
          <Input value={pi.phone} onChange={setField('phone')} placeholder="e.g. +92 300 1234567" />
        </Field>
        <Field label="Location">
          <Input value={pi.location} onChange={setField('location')} placeholder="e.g. Islamabad, Pakistan" />
        </Field>
        <Field label="LinkedIn">
          <Input value={pi.linkedIn} onChange={setField('linkedIn')} placeholder="e.g. linkedin.com/in/kamran-malik" />
        </Field>
        <Field label="GitHub">
          <Input value={pi.github} onChange={setField('github')} placeholder="e.g. github.com/kamranmalik" />
        </Field>
      </div>

      <Field label="Portfolio URL">
        <Input value={pi.portfolio} onChange={setField('portfolio')} placeholder="e.g. https://kamranphysics.space" />
      </Field>

      <Divider />
      <SectionHeading>Target Role & AI</SectionHeading>

      <Field label="Target Job Title">
        <Input
          value={data.targetJobTitle}
          onChange={e => onChange({ ...data, targetJobTitle: e.target.value })}
          placeholder="e.g. Senior Software Engineer / Research Scientist"
        />
      </Field>

      <Field label="Target Job Description (paste JD for better AI results)">
        <Textarea
          value={data.targetJobDescription}
          onChange={e => onChange({ ...data, targetJobDescription: e.target.value })}
          placeholder="Paste the full job description here…"
          rows={4}
        />
      </Field>

      <Divider />
      <SectionHeading>Professional Summary</SectionHeading>

      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
          Summary
        </span>
        <AiButton onClick={onAiGenerate} loading={aiLoading}>
          Auto-Generate Summary with AI
        </AiButton>
      </div>

      <Textarea
        value={data.aiSummary ?? aiSummary ?? ''}
        onChange={e => onChange({ ...data, aiSummary: e.target.value })}
        placeholder="A compelling professional summary will appear here after AI generation, or type your own…"
        rows={5}
      />
    </div>
  );
}

// ── Experience tab ────────────────────────────────────────────────────────
function ExperienceTab({ data, onChange, onOptimizeBullets, aiLoadingIdx }) {
  const experiences = data.experience ?? [];

  const updateExp = (i, field, value) => {
    const updated = experiences.map((exp, idx) =>
      idx === i ? { ...exp, [field]: value } : exp
    );
    onChange({ ...data, experience: updated });
  };

  const addExp = () => onChange({ ...data, experience: [...experiences, { ...EMPTY_EXPERIENCE }] });

  const removeExp = (i) =>
    onChange({ ...data, experience: experiences.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-6">
      <SectionHeading>Work Experience</SectionHeading>

      {experiences.length === 0 && (
        <p className="text-sm text-center py-4" style={{ color: '#475569' }}>
          No experience entries yet.
        </p>
      )}

      {experiences.map((exp, i) => (
        <div
          key={exp._id ?? i}
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold" style={{ color: '#64748b' }}>
              Position {i + 1}
            </span>
            <RemoveButton onClick={() => removeExp(i)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Job Title">
              <Input value={exp.jobTitle} onChange={e => updateExp(i, 'jobTitle', e.target.value)} placeholder="e.g. Senior Research Engineer" />
            </Field>
            <Field label="Company">
              <Input value={exp.company} onChange={e => updateExp(i, 'company', e.target.value)} placeholder="e.g. CERN / Google DeepMind" />
            </Field>
            <Field label="Location">
              <Input value={exp.location} onChange={e => updateExp(i, 'location', e.target.value)} placeholder="e.g. Geneva, Switzerland" />
            </Field>
            <Field label="Start Date">
              <Input value={exp.startDate} onChange={e => updateExp(i, 'startDate', e.target.value)} placeholder="e.g. Mar 2021" />
            </Field>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                className="w-4 h-4 rounded flex items-center justify-center transition-all duration-150"
                style={{
                  background: exp.isCurrent ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${exp.isCurrent ? '#3b82f6' : 'rgba(255,255,255,0.15)'}`,
                }}
                onClick={() => updateExp(i, 'isCurrent', !exp.isCurrent)}
              >
                {exp.isCurrent && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </div>
              <span className="text-xs" style={{ color: '#94a3b8' }}>Currently working here</span>
            </label>
            {!exp.isCurrent && (
              <div className="flex-1">
                <Input value={exp.endDate} onChange={e => updateExp(i, 'endDate', e.target.value)} placeholder="e.g. Dec 2024 or Present" />
              </div>
            )}
          </div>

          <Field label="Raw Description (paste your existing bullets or duties)">
            <Textarea
              value={exp.rawDescription}
              onChange={e => updateExp(i, 'rawDescription', e.target.value)}
              placeholder="Describe your responsibilities and achievements…"
              rows={3}
            />
          </Field>

          {/* AI optimize button */}
          <div className="flex items-center justify-end">
            <AiButton onClick={() => onOptimizeBullets(i)} loading={aiLoadingIdx === i}>
              🤖 Optimize Bullet Points
            </AiButton>
          </div>

          {/* AI-generated bullets */}
          {exp.aiBullets?.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#8b5cf6' }}>
                AI-Generated Bullets
              </p>
              {exp.aiBullets.map((bullet, bi) => (
                <div key={bi} className="flex items-start gap-2">
                  <span style={{ color: '#3b82f6' }} className="mt-1 shrink-0 text-xs">•</span>
                  <input
                    type="text"
                    value={bullet}
                    onChange={e => {
                      const bullets = [...exp.aiBullets];
                      bullets[bi] = e.target.value;
                      updateExp(i, 'aiBullets', bullets);
                    }}
                    className="builder-input text-xs"
                    style={{ padding: '5px 8px' }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <AddButton onClick={addExp}>Add Experience</AddButton>
    </div>
  );
}

// ── Education tab ─────────────────────────────────────────────────────────
function EducationTab({ data, onChange }) {
  const education = data.education ?? [];

  const updateEdu = (i, field, value) => {
    const updated = education.map((edu, idx) =>
      idx === i ? { ...edu, [field]: value } : edu
    );
    onChange({ ...data, education: updated });
  };

  const addEdu = () => onChange({ ...data, education: [...education, { ...EMPTY_EDUCATION }] });

  const removeEdu = (i) =>
    onChange({ ...data, education: education.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-6">
      <SectionHeading>Education</SectionHeading>

      {education.length === 0 && (
        <p className="text-sm text-center py-4" style={{ color: '#475569' }}>
          No education entries yet.
        </p>
      )}

      {education.map((edu, i) => (
        <div
          key={edu._id ?? i}
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold" style={{ color: '#64748b' }}>Entry {i + 1}</span>
            <RemoveButton onClick={() => removeEdu(i)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Degree / Certificate">
              <Input value={edu.degree} onChange={e => updateEdu(i, 'degree', e.target.value)} placeholder="e.g. Ph.D. Physics / B.Sc. Computer Science" />
            </Field>
            <Field label="Institution">
              <Input value={edu.institution} onChange={e => updateEdu(i, 'institution', e.target.value)} placeholder="e.g. Quaid-i-Azam University" />
            </Field>
            <Field label="Location">
              <Input value={edu.location} onChange={e => updateEdu(i, 'location', e.target.value)} placeholder="e.g. Islamabad, Pakistan" />
            </Field>
            <Field label="GPA">
              <Input value={edu.gpa} onChange={e => updateEdu(i, 'gpa', e.target.value)} placeholder="e.g. 3.85 / 4.00" />
            </Field>
            <Field label="Start Year">
              <Input value={edu.startYear} onChange={e => updateEdu(i, 'startYear', e.target.value)} placeholder="e.g. 2018" />
            </Field>
            <Field label="End Year">
              <Input value={edu.endYear} onChange={e => updateEdu(i, 'endYear', e.target.value)} placeholder="e.g. 2022 or Present" />
            </Field>
          </div>
        </div>
      ))}

      <AddButton onClick={addEdu}>Add Education</AddButton>
    </div>
  );
}

// ── Skills tab ────────────────────────────────────────────────────────────
function SkillsTab({ data, onChange }) {
  const skillGroups = data.skills ?? [];

  const updateGroup = (i, field, value) => {
    const updated = skillGroups.map((g, idx) =>
      idx === i ? { ...g, [field]: value } : g
    );
    onChange({ ...data, skills: updated });
  };

  const updateItems = (i, rawText) => {
    const items = rawText.split(',').map(s => s.trim()).filter(Boolean);
    updateGroup(i, 'items', items);
  };

  const addGroup = () =>
    onChange({ ...data, skills: [...skillGroups, { ...EMPTY_SKILL_GROUP }] });

  const removeGroup = (i) =>
    onChange({ ...data, skills: skillGroups.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-6">
      <SectionHeading>Skills & Technologies</SectionHeading>
      <p className="text-xs mb-2" style={{ color: '#475569' }}>
        Group skills by category. Separate items with commas.
      </p>

      {skillGroups.length === 0 && (
        <p className="text-sm text-center py-4" style={{ color: '#475569' }}>
          No skill groups yet.
        </p>
      )}

      {skillGroups.map((group, i) => (
        <div
          key={group._id ?? i}
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold" style={{ color: '#64748b' }}>Group {i + 1}</span>
            <RemoveButton onClick={() => removeGroup(i)} />
          </div>

          <Field label="Category">
            <Input
              value={group.category}
              onChange={e => updateGroup(i, 'category', e.target.value)}
              placeholder="e.g. Languages, Frameworks, Tools, Databases"
            />
          </Field>
          <Field label="Skills (comma-separated)">
            <Input
              value={group.items?.join(', ')}
              onChange={e => updateItems(i, e.target.value)}
              placeholder="e.g. Python, TensorFlow, NumPy, Matplotlib"
            />
          </Field>

          {/* Badge preview */}
          {group.items?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {group.items.map(item => (
                <span
                  key={item}
                  className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={{
                    background: 'rgba(59,130,246,0.12)',
                    border: '1px solid rgba(59,130,246,0.28)',
                    color: '#93c5fd',
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}

      <AddButton onClick={addGroup}>Add Skill Group</AddButton>
    </div>
  );
}

// ── Projects tab ─────────────────────────────────────────────────────────
function ProjectsTab({ data, onChange, onOptimizeProject, aiLoadingProjectIdx }) {
  const projects = data.projects ?? [];

  const updateProject = (i, field, value) => {
    const updated = projects.map((p, idx) =>
      idx === i ? { ...p, [field]: value } : p
    );
    onChange({ ...data, projects: updated });
  };

  const updateTechnologies = (i, rawText) => {
    const items = rawText.split(',').map(s => s.trim()).filter(Boolean);
    updateProject(i, 'technologies', items);
  };

  const addProject = () =>
    onChange({ ...data, projects: [...projects, { ...EMPTY_PROJECT }] });

  const removeProject = (i) =>
    onChange({ ...data, projects: projects.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-6">
      <SectionHeading>Projects</SectionHeading>
      <p className="text-xs mb-2" style={{ color: '#475569' }}>
        Highlight your strongest projects. Use the AI button to polish descriptions.
      </p>

      {projects.length === 0 && (
        <p className="text-sm text-center py-4" style={{ color: '#475569' }}>
          No projects yet.
        </p>
      )}

      {projects.map((project, i) => (
        <div
          key={project._id ?? i}
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold" style={{ color: '#64748b' }}>Project {i + 1}</span>
            <RemoveButton onClick={() => removeProject(i)} />
          </div>

          <Field label="Project Title">
            <Input
              value={project.title}
              onChange={e => updateProject(i, 'title', e.target.value)}
              placeholder="e.g. Quantum Simulation Engine / ATS Resume Analyser"
            />
          </Field>

          <Field label="Technologies Used (comma-separated)">
            <Input
              value={project.technologies?.join(', ')}
              onChange={e => updateTechnologies(i, e.target.value)}
              placeholder="e.g. Python, React, Node.js, MongoDB, TensorFlow"
            />
          </Field>

          {project.technologies?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {project.technologies.map(tech => (
                <span
                  key={tech}
                  className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={{
                    background: 'rgba(16,185,129,0.10)',
                    border: '1px solid rgba(16,185,129,0.28)',
                    color: '#6ee7b7',
                  }}
                >
                  {tech}
                </span>
              ))}
            </div>
          )}

          <Field label="Project Link / GitHub">
            <Input
              value={project.link}
              onChange={e => updateProject(i, 'link', e.target.value)}
              placeholder="e.g. github.com/kamranmalik/quantum-sim or https://myproject.dev"
            />
          </Field>

          <Field label="Description">
            <Textarea
              value={project.description}
              onChange={e => updateProject(i, 'description', e.target.value)}
              placeholder="Briefly describe the project's purpose, your role, and impact…"
              rows={3}
            />
          </Field>

          <div className="flex items-center justify-end">
            <AiButton
              onClick={() => onOptimizeProject(i)}
              loading={aiLoadingProjectIdx === i}
            >
              ✨ Optimize Description with AI
            </AiButton>
          </div>

          {project.aiDescription && (
            <div className="mt-2 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#10b981' }}>
                AI-Optimized Description
              </p>
              <Textarea
                value={project.aiDescription}
                onChange={e => updateProject(i, 'aiDescription', e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>
      ))}

      <AddButton onClick={addProject}>Add Project</AddButton>
    </div>
  );
}

// ── Certificates & Awards tab ─────────────────────────────────────────────
function CertificationsTab({ data, onChange }) {
  const certs = data.certifications ?? [];

  const updateCert = (i, field, value) => {
    const updated = certs.map((c, idx) =>
      idx === i ? { ...c, [field]: value } : c
    );
    onChange({ ...data, certifications: updated });
  };

  const addCert = () =>
    onChange({ ...data, certifications: [...certs, { ...EMPTY_CERTIFICATION }] });

  const removeCert = (i) =>
    onChange({ ...data, certifications: certs.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-6">
      <SectionHeading>Certificates & Awards</SectionHeading>
      <p className="text-xs mb-2" style={{ color: '#475569' }}>
        Add professional certifications, licences, and notable awards.
      </p>

      {certs.length === 0 && (
        <p className="text-sm text-center py-4" style={{ color: '#475569' }}>
          No certificates or awards yet.
        </p>
      )}

      {certs.map((cert, i) => (
        <div
          key={cert._id ?? i}
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold" style={{ color: '#64748b' }}>Entry {i + 1}</span>
            <RemoveButton onClick={() => removeCert(i)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Certificate / Award Name">
              <Input
                value={cert.name}
                onChange={e => updateCert(i, 'name', e.target.value)}
                placeholder="e.g. AWS Certified Solutions Architect"
              />
            </Field>
            <Field label="Issuing Organization">
              <Input
                value={cert.issuer}
                onChange={e => updateCert(i, 'issuer', e.target.value)}
                placeholder="e.g. Amazon Web Services / Coursera"
              />
            </Field>
            <Field label="Issue Date">
              <Input
                value={cert.issueDate}
                onChange={e => updateCert(i, 'issueDate', e.target.value)}
                placeholder="e.g. Aug 2023"
              />
            </Field>
            <Field label="Credential ID / URL">
              <Input
                value={cert.credentialId}
                onChange={e => updateCert(i, 'credentialId', e.target.value)}
                placeholder="e.g. ABC-123 or verify.credential.net/…"
              />
            </Field>
          </div>
        </div>
      ))}

      <AddButton onClick={addCert}>Add Certificate / Award</AddButton>
    </div>
  );
}


function ResumePreviewSheet({ data }) {
  if (!data) return null;

  const pi       = data.personalInfo   ?? {};
  const expArr   = data.experience     ?? [];
  const eduArr   = data.education      ?? [];
  const skills   = data.skills         ?? [];
  const projects = data.projects       ?? [];
  const certs    = data.certifications ?? [];
  const summary  = data.aiSummary      ?? '';

  const contactParts = [pi.email, pi.phone, pi.location].filter(Boolean);

  return (
    <div className="resume-paper w-full rounded-sm p-8 text-sm leading-relaxed"
         style={{ aspectRatio: '1 / 1.414', minHeight: '0' }}>

      {/* ── Header ── */}
      <div className="text-center mb-4 pb-4" style={{ borderBottom: '2px solid #1e40af' }}>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {pi.fullName || <span className="text-slate-300 italic">Your Name</span>}
        </h1>
        {data.targetJobTitle && (
          <p className="text-sm font-medium text-blue-700 mt-0.5">{data.targetJobTitle}</p>
        )}
        {contactParts.length > 0 && (
          <p className="text-xs text-slate-500 mt-1.5">{contactParts.join(' · ')}</p>
        )}
        {(pi.linkedIn || pi.github || pi.portfolio) && (
          <p className="text-xs text-blue-600 mt-0.5">
            {[pi.linkedIn, pi.github, pi.portfolio].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      {/* ── Summary ── */}
      {summary && (
        <section className="mb-4">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
            Professional Summary
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed">{summary}</p>
        </section>
      )}

      {/* ── Experience ── */}
      {expArr.length > 0 && (
        <section className="mb-4">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2"
              style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
            Experience
          </h2>
          <div className="space-y-3">
            {expArr.map((exp, i) => (
              <div key={exp._id ?? i}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{exp.jobTitle || 'Job Title'}</p>
                    <p className="text-xs text-blue-700 font-medium">{exp.company}{exp.location ? ` · ${exp.location}` : ''}</p>
                  </div>
                  <p className="text-[11px] text-slate-500 shrink-0 ml-2">
                    {[exp.startDate, exp.isCurrent ? 'Present' : exp.endDate].filter(Boolean).join(' – ')}
                  </p>
                </div>
                {/* Show AI bullets if present, else raw description */}
                {exp.aiBullets?.length > 0 ? (
                  <ul className="mt-1 space-y-0.5 list-none pl-3">
                    {exp.aiBullets.map((b, bi) => (
                      <li key={bi} className="text-[11px] text-slate-700 leading-relaxed flex gap-1.5">
                        <span className="text-blue-500 shrink-0">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                ) : exp.rawDescription ? (
                  <p className="text-[11px] text-slate-600 mt-1 pl-3 leading-relaxed">
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
        <section className="mb-4">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2"
              style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
            Education
          </h2>
          <div className="space-y-2">
            {eduArr.map((edu, i) => (
              <div key={edu._id ?? i} className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">{edu.degree || 'Degree'}</p>
                  <p className="text-xs text-blue-700">{edu.institution}{edu.location ? ` · ${edu.location}` : ''}</p>
                  {edu.gpa && <p className="text-[11px] text-slate-500">GPA: {edu.gpa}</p>}
                </div>
                <p className="text-[11px] text-slate-500 shrink-0 ml-2">
                  {[edu.startYear, edu.endYear].filter(Boolean).join(' – ')}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Skills ── */}
      {skills.length > 0 && (
        <section className="mb-4">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2"
              style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
            Skills
          </h2>
          <div className="space-y-1">
            {skills.map((group, i) => (
              group.items?.length > 0 && (
                <div key={group._id ?? i} className="flex gap-2 text-xs text-slate-700">
                  {group.category && (
                    <span className="font-semibold shrink-0 text-slate-800">{group.category}:</span>
                  )}
                  <span>{group.items.join(', ')}</span>
                </div>
              )
            ))}
          </div>
        </section>
      )}

      {/* ── Projects ── */}
      {projects.length > 0 && (
        <section className="mb-4">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2"
              style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
            Projects
          </h2>
          <div className="space-y-3">
            {projects.map((proj, i) => (
              <div key={proj._id ?? i}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{proj.title || 'Project Title'}</p>
                    {proj.technologies?.length > 0 && (
                      <p className="text-[11px] text-blue-600 mt-0.5">{proj.technologies.join(', ')}</p>
                    )}
                  </div>
                  {proj.link && (
                    <p className="text-[11px] text-blue-500 shrink-0 ml-2 truncate max-w-[140px]">{proj.link}</p>
                  )}
                </div>
                {(proj.aiDescription || proj.description) && (
                  <p className="text-[11px] text-slate-600 mt-1 pl-0 leading-relaxed">
                    {proj.aiDescription || proj.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Certifications ── */}
      {certs.length > 0 && (
        <section className="mb-4">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2"
              style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
            Certificates & Awards
          </h2>
          <div className="space-y-1.5">
            {certs.map((cert, i) => (
              <div key={cert._id ?? i} className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">{cert.name || 'Certificate Name'}</p>
                  <p className="text-[11px] text-blue-700">{cert.issuer}</p>
                  {cert.credentialId && (
                    <p className="text-[11px] text-slate-500 truncate max-w-[260px]">ID: {cert.credentialId}</p>
                  )}
                </div>
                {cert.issueDate && (
                  <p className="text-[11px] text-slate-500 shrink-0 ml-2">{cert.issueDate}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!pi.fullName && !summary && expArr.length === 0 && eduArr.length === 0 && skills.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-slate-300 text-sm italic">Start filling in the form to see your resume…</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────
export default function ResumeBuilder() {
  const { id }    = useParams();
  const navigate  = useNavigate();

  // ── State ────────────────────────────────────────────────────────────────
  const [resumeData,  setResumeData]  = useState(null);
  const [activeTab,   setActiveTab]   = useState(0);
  const [saving,      setSaving]      = useState(false);
  const [saveStatus,  setSaveStatus]  = useState('idle'); // idle | saving | saved | error
  const [loadError,   setLoadError]   = useState(null);
  const [aiLoading,   setAiLoading]   = useState(false);   // full generation
  const [aiLoadingIdx, setAiLoadingIdx] = useState(null);  // per-experience bullet optimization
  const [aiLoadingProjectIdx, setAiLoadingProjectIdx] = useState(null); // per-project description

  // ── Debounced auto-save ──────────────────────────────────────────────────
  const debouncedData = useDebounce(resumeData, 1500);
  const isFirstSave   = useRef(true); // don't auto-save on initial load

  // ── Fetch on mount ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await api.get(`/resumes/${id}`);
        setResumeData(res.data.data ?? res.data);
      } catch {
        setLoadError('Could not load resume. It may have been deleted or you may not have access.');
      }
    })();
  }, [id]);

  // ── Auto-save when debounced data changes ────────────────────────────────
  useEffect(() => {
    if (!debouncedData || !id) return;
    if (isFirstSave.current) { isFirstSave.current = false; return; }

    (async () => {
      setSaveStatus('saving');
      try {
        // Strip read-only fields before sending
        const { _id, userId, createdAt, updatedAt, __v, ...payload } = debouncedData;
        await api.put(`/resumes/${id}`, payload);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    })();
  }, [debouncedData, id]);

  // ── Manual save ──────────────────────────────────────────────────────────
  const handleManualSave = async () => {
    if (!resumeData || !id) return;
    setSaving(true);
    setSaveStatus('saving');
    try {
      const { _id, userId, createdAt, updatedAt, __v, ...payload } = resumeData;
      await api.put(`/resumes/${id}`, payload);
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  // ── Full AI generation (summary + all bullets) ────────────────────────────
  const handleAiGenerate = async () => {
    if (!id) return;
    // First auto-save current state so Gemini reads latest data
    try {
      const { _id, userId, createdAt, updatedAt, __v, ...payload } = resumeData;
      await api.put(`/resumes/${id}`, payload);
    } catch { /* continue anyway */ }

    setAiLoading(true);
    try {
      const res = await api.post('/ai/generate', { resumeId: id });
      const updated = res.data.data?.resume ?? res.data.resume ?? res.data.data;
      if (updated) {
        setResumeData(updated);
        isFirstSave.current = true; // suppress auto-save immediately after AI write
      }
    } catch (err) {
      alert(err.response?.data?.message || 'AI generation failed. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  // ── Per-experience bullet optimization ───────────────────────────────────
  const handleOptimizeBullets = async (idx) => {
    if (!id) return;
    try {
      const { _id, userId, createdAt, updatedAt, __v, ...payload } = resumeData;
      await api.put(`/resumes/${id}`, payload);
    } catch { /* continue */ }

    setAiLoadingIdx(idx);
    try {
      const res = await api.post('/ai/generate', { resumeId: id });
      const updated = res.data.data?.resume ?? res.data.resume ?? res.data.data;
      if (updated) {
        setResumeData(updated);
        isFirstSave.current = true;
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Optimization failed. Please try again.');
    } finally {
      setAiLoadingIdx(null);
    }
  };

  // ── Per-project description optimization ─────────────────────────────────
  const handleOptimizeProject = async (idx) => {
    if (!id || !resumeData) return;
    // Save current state first so the AI sees the latest project data
    try {
      const { _id, userId, createdAt, updatedAt, __v, ...payload } = resumeData;
      await api.put(`/resumes/${id}`, payload);
    } catch { /* continue */ }

    setAiLoadingProjectIdx(idx);
    try {
      const res = await api.post('/ai/generate', { resumeId: id });
      const updated = res.data.data?.resume ?? res.data.resume ?? res.data.data;
      if (updated) {
        setResumeData(updated);
        isFirstSave.current = true;
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Project optimization failed. Please try again.');
    } finally {
      setAiLoadingProjectIdx(null);
    }
  };

  // ── Save status label ────────────────────────────────────────────────────
  const saveLabel = {
    idle:   '',
    saving: 'Saving…',
    saved:  'Saved ✓',
    error:  'Save failed',
  }[saveStatus];

  const saveLabelColor = {
    saving: '#60a5fa',
    saved:  '#34d399',
    error:  '#f87171',
  }[saveStatus] ?? '#475569';

  // ── Loading / error skeleton ─────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6"
           style={{ backgroundColor: 'var(--bg-base)' }}>
        <div className="text-center max-w-sm">
          <p className="text-sm mb-4" style={{ color: '#f87171' }}>{loadError}</p>
          <button onClick={() => navigate('/dashboard')}
                  className="text-sm font-medium transition-colors duration-150"
                  style={{ color: '#3b82f6' }}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!resumeData) {
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

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-sm font-medium transition-colors duration-150"
            style={{ color: '#64748b' }}
            onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'}
            onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>
          <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
          <span className="text-sm font-semibold truncate max-w-[200px]" style={{ color: '#e2e8f0' }}>
            {resumeData.title}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Auto-save status */}
          {saveStatus !== 'idle' && (
            <span className="text-xs font-medium save-pulse" style={{ color: saveLabelColor }}>
              {saveLabel}
            </span>
          )}

          {/* AI Generate full */}
          <AiButton onClick={handleAiGenerate} loading={aiLoading}>
            {aiLoading ? 'Generating…' : '🤖 Generate with AI'}
          </AiButton>

          {/* Manual save */}
          <button
            onClick={handleManualSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold
                       text-white transition-all duration-200 active:scale-[0.97]
                       disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: '#3b82f6', boxShadow: '0 0 14px rgba(59,130,246,0.3)' }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#2563eb'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#3b82f6'; }}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </button>
        </div>
      </header>

      {/* ── Split-screen workspace ──────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* LEFT: edit suite */}
        <div
          className="flex flex-col shrink-0 overflow-hidden"
          style={{
            width: '45%',
            borderRight: '1px solid var(--border-subtle)',
            background: '#0d1423',
          }}
        >
          {/* Step tabs */}
          <div
            className="flex shrink-0 px-4 pt-4 pb-0 gap-1"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className="px-4 py-2 text-xs font-semibold rounded-t-lg transition-all duration-150"
                style={activeTab === i
                  ? { background: 'rgba(59,130,246,0.12)', color: '#60a5fa', borderBottom: '2px solid #3b82f6' }
                  : { color: '#475569', borderBottom: '2px solid transparent' }
                }
              >
                {i + 1}. {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {activeTab === 0 && (
              <ProfileTab
                data={resumeData}
                onChange={setResumeData}
                aiSummary={resumeData.aiSummary}
                onAiGenerate={handleAiGenerate}
                aiLoading={aiLoading}
              />
            )}
            {activeTab === 1 && (
              <ExperienceTab
                data={resumeData}
                onChange={setResumeData}
                onOptimizeBullets={handleOptimizeBullets}
                aiLoadingIdx={aiLoadingIdx}
              />
            )}
            {activeTab === 2 && (
              <EducationTab data={resumeData} onChange={setResumeData} />
            )}
            {activeTab === 3 && (
              <SkillsTab data={resumeData} onChange={setResumeData} />
            )}
            {activeTab === 4 && (
              <ProjectsTab
                data={resumeData}
                onChange={setResumeData}
                onOptimizeProject={handleOptimizeProject}
                aiLoadingProjectIdx={aiLoadingProjectIdx}
              />
            )}
            {activeTab === 5 && (
              <CertificationsTab data={resumeData} onChange={setResumeData} />
            )}
          </div>

          {/* Tab nav arrows */}
          <div
            className="flex items-center justify-between px-5 py-3 shrink-0"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <button
              onClick={() => setActiveTab(t => Math.max(0, t - 1))}
              disabled={activeTab === 0}
              className="flex items-center gap-1.5 text-xs font-medium transition-all duration-150
                         disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ color: '#64748b' }}
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-xs" style={{ color: '#334155' }}>
              {activeTab + 1} / {TABS.length}
            </span>
            <button
              onClick={() => setActiveTab(t => Math.min(TABS.length - 1, t + 1))}
              disabled={activeTab === TABS.length - 1}
              className="flex items-center gap-1.5 text-xs font-medium transition-all duration-150
                         disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ color: '#64748b' }}
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* RIGHT: live preview canvas */}
        <div
          className="flex-1 overflow-y-auto flex items-start justify-center py-8 px-6"
          style={{ background: '#0a0e1b' }}
        >
          <div className="w-full max-w-[640px]">
            {/* Canvas label */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#334155' }}>
                Live Preview
              </span>
              <span className="text-[11px]" style={{ color: '#1e40af' }}>
                A4 · Standard
              </span>
            </div>

            {/* Paper sheet */}
            <div className="relative">
              <ResumePreviewSheet data={resumeData} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
