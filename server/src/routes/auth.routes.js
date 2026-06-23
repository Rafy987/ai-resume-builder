import { Router } from "express";
import {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword,
} from "../controllers/auth.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { registerSchema, loginSchema } from "../validators/auth.validator.js";
import { requestResetSchema, resetPasswordSchema } from "../validators/passwordReset.validator.js";
import rateLimit from "express-rate-limit";

const router = Router();

// ---------------------------------------------------------------------------
// Auth-specific rate limiter
// Stricter than the global limiter to slow down brute-force attacks
// on the register and login endpoints.
// ---------------------------------------------------------------------------

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                     // max 10 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many authentication attempts from this IP. Please try again after 15 minutes.",
  },
});

// ---------------------------------------------------------------------------
// Public routes  (no authentication required)
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/auth/register
 * Body: { fullName, email, password }
 *
 * Middleware chain:
 *   authLimiter  →  validate(registerSchema)  →  register controller
 */
router.post("/register", authLimiter, validate(registerSchema), register);

/**
 * POST /api/v1/auth/login
 * Body: { email, password }
 *
 * Middleware chain:
 *   authLimiter  →  validate(loginSchema)  →  login controller
 */
router.post("/login", authLimiter, validate(loginSchema), login);

/**
 * POST /api/v1/auth/refresh-token
 * Cookie: refreshToken (httpOnly)
 *
 * No auth middleware — the refresh token cookie IS the credential here.
 * The controller validates it internally.
 */
router.post("/refresh-token", refreshToken);

// ---------------------------------------------------------------------------
// Protected routes  (valid access token required)
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/auth/logout
 * Header: Authorization: Bearer <accessToken>
 *
 * Clears the refresh token from DB and expires the cookie.
 */
router.post("/logout", verifyJWT, logout);

/**
 * GET /api/v1/auth/me
 * Header: Authorization: Bearer <accessToken>
 *
 * Returns the authenticated user's profile data.
 */
router.get("/me", verifyJWT, getMe);

/**
 * PATCH /api/v1/auth/me
 * Body: { name }
 * Updates the authenticated user's display name.
 */
router.patch("/me", verifyJWT, updateProfile);

/**
 * POST /api/v1/auth/change-password
 * Body: { currentPassword, newPassword }
 * Changes the authenticated user's password after verifying the current one.
 */
router.post("/change-password", verifyJWT, changePassword);

// ---------------------------------------------------------------------------
// Password reset routes  (public — no access token required)
// ---------------------------------------------------------------------------

// Dedicated rate limiter for reset requests — prevents email flooding
// In development the limit is relaxed so you can test freely.
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 5 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "development", // completely skip in dev
  message: {
    success: false,
    message: "Too many password reset requests. Please try again after 15 minutes.",
  },
});

/**
 * POST /api/v1/auth/request-password-reset
 * Body: { email }
 *
 * Sends a password-reset email with a signed JWT link (expires 15 min).
 * Always responds with the same message to prevent email enumeration.
 */
router.post(
  "/request-password-reset",
  resetLimiter,
  validate(requestResetSchema),
  requestPasswordReset
);

/**
 * POST /api/v1/auth/reset-password
 * Body: { token, newPassword }
 *
 * Verifies the JWT from the email link and sets the new password.
 */
router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  resetPassword
);

export default router;
