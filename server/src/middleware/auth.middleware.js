import jwt from "jsonwebtoken";
import { User } from "../models/User.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * verifyJWT Middleware
 *
 * Protects routes that require an authenticated user.
 *
 * Token extraction order (first found wins):
 *   1. Authorization header  →  "Bearer <token>"
 *   2. req.cookies.accessToken  (set by the server on login)
 *
 * On success  → attaches the full user document (without password) to req.user
 * On failure  → throws ApiError(401) which is caught by the global error handler
 */
const verifyJWT = asyncHandler(async (req, _res, next) => {
  // ── 1. Extract token ─────────────────────────────────────────────────────
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) {
    throw new ApiError(401, "Unauthorized: No access token provided");
  }

  // ── 2. Verify & decode ───────────────────────────────────────────────────
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (err) {
    // Distinguish between expired tokens and genuinely invalid ones
    // so the client can decide whether to attempt a silent refresh.
    if (err.name === "TokenExpiredError") {
      throw new ApiError(401, "Unauthorized: Access token has expired");
    }
    throw new ApiError(401, "Unauthorized: Invalid access token");
  }

  // ── 3. Fetch user from DB ────────────────────────────────────────────────
  // password and refreshToken are select:false in the schema — safe to omit here.
  const user = await User.findById(decoded._id);

  if (!user) {
    // Token was valid but the user no longer exists (deleted account, etc.)
    throw new ApiError(401, "Unauthorized: User no longer exists");
  }

  // ── 4. Attach to request ─────────────────────────────────────────────────
  req.user = user;
  next();
});

export { verifyJWT };
