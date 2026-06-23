import mongoose from "mongoose";
import { Resume } from "../models/Resume.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * isValidObjectId
 * Guards against malformed :id params reaching Mongoose and throwing a
 * CastError instead of returning a clean 400 to the client.
 *
 * @param {string} id
 * @returns {boolean}
 */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ---------------------------------------------------------------------------
// Controller: createResume
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/resumes
 *
 * Creates a new, mostly-empty resume shell for the authenticated user.
 * Only `title` is accepted from the body; everything else gets its schema
 * default (empty arrays, "draft" status, etc.).
 *
 * The frontend immediately redirects the user into the builder with the
 * returned `_id`, which is then used for all subsequent auto-save PATCHes.
 */
const createResume = asyncHandler(async (req, res) => {
  const { title } = req.body;

  const resume = await Resume.create({
    userId: req.user._id,
    title: title || "Untitled Resume",
  });

  res
    .status(201)
    .json(new ApiResponse(201, resume, "Resume created successfully"));
});

// ---------------------------------------------------------------------------
// Controller: getAllResumes
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/resumes
 *
 * Returns all resumes owned by the authenticated user, sorted by most
 * recently updated (newest first).
 *
 * Projection deliberately EXCLUDES heavy / AI-input fields that are not
 * needed for the dashboard card layout:
 *   - targetJobDescription  (can be thousands of characters)
 *   - experience[].rawDescription
 *   - aiSummary
 *
 * This keeps dashboard payloads small regardless of resume content size.
 */
const getAllResumes = asyncHandler(async (req, res) => {
  const resumes = await Resume.find({ userId: req.user._id })
    .select(
      "-targetJobDescription -aiSummary -experience.rawDescription -experience.aiBullets"
    )
    .sort({ updatedAt: -1 }) // Compound index { userId:1, updatedAt:-1 } covers this
    .lean(); // Plain JS objects — no Mongoose overhead needed for read-only list

  res
    .status(200)
    .json(
      new ApiResponse(200, resumes, "Resumes fetched successfully")
    );
});

// ---------------------------------------------------------------------------
// Controller: getResumeById
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/resumes/:id
 *
 * Fetches a single resume's full document.
 *
 * Ownership is enforced directly in the query filter by requiring BOTH
 * `_id === params.id` AND `userId === req.user._id`.
 *
 * This is stronger than fetching by _id alone and then comparing userId
 * in application code, because:
 *   1. It's a single atomic DB round-trip.
 *   2. There is no window where a document belonging to another user is
 *      transiently loaded into memory.
 */
const getResumeById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    throw new ApiError(400, "Invalid resume ID format");
  }

  const resume = await Resume.findOne({
    _id: id,
    userId: req.user._id, // ← ownership check baked into the query
  });

  if (!resume) {
    // Return 404 regardless of whether the resume doesn't exist OR belongs to
    // another user. Returning 403 in the second case would confirm the resource
    // exists, leaking information about other users' data.
    throw new ApiError(404, "Resume not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, resume, "Resume fetched successfully"));
});

// ---------------------------------------------------------------------------
// Controller: updateResume
// ---------------------------------------------------------------------------

/**
 * PUT /api/v1/resumes/:id
 *
 * Full or partial update of a resume document. Designed to be called by the
 * frontend auto-save mechanism on every debounced change event, so it must
 * handle partial bodies gracefully (the Joi validator ensures this).
 *
 * Key options on findOneAndUpdate:
 *   new: true           → returns the document AFTER the update, not before
 *   runValidators: true → runs Mongoose schema validators on the update data
 *   context: "query"    → required for validators on update operations
 */
const updateResume = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    throw new ApiError(400, "Invalid resume ID format");
  }

  // Guard: prevent userId or status from being overwritten via this endpoint
  // Status has its own dedicated PATCH route; userId must never change.
  const { userId, status, ...safeUpdateData } = req.body;

  if (Object.keys(safeUpdateData).length === 0) {
    throw new ApiError(400, "No updatable fields were provided");
  }

  const updatedResume = await Resume.findOneAndUpdate(
    {
      _id: id,
      userId: req.user._id, // ← ownership enforced in the filter
    },
    { $set: safeUpdateData },
    {
      new: true,           // Return updated document
      runValidators: true, // Enforce schema validators on the new values
      context: "query",    // Required for validators in update operations
    }
  );

  if (!updatedResume) {
    throw new ApiError(404, "Resume not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, updatedResume, "Resume updated successfully"));
});

// ---------------------------------------------------------------------------
// Controller: deleteResume
// ---------------------------------------------------------------------------

/**
 * DELETE /api/v1/resumes/:id
 *
 * Permanently removes a resume document.
 *
 * findOneAndDelete with the compound filter `{ _id, userId }` acts as the
 * ownership gate — if a user tries to delete a resume they don't own,
 * the query finds nothing and we return 404 (same as "not found" so we
 * don't confirm the existence of other users' resources).
 */
const deleteResume = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    throw new ApiError(400, "Invalid resume ID format");
  }

  const deletedResume = await Resume.findOneAndDelete({
    _id: id,
    userId: req.user._id, // ← ownership enforced in the filter
  });

  if (!deletedResume) {
    throw new ApiError(404, "Resume not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, { _id: deletedResume._id }, "Resume deleted successfully"));
});

// ---------------------------------------------------------------------------
// Controller: updateResumeStatus
// ---------------------------------------------------------------------------

/**
 * PATCH /api/v1/resumes/:id/status
 *
 * A narrow, purpose-built endpoint for advancing a resume through its
 * lifecycle states: draft → generated → finalised.
 *
 * Separated from the general updateResume endpoint because:
 *   1. Status transitions may carry side-effects in future phases
 *      (e.g., "finalised" could trigger a PDF generation job).
 *   2. It makes the API intent explicit and auditable.
 *   3. The validate middleware uses a tighter schema (updateResumeStatusSchema)
 *      that only accepts the `status` field.
 */
const updateResumeStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!isValidObjectId(id)) {
    throw new ApiError(400, "Invalid resume ID format");
  }

  const updatedResume = await Resume.findOneAndUpdate(
    {
      _id: id,
      userId: req.user._id, // ← ownership enforced in the filter
    },
    { $set: { status } },
    { new: true, runValidators: true, context: "query" }
  );

  if (!updatedResume) {
    throw new ApiError(404, "Resume not found");
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { _id: updatedResume._id, status: updatedResume.status },
        `Resume status updated to '${status}'`
      )
    );
});

export {
  createResume,
  getAllResumes,
  getResumeById,
  updateResume,
  deleteResume,
  updateResumeStatus,
};
