/**
 * api/index.js — Vercel serverless entry point
 *
 * Vercel requires a default export of the Express app (not a listen() call).
 * This file boots the DB connection and exports the app so Vercel can wrap it
 * as a serverless function. The regular server.js is untouched for local dev.
 */
import "../src/config/env.js";
import { connectDB } from "../src/config/db.js";
import { app } from "../src/app.js";

// Connect to MongoDB once — subsequent invocations reuse the cached connection
connectDB().catch((err) => {
  console.error("❌ Vercel: MongoDB connection failed:", err.message);
});

export default app;
