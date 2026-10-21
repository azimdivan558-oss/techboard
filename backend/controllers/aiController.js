
import axios from "axios";
import User from "../models/User.js";
import JobPost from "../models/JobPost.js";

/* =========================================================
   GEMINI CONFIGURATION
========================================================= */

const FALLBACK_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
];

const REQUEST_TIMEOUT = 12000;
const TOTAL_DEADLINE = 35000;

const getModelList = () => {
  const primary = process.env.GEMINI_MODEL?.trim();

  return [
    ...new Set(
      [primary, ...FALLBACK_MODELS].filter(Boolean)
    ),
  ];
};

const isTimeoutError = (error) =>
  error.code === "ECONNABORTED" ||
  error.code === "ETIMEDOUT" ||
  error.message?.toLowerCase().includes("timeout");

const isQuotaError = (error) =>
  error.response?.status === 429;

const isModelUnavailableError = (error) =>
  error.response?.status === 404;

const isTemporaryError = (error) => {
  const status = error.response?.status;

  return (
    [408, 500, 502, 503, 504].includes(status) ||
    isTimeoutError(error) ||
    (!error.response && !error.request)
  );
};

/* =========================================================
   SINGLE GEMINI REQUEST
========================================================= */

const requestGemini = async ({
  model,
  conversation,
  systemInstruction,
  timeout,
}) => {
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
      timeout,
    }
  );

  return response.data;
};

/* =========================================================
   GEMINI FALLBACK CHAIN
========================================================= */

export const callGemini = async ({
  conversation,
  systemInstruction,
}) => {
  const models = getModelList();
  const startedAt = Date.now();
  let lastError = null;

  for (const model of models) {
    const remaining =
      TOTAL_DEADLINE - (Date.now() - startedAt);

    if (remaining <= 0) {
      console.warn("Gemini total wait limit reached.");
      break;
    }

    const timeout = Math.min(
      REQUEST_TIMEOUT,
      remaining
    );

    try {
      return await requestGemini({
        model,
        conversation,
        systemInstruction,
        timeout,
      });
    } catch (error) {
      lastError = error;

      console.error(`Gemini failed on ${model}:`, {
        status: error.response?.status,
        code: error.code,
        message:
          error.response?.data?.error?.message ||
          error.message,
      });

      if (
        isQuotaError(error) ||
        isTemporaryError(error) ||
        isModelUnavailableError(error)
      ) {
        console.warn(
          `${model} failed. Trying next model...`
        );
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error(
    "All Gemini models failed"
  );
};

/* =========================================================
   AI CHAT CONTROLLER
========================================================= */

export const chatWithAI = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        message: "Message is required.",
      });
    }

    if (String(message).length > 3000) {
      return res.status(400).json({
        message:
          "Message is too long. Please keep it under 3000 characters.",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is missing.");

      return res.status(500).json({
        message:
          "AI service is not configured. Please contact support.",
      });
    }

    if (!req.user?._id) {
      return res.status(401).json({
        message: "User authentication required.",
      });
    }

    /* ---------- USER PROFILE ---------- */

    const user = await User.findById(
      req.user._id
    ).lean();

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    /* ---------- APPROVED JOBS ---------- */

    let jobs = [];

    try {
      jobs = await JobPost.find({
        isActive: true,
        approvalStatus: "Approved",
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
    } catch (jobError) {
      console.error(
        "JOB FETCH ERROR:",
        jobError.message
      );
    }

    /* ---------- PROFILE CONTEXT ---------- */

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

Name: ${user.name || "Not provided"}
Email: ${user.email || "Not provided"}
Title: ${user.title || "Not provided"}
Location: ${user.location || "Not provided"}
Skills: ${skillsText}
Education: ${educationText}
Experience: ${experienceText}
Bio: ${user.bio || "Not provided"}
`;

    /* ---------- JOB CONTEXT ---------- */

    const jobsContext = jobs.length
      ? jobs.map((job, index) => {
          const jobSkills = Array.isArray(job.skills)
            ? job.skills.join(", ")
            : job.skills || "Not specified";

          return `
JOB ${index + 1}
Title: ${job.title || "Not specified"}
Company: ${job.companyName || job.company || "Not specified"}
Location: ${job.location || "Not specified"}
Skills: ${jobSkills}
Description: ${
            job.description
              ? String(job.description).slice(0, 300)
              : "Not specified"
          }
`;
        }).join("\n")
      : "No jobs are currently available.";

    /* ---------- SYSTEM INSTRUCTION ---------- */

    const systemInstruction = `
You are TechBoard AI Career Assistant.

Help candidates with:
1. Job searching and job matching
2. Resume and profile improvement
3. Career guidance and roadmaps
4. Interview and mock interview preparation
5. Skill improvement
6. Job description analysis
7. Professional communication
8. Learning recommendations

RULES:
- Be friendly, professional and practical.
- Keep answers reasonably concise.
- Use the candidate profile when relevant.
- Recommend ONLY jobs included in AVAILABLE JOBS.
- Never invent companies, vacancies, salaries or requirements.
- Clearly state when no matching job is found.
- Do not claim to perform actions you have not performed.

CANDIDATE INFORMATION:
${userContext}

AVAILABLE JOBS:
${jobsContext}
`;

    /* ---------- CHAT HISTORY ---------- */

    let conversation = "";

    if (Array.isArray(history)) {
      for (const item of history.slice(-10)) {
        if (!item?.content) continue;

        const role =
          item.role === "assistant"
            ? "AI Assistant"
            : "Candidate";

        conversation +=
          `${role}: ${String(item.content)}\n\n`;
      }
    }

    conversation +=
      `Candidate: ${String(message).trim()}`;

    /* ---------- CALL GEMINI ---------- */

    const result = await callGemini({
      conversation,
      systemInstruction,
    });

    /* ---------- EXTRACT RESPONSE ---------- */

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
      console.error(
        "EMPTY GEMINI RESPONSE:",
        JSON.stringify(result, null, 2)
      );

      return res.status(500).json({
        message:
          "Gemini returned an empty response. Please try again.",
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
        message:
          "AI took too long to respond. Please try again.",
      });
    }

    if (status === 429) {
      return res.status(429).json({
        message:
          "AI quota or rate limit reached. Please try again later.",
      });
    }

    if (status === 503) {
      return res.status(503).json({
        message:
          "AI is temporarily busy. Please try again shortly.",
      });
    }

    if (status === 401 || status === 403) {
      return res.status(500).json({
        message:
          "AI service authentication failed. Check your Gemini API key and permissions.",
      });
    }

    if (status === 404) {
      return res.status(502).json({
        message:
          "The configured Gemini model or API endpoint was not found. Check your model configuration.",
      });
    }

    return res.status(500).json({
      message: "AI service failed. Please try again.",
    });
  }
};
