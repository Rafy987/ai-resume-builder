import jwt from "jsonwebtoken";
import { User } from "../models/User.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../services/token.service.js";
import { sendPasswordResetEmail } from "../services/mail.service.js";

// ---------------------------------------------------------------------------
// Cookie configuration
// ---------------------------------------------------------------------------

/**
 * Shared options for the refresh token httpOnly cookie.
 *
 * httpOnly  → JavaScript (XSS) cannot read this cookie
 * secure    → Only sent over HTTPS in production
 * sameSite  → "strict" prevents CSRF attacks
 * maxAge    → 7 days expressed in milliseconds
 */
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

/**
 * Shared options to CLEAR the refresh token cookie on logout.
 * Must match the path/domain used when setting it.
 */
const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
};

// ---------------------------------------------------------------------------
// Helper: build token pair + persist refresh token in DB
// ---------------------------------------------------------------------------

/**
 * issueTokens
 *
 * Generates a fresh access/refresh token pair for the given userId,
 * persists the refresh token on the user document, and returns both tokens.
 * Extracting this prevents duplication across register, login, and refreshToken.
 *
 * @param {string} userId - MongoDB ObjectId of the user
 * @returns {{ accessToken: string, refreshToken: string }}
 */
const issueTokens = async (userId) => {
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId);

  // Persist the refresh token so we can invalidate it on logout
  // findByIdAndUpdate is faster than a full document save here
  await User.findByIdAndUpdate(
    userId,
    { $set: { refreshToken } },
    { new: true }
  );

  return { accessToken, refreshToken };
};

// ---------------------------------------------------------------------------
// Helper: safe user object to return in API responses
// ---------------------------------------------------------------------------

/**
 * sanitizeUser
 *
 * Returns a plain object with only the fields safe to expose to the client.
 * Never include password, refreshToken, or __v.
 *
 * @param {import("mongoose").Document} user
 * @returns {object}
 */
const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  plan: user.plan,
  generationsUsed: user.generationsUsed,
  generationLimit: user.generationLimit,
  isVerified: user.isVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// ---------------------------------------------------------------------------
// Controller: register
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/auth/register
 *
 * 1. Check for an existing account with the same email.
 * 2. Create the user (password is hashed by the pre-save hook).
 * 3. Issue tokens and set the refresh token cookie.
 * 4. Return 201 with the access token and sanitized user.
 */
const register = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;

  // ── 1. Duplicate email check ─────────────────────────────────────────────
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists");
  }

  // ── 2. Create user ───────────────────────────────────────────────────────
  // The pre-save hook in User.model.js will hash the password automatically.
  const user = await User.create({
    name: fullName,
    email,
    password,
  });

  // ── 3. Issue tokens ──────────────────────────────────────────────────────
  const { accessToken, refreshToken } = await issueTokens(user._id);

  // ── 4. Send response ─────────────────────────────────────────────────────
  res
    .status(201)
    .cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS)
    .json(
      new ApiResponse(
        201,
        { user: sanitizeUser(user), accessToken },
        "Account created successfully"
      )
    );
});

// ---------------------------------------------------------------------------
// Controller: login
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/auth/login
 *
 * 1. Find the user by email — explicitly select password (select:false in schema).
 * 2. Compare the candidate password with the bcrypt hash.
 * 3. Issue tokens and set the refresh token cookie.
 * 4. Return 200 with the access token and sanitized user.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // ── 1. Find user + password ──────────────────────────────────────────────
  // Must use .select("+password") because the field has select:false in schema.
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    // Use a generic message — don't reveal whether the email exists or not.
    throw new ApiError(401, "Invalid email or password");
  }

  // ── 2. Verify password ───────────────────────────────────────────────────
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  // ── 3. Issue tokens ──────────────────────────────────────────────────────
  const { accessToken, refreshToken } = await issueTokens(user._id);

  // ── 4. Send response ─────────────────────────────────────────────────────
  res
    .status(200)
    .cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS)
    .json(
      new ApiResponse(
        200,
        { user: sanitizeUser(user), accessToken },
        "Logged in successfully"
      )
    );
});

// ---------------------------------------------------------------------------
// Controller: logout
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/auth/logout  [Protected]
 *
 * 1. Remove the refresh token from the user document in MongoDB.
 * 2. Clear the refresh token cookie from the browser.
 * 3. Return 200.
 *
 * The access token will naturally expire on its own (short-lived by design).
 * Clients should also discard the access token from memory on logout.
 */
const logout = asyncHandler(async (req, res) => {
  // req.user is set by the verifyJWT middleware
  await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { refreshToken: 1 } }, // removes the field entirely
    { new: true }
  );

  res
    .status(200)
    .clearCookie("refreshToken", CLEAR_COOKIE_OPTIONS)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

// ---------------------------------------------------------------------------
// Controller: refreshToken
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/auth/refresh-token
 *
 * Called by the client when its access token has expired (silent refresh).
 *
 * 1. Read the refresh token from the httpOnly cookie.
 * 2. Verify the JWT signature and expiry.
 * 3. Fetch the user and compare the stored token with the incoming one
 *    (token rotation: the stored one is replaced on each use).
 * 4. Issue a new token pair, persist the new refresh token, set new cookie.
 * 5. Return 200 with the new access token.
 */
const refreshToken = asyncHandler(async (req, res) => {
  // ── 1. Extract incoming refresh token ────────────────────────────────────
  const incomingRefreshToken = req.cookies?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized: No refresh token provided");
  }

  // ── 2. Verify JWT signature ───────────────────────────────────────────────
  let decoded;
  try {
    decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new ApiError(401, "Session expired, please log in again");
    }
    throw new ApiError(401, "Unauthorized: Invalid refresh token");
  }

  // ── 3. Fetch user + stored refresh token ─────────────────────────────────
  // refreshToken has select:false — must explicitly select it here.
  const user = await User.findById(decoded._id).select("+refreshToken");

  if (!user) {
    throw new ApiError(401, "Unauthorized: User no longer exists");
  }

  // Token rotation guard: if the stored token doesn't match what was sent,
  // a refresh token has been reused after rotation — potential theft detected.
  if (user.refreshToken !== incomingRefreshToken) {
    // Invalidate all sessions for this user as a security precaution
    await User.findByIdAndUpdate(user._id, { $unset: { refreshToken: 1 } });
    throw new ApiError(
      401,
      "Refresh token reuse detected. Please log in again."
    );
  }

  // ── 4. Issue new token pair ───────────────────────────────────────────────
  const { accessToken, refreshToken: newRefreshToken } = await issueTokens(
    user._id
  );

  // ── 5. Send response ──────────────────────────────────────────────────────
  res
    .status(200)
    .cookie("refreshToken", newRefreshToken, REFRESH_COOKIE_OPTIONS)
    .json(
      new ApiResponse(
        200,
        { accessToken },
        "Access token refreshed successfully"
      )
    );
});

// ---------------------------------------------------------------------------
// Controller: getMe
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/auth/me  [Protected]
 *
 * Returns the currently authenticated user's profile.
 * req.user is populated by the verifyJWT middleware — no DB call needed.
 */
const getMe = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(
      new ApiResponse(200, sanitizeUser(req.user), "User profile fetched successfully")
    );
});

/**
 * updateProfile — PATCH /api/v1/auth/me  [Protected]
 * Allows the user to update their display name.
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    throw new ApiError(400, "Name must be at least 2 characters");
  }

  const updated = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { name: name.trim() } },
    { new: true, runValidators: true }
  );

  res
    .status(200)
    .json(new ApiResponse(200, sanitizeUser(updated), "Profile updated successfully"));
});

/**
 * changePassword — POST /api/v1/auth/change-password  [Protected]
 * Verifies the current password then replaces it with the new one.
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Current password and new password are required");
  }
  if (newPassword.length < 8) {
    throw new ApiError(400, "New password must be at least 8 characters");
  }

  const user = await User.findById(req.user._id).select("+password");
  const isValid = await user.isPasswordCorrect(currentPassword);
  if (!isValid) {
    throw new ApiError(401, "Current password is incorrect");
  }

  user.password = newPassword; // pre-save hook will hash it
  await user.save();

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

// ---------------------------------------------------------------------------
// Controller: requestPasswordReset
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/auth/request-password-reset  [Public]
 *
 * 1. Look up the user by email — respond with the same generic message
 *    whether the account exists or not (prevents user enumeration).
 * 2. Generate a short-lived (15 min) signed JWT as the reset token.
 * 3. Send the reset link to the user's email via Nodemailer.
 * 4. Return 200 with a generic success message.
 */
const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // ── 1. Look up user ──────────────────────────────────────────────────────
  // We intentionally keep the response identical regardless of whether the
  // email exists — this prevents bad actors from enumerating registered emails.
  const user = await User.findOne({ email });

  if (user) {
    // ── 2. Generate reset token ────────────────────────────────────────────
    // Dedicated secret keeps this token family isolated from access tokens.
    // Short 15-minute expiry limits the attack window.
    const resetToken = jwt.sign(
      { _id: user._id, purpose: "password-reset" },
      process.env.RESET_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    // ── 3. Build reset URL and attempt email delivery ─────────────────────
    const clientOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
    const resetUrl = `${clientOrigin}/reset-password?token=${resetToken}`;

    const { sent, reason } = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });

    // Surface a clear error instead of silently swallowing mail failures.
    // A missing SMTP config is a developer mistake, not a silent no-op.
    if (!sent) {
      if (reason === "smtp_not_configured") {
        throw new ApiError(
          503,
          "Email service is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your .env file."
        );
      }
      throw new ApiError(
        503,
        "Failed to send the reset email. Please try again in a moment."
      );
    }
  }

  // ── 4. Always return the same generic message ─────────────────────────────
  res.status(200).json(
    new ApiResponse(
      200,
      {},
      "If an account with that email exists, a password reset link has been sent."
    )
  );
});

// ---------------------------------------------------------------------------
// Controller: resetPassword
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/auth/reset-password  [Public]
 *
 * Consumes the reset token from the email link and updates the user's password.
 *
 * 1. Verify and decode the reset JWT.
 * 2. Check the token was issued with purpose "password-reset".
 * 3. Find the user and update the password (pre-save hook hashes it).
 * 4. Invalidate all existing sessions (clear refreshToken in DB).
 * 5. Return 200.
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  // ── 1 & 2. Verify token ───────────────────────────────────────────────────
  let decoded;
  try {
    decoded = jwt.verify(
      token,
      process.env.RESET_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET
    );
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new ApiError(400, "Reset link has expired. Please request a new one.");
    }
    throw new ApiError(400, "Invalid or malformed reset token.");
  }

  if (decoded.purpose !== "password-reset") {
    throw new ApiError(400, "Invalid reset token.");
  }

  // ── 3. Find user ──────────────────────────────────────────────────────────
  const user = await User.findById(decoded._id).select("+password");
  if (!user) {
    throw new ApiError(404, "User account not found.");
  }

  // ── 4. Update password + invalidate all sessions ──────────────────────────
  user.password = newPassword; // pre-save hook in User.model.js hashes this
  user.refreshToken = undefined; // force re-login on all devices
  await user.save();

  // ── 5. Respond ────────────────────────────────────────────────────────────
  res.status(200).json(
    new ApiResponse(200, {}, "Password reset successfully. Please log in with your new password.")
  );
});

export {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword,
};
