import { Router } from "express";
import multer from "multer";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { analyzeResumeController, generateCoverLetter, generateInterviewQuestions } from "../controllers/analyzer.controller.js";
import { getAnalysisHistory, getDashboardStats } from "../controllers/analysis.controller.js";
import { ApiError } from "../utils/ApiError.js";

const router = Router();

// ---------------------------------------------------------------------------
// Multer configuration — memory storage (no temp files on disk)
// ---------------------------------------------------------------------------

/**
 * fileFilter
 *
 * Rejects anything that is not a PDF or DOCX before the buffer is even read.
 * This is a first-pass guard; the controller also validates after extraction.
 */
const fileFilter = (_req, file, cb) => {
  const allowed = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(415, "Only PDF and DOCX files are supported."), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),  // Buffer lives in RAM — no disk I/O
  limits: {
    fileSize: 5 * 1024 * 1024,      // 5 MB hard cap
    files: 1,                        // Single file per request
  },
  fileFilter,
});

// ---------------------------------------------------------------------------
// Multer error middleware
// ---------------------------------------------------------------------------

/**
 * handleMulterError
 *
 * Catches multer-specific errors (LIMIT_FILE_SIZE, LIMIT_UNEXPECTED_FILE, etc.)
 * and maps them to our ApiError format so the global error handler can
 * return a clean JSON response instead of multer's default HTML error page.
 */
function handleMulterError(err, _req, _res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(new ApiError(413, "File exceeds the 5 MB size limit."));
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return next(new ApiError(400, `Unexpected file field. Use the field name "resume".`));
    }
    return next(new ApiError(400, `File upload error: ${err.message}`));
  }
  // Not a multer error — pass through to global error handler
  next(err);
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// All analyzer routes require a valid JWT
router.use(verifyJWT);

/**
 * POST /api/v1/analyzer/upload
 *
 * Accepts a single PDF or DOCX file under the field name "resume",
 * extracts its text, runs it through the AI model, and returns an ATS analysis.
 *
 * Flow:
 *   verifyJWT → multer (memoryStorage + fileFilter) → analyzeResumeController
 *                             ↓ (on error)
 *                      handleMulterError → global error handler
 */
router.post(
  "/upload",
  (req, res, next) => {
    upload.single("resume")(req, res, (err) => {
      if (err) return handleMulterError(err, req, res, next);
      next();
    });
  },
  analyzeResumeController
);

/**
 * GET /api/v1/analyzer/history
 *
 * Returns a lightweight list of the authenticated user's past analysis runs,
 * sorted newest-first. Projects summary fields only (_id, fileName, atsScore,
 * detectedDomain, marketFit, createdAt) for fast dashboard list rendering.
 */
router.get("/history", getAnalysisHistory);

/**
 * GET /api/v1/analyzer/stats
 *
 * Returns aggregated dashboard analytics for the authenticated user:
 *   - totalScans, averageAtsScore, topDomain
 *   - domainBreakdown  [ { domain, count } ]
 *   - marketFitBreakdown [ { marketFit, count } ]
 */
router.get("/stats", getDashboardStats);

/**
 * POST /api/v1/analyzer/cover-letter
 * Body: { company, role, jobDescription }
 *
 * Generates a tailored, professional cover letter using OpenRouter AI.
 * Returns { coverLetter: string } — plain text, ready for clipboard copy.
 */
router.post("/cover-letter", generateCoverLetter);

/**
 * POST /api/v1/analyzer/interview-prep
 * Body: { resumeId }
 *
 * Fetches the user's resume by ID, extracts their tech stack, experience, and
 * projects, then generates 5 Technical + 5 Behavioral interview questions with
 * ideal answers and hints. Returns { questions: Array }.
 */
router.post("/interview-prep", generateInterviewQuestions);

export default router;
