import { AnalysisResult } from "../models/AnalysisResult.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// ---------------------------------------------------------------------------
// GET /api/v1/analyzer/history
// ---------------------------------------------------------------------------

/**
 * getAnalysisHistory
 *
 * Returns a lightweight list of the authenticated user's past analysis runs,
 * sorted newest-first. Only summary fields are projected — full detail fields
 * (strengths, recommendations, keywords) are excluded to keep the payload
 * small for the "My Resumes" dashboard list view.
 *
 * Response shape:
 *   { success, data: { analyses: [...], total: n }, message }
 */
const getAnalysisHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const analyses = await AnalysisResult
    .find({ userId })
    .sort({ createdAt: -1 })
    .select("_id fileName fileSize atsScore detectedDomain marketFit createdAt")
    .lean(); // plain JS objects — faster, no mongoose overhead on reads

  return res
    .status(200)
    .json(new ApiResponse(
      200,
      { analyses, total: analyses.length },
      "Analysis history fetched successfully"
    ));
});

// ---------------------------------------------------------------------------
// GET /api/v1/analyzer/stats
// ---------------------------------------------------------------------------

/**
 * getDashboardStats
 *
 * Runs a single aggregation pipeline against AnalysisResult to compute:
 *   - totalScans        — total documents for this user
 *   - averageAtsScore   — mean atsScore, rounded to 1 decimal place
 *   - topDomain         — most frequently detected domain (empty string if none)
 *   - domainBreakdown   — array of { domain, count } sorted by count desc
 *   - marketFitBreakdown — array of { marketFit, count } for High / Medium / Low
 *
 * All fields have safe zero/null fallbacks so the frontend never receives
 * undefined values.
 *
 * Response shape:
 *   { success, data: { totalScans, averageAtsScore, topDomain,
 *                      domainBreakdown, marketFitBreakdown }, message }
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [result] = await AnalysisResult.aggregate([
    // ── Stage 1: scope to this user ──────────────────────────────────────
    { $match: { userId } },

    // ── Stage 2: compute summary stats + domain / marketFit groups ────────
    {
      $facet: {
        // Overall stats across all docs
        summary: [
          {
            $group: {
              _id: null,
              totalScans: { $sum: 1 },
              averageAtsScore: { $avg: "$atsScore" },
            },
          },
        ],

        // Count per detected domain
        domainBreakdown: [
          {
            $group: {
              _id: "$detectedDomain",
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          {
            $project: {
              _id: 0,
              domain: { $ifNull: ["$_id", "Unknown"] },
              count: 1,
            },
          },
        ],

        // Count per market fit tier
        marketFitBreakdown: [
          {
            $group: {
              _id: "$marketFit",
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          {
            $project: {
              _id: 0,
              marketFit: { $ifNull: ["$_id", "Unknown"] },
              count: 1,
            },
          },
        ],
      },
    },
  ]);

  // ── Unpack facet results with safe fallbacks ─────────────────────────────
  const summary          = result?.summary?.[0]          ?? {};
  const domainBreakdown  = result?.domainBreakdown        ?? [];
  const marketFitBreakdown = result?.marketFitBreakdown   ?? [];

  const totalScans      = summary.totalScans      ?? 0;
  const averageAtsScore = summary.averageAtsScore != null
    ? Math.round(summary.averageAtsScore * 10) / 10   // 1 decimal place
    : 0;
  const topDomain       = domainBreakdown[0]?.domain ?? "";

  return res
    .status(200)
    .json(new ApiResponse(
      200,
      { totalScans, averageAtsScore, topDomain, domainBreakdown, marketFitBreakdown },
      "Dashboard stats fetched successfully"
    ));
});

export { getAnalysisHistory, getDashboardStats };
