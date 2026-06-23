import Joi from "joi";

/**
 * Password rules (shared between register and any future change-password flow):
 *  - Minimum 8 characters
 *  - At least one uppercase letter
 *  - At least one lowercase letter
 *  - At least one digit
 *  - At least one special character
 *
 * Keeping this as a reusable constant avoids duplicating the regex.
 */
const passwordRules = Joi.string()
  .min(8)
  .max(128)
  .pattern(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()\-_=+{};:,<.>])[A-Za-z\d@$!%*?&#^()\-_=+{};:,<.>]{8,}$/
  )
  .messages({
    "string.min": "Password must be at least 8 characters long",
    "string.max": "Password cannot exceed 128 characters",
    "string.pattern.base":
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    "any.required": "Password is required",
    "string.empty": "Password cannot be empty",
  });

/**
 * registerSchema
 *
 * Validates the request body for POST /api/v1/auth/register.
 * Fields:
 *  - fullName : 2–50 chars, required
 *  - email    : valid RFC email, required, lowercased
 *  - password : strong password per rules above, required
 */
const registerSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(50).required().messages({
    "string.min": "Full name must be at least 2 characters long",
    "string.max": "Full name cannot exceed 50 characters",
    "any.required": "Full name is required",
    "string.empty": "Full name cannot be empty",
  }),

  email: Joi.string().trim().email({ tlds: { allow: false } }).lowercase().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
    "string.empty": "Email cannot be empty",
  }),

  password: passwordRules.required(),
});

/**
 * loginSchema
 *
 * Validates the request body for POST /api/v1/auth/login.
 * Fields:
 *  - email    : valid email, required
 *  - password : non-empty string, required
 *             (no strength check here — we just need it to attempt comparison)
 */
const loginSchema = Joi.object({
  email: Joi.string().trim().email({ tlds: { allow: false } }).lowercase().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
    "string.empty": "Email cannot be empty",
  }),

  password: Joi.string().required().messages({
    "any.required": "Password is required",
    "string.empty": "Password cannot be empty",
  }),
});

export { registerSchema, loginSchema };
