import Joi from "joi";

/**
 * Resume Validators
 *
 * All schemas here are designed for PARTIAL / INCREMENTAL updates to support
 * front-end auto-save. Every field is optional unless noted otherwise.
 *
 * This means the client can send:
 *   PATCH /resumes/:id  { "title": "New Title" }          ✅
 *   PATCH /resumes/:id  { "personalInfo": { "phone": "..." } }  ✅
 *
 * Mongoose's `runValidators: true` in the controller provides the second layer
 * of validation at the DB level for things like maxlength.
 */

// ---------------------------------------------------------------------------
// Sub-schemas (mirroring Mongoose sub-schemas in Resume.model.js)
// ---------------------------------------------------------------------------

const experienceItemSchema = Joi.object({
  _id: Joi.string(), // Allow client to pass existing sub-doc _id on update

  jobTitle: Joi.string().trim().max(100).allow("").messages({
    "string.max": "Job title cannot exceed 100 characters",
  }),

  company: Joi.string().trim().max(100).allow("").messages({
    "string.max": "Company name cannot exceed 100 characters",
  }),

  location: Joi.string().trim().max(100).allow("").messages({
    "string.max": "Location cannot exceed 100 characters",
  }),

  startDate: Joi.string().trim().allow(""),

  endDate: Joi.string().trim().allow(""),

  isCurrent: Joi.boolean(),

  rawDescription: Joi.string().trim().max(5000).allow("").messages({
    "string.max": "Raw description cannot exceed 5000 characters",
  }),

  aiBullets: Joi.array().items(Joi.string().trim()).default([]),
});

const educationItemSchema = Joi.object({
  _id: Joi.string(),

  degree: Joi.string().trim().max(150).allow("").messages({
    "string.max": "Degree cannot exceed 150 characters",
  }),

  institution: Joi.string().trim().max(150).allow("").messages({
    "string.max": "Institution name cannot exceed 150 characters",
  }),

  location: Joi.string().trim().max(100).allow("").messages({
    "string.max": "Location cannot exceed 100 characters",
  }),

  startYear: Joi.string().trim().allow(""),

  endYear: Joi.string().trim().allow(""),

  gpa: Joi.string().trim().max(20).allow("").messages({
    "string.max": "GPA value cannot exceed 20 characters",
  }),

  relevantCoursework: Joi.array().items(Joi.string().trim()).default([]),
});

const skillsItemSchema = Joi.object({
  _id: Joi.string(),

  category: Joi.string().trim().max(80).allow("").messages({
    "string.max": "Skill category cannot exceed 80 characters",
  }),

  items: Joi.array().items(Joi.string().trim()).default([]),
});

const certificationItemSchema = Joi.object({
  _id: Joi.string(),

  name: Joi.string().trim().max(150).allow("").messages({
    "string.max": "Certification name cannot exceed 150 characters",
  }),

  issuer: Joi.string().trim().max(100).allow("").messages({
    "string.max": "Issuer cannot exceed 100 characters",
  }),

  year: Joi.string().trim().allow(""),

  issueDate: Joi.string().trim().allow(""),

  credentialId: Joi.string().trim().max(300).allow("").messages({
    "string.max": "Credential ID/URL cannot exceed 300 characters",
  }),
});

const projectItemSchema = Joi.object({
  _id: Joi.string(),

  title: Joi.string().trim().max(150).allow("").messages({
    "string.max": "Project title cannot exceed 150 characters",
  }),

  technologies: Joi.array().items(Joi.string().trim()).default([]),

  link: Joi.string().trim().max(300).allow("").messages({
    "string.max": "Project link cannot exceed 300 characters",
  }),

  description: Joi.string().trim().max(2000).allow("").messages({
    "string.max": "Project description cannot exceed 2000 characters",
  }),

  aiDescription: Joi.string().trim().max(2000).allow("").messages({
    "string.max": "AI project description cannot exceed 2000 characters",
  }),
});

const personalInfoSchema = Joi.object({
  fullName: Joi.string().trim().max(100).allow("").messages({
    "string.max": "Full name cannot exceed 100 characters",
  }),

  email: Joi.string()
    .trim()
    .email({ tlds: { allow: false } })
    .lowercase()
    .allow("")
    .messages({
      "string.email": "Please provide a valid email address",
    }),

  phone: Joi.string().trim().max(30).allow("").messages({
    "string.max": "Phone number cannot exceed 30 characters",
  }),

  location: Joi.string().trim().max(100).allow("").messages({
    "string.max": "Location cannot exceed 100 characters",
  }),

  linkedIn: Joi.string().trim().max(200).allow("").messages({
    "string.max": "LinkedIn URL cannot exceed 200 characters",
  }),

  github: Joi.string().trim().max(200).allow("").messages({
    "string.max": "GitHub URL cannot exceed 200 characters",
  }),

  portfolio: Joi.string().trim().max(200).allow("").messages({
    "string.max": "Portfolio URL cannot exceed 200 characters",
  }),
});

// ---------------------------------------------------------------------------
// createResumeSchema
// Minimal — only a title is accepted at creation time (or nothing at all).
// The resume shell is created first; sections are filled in via auto-save.
// ---------------------------------------------------------------------------

const createResumeSchema = Joi.object({
  title: Joi.string().trim().max(120).default("Untitled Resume").messages({
    "string.max": "Resume title cannot exceed 120 characters",
  }),
});

// ---------------------------------------------------------------------------
// updateResumeSchema
// All fields are optional to support partial auto-save from any section
// of the resume builder UI (e.g. only the personalInfo panel was changed).
// ---------------------------------------------------------------------------

const updateResumeSchema = Joi.object({
  title: Joi.string().trim().max(120).allow("").messages({
    "string.max": "Resume title cannot exceed 120 characters",
  }),

  templateId: Joi.string().trim().allow(""),

  personalInfo: personalInfoSchema,

  targetJobTitle: Joi.string().trim().max(120).allow("").messages({
    "string.max": "Target job title cannot exceed 120 characters",
  }),

  targetJobDescription: Joi.string().trim().max(10000).allow("").messages({
    "string.max": "Target job description cannot exceed 10000 characters",
  }),

  aiSummary: Joi.string().trim().max(2000).allow("").messages({
    "string.max": "AI summary cannot exceed 2000 characters",
  }),

  experience: Joi.array().items(experienceItemSchema),

  education: Joi.array().items(educationItemSchema),

  skills: Joi.array().items(skillsItemSchema),

  certifications: Joi.array().items(certificationItemSchema),

  projects: Joi.array().items(projectItemSchema),
});

// ---------------------------------------------------------------------------
// updateResumeStatusSchema
// Dedicated narrow schema for the PATCH /status endpoint.
// Only the `status` field is accepted — nothing else can be changed here.
// ---------------------------------------------------------------------------

const updateResumeStatusSchema = Joi.object({
  status: Joi.string()
    .valid("draft", "generated", "finalised")
    .required()
    .messages({
      "any.only": "Status must be one of: draft, generated, finalised",
      "any.required": "Status is required",
    }),
});

export { createResumeSchema, updateResumeSchema, updateResumeStatusSchema };
