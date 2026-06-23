/**
 * Standardized API Response wrapper.
 * Ensures every successful response from the API has a consistent shape.
 */
class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code (e.g., 200, 201)
   * @param {*} data - The payload to send back to the client
   * @param {string} message - A human-readable success message
   */
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    // Any status code below 400 is considered a success
    this.success = statusCode < 400;
  }
}

export { ApiResponse };
