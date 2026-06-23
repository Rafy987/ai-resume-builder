import Joi from "joi";

/**
 * requestResetSchema
 * Validates POST /api/v1/auth/request-password-reset
 * Only needs a valid email address.
 */
const requestResetSchema = Joi.object({
  email: Joi.string()
    .trim()
    .email({ tlds: { allow: false } })
    .lowercase()
    .required()
    .messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
      "string.empty": "Email cannot be empty",
    }),
});

/**
 * resetPasswordSchema
 * Validates POST /api/v1/auth/reset-password
 * Requires the JWT token (from the email link) and the new password.
 */
const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    "any.required": "Reset token is required",
    "string.empty": "Reset token cannot be empty",
  }),

  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()\-_=+{};:,<.>])[A-Za-z\d@$!%*?&#^()\-_=+{};:,<.>]{8,}$/
    )
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters long",
      "string.max": "Password cannot exceed 128 characters",
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      "any.required": "New password is required",
      "string.empty": "New password cannot be empty",
    }),
});

export { requestResetSchema, resetPasswordSchema };
