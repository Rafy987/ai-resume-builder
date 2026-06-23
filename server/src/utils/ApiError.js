/**
 * Custom API Error class that extends the native Error object.
 * Provides a standardized error structure across the entire application.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (e.g., 400, 401, 404, 500)
   * @param {string} message - Human-readable error message
   * @param {Array} errors - Array of detailed validation or field-level errors
   * @param {string} stack - Optional stack trace (auto-captured if not provided)
   */
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = ""
  ) {
    super(message);

    this.statusCode = statusCode;
    this.message = message;
    this.success = false;
    this.errors = errors;
    this.data = null;

    if (stack) {
      this.stack = stack;
    } else {
      // Captures the current call stack, excluding the constructor itself
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
