import pdfParse from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";
import OpenAI from "openai";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AnalysisResult } from "../models/AnalysisResult.model.js";
import { Resume } from "../models/Resume.model.js";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:5173",
    "X-Title": "AI Resume Builder",
  },
});
// ---------------------------------------------------------------------------
// Text extraction helpers
// ---------------------------------------------------------------------------

/**
 * extractText
 *
 * Reads the uploaded file buffer and extracts plain text based on MIME type.
 *
 * @param {Buffer} buffer   - Raw file bytes from multer memoryStorage
 * @param {string} mimetype - MIME type reported by multer
 * @returns {Promise<string>} Extracted plain text
 */
async function extractText(buffer, mimetype) {
  if (mimetype === "application/pdf") {
    console.log("📄 Analyzer: parsing PDF buffer, byte length:", buffer.length);
    const data = await pdfParse(buffer);
    const text = data.text?.trim() ?? "";
    console.log(`📄 Analyzer: PDF extracted — ${text.length} chars`);
    return text;
  }

  if (
    mimetype ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    console.log("📄 Analyzer: parsing DOCX buffer, byte length:", buffer.length);
    const { value } = await mammoth.extractRawText({ buffer });
    const text = value?.trim() ?? "";
    console.log(`📄 Analyzer: DOCX extracted — ${text.length} chars`);
    return text;
  }

  throw new ApiError(415, "Unsupported file type. Only PDF and DOCX are accepted.");
}

// ---------------------------------------------------------------------------
// JSON extraction helper
// ---------------------------------------------------------------------------

/**
 * extractJSON
 *
 * Strips any markdown code fences (``` or ```json) that AI models may wrap
 * around their response, then attempts JSON.parse. Returns the parsed object
 * on success or null on failure so the caller can handle the fallback.
 *
 * @param {string} raw - Raw text string from AI model
 * @returns {{ parsed: object|null, cleaned: string }}
 */
function extractJSON(raw) {
  // Remove every occurrence of opening/closing fences, not just the outermost
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/im, "")   // leading fence
    .replace(/\s*```\s*$/im, "")         // trailing fence
    .replace(/```(?:json)?\s*/gim, "")   // any remaining opening fences
    .replace(/\s*```/gim, "")            // any remaining closing fences
    .trim();

  try {
    return { parsed: JSON.parse(cleaned), cleaned };
  } catch {
    return { parsed: null, cleaned };
  }
}

// ---------------------------------------------------------------------------
// AI System Prompt
// ---------------------------------------------------------------------------

const ANALYZER_SYSTEM_PROMPT = `You are a professional ATS (Applicant Tracking System) resume evaluator with 15+ years of hiring and career coaching experience. Your job is to analyse a resume and return a precise, actionable JSON evaluation.

STRICT OUTPUT RULES:
1. Return ONLY a single valid JSON object.
2. Do NOT wrap the output in markdown code fences, backticks, or any other formatting.
3. Do NOT include any text before or after the JSON object.
4. The JSON MUST match this exact schema:
{
  "score": <integer 0-100 representing ATS compatibility>,
  "domain": "<Primary professional domain, e.g. Computer Science, Marketing, Finance>",
  "marketFit": "<one of: High | Medium | Low>",
  "summary": "<2-4 sentence honest summary of the resume's overall quality and fit>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "gapAnalysis": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "keywords": {
    "found": ["<keyword found in resume>", "..."],
    "missing": ["<high-value keyword missing>", "..."]
  }
}
5. score: Evaluate ATS compatibility (keyword density, formatting signals, section completeness).
   - 80-100: Excellent, likely to pass most ATS filters
   - 60-79:  Good but has identifiable gaps
   - 40-59:  Fair — significant improvements needed
   - 0-39:   Poor — major restructuring required
6. strengths: Exactly 2-4 specific, evidence-backed strengths from the resume text.
7. gapAnalysis: Exactly 3-5 actionable, specific recommendations to improve ATS score and marketability.
8. keywords.found: Up to 10 relevant technical or professional keywords present in the resume.
9. keywords.missing: Up to 8 high-value keywords relevant to the detected domain that are absent.
10. Do NOT fabricate details not present in the resume text.`;

// ---------------------------------------------------------------------------
// Controller: analyzeResume
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/analyzer/upload
 *
 * Pipeline:
 *  1. Validate the uploaded file exists (multer places it on req.file).
 *  2. Size guard.
 *  3. Extract plain text from the file buffer (PDF or DOCX).
 *  4. Validate there is enough text to meaningfully analyse.
 *  5. Call OpenRouter AI with the extracted text.
 *  6. Strip any markdown fences and parse the JSON response.
 *  7. Validate the response shape minimally.
 *  8. Persist the analysis result to MongoDB.
 *  9. Return { success: true, data: <parsed result + _id> }.
 */
const analyzeResumeController = asyncHandler(async (req, res) => {
  try {
    // ── 1. File presence check ─────────────────────────────────────────────
    console.log("📥 Analyzer: request received");
    console.log("File received:", req.file ? req.file.originalname : "None");

    if (!req.file) {
      console.error("❌ Analyzer: req.file is missing. Incoming Content-Type:", req.headers["content-type"]);
      console.error("❌ Analyzer: Full incoming headers:", JSON.stringify(req.headers, null, 2));
      throw new ApiError(400, "No file uploaded. Please attach a PDF or DOCX resume.");
    }

    const { buffer, mimetype, originalname, size } = req.file;
    console.log(`📎 Analyzer: file="${originalname}", mime="${mimetype}", size=${size} bytes`);

    // ── 2. Size guard ──────────────────────────────────────────────────────
    const MAX_BYTES = 5 * 1024 * 1024;
    if (size > MAX_BYTES) {
      throw new ApiError(413, "File exceeds the 5 MB size limit.");
    }

    // ── 3. Text extraction ─────────────────────────────────────────────────
    console.log("Starting text extraction for mime:", mimetype);
    let resumeText;
    try {
      resumeText = await extractText(buffer, mimetype);
    } catch (err) {
      console.error("❌ Analyzer: text extraction failed:", err.message);
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        422,
        `Could not read file content from "${originalname}". Ensure the file is not corrupted or password-protected.`
      );
    }

    // ── 4. Minimum content check ───────────────────────────────────────────
    console.log(`🔍 Analyzer: extracted text length = ${resumeText?.length ?? 0} chars`);
    if (!resumeText || resumeText.length < 100) {
      throw new ApiError(
        422,
        "The uploaded file appears to be empty or contains too little text to analyse. Please upload a properly formatted resume."
      );
    }

    // Truncate very long documents to fit within model's context window
    const truncatedText = resumeText.slice(0, 12000);
    console.log(`✂️  Analyzer: text truncated to ${truncatedText.length} chars for AI model`);

    // ── 5. Call OpenRouter AI ──────────────────────────────────────────────
    console.log("🤖 Analyzer: calling OpenRouter AI...");
    const userPrompt = `Please analyse the following resume text and return ONLY a raw JSON object (no markdown, no code fences):\n\n---\n${truncatedText}\n---`;

    let rawText;
    try {
      const response = await openai.chat.completions.create({
        model: process.env.AI_MODEL || "google/gemma-4-26b-a4b-it:free",
        messages: [
          { role: "system", content: ANALYZER_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      });
      rawText = response.choices[0].message.content;
      console.log("✅ Analyzer: OpenRouter AI responded, raw length:", rawText?.length ?? 0);
    } catch (err) {
      console.error("❌ OpenRouter AI analyzer API call failed:", err.message);
      console.error("❌ Analyzer: OpenRouter error stack:", err.stack);
      throw new ApiError(502, "AI analysis service is temporarily unavailable. Please try again in a moment.");
    }

    // ── 6. Strip markdown fences & parse JSON ──────────────────────────────
    console.log("🔧 Analyzer: parsing AI JSON response...");
    const { parsed, cleaned } = extractJSON(rawText);

    if (!parsed) {
      console.error("❌ Analyzer: JSON.parse failed on AI response.");
      console.error("❌ Analyzer: raw AI output was:\n", rawText);
      console.error("❌ Analyzer: cleaned string attempted:\n", cleaned);
      throw new ApiError(500, "AI returned an unexpected response format. Please try again.");
    }
    console.log("✅ Analyzer: JSON parsed successfully");

    // ── 7. Shape validation ────────────────────────────────────────────────
    const required = ["score", "domain", "marketFit", "summary", "strengths", "gapAnalysis", "keywords"];
    for (const key of required) {
      if (parsed[key] === undefined) {
        console.error(`❌ Analyzer: missing required field "${key}" in AI response`);
        console.error("❌ Analyzer: full parsed object:", JSON.stringify(parsed, null, 2));
        throw new ApiError(500, "AI response was incomplete. Please try again.");
      }
    }

    // Coerce score to integer in case the AI model returns a float
    parsed.score = Math.round(Number(parsed.score));

    // Ensure array fields are actually arrays (defensive)
    parsed.strengths        = Array.isArray(parsed.strengths)           ? parsed.strengths           : [];
    parsed.gapAnalysis      = Array.isArray(parsed.gapAnalysis)         ? parsed.gapAnalysis         : [];
    parsed.keywords         = parsed.keywords ?? {};
    parsed.keywords.found   = Array.isArray(parsed.keywords.found)      ? parsed.keywords.found      : [];
    parsed.keywords.missing = Array.isArray(parsed.keywords.missing)    ? parsed.keywords.missing    : [];

    console.log(`🎉 Analyzer: complete — score=${parsed.score}, domain="${parsed.domain}", marketFit="${parsed.marketFit}"`);

    // ── 8. Persist analysis result to MongoDB ──────────────────────────────
    let savedRecord = null;
    try {
      savedRecord = await AnalysisResult.create({
        userId:          req.user?._id,
        fileName:        originalname   ?? "unknown",
        fileSize:        size           ?? 0,
        atsScore:        parsed.score,
        detectedDomain:  parsed.domain  ?? "",
        marketFit:       ["High", "Medium", "Low"].includes(parsed.marketFit)
                           ? parsed.marketFit
                           : "Low",
        summary:         parsed.summary          ?? "",
        strengths:       parsed.strengths         ?? [],
        recommendations: parsed.gapAnalysis       ?? [],
        foundKeywords:   parsed.keywords?.found   ?? [],
        missingKeywords: parsed.keywords?.missing ?? [],
      });
      console.log("💾 Analyzer: result saved to DB, _id:", savedRecord._id);
    } catch (dbErr) {
      // DB persistence failure must not block the response — the AI already
      // did the work, so we log the error and continue without an _id.
      console.error("⚠️  Analyzer: failed to save result to DB:", dbErr.message);
    }

    // ── 9. Respond ─────────────────────────────────────────────────────────
    return res
      .status(200)
      .json(new ApiResponse(200, { ...parsed, _id: savedRecord?._id ?? null }, "Resume analysis complete"));

  } catch (err) {
    // Re-throw ApiErrors as-is so the global error handler serialises them
    // correctly. Wrap anything unexpected as a 500 so no raw Node error leaks.
    if (err instanceof ApiError) throw err;
    console.error("❌ Analyzer: unexpected error:", err.message);
    console.error("❌ Analyzer: stack:", err.stack);
    throw new ApiError(500, "An unexpected error occurred during analysis. Please try again.");
  }
});

// ---------------------------------------------------------------------------
// AI System Prompt — Cover Letter
// ---------------------------------------------------------------------------

const COVER_LETTER_SYSTEM_PROMPT = `You are an expert career coach and professional writer with 15+ years of experience crafting compelling cover letters that get candidates hired at top companies. You write in a confident, authentic, and professional tone — never generic or robotic.

STRICT OUTPUT RULES:
1. Return ONLY the plain cover letter text. No JSON, no markdown code fences, no extra commentary.
2. Use standard cover letter structure:
   - Opening paragraph: Hook that names the role and company, expresses genuine enthusiasm.
   - Body paragraph 1: Strongest relevant skill or achievement matched to the job description.
   - Body paragraph 2: Second key strength + cultural fit / why this specific company.
   - Closing paragraph: Clear call to action, gratitude, professional sign-off.
3. Length: 3–4 paragraphs, 250–350 words. Concise and impactful.
4. Tone: Professional but human. First person. No clichés like "I am writing to apply".
5. Do NOT invent credentials or personal details not implied by the inputs.
6. Address the hiring manager as "Hiring Manager" unless a name is provided.
7. End with:
   Sincerely,
   [Applicant]`;

// ---------------------------------------------------------------------------
// Controller: generateCoverLetter
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/analyzer/cover-letter  [Protected]
 *
 * Body: { company, role, jobDescription }
 *
 * 1. Validate all three required fields are present and non-empty.
 * 2. Build a structured prompt from the inputs.
 * 3. Call OpenRouter with the same client used for resume analysis.
 * 4. Return the plain-text cover letter to the client.
 */
const generateCoverLetter = asyncHandler(async (req, res) => {
  const { company, role, jobDescription } = req.body;

  // ── 1. Input validation ──────────────────────────────────────────────────
  if (!company?.trim()) {
    throw new ApiError(400, "Company name is required.");
  }
  if (!role?.trim()) {
    throw new ApiError(400, "Job role / title is required.");
  }
  if (!jobDescription?.trim()) {
    throw new ApiError(400, "Job description is required.");
  }

  const companyClean  = company.trim().slice(0, 120);
  const roleClean     = role.trim().slice(0, 120);
  const jdClean       = jobDescription.trim().slice(0, 6000); // cap to keep within context

  console.log(`✉️  Cover Letter: generating for role="${roleClean}" at company="${companyClean}"`);

  // ── 2. Build prompt ──────────────────────────────────────────────────────
  const userPrompt =
    `Write a professional cover letter for the following opportunity:\n\n` +
    `Company: ${companyClean}\n` +
    `Role: ${roleClean}\n\n` +
    `Job Description:\n${jdClean}\n\n` +
    `Write the full cover letter now. Return only the letter text — no subject line, no extra commentary.`;

  // ── 3. Call OpenRouter ───────────────────────────────────────────────────
  let coverLetter;
  try {
    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL || "google/gemma-4-26b-a4b-it:free",
      messages: [
        { role: "system", content: COVER_LETTER_SYSTEM_PROMPT },
        { role: "user",   content: userPrompt },
      ],
      temperature: 0.7,    // slightly higher than analyzer for natural prose
      max_tokens:  1200,
    });

    coverLetter = response.choices?.[0]?.message?.content?.trim() ?? "";
    console.log(`✅ Cover Letter: generated — ${coverLetter.length} chars`);
  } catch (err) {
    console.error("❌ Cover Letter: OpenRouter API error:", err.message);
    throw new ApiError(502, "AI service is temporarily unavailable. Please try again in a moment.");
  }

  if (!coverLetter) {
    throw new ApiError(500, "AI returned an empty response. Please try again.");
  }

  // ── 4. Respond ───────────────────────────────────────────────────────────
  return res
    .status(200)
    .json(new ApiResponse(200, { coverLetter }, "Cover letter generated successfully"));
});

// ---------------------------------------------------------------------------
// Interview Prep — System Prompt
// ---------------------------------------------------------------------------

const INTERVIEW_PREP_SYSTEM_PROMPT = `You are a world-class technical recruiter and career coach with 15+ years of experience conducting interviews at FAANG, top startups, and Fortune 500 companies. Your role is to generate hyper-personalised mock interview questions based on a candidate's actual resume data.

STRICT OUTPUT RULES:
1. Return ONLY a single valid JSON object. No markdown, no code fences, no commentary.
2. The JSON MUST match this exact schema:
{
  "technicalQuestions": [
    {
      "question": "<specific technical question derived from their stack/experience/projects>",
      "idealAnswer": "<a thorough, 3-5 sentence model answer with specific technical details>",
      "hint": "<a one-sentence coaching tip on what interviewers are really testing>",
      "difficulty": "<Easy | Medium | Hard>"
    }
  ],
  "behavioralQuestions": [
    {
      "question": "<STAR-format behavioral question tied to a real experience from their resume>",
      "idealAnswer": "<model STAR answer referencing specifics from the candidate's resume>",
      "hint": "<one-sentence tip on what interviewers are assessing>",
      "difficulty": "<Easy | Medium | Hard>"
    }
  ]
}
3. Generate EXACTLY 5 technical and EXACTLY 5 behavioral questions.
4. Technical questions MUST reference actual technologies, projects, or experiences from the resume. Do not ask generic questions.
5. Behavioral questions MUST reference specific roles, responsibilities, or achievements visible in the resume. Ground each in real context.
6. idealAnswer must be substantive — 3-5 sentences minimum. Mention specific technologies or situations from the resume where relevant.
7. hint must be ≤ 20 words. Sharp and actionable.
8. difficulty must be calibrated to the seniority level implied by the resume.
9. Never invent technologies or experiences not present in the resume.`;

// ---------------------------------------------------------------------------
// Controller: generateInterviewQuestions
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/analyzer/interview-prep  [Protected]
 *
 * Body: { resumeId: string }
 *
 * 1. Validate resumeId is present.
 * 2. Fetch the resume from MongoDB (ownership-scoped).
 * 3. Build a structured resume summary for the prompt.
 * 4. Call OpenRouter — response must be a JSON object.
 * 5. Parse, validate, and return { questions }.
 */
const generateInterviewQuestions = asyncHandler(async (req, res) => {
  const { resumeId } = req.body;

  // ── 1. Validate input ────────────────────────────────────────────────────
  if (!resumeId || typeof resumeId !== "string" || resumeId.trim().length === 0) {
    throw new ApiError(400, "resumeId is required.");
  }

  // ── 2. Fetch resume (ownership enforced via userId filter) ───────────────
  const resume = await Resume.findOne({
    _id: resumeId.trim(),
    userId: req.user._id,
  }).lean();

  if (!resume) {
    throw new ApiError(404, "Resume not found. Please select a valid resume.");
  }

  // ── 3. Build structured resume summary for the prompt ───────────────────
  const name     = resume.personalInfo?.fullName || "The Candidate";
  const target   = resume.targetJobTitle         || "a software engineering role";

  // Skills — flatten all categories into a readable string
  const skillsText = (resume.skills || [])
    .map(g => {
      const items = Array.isArray(g.items) ? g.items.join(", ") : "";
      return g.category ? `${g.category}: ${items}` : items;
    })
    .filter(Boolean)
    .join(" | ") || "Not specified";

  // Experience — numbered list with title, company, dates, raw description
  const expText = (resume.experience || []).length > 0
    ? resume.experience.map((e, i) => {
        const dates = [e.startDate, e.isCurrent ? "Present" : e.endDate].filter(Boolean).join(" – ");
        const desc  = e.rawDescription?.trim() || (e.aiBullets || []).join(". ") || "No description.";
        return `[${i + 1}] ${e.jobTitle || "Unknown"} @ ${e.company || "Unknown"} (${dates || "Dates not specified"})\n    ${desc}`;
      }).join("\n\n")
    : "No experience entries.";

  // Projects
  const projText = (resume.projects || []).length > 0
    ? resume.projects.map((p, i) => {
        const techs = (p.technologies || []).join(", ");
        const desc  = p.description?.trim() || "No description.";
        return `[${i + 1}] ${p.title || "Untitled"} (${techs || "No tech listed"})\n    ${desc}`;
      }).join("\n\n")
    : "No projects listed.";

  // Education
  const eduText = (resume.education || []).length > 0
    ? resume.education.map(e => `${e.degree || "Degree"} — ${e.institution || "Institution"} (${e.endYear || "N/A"})`).join("; ")
    : "Not specified";

  const userPrompt =
    `Generate personalised mock interview questions for the following candidate.\n\n` +
    `CANDIDATE: ${name}\n` +
    `TARGET ROLE: ${target}\n\n` +
    `SKILLS:\n${skillsText}\n\n` +
    `WORK EXPERIENCE:\n${expText}\n\n` +
    `PROJECTS:\n${projText}\n\n` +
    `EDUCATION: ${eduText}\n\n` +
    `Return ONLY the JSON object. Exactly 5 technical and 5 behavioral questions.`;

  console.log(`🎤 Interview Prep: generating for resumeId="${resumeId}", user="${req.user._id}"`);

  // ── 4. Call OpenRouter ───────────────────────────────────────────────────
  // "openrouter/free" is OpenRouter's own auto-routing slug — it picks any
  // currently available free model at request time, so it is immune to
  // individual model slugs being retired or moved behind a paywall.
  // Payload is kept minimal (model + messages + temperature only) to avoid
  // triggering 502s from advanced params that free-tier models may reject.
  // process.env.AI_MODEL is intentionally ignored here.
  let rawText;
  try {
    console.log("🤖 Interview Prep: calling OpenRouter...");
    const response = await openai.chat.completions.create({
      model:       "openrouter/auto",
      messages: [
        { role: "system", content: INTERVIEW_PREP_SYSTEM_PROMPT },
        { role: "user",   content: userPrompt },
      ],
      temperature: 0.55,
    });

    // Guard against empty or malformed choices array
    const choice = response.choices?.[0];
    if (!choice || !choice.message?.content) {
      console.error("❌ Interview Prep: OpenRouter returned empty choices array");
      console.error("   full response:", JSON.stringify(response));
      throw new ApiError(502, "AI service returned an empty response. Please try again.");
    }

    rawText = choice.message.content.trim();
    console.log(`✅ Interview Prep: AI responded — length=${rawText.length}, finish_reason=${choice.finish_reason}`);
  } catch (err) {
    // Re-throw ApiErrors we threw ourselves above
    if (err instanceof ApiError) throw err;

    // Log every available detail for root-cause tracing
    console.error("❌ Interview Prep: OpenRouter call failed");
    console.error("   message   :", err.message);
    console.error("   status    :", err.status    ?? err.response?.status ?? "n/a");
    console.error("   error body:", JSON.stringify(err.error ?? err.response?.data ?? null));
    console.error("   headers   :", JSON.stringify(err.response?.headers ?? null));
    console.error("   stack     :", err.stack);
    throw new ApiError(502, "AI service is temporarily unavailable. Please try again.");
  }

  // ── 5. Aggressive JSON extraction ───────────────────────────────────────
  // Free models sometimes still wrap output in markdown fences even when
  // response_format is set. Strip all variants before parsing.
  let parsed;
  try {
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/im, "")   // leading fence
      .replace(/\s*```\s*$/im,      "")    // trailing fence
      .replace(/```(?:json)?\s*/gim, "")   // any remaining opening fences
      .replace(/\s*```/gim,         "")    // any remaining closing fences
      .trim();

    console.log("🔧 Interview Prep: attempting JSON.parse on cleaned response...");
    parsed = JSON.parse(cleaned);
    console.log("✅ Interview Prep: JSON parsed successfully");
  } catch (parseErr) {
    console.error("❌ Interview Prep: JSON.parse failed");
    console.error("   parse error :", parseErr.message);
    console.error("   raw response:", rawText.slice(0, 600));
    throw new ApiError(500, "AI returned an unexpected response format. Please try again.");
  }

  if (!parsed || !Array.isArray(parsed.technicalQuestions) || !Array.isArray(parsed.behavioralQuestions)) {
    console.error("❌ Interview Prep: parsed object missing required arrays");
    console.error("   keys present:", Object.keys(parsed ?? {}));
    console.error("   raw snippet :", rawText.slice(0, 400));
    throw new ApiError(500, "AI returned an unexpected response shape. Please try again.");
  }

  // Normalise — ensure all required fields exist on every question
  const normalise = (arr) =>
    arr.map(q => ({
      question:    q.question    || "",
      idealAnswer: q.idealAnswer || "",
      hint:        q.hint        || "",
      difficulty:  ["Easy","Medium","Hard"].includes(q.difficulty) ? q.difficulty : "Medium",
    }));

  return res.status(200).json(
    new ApiResponse(200, {
      resumeTitle:          resume.title,
      candidateName:        name,
      targetRole:           target,
      technicalQuestions:   normalise(parsed.technicalQuestions.slice(0, 5)),
      behavioralQuestions:  normalise(parsed.behavioralQuestions.slice(0, 5)),
    }, "Interview questions generated successfully")
  );
});

export { analyzeResumeController, generateCoverLetter, generateInterviewQuestions };
