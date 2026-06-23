/**
 * server.js — Application entry point
 *
 * Import order is critical here. env.js MUST be first because ES module
 * static imports are hoisted — dotenv.config() inside server.js would run
 * too late (after all other modules have already loaded and read process.env).
 *
 * Correct boot sequence:
 *   1. env.js    → populates process.env from .env file
 *   2. db.js     → connects to MongoDB (reads MONGODB_URI from process.env)
 *   3. app.js    → builds the Express app (reads ANTHROPIC_API_KEY for the analyzer)
 *   4. listen()  → starts accepting HTTP traffic
 */
import "./config/env.js";

import { connectDB } from "./config/db.js";
import { app } from "./app.js";
import { verifySmtpConnection } from "./services/mail.service.js";

const PORT = process.env.PORT || 8000;

connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.error("❌ Express application error:", error);
      process.exit(1);
    });

    app.listen(PORT, () => {
      console.log(`\n🚀 Server is running on port: ${PORT}`);
      console.log(`   Environment : ${process.env.NODE_ENV || "development"}`);
      console.log(`   Health check: http://localhost:${PORT}/api/v1/health\n`);

      // Verify SMTP connectivity after the server is already listening so a
      // slow Gmail handshake never delays the server from accepting requests.
      verifySmtpConnection();
    });
  })
  .catch((error) => {
    console.error("❌ Failed to start the server:", error);
    process.exit(1);
  });
