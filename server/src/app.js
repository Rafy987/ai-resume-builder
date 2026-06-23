import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { ApiError } from "./utils/ApiError.js";
import authRouter from "./routes/auth.routes.js";
import resumeRouter from "./routes/resume.routes.js";
import aiRouter from "./routes/ai.routes.js";
import analyzerRouter from "./routes/analyzer.routes.js";

const app = express();

// ---------------------------------------------------------------------------
// Security Middleware
// ---------------------------------------------------------------------------

// Sets various HTTP headers to protect against well-known web vulnerabilities
app.use(helmet());

// ---------------------------------------------------------------------------
// CORS Configuration
// IMPORTANT: Must be registered BEFORE the rate limiter so that preflight
// OPTIONS requests are answered immediately without consuming rate-limit quota.
// ---------------------------------------------------------------------------

const corsOptions = {
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true, // Allow cookies / authorization headers
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
// Explicitly handle preflight requests for all routes
app.options("*", cors(corsOptions));

// Global rate limiter: max 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true, // Returns rate limit info in `RateLimit-*` headers
  legacyHeaders: false,  // Disables the `X-RateLimit-*` headers
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes.",
  },
});

app.use(globalLimiter);

// ---------------------------------------------------------------------------
// Request Parsing Middleware
// ---------------------------------------------------------------------------

// Parse incoming JSON payloads (limit prevents large payload attacks)
app.use(express.json({ limit: "16kb" }));

// Parse URL-encoded bodies (e.g., HTML form submissions)
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Parse Cookie header and populate req.cookies
app.use(cookieParser());

// ---------------------------------------------------------------------------
// Logging Middleware
// ---------------------------------------------------------------------------

// Use 'dev' format in development, 'combined' (Apache-style) in production
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ---------------------------------------------------------------------------
// Health Check Route
// ---------------------------------------------------------------------------

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy and running.",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Favicon Handler — prevents 404 errors from browser favicon requests
// ---------------------------------------------------------------------------

app.get("/favicon.ico", (req, res) => res.status(204).end());

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/resumes", resumeRouter);
app.use("/api/v1/ai", aiRouter);
app.use("/api/v1/analyzer", analyzerRouter);

// ---------------------------------------------------------------------------
// 404 Handler — catches any request that didn't match a defined route
// ---------------------------------------------------------------------------

app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

// ---------------------------------------------------------------------------
// Global Error Handler — MUST be the last middleware registered
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // If the error is already a structured ApiError, use its properties directly.
  // Otherwise, fall back to a generic 500 Internal Server Error.
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const message =
    err instanceof ApiError ? err.message : "Internal Server Error";
  const errors = err instanceof ApiError ? err.errors : [];

  // Log the full stack trace in non-production environments for debugging
  if (process.env.NODE_ENV !== "production") {
    console.error("🔴 ERROR:", err.stack);
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors,
    // Expose stack trace only during development
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

export { app };
