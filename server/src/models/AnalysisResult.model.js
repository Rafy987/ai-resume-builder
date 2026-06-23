import mongoose, { Schema } from "mongoose";

// ---------------------------------------------------------------------------
// AnalysisResult Schema
//
// Stores the output of a single AI resume analysis run.
// Decoupled from the Resume builder schema so each can evolve independently.
// ---------------------------------------------------------------------------

const analysisResultSchema = new Schema(
  {
    // ── Ownership ────────────────────────────────────────────────────────
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId is required"],
      index: true,
    },

    // ── Source file metadata ─────────────────────────────────────────────
    fileName: {
      type: String,
      trim: true,
      default: "unknown",
    },
    fileSize: {
      type: Number, // bytes
      default: 0,
    },

    // ── AI analysis output ───────────────────────────────────────────────
    atsScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    detectedDomain: {
      type: String,
      trim: true,
      default: "",
    },
    marketFit: {
      type: String,
      enum: {
        values: ["High", "Medium", "Low"],
        message: "marketFit must be one of: High, Medium, Low",
      },
      default: "Low",
    },
    summary: {
      type: String,
      trim: true,
      default: "",
    },
    strengths: {
      type: [String],
      default: [],
    },
    // Gap analysis / AI recommendations
    recommendations: {
      type: [String],
      default: [],
    },
    foundKeywords: {
      type: [String],
      default: [],
    },
    missingKeywords: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Index for fetching a user's analysis history sorted by newest first
analysisResultSchema.index({ userId: 1, createdAt: -1 });

export const AnalysisResult = mongoose.model("AnalysisResult", analysisResultSchema);
