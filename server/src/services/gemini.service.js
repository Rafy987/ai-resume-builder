import { geminiModel } from "../config/gemini.js";
import { ApiError } from "../utils/ApiError.js";

// ---------------------------------------------------------------------------
// SYSTEM PROMPT
// ---------------------------------------------------------------------------

/**
 * SYSTEM_PROMPT
 *
 * This is the most critical piece of the AI integration. It:
 *   1. Defines the model's persona as an elite ATS resume writer.
 *   2. Specifies the EXACT JSON schema the model must return — no prose,
 *      no markdown, no explanation. Just the object.
 *   3. Gives explicit instructions on writing style (action verbs,
 *      quantified achievements, ATS keyword integration).
 *   4. Defines the contract between the model and our parser so defensive
 *      parsing has a reliable target shape.
 *
 * Stored as a constant so it is defined once and never reconstructed on
 * every request, keeping memory allocation minimal.
 */
const SYSTEM_PROMPT = `You are an elite, ATS-optimized resume writer with 15+ years of experience helping candidates land roles at FAANG companies, top startups, and Fortune 500 firms. You specialize in transforming raw, unstructured work experience into powerful, results-driven resume content that passes Applicant Tracking Systems with a score above 85%.

YOUR TASK:
Analyze the candidate's raw experience, skills, and the target job description provided. Generate a tailored professional summary and strong bullet points for each experience entry.

STRICT OUTPUT RULES — READ CAREFULLY:
1. You MUST return ONLY a single, valid JSON object. No prose, no explanation, no markdown, no code fences.
2. The JSON object MUST exactly match this schema:
{
  "summary": "<A 3-4 sentence professional summary tailored to the target role>",
  "experienceBullets": [
    ["<bullet 1 for experience entry 0>", "<bullet 2>", "<bullet 3>"],
    ["<bullet 1 for experience entry 1>", "<bullet 2>", "<bullet 3>"]
  ]
}
3. "experienceBullets" is an array of arrays. The outer array index MUST correspond exactly to the index of the experience entry provided in the user prompt. If there are 3 experience entries, there must be exactly 3 inner arrays.
4. Each bullet point MUST:
   - Begin with a strong past-tense action verb (e.g., Architected, Engineered, Spearheaded, Delivered, Optimized, Reduced, Increased)
   - Follow the CAR format where possible: Challenge → Action → Result
   - Include quantified metrics wherever they can be reasonably inferred or were provided (e.g., "by 40%", "serving 10K+ users", "reducing latency by 200ms")
   - Integrate relevant keywords from the target job description naturally
   - Be a single line, maximum 160 characters
5. The "summary" MUST:
   - Be 3-4 concise sentences
   - Open with the candidate's title and years of experience
   - Highlight 2-3 top skills matching the target role
   - Close with a value proposition statement
6. Do NOT invent companies, degrees, titles, or metrics that are completely absent from the input. You MAY infer reasonable quantifications from context.
7. If an experience entry has no rawDescription, generate 2 generic strong bullets based only on the job title and company.`;

// ---------------------------------------------------------------------------
// buildUserPrompt
// ---------------------------------------------------------------------------

/**
 * buildUserPrompt
 *
 * Constructs the per-request user message by interpolating the resume's
 * actual data into a structured prompt. Keeping system instructions in
 * SYSTEM_PROMPT and variable data here is the correct separation of concerns
 * — the system prompt never changes, only the user data does.
 *
 * @param {import("mongoose").Document} resume - Full resume Mongoose document
 * @returns {string} The complete user-turn prompt string
 */
const buildUserPrompt = (resume) => {
  const {
    personalInfo = {},
    targetJobTitle,
    targetJobDescription,
    skills = [],
    experience = [],
  } = resume;

  // ── Candidate header ───────────────────────────────────────────────────
  const candidateName = personalInfo.fullName || "Not provided";
  const candidateLocation = personalInfo.location || "Not provided";

  // ── Skills block ───────────────────────────────────────────────────────
  // Flatten all skill items across all categories into a readable string.
  const skillsText =
    skills.length > 0
      ? skills
          .map((group) => {
            const categoryLabel = group.category ? `${group.category}: ` : "";
            const items =
              Array.isArray(group.items) && group.items.length > 0
                ? group.items.join(", ")
                : "N/A";
            return `${categoryLabel}${items}`;
          })
          .join(" | ")
      : "Not provided";

  // ── Experience block ───────────────────────────────────────────────────
  // Number each entry so the model can align its experienceBullets array
  // indices with the correct job. This is the key to reliable index mapping.
  const experienceText =
    experience.length > 0
      ? experience
          .map((exp, index) => {
            const title = exp.jobTitle || "Unknown Title";
            const company = exp.company || "Unknown Company";
            const location = exp.location || "";
            const start = exp.startDate || "";
            const end = exp.isCurrent ? "Present" : exp.endDate || "";
            const dateRange = [start, end].filter(Boolean).join(" – ");
            const raw = exp.rawDescription?.trim() || "No description provided.";

            return [
              `[Experience Entry ${index}]`,
              `  Title    : ${title}`,
              `  Company  : ${company}${location ? ` | ${location}` : ""}`,
              `  Duration : ${dateRange || "Not specified"}`,
              `  Raw Notes: ${raw}`,
            ].join("\n");
          })
          .join("\n\n")
      : "No experience entries provided.";

  // ── Assemble final prompt ──────────────────────────────────────────────
  return `
CANDIDATE INFORMATION:
  Name     : ${candidateName}
  Location : ${candidateLocation}

TARGET ROLE:
  Job Title  : ${targetJobTitle || "Not specified"}
  Job Description:
  ${targetJobDescription?.trim() || "Not provided — generate based on target job title and candidate skills."}

CANDIDATE SKILLS:
  ${skillsText}

WORK EXPERIENCE (${experience.length} ${experience.length === 1 ? "entry" : "entries"}):
${experienceText}

INSTRUCTIONS REMINDER:
Return ONLY the JSON object. The "experienceBullets" array must have exactly ${experience.length} inner array(s), one per experience entry above, in the same order.
`.trim();
};

// ---------------------------------------------------------------------------
// generateResumeContent
// ---------------------------------------------------------------------------

/**
 * generateResumeContent
 *
 * Orchestrates the full AI generation pipeline:
 *   1. Build the structured user prompt from the resume document.
 *   2. Send the system prompt + user prompt to Gemini 1.5 Flash.
 *   3. Defensively strip any markdown code fences Gemini may still emit
 *      despite the responseMimeType: "application/json" instruction.
 *   4. Parse and validate the JSON response shape.
 *   5. Return a clean, typed JavaScript object ready for the controller.
 *
 * @param {import("mongoose").Document} resume - Full resume Mongoose document
 * @returns {Promise<{ summary: string, experienceBullets: string[][] }>}
 * @throws {ApiError} 502 on Gemini API failure, 500 on malformed response
 */
const generateResumeContent = async (resume) => {
  const userPrompt = buildUserPrompt(resume);

  // ── 1. Call Gemini ───────────────────────────────────────────────────────
  let rawText;
  try {
    const result = await geminiModel.generateContent({
      // Pass the system prompt as a system instruction so the model treats
      // it with higher authority than user-turn content.
      systemInstruction: SYSTEM_PROMPT,
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
    });

    const response = result.response;
    rawText = response.text();
  } catch (err) {
    console.error("❌ Gemini API call failed:", err.message);
    throw new ApiError(
      502,
      "AI service is temporarily unavailable. Please try again in a moment.",
      [],
      err.stack
    );
  }

  // ── 2. Defensive markdown stripping ─────────────────────────────────────
  // Even with responseMimeType: "application/json", some Gemini versions
  // still wrap the response in ```json ... ``` or ``` ... ```.
  // This regex handles all known variants:
  //   ```json\n{...}\n```
  //   ```\n{...}\n```
  //   {... } (already clean — regex won't match, original string returned)
  let cleanedText = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "") // Strip opening code fence
    .replace(/\s*```$/i, "")          // Strip closing code fence
    .trim();

  // ── 3. Parse JSON ────────────────────────────────────────────────────────
  let parsed;
  try {
    parsed = JSON.parse(cleanedText);
  } catch (parseErr) {
    console.error("❌ Failed to parse Gemini response as JSON:");
    console.error("Raw text received:", rawText);
    throw new ApiError(
      500,
      "AI returned an unexpected response format. Please try again.",
      [],
      parseErr.stack
    );
  }

  // ── 4. Shape validation ──────────────────────────────────────────────────
  // Minimal but critical — ensures the controller can safely map the response
  // onto the resume document without crashing on undefined access.
  if (typeof parsed.summary !== "string" || !Array.isArray(parsed.experienceBullets)) {
    console.error("❌ Gemini response failed shape validation:", parsed);
    throw new ApiError(
      500,
      "AI response structure was invalid. Please try again.",
    );
  }

  // Ensure every element in experienceBullets is itself an array.
  // Gemini occasionally returns a flat array for single-experience resumes.
  const normalizedBullets = parsed.experienceBullets.map((entry) =>
    Array.isArray(entry) ? entry : [entry]
  );

  return {
    summary: parsed.summary.trim(),
    experienceBullets: normalizedBullets,
  };
};

export { generateResumeContent, buildUserPrompt };
