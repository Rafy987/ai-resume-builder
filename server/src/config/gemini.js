import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Gemini Client — initialized once at startup, reused across all requests.
 *
 * Module-level singleton: Node.js caches the module after the first import,
 * so `genAI` and `geminiModel` are only constructed once regardless of how
 * many times this file is imported elsewhere in the codebase.
 *
 * Early validation: If GEMINI_API_KEY is missing the server will throw at
 * startup rather than failing silently on the first AI request.
 */

if (!process.env.GEMINI_API_KEY) {
  // Warn instead of throwing — the analyzer now uses Anthropic Claude and no
  // longer needs this key. The AI resume-builder feature (gemini.service.js)
  // will fail at call time if the key is absent, rather than crashing startup.
  console.warn(
    "⚠️  GEMINI_API_KEY is not set. The AI resume-builder feature will be unavailable."
  );
}

// The top-level client — holds the API key and manages the HTTP transport layer.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Pre-configured model instance.
 *
 * We export this directly so the service layer never has to worry about
 * constructing it or passing configuration around.
 *
 * generationConfig is set here as a baseline; the service can override
 * individual parameters (like temperature) per call if needed.
 */
const geminiModel = genAI.getGenerativeModel({
  // gemini-2.0-flash is the current stable model on the v1 endpoint.
  // gemini-1.5-flash was retired and only existed on the v1beta channel,
  // which caused the 404 "not found for API version v1beta" error.
  model: "gemini-2.0-flash",
  generationConfig: {
    // Force the API to return a raw JSON string with no markdown wrapping.
    // This eliminates the need to strip ```json fences from the response.
    responseMimeType: "application/json",

    // Low temperature: reduces creative/hallucinated output and keeps the
    // model focused on structured, professional resume content.
    temperature: 0.4,

    // topP + topK together with low temperature produce consistent,
    // high-quality professional writing rather than random variation.
    topP: 0.85,
    topK: 40,

    // Generous token ceiling so a full resume with multiple roles is never
    // truncated mid-response (a truncated JSON object would break parsing).
    maxOutputTokens: 8192,
  },
});

export { genAI, geminiModel };
