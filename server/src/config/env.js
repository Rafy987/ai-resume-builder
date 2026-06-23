/**
 * env.js — Must be the very first import in server.js
 *
 * In ES modules, ALL static `import` statements are hoisted and resolved
 * before any line of code in the importing file executes. This means:
 *
 *   import dotenv from "dotenv";
 *   dotenv.config();           ← runs AFTER all imports are resolved
 *   import { app } from "./app.js";  ← app.js (and gemini.js) already ran!
 *
 * By isolating dotenv.config() in its own module and importing it first,
 * we guarantee process.env is fully populated before any other module's
 * top-level code runs.
 *
 * This is the canonical ES module pattern for dotenv initialization.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve .env relative to the project root (two levels up from src/config/)
const envPath = path.resolve(__dirname, "../../.env");

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn(`⚠️  Could not load .env file from ${envPath}:`, result.error.message);
  console.warn("   Falling back to system environment variables.");
} else {
  console.log(`✅ Environment variables loaded from: ${envPath}`);
}
