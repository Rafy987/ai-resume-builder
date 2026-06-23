/**
 * asyncHandler - A higher-order function (wrapper) for async route controllers.
 *
 * Eliminates the need for repetitive try/catch blocks in every controller.
 * Any unhandled promise rejection is automatically forwarded to Express's
 * global error handler via the `next` function.
 *
 * @param {Function} requestHandler - An async Express route handler function
 * @returns {Function} A new function that wraps the handler in promise error handling
 */
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };
