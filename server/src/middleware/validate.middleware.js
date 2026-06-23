import { ApiError } from "../utils/ApiError.js";

/**
 * validate
 *
 * A reusable middleware factory that accepts a Joi schema and returns an
 * Express middleware function. It validates `req.body` against the schema
 * and either passes control to the next handler (on success) or throws a
 * structured ApiError(400) with all validation messages collected into the
 * `errors` array (on failure).
 *
 * Usage in a route file:
 *   import { validate } from "../middleware/validate.middleware.js";
 *   import { registerSchema } from "../validators/auth.validator.js";
 *
 *   router.post("/register", validate(registerSchema), registerController);
 *
 * @param {import("joi").Schema} schema - A Joi object schema to validate against
 * @returns {import("express").RequestHandler}
 */
const validate = (schema) => (req, _res, next) => {
  const { error, value } = schema.validate(req.body, {
    // Report ALL validation errors at once instead of stopping at the first one.
    // This lets the client fix everything in a single round-trip.
    abortEarly: false,

    // Strip any keys from req.body that are not defined in the schema.
    // Prevents extra fields from leaking into controllers.
    stripUnknown: true,

    // Converts types where possible (e.g., lowercase email).
    convert: true,
  });

  if (error) {
    // Map Joi's ValidationError details into a flat, client-friendly array.
    const errors = error.details.map((detail) => ({
      field: detail.path.join("."),   // e.g. "email", "password"
      message: detail.message,        // e.g. "Password is required"
    }));

    return next(new ApiError(400, "Validation failed", errors));
  }

  // Replace req.body with the sanitized & converted value from Joi
  req.body = value;
  next();
};

export { validate };
