import mongoose from "mongoose";
import { Resume } from "../models/Resume.model.js";
import { User } from "../models/User.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateResumeContent } from "../services/gemini.service.js";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ---------------------------------------------------------------------------
// Controller: generateResume
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/ai/generate
 *
 * The core AI generation endpoint. Full pipeline:
 *
 *  1. Validate the incoming resumeId parameter.
 *  2. Fetch the resume — ownership is enforced in the query filter.
 *  3. Check the user's monthly generation quota against the User document.
 *  4. Validate that the resume has enough content to generate from.
 *  5. Call the Gemini service to produce summary + bullets.
 *  6. Map the AI output back onto the resume document:
 *       - Set aiSummary
 *       - Map each experienceBullets[i] → experience[i].aiBullets
 *  7. Persist the updated resume with status → "generated".
 *  8. Atomically increment the user's generationsUsed counter.
 *  9. Return the fully updated resume document.
 *
 * Atomicity note on step 8:
 *   We use $inc on the User document AFTER successfully saving the resume.
 *   If the resume save fails, $inc is never called — no quota is consumed.
 *   If $inc fails after the resume is saved, the user got a generation
 *   without paying a quota unit — this is acceptable (favours the user).
 *   A distributed transaction would be overkill here.
 */
const generateResume = asyncHandler(async (req, res) => {
  const { resumeId } = req.body;

  // ── 1. Validate resumeId ────────────────────────────────────────────────
  if (!resumeId) {
    throw new ApiError(400, "resumeId is required in the request body");
  }

  if (!isValidObjectId(resumeId)) {
    throw new ApiError(400, "Invalid resumeId format");
  }

  // ── 2. Fetch resume with ownership enforcement ──────────────────────────
  // Ownership is checked directly in the query — not application-level code.
  const resume = await Resume.findOne({
    _id: resumeId,
    userId: req.user._id,
  });

  if (!resume) {
    throw new ApiError(404, "Resume not found");
  }

  // ── 3. Quota check ──────────────────────────────────────────────────────
  // Re-fetch the user with a fresh DB read to get the latest counters.
  // req.user was set at token verification time and may be stale if the
  // user has generated other resumes in parallel sessions.
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(401, "User account no longer exists");
  }

  // Check if the monthly reset date has passed — if so, reset the counter
  // before checking the limit. This avoids a separate cron job for resets.
  const now = new Date();
  if (user.generationsResetDate && now > user.generationsResetDate) {
    user.generationsUsed = 0;
    // Roll the reset date forward by another 30 days
    const nextReset = new Date();
    nextReset.setDate(nextReset.getDate() + 30);
    user.generationsResetDate = nextReset;
    await user.save();
  }

  if (user.generationsUsed >= user.generationLimit) {
    throw new ApiError(
      403,
      `You have used all ${user.generationLimit} AI generation(s) on your ${user.plan} plan. ` +
      `Upgrade your plan or wait until your quota resets on ${user.generationsResetDate?.toDateString()}.`
    );
  }

  // ── 4. Minimum content validation ──────────────────────────────────────
  // The AI needs at least something meaningful to work with. A completely
  // empty resume would waste an API call and a generation credit.
  const hasExperience =
    Array.isArray(resume.experience) && resume.experience.length > 0;
  const hasSkills =
    Array.isArray(resume.skills) && resume.skills.length > 0;
  const hasTargetRole =
    resume.targetJobTitle && resume.targetJobTitle.trim().length > 0;

  if (!hasExperience && !hasSkills) {
    throw new ApiError(
      422,
      "Your resume needs at least one experience entry or skills section before AI generation can run. " +
      "Please fill in some details and try again."
    );
  }

  if (!hasTargetRole) {
    throw new ApiError(
      422,
      "Please provide a Target Job Title before generating your resume. " +
      "This helps the AI tailor your content to the role."
    );
  }

  // ── 5. Call Gemini service ──────────────────────────────────────────────
  // This is the async AI call — can take 3-8 seconds. The asyncHandler
  // wrapper will catch any ApiError thrown inside generateResumeContent.
  const aiResult = await generateResumeContent(resume);

  // ── 6. Map AI output onto the resume document ───────────────────────────
  // Set the AI-generated professional summary.
  resume.aiSummary = aiResult.summary;

  // Map each bullet array to its corresponding experience entry.
  // We iterate over experience entries (not AI bullets) to be safe —
  // if Gemini returned fewer arrays than entries, extras remain unchanged.
  resume.experience = resume.experience.map((exp, index) => {
    const bullets = aiResult.experienceBullets[index];
    if (Array.isArray(bullets) && bullets.length > 0) {
      // Replace the entire aiBullets array for this entry.
      // Filter out any empty strings Gemini may have included.
      exp.aiBullets = bullets.filter(
        (b) => typeof b === "string" && b.trim().length > 0
      );
    }
    return exp;
  });

  // Advance the resume lifecycle status.
  resume.status = "generated";

  // ── 7. Persist the updated resume ──────────────────────────────────────
  const updatedResume = await resume.save();

  // ── 8. Atomically increment the user's generation counter ──────────────
  // $inc is atomic at the MongoDB level — safe under concurrent requests.
  await User.findByIdAndUpdate(
    user._id,
    { $inc: { generationsUsed: 1 } },
    { new: true }
  );

  // ── 9. Return the full updated resume ───────────────────────────────────
  res.status(200).json(
    new ApiResponse(
      200,
      {
        resume: updatedResume,
        quota: {
          used: user.generationsUsed + 1,       // +1 reflects the just-consumed credit
          limit: user.generationLimit,
          remaining: user.generationLimit - user.generationsUsed - 1,
          resetsOn: user.generationsResetDate,
        },
      },
      "Resume content generated successfully"
    )
  );
});

export { generateResume };
