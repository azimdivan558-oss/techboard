import axios from "axios";
import User from "../models/User.js";
import JobPost from "../models/JobPost.js";

/* =========================================================
   CONFIG
========================================================= */

// Pehle .env wala model (GEMINI_MODEL), phir ye fallback models.
// Naam wahi rakho jo AI Studio ki rate-limit list me dikh rahe hain.
const FALLBACK_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.8-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

const REQUEST_TIMEOUT = 30000;     // ek request max 30 sec
const TOTAL_DEADLINE = 60000;      // saare models mila ke max 60 sec
const TEMP_RETRY_DELAY = 2000;     // 503/500 par 1 retry se pehle wait

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getModelList = () => {
  const primary = process.env.GEMINI_MODEL;
  const list = primary ? [primary, ...FALLBACK_MODELS] : [...FALLBACK_MODELS];
  return [...new Set(list)]; // duplicates hata do
};

const isTimeoutError = (error) =>
  error.code === "ECONNABORTED" ||
  error.code === "ETIMEDOUT" ||
  error.message?.toLowerCase().includes("timeout");

const isQuotaError = (error) => error.response?.status === 429;

const isTemporaryError = (error) => {
  const status = error.response?.status;
  return (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    isTimeoutError(error) ||
    (!error.response && !isTimeoutError(error)) // network error
  );
};

/* =========================================================
   SINGLE GEMINI REQUEST
========================================================= */

const requestGemini = async ({ model, conversation, systemInstruction }) => {
  console.log(`Calling Gemini model: ${model}`);

  const response = await axios.post(
    "https://generativelanguage.googleapis.com/v1beta/interactions",
    {
      model,
      input: conversation,
      system_instruction: systemInstruction,
      generation_config: {
        temperature: 0.7,
        max_output_tokens: 1200,
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      timeout: REQUEST_TIMEOUT,
    }
  );

  return response.data;
};

/* =========================================================
   GEMINI CALL WITH MODEL FALLBACK

   - 429 (quota): retry NAHI, seedha agla model
   - 500/502/503/504/timeout/network: sirf 1 retry, phir agla model
   - 400/401/403 jaise permanent errors: seedha bahar
   - Total wait TOTAL_DEADLINE se zyada nahi
========================================================= */

export const callGemini = async ({ conversation, systemInstruction }) => {
  const models = getModelList();
  const startedAt = Date.now();
  let lastError = null;

  for (const model of models) {
    if (Date.now() - startedAt > TOTAL_DEADLINE) {
      console.warn("Gemini total wait limit reached.");
      break;
    }

    try {
      return await requestGemini({ model, conversation, systemInstruction });
    } catch (error) {
      lastError = error;

      const status = error.response?.status;
      console.error(`Gemini failed on ${model}:`, {
        status,
        code: error.response?.data?.error?.code || error.code,
        message: error.response?.data?.error?.message || error.message,
      });

      // Quota khatam: is model par dobara mat try karo
      if (isQuotaError(error)) {
        console.warn(`Quota exceeded for ${model}. Trying next model...`);
        continue;
      }

      // Temporary error: ek hi retry
      if (isTemporaryError(error)) {
        if (Date.now() - startedAt > TOTAL_DEADLINE) break;

        let delay = TEMP_RETRY_DELAY;
        const retryAfter = Number(error.response?.headers?.["retry-after"]);
        if (!Number.isNaN(retryAfter) && retryAfter > 0) {
          delay = Math.min(retryAfter * 1000, 10000);
        }

        console.log(`${model} temporarily unavailable. Retrying once in ${delay / 1000}s...`);
        await sleep(delay);

        try {
          return await requestGemini({ model, conversation, systemInstruction });
        } catch (retryError) {
          lastError = retryError;

          if (isQuotaError(retryError) || isTemporaryError(retryError)) {
            continue; // agla model
          }
          throw retryError;
        }
      }

      // Permanent error (400/401/403 etc.)
      throw error;
    }
  }

  throw lastError || new Error("All Gemini models failed");
};

/* =========================================================
   AI CHAT CONTROLLER
========================================================= */

export const chatWithAI = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    /* ---------- VALIDATE MESSAGE ---------- */

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        message: "Message is required.",
      });
    }

    if (String(message).length > 3000) {
      return res.status(400).json({
        message: "Message is too long. Please keep it under 3000 characters.",
      });
    }

    /* ---------- CHECK API KEY ---------- */

    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is missing.");

      return res.status(500).json({
        message: "AI service is not configured. Please contact support.",
      });
    }

    /* ---------- CHECK AUTHENTICATED USER ---------- */

    if (!req.user || !req.user._id) {
      return res.status(401).json({
        message: "User authentication required.",
      });
    }

    /* ---------- GET USER PROFILE ---------- */

    const user = await User.findById(req.user._id).lean();

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    /* ---------- GET AVAILABLE JOBS ---------- */

    let jobs = [];

    try {
      jobs = await JobPost.find({
        isActive: true,
        approvalStatus: "Approved",
      })
        .limit(30)
        .lean();
    } catch (jobError) {
      console.error("JOB FETCH ERROR:", jobError.message);
      // AI chat jobs fetch fail hone par bhi chalna chahiye
      jobs = [];
    }

    /* ---------- USER PROFILE CONTEXT ---------- */

    const skillsText = Array.isArray(user.skills)
      ? user.skills.join(", ")
      : user.skills || "Not provided";

    const educationText = Array.isArray(user.education)
      ? JSON.stringify(user.education)
      : user.education || "Not provided";

    const experienceText = Array.isArray(user.experience)
      ? JSON.stringify(user.experience)
      : user.experience || "Not provided";

    const userContext = `
CANDIDATE PROFILE

Name:
${user.name || "Not provided"}

Email:
${user.email || "Not provided"}

Title:
${user.title || "Not provided"}

Location:
${user.location || "Not provided"}

Skills:
${skillsText}

Education:
${educationText}

Experience:
${experienceText}

Bio:
${user.bio || "Not provided"}
`;

    /* ---------- JOB CONTEXT ---------- */

    let jobsContext = "No jobs are currently available.";

    if (jobs.length > 0) {
      jobsContext = jobs
        .map((job, index) => {
          const jobSkills = Array.isArray(job.skills)
            ? job.skills.join(", ")
            : job.skills || "Not specified";

          return `
JOB ${index + 1}

Title:
${job.title || "Not specified"}

Company:
${job.companyName || job.company || "Not specified"}

Location:
${job.location || "Not specified"}

Skills:
${jobSkills}

Description:
${job.description || "Not specified"}
`;
        })
        .join("\n");
    }

    /* ---------- SYSTEM INSTRUCTION ---------- */

    const systemInstruction = `
You are TechBoard AI Career Assistant.

You are an AI assistant inside a job portal called TechBoard.

Your main purpose is to help candidates with:

1. Job searching
2. Job matching
3. Resume improvement
4. Profile improvement
5. Career guidance
6. Interview preparation
7. Mock interviews
8. Skill improvement
9. Job description analysis
10. Career roadmaps
11. Professional communication
12. Learning recommendations


IMPORTANT RULES:

- Be friendly and professional.
- Give practical and actionable answers.
- Keep normal answers reasonably concise.
- Use the candidate profile whenever relevant.
- If the user asks about their skills, use their actual profile.
- If the user asks for job recommendations, use ONLY the available jobs provided below.
- NEVER invent a company, job, salary, vacancy or job requirement.
- If there are no matching jobs, clearly say that no matching job was found.
- You can explain why a particular job may match the candidate.
- You can suggest skills the candidate should improve.
- You can help prepare interview questions.
- You can conduct mock interviews.
- You can improve resumes and professional messages.
- Do not claim that you performed an action that you did not actually perform.


CANDIDATE INFORMATION:

${userContext}


AVAILABLE JOBS:

${jobsContext}
`;

    /* ---------- BUILD CHAT HISTORY ---------- */

    let conversation = "";

    if (Array.isArray(history)) {
      // Sirf last 10 messages bhejo (tokens bachte hain)
      for (const item of history.slice(-10)) {
        if (!item || !item.content) continue;

        const role = item.role === "assistant" ? "AI Assistant" : "Candidate";

        conversation += `${role}: ${String(item.content)}\n\n`;
      }
    }

    conversation += `Candidate: ${String(message).trim()}`;

    /* ---------- CALL GEMINI ---------- */

    const result = await callGemini({
      conversation,
      systemInstruction,
    });

    /* ---------- GET AI RESPONSE ---------- */

    const aiMessage =
      result?.output_text?.trim() ||
      result?.steps
        ?.filter((step) => step.type === "model_output")
        ?.flatMap((step) => step.content || [])
        ?.filter((content) => content.type === "text")
        ?.map((content) => content.text)
        ?.join("\n")
        ?.trim();

    if (!aiMessage) {
      console.error("EMPTY GEMINI RESPONSE:", JSON.stringify(result, null, 2));

      return res.status(500).json({
        message: "Gemini returned an empty response. Please try again.",
      });
    }

    return res.status(200).json({
      message: aiMessage,
    });
  } catch (error) {
    console.error(
      "GEMINI AI CHAT ERROR:",
      error.response?.data || error.message
    );

    const status = error.response?.status;

    if (isTimeoutError(error)) {
      return res.status(504).json({
        message: "AI took too long to respond. Please try again.",
      });
    }

    if (status === 429) {
      return res.status(429).json({
        message: "AI is busy right now. Please try again in a minute.",
      });
    }

    if (status === 503) {
      return res.status(503).json({
        message: "AI is temporarily busy. Please try again shortly.",
      });
    }

    if (status === 401 || status === 403) {
      return res.status(500).json({
        message: "AI service is not available right now. Please contact support.",
      });
    }

    return res.status(500).json({
      message: "AI service failed. Please try again.",
    });
  }
};