import { Router } from "express";
import {
  createResume,
  getAllResumes,
  getResumeById,
  updateResume,
  deleteResume,
  updateResumeStatus,
} from "../controllers/resume.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createResumeSchema,
  updateResumeSchema,
  updateResumeStatusSchema,
} from "../validators/resume.validator.js";

const router = Router();

// ---------------------------------------------------------------------------
// Apply verifyJWT to the ENTIRE router.
//
// router.use(verifyJWT) here means every route defined below REQUIRES a valid
// access token. There is no need to add verifyJWT individually per route,
// and it's impossible to accidentally forget it on a new route added later.
// ---------------------------------------------------------------------------
router.use(verifyJWT);

// ---------------------------------------------------------------------------
// Collection-level routes  →  /api/v1/resumes
// ---------------------------------------------------------------------------

router
  .route("/")
  /**
   * GET /api/v1/resumes
   * Returns all resumes for the authenticated user (dashboard list).
   * Heavy fields are excluded via projection in the controller.
   */
  .get(getAllResumes)

  /**
   * POST /api/v1/resumes
   * Body: { title? }
   * Creates a new empty resume shell and returns it.
   */
  .post(validate(createResumeSchema), createResume);

// ---------------------------------------------------------------------------
// Resource-level routes  →  /api/v1/resumes/:id
// ---------------------------------------------------------------------------

router
  .route("/:id")
  /**
   * GET /api/v1/resumes/:id
   * Returns the full resume document (all fields).
   * Ownership is enforced inside the controller query.
   */
  .get(getResumeById)

  /**
   * PUT /api/v1/resumes/:id
   * Body: Partial resume object (any combination of top-level fields)
   * Used by the auto-save mechanism — supports full or partial updates.
   */
  .put(validate(updateResumeSchema), updateResume)

  /**
   * DELETE /api/v1/resumes/:id
   * Permanently deletes the resume. No body required.
   * Ownership is verified implicitly inside the controller.
   */
  .delete(deleteResume);

// ---------------------------------------------------------------------------
// Status sub-resource  →  /api/v1/resumes/:id/status
// ---------------------------------------------------------------------------

/**
 * PATCH /api/v1/resumes/:id/status
 * Body: { status: "draft" | "generated" | "finalised" }
 * Advances the resume lifecycle state.
 * Using PATCH (not PUT) signals a partial, single-field update.
 */
router
  .route("/:id/status")
  .patch(validate(updateResumeStatusSchema), updateResumeStatus);

export default router;
