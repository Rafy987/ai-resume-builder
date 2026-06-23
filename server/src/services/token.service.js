import jwt from "jsonwebtoken";

/**
 * generateAccessToken
 *
 * Creates a short-lived JWT used to authenticate API requests.
 * Signed with ACCESS_TOKEN_SECRET and expires per ACCESS_TOKEN_EXPIRY (e.g. "15m").
 *
 * The payload is intentionally minimal — only the user's _id is embedded
 * to reduce the blast radius if a token is intercepted.
 *
 * @param {string} userId - The MongoDB ObjectId string of the user
 * @returns {string} Signed JWT access token
 */
const generateAccessToken = (userId) => {
  return jwt.sign(
    { _id: userId },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" }
  );
};

/**
 * generateRefreshToken
 *
 * Creates a long-lived JWT stored in an httpOnly cookie and persisted
 * (hashed or raw, your choice) in the user document in MongoDB.
 * Used exclusively to issue new access tokens when the old one expires.
 *
 * Signed with a DIFFERENT secret (REFRESH_TOKEN_SECRET) so a compromised
 * access token secret cannot be used to forge refresh tokens.
 *
 * @param {string} userId - The MongoDB ObjectId string of the user
 * @returns {string} Signed JWT refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { _id: userId },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" }
  );
};

export { generateAccessToken, generateRefreshToken };
