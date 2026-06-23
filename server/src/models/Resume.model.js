import mongoose, { Schema } from "mongoose";

// ---------------------------------------------------------------------------
// Sub-schemas
// Defined separately so each section is reusable and independently testable.
// _id is enabled on sub-docs so the frontend can key/update items by id.
// ---------------------------------------------------------------------------

/**
 * Experience entry sub-schema.
 * `aiBullets` stores the AI-generated bullet points for this role after
 * the generation phase; starts as an empty array.
 * `isCurrent` drives the "I currently work here" toggle — when true,
 * `endDate` is intentionally left blank.
 */
const experienceSchema = new Schema(
  {
    jobTitle: {
      type: String,
      trim: true,
      maxlength: [100, "Job title cannot exceed 100 characters"],
    },
    company: {
      type: String,
      trim: true,
      maxlength: [100, "Company name cannot exceed 100 characters"],
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, "Location cannot exceed 100 characters"],
    },
    startDate: {
      type: String, // Stored as "MMM YYYY" string for display flexibility
      trim: true,
    },
    endDate: {
      type: String,
      trim: true,
    },
    isCurrent: {
      type: Boolean,
      default: false,
    },
    // Raw, unformatted text the user pastes from their original resume or types
    rawDescription: {
      type: String,
      trim: true,
      maxlength: [5000, "Raw description cannot exceed 5000 characters"],
    },
    // AI-generated, quantified, action-verb-led bullet points for this role
    aiBullets: {
      type: [String],
      default: [],
    },
  },
  { _id: true }
);

/**
 * Education entry sub-schema.
 */
const educationSchema = new Schema(
  {
    degree: {
      type: String,
      trim: true,
      maxlength: [150, "Degree cannot exceed 150 characters"],
    },
    institution: {
      type: String,
      trim: true,
      maxlength: [150, "Institution name cannot exceed 150 characters"],
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, "Location cannot exceed 100 characters"],
    },
    startYear: {
      type: String,
      trim: true,
    },
    endYear: {
      type: String,
      trim: true,
    },
    gpa: {
      type: String, // Stored as string to handle "3.8/4.0", "Distinction", etc.
      trim: true,
      maxlength: [20, "GPA cannot exceed 20 characters"],
    },
    relevantCoursework: {
      type: [String],
      default: [],
    },
  },
  { _id: true }
);

/**
 * Skills group sub-schema.
 * Grouped by category so the UI can render sections like
 * "Languages: Python, JS" and "Tools: Git, Docker".
 */
const skillsSchema = new Schema(
  {
    category: {
      type: String,
      trim: true,
      maxlength: [80, "Skill category cannot exceed 80 characters"],
    },
    items: {
      type: [String],
      default: [],
    },
  },
  { _id: true }
);

/**
 * Certification entry sub-schema.
 */
const certificationSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: [150, "Certification name cannot exceed 150 characters"],
    },
    issuer: {
      type: String,
      trim: true,
      maxlength: [100, "Issuer cannot exceed 100 characters"],
    },
    year: {
      type: String,
      trim: true,
    },
    issueDate: {
      type: String,
      trim: true,
    },
    credentialId: {
      type: String,
      trim: true,
      maxlength: [300, "Credential ID/URL cannot exceed 300 characters"],
    },
  },
  { _id: true }
);

/**
 * Project entry sub-schema.
 */
const projectSchema = new Schema(
  {
    title: {
      type: String,
      trim: true,
      maxlength: [150, "Project title cannot exceed 150 characters"],
    },
    technologies: {
      type: [String],
      default: [],
    },
    link: {
      type: String,
      trim: true,
      maxlength: [300, "Project link cannot exceed 300 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Project description cannot exceed 2000 characters"],
    },
    aiDescription: {
      type: String,
      trim: true,
      maxlength: [2000, "AI project description cannot exceed 2000 characters"],
    },
  },
  { _id: true }
);

/**
 * Personal info sub-schema (root-level inline object, not a separate collection).
 */
const personalInfoSchema = new Schema(
  {
    fullName: {
      type: String,
      trim: true,
      maxlength: [100, "Full name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [30, "Phone number cannot exceed 30 characters"],
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, "Location cannot exceed 100 characters"],
    },
    linkedIn: {
      type: String,
      trim: true,
      maxlength: [200, "LinkedIn URL cannot exceed 200 characters"],
    },
    github: {
      type: String,
      trim: true,
      maxlength: [200, "GitHub URL cannot exceed 200 characters"],
    },
    portfolio: {
      type: String,
      trim: true,
      maxlength: [200, "Portfolio URL cannot exceed 200 characters"],
    },
  },
  { _id: false } // Embedded inline — no separate _id needed
);

// ---------------------------------------------------------------------------
// Root Resume Schema
// ---------------------------------------------------------------------------

const resumeSchema = new Schema(
  {
    // ── Ownership ──────────────────────────────────────────────────────────
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId is required"],
      index: true, // Single-field index for fast per-user queries
    },

    // ── Meta ───────────────────────────────────────────────────────────────
    title: {
      type: String,
      trim: true,
      maxlength: [120, "Resume title cannot exceed 120 characters"],
      default: "Untitled Resume",
    },

    // ── Status lifecycle ───────────────────────────────────────────────────
    // draft     → user is still editing, no AI generation yet
    // generated → AI has produced bullets / summary at least once
    // finalised → user has approved and locked the resume
    status: {
      type: String,
      enum: {
        values: ["draft", "generated", "finalised"],
        message: "Status must be one of: draft, generated, finalised",
      },
      default: "draft",
    },

    // ── Template selection ─────────────────────────────────────────────────
    // Stores a template identifier string (e.g. "modern", "classic", "minimal")
    // resolved by the frontend renderer in Phase 4.
    templateId: {
      type: String,
      trim: true,
      default: "classic",
    },

    // ── Personal information ───────────────────────────────────────────────
    personalInfo: {
      type: personalInfoSchema,
      default: () => ({}),
    },

    // ── AI targeting inputs ────────────────────────────────────────────────
    // The job title the user is applying for — used as context for AI prompts
    targetJobTitle: {
      type: String,
      trim: true,
      maxlength: [120, "Target job title cannot exceed 120 characters"],
    },

    // Full job description text pasted by the user — heavy field, excluded
    // from list projections in getAllResumes to keep dashboard queries fast.
    targetJobDescription: {
      type: String,
      trim: true,
      maxlength: [10000, "Target job description cannot exceed 10000 characters"],
    },

    // ── AI output ──────────────────────────────────────────────────────────
    // The AI-crafted professional summary tailored to the target role.
    // Populated during Phase 3 (AI generation).
    aiSummary: {
      type: String,
      trim: true,
      maxlength: [2000, "AI summary cannot exceed 2000 characters"],
    },

    // ── Resume sections ────────────────────────────────────────────────────
    experience: {
      type: [experienceSchema],
      default: [],
    },

    education: {
      type: [educationSchema],
      default: [],
    },

    skills: {
      type: [skillsSchema],
      default: [],
    },

    certifications: {
      type: [certificationSchema],
      default: [],
    },

    // ── Projects ───────────────────────────────────────────────────────────
    projects: {
      type: [projectSchema],
      default: [],
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

/**
 * Compound index on userId + updatedAt (descending).
 *
 * Purpose: Powers the "My Resumes" dashboard query which fetches all resumes
 * for a user sorted by most recently modified. Without this, MongoDB would
 * do a full collection scan + in-memory sort for every dashboard load.
 *
 * Query pattern it satisfies:
 *   Resume.find({ userId }).sort({ updatedAt: -1 })
 */
resumeSchema.index({ userId: 1, updatedAt: -1 });

export const Resume = mongoose.model("Resume", resumeSchema);
