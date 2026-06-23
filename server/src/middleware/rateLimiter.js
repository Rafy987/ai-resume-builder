import rateLimit from "express-rate-limit";

/**
 * aiRateLimiter
 *
 * Restricts each authenticated user to a maximum of 10 AI generation
 * requests per hour. This sits on top of the global IP-based limiter
 * defined in app.js and adds a user-identity-based layer.
 *
 * Key design decisions:
 *
 * 1. keyGenerator uses `req.user._id` (MongoDB ObjectId as string) instead
 *    of the default IP address. This means:
 *      - Users behind the same corporate NAT / VPN are tracked individually.
 *      - A single user can't bypass the limit by switching networks.
 *    Note: verifyJWT middleware MUST run before aiRateLimiter in the route
 *    chain, otherwise req.user will be undefined and the key will fall back
 *    to the IP. The route definition enforces this ordering.
 *
 * 2. skipFailedRequests: true — requests that result in a 4xx or 5xx
 *    response (e.g., missing resume ID, quota exceeded) do NOT consume a
 *    generation slot. Only successful AI calls count against the limit.
 *    This prevents a bug where validation errors eat up a user's quota.
 *
 * 3. standardHeaders: true — sends `RateLimit-Limit`, `RateLimit-Remaining`,
 *    and `RateLimit-Reset` headers so the frontend can display a countdown
 *    or disable the "Generate" button proactively.
 */
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window

  max: 10, // Maximum 10 AI generation requests per user per hour

  // Use the authenticated user's MongoDB _id as the rate limit key.
  // Falls back to IP if for any reason req.user is not populated.
  keyGenerator: (req) => {
    return req.user?._id?.toString() || req.ip;
  },

  // Do not count requests that returned an error response against the quota.
  skipFailedRequests: true,

  standardHeaders: true,  // Emit RateLimit-* headers (RFC 6585 draft)
  legacyHeaders: false,   // Disable deprecated X-RateLimit-* headers

  message: {
    success: false,
    statusCode: 429,
    message:
      "You have reached the maximum of 10 AI generation requests per hour. " +
      "Please wait before generating again.",
  },

  // Custom handler gives us full control over the response shape so it
  // matches our ApiResponse pattern instead of the default express-rate-limit
  // plain-text or default JSON format.
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json({
      success: false,
      statusCode: options.statusCode,
      message: options.message.message,
      errors: [],
    });
  },
});

export { aiRateLimiter };
