import { Router } from "express";
import { generateResume } from "../controllers/ai.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { aiRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// ---------------------------------------------------------------------------
// Middleware order matters here:
//
//   verifyJWT     → Must run first to populate req.user
//   aiRateLimiter → Uses req.user._id as the rate-limit key; depends on verifyJWT
//   generateResume → Controller runs only if both guards pass
//
// All AI routes require authentication. There are no public AI endpoints.
// ---------------------------------------------------------------------------

router.use(verifyJWT);

// ---------------------------------------------------------------------------
// POST /api/v1/ai/generate
//
// Body: { resumeId: "<MongoDB ObjectId string>" }
//
// Triggers the full AI generation pipeline for a specific resume:
//   1. Ownership check
//   2. Quota check
//   3. Gemini API call
//   4. Patch aiSummary + aiBullets onto the resume
//   5. Increment generationsUsed
//   6. Return updated resume + quota info
// ---------------------------------------------------------------------------
router.post("/generate", aiRateLimiter, generateResume);

export default router;
