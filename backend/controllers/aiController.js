import axios from "axios";
import User from "../models/User.js";
import JobPost from "../models/JobPost.js";

/* =========================================================
   WAIT HELPER
========================================================= */

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};


/* =========================================================
   GEMINI API CALL WITH SMART RETRY
========================================================= */

export const callGemini = async ({
  model,
  conversation,
  systemInstruction,
}) => {

  const MAX_RETRIES = 3;

  // Gemini can sometimes take 15-25 seconds.
  // 45 seconds gives it enough time without hanging too long.
  const REQUEST_TIMEOUT = 45000;

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

    try {

      console.log(
        `Calling Gemini model: ${model} | Attempt ${attempt}/${MAX_RETRIES}`
      );

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

      console.log(
        `Gemini response received successfully on attempt ${attempt}.`
      );

      return response.data;

    } catch (error) {

      lastError = error;

      const status = error.response?.status;

      const errorData = error.response?.data;

      const errorCode =
        errorData?.error?.code ||
        errorData?.code;

      const errorMessage =
        errorData?.error?.message ||
        errorData?.message ||
        error.message;

      const isTimeout =
        error.code === "ECONNABORTED" ||
        error.code === "ETIMEDOUT" ||
        error.message?.toLowerCase().includes("timeout");

      const isNetworkError =
        !error.response &&
        !isTimeout;

      console.error(
        `Gemini attempt ${attempt} failed:`,
        {
          status,
          code: errorCode || error.code,
          message: errorMessage,
          timeout: isTimeout,
        }
      );


      /* =====================================================
         DETERMINE WHETHER ERROR SHOULD BE RETRIED
      ===================================================== */

      const shouldRetry =
        status === 503 ||
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 504 ||
        errorCode === "service_unavailable" ||
        isTimeout ||
        isNetworkError;


      /* =====================================================
         DO NOT RETRY PERMANENT ERRORS
      ===================================================== */

      if (!shouldRetry) {

        console.error(
          "Gemini returned a non-retryable error."
        );

        throw error;
      }


      /* =====================================================
         LAST ATTEMPT
      ===================================================== */

      if (attempt === MAX_RETRIES) {

        console.error(
          `Gemini failed after ${MAX_RETRIES} attempts.`
        );

        throw lastError;
      }


      /* =====================================================
         SMART RETRY DELAY
      ===================================================== */

      // Default delays:
      // Attempt 1 -> wait 2 seconds
      // Attempt 2 -> wait 5 seconds

      let retryDelay =
        attempt === 1
          ? 2000
          : 5000;


      /* =====================================================
         HANDLE GEMINI RETRY-AFTER
      ===================================================== */

      const retryAfter =
        error.response?.headers?.["retry-after"];


      if (retryAfter) {

        const retryAfterSeconds =
          Number(retryAfter);

        if (
          !Number.isNaN(retryAfterSeconds) &&
          retryAfterSeconds > 0
        ) {

          /*
             Do not allow Gemini to make the user
             wait an excessive amount of time.

             Maximum retry wait = 10 seconds.
          */

          retryDelay = Math.min(
            retryAfterSeconds * 1000,
            10000
          );
        }
      }


      console.log(
        `Gemini temporarily unavailable. Retrying in ${
          retryDelay / 1000
        } seconds...`
      );


      await sleep(retryDelay);
    }
  }


  throw lastError;
};


/* =========================================================
   AI CHAT CONTROLLER
========================================================= */

export const chatWithAI = async (req, res) => {

  try {

    const {
      message,
      history = [],
    } = req.body;


    /* =====================================================
       VALIDATE MESSAGE
    ===================================================== */

    if (!message || !message.trim()) {

      return res.status(400).json({
        message: "Message is required.",
      });
    }


    /* =====================================================
       CHECK GEMINI API KEY
    ===================================================== */

    if (!process.env.GEMINI_API_KEY) {

      console.error(
        "GEMINI_API_KEY is missing."
      );

      return res.status(500).json({
        message:
          "Gemini API key is missing. Please check your backend .env file.",
      });
    }


    /* =====================================================
       CHECK AUTHENTICATED USER
    ===================================================== */

    if (!req.user || !req.user._id) {

      return res.status(401).json({
        message:
          "User authentication required.",
      });
    }


    /* =====================================================
       GET USER PROFILE
    ===================================================== */

    const user =
      await User.findById(
        req.user._id
      ).lean();


    if (!user) {

      return res.status(404).json({
        message:
          "User not found.",
      });
    }


    /* =====================================================
       GET AVAILABLE JOBS
    ===================================================== */

    let jobs = [];

    try {

      jobs =
        await JobPost.find({
          isActive: true,
          approvalStatus: "Approved",
        })
          .limit(30)
          .lean();

    } catch (jobError) {

      console.error(
        "JOB FETCH ERROR:",
        jobError.message
      );

      // AI chat should still work
      // even if job fetching fails.

      jobs = [];
    }


    /* =====================================================
       USER PROFILE CONTEXT
    ===================================================== */

    const skillsText =
      Array.isArray(user.skills)
        ? user.skills.join(", ")
        : user.skills ||
          "Not provided";


    const educationText =
      Array.isArray(user.education)
        ? JSON.stringify(
            user.education
          )
        : user.education ||
          "Not provided";


    const experienceText =
      Array.isArray(user.experience)
        ? JSON.stringify(
            user.experience
          )
        : user.experience ||
          "Not provided";


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


    /* =====================================================
       JOB CONTEXT
    ===================================================== */

    let jobsContext =
      "No jobs are currently available.";


    if (jobs.length > 0) {

      jobsContext =
        jobs
          .map((job, index) => {

            const jobSkills =
              Array.isArray(job.skills)
                ? job.skills.join(", ")
                : job.skills ||
                  "Not specified";


            return `
JOB ${index + 1}

Title:
${job.title || "Not specified"}

Company:
${
  job.companyName ||
  job.company ||
  "Not specified"
}

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


    /* =====================================================
       SYSTEM INSTRUCTION
    ===================================================== */

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


    /* =====================================================
       BUILD CHAT HISTORY
    ===================================================== */

    let conversation = "";


    if (Array.isArray(history)) {

      for (const item of history) {

        if (
          !item ||
          !item.content
        ) {
          continue;
        }


        const role =
          item.role === "assistant"
            ? "AI Assistant"
            : "Candidate";


        conversation +=
          `${role}: ${String(
            item.content
          )}\n\n`;
      }
    }


    /* =====================================================
       ADD CURRENT MESSAGE
    ===================================================== */

    conversation +=
      `Candidate: ${message.trim()}`;


    /* =====================================================
       GEMINI MODEL
    ===================================================== */

    const model =
      process.env.GEMINI_MODEL ||
      "gemini-3.7-flash";


    console.log(
      `Using Gemini model: ${model}`
    );


    /* =====================================================
       CALL GEMINI WITH SMART RETRY
    ===================================================== */

    const result =
      await callGemini({
        model,
        conversation,
        systemInstruction,
      });


    /* =====================================================
       GET AI RESPONSE
    ===================================================== */

    const aiMessage =
      result?.output_text?.trim() ||

      result?.steps
        ?.filter(
          (step) =>
            step.type ===
            "model_output"
        )
        ?.flatMap(
          (step) =>
            step.content || []
        )
        ?.filter(
          (content) =>
            content.type === "text"
        )
        ?.map(
          (content) =>
            content.text
        )
        ?.join("\n")
        ?.trim();


    /* =====================================================
       EMPTY RESPONSE
    ===================================================== */

    if (!aiMessage) {

      console.error(
        "EMPTY GEMINI RESPONSE:",
        JSON.stringify(
          result,
          null,
          2
        )
      );

      return res.status(500).json({
        message:
          "Gemini returned an empty response. Please try again.",
      });
    }


    /* =====================================================
       SUCCESS
    ===================================================== */

    return res.status(200).json({
      message: aiMessage,
    });


  } catch (error) {

    console.error(
      "GEMINI AI CHAT ERROR:",
      error.response?.data ||
        error.message
    );


    const status =
      error.response?.status;


    const isTimeout =
      error.code === "ECONNABORTED" ||
      error.code === "ETIMEDOUT" ||
      error.message?.toLowerCase().includes("timeout");


    /* =====================================================
       TIMEOUT
    ===================================================== */

    if (isTimeout) {

      return res.status(504).json({
        message:
          "Gemini AI took too long to respond. Please try again.",
      });
    }


    /* =====================================================
       503
    ===================================================== */

    if (status === 503) {

      return res.status(503).json({
        message:
          "Gemini AI is temporarily busy. Please try again shortly.",
      });
    }


    /* =====================================================
       429
    ===================================================== */

    if (status === 429) {

      return res.status(429).json({
        message:
          "Gemini request limit was reached. Please wait a little before sending another message.",
      });
    }


    /* =====================================================
       401 / 403
    ===================================================== */

    if (
      status === 401 ||
      status === 403
    ) {

      return res.status(status).json({
        message:
          "Gemini API key is invalid or does not have access to this model.",
      });
    }


    /* =====================================================
       OTHER ERRORS
    ===================================================== */

    return res.status(500).json({
      message:
        error.response?.data?.error?.message ||
        "AI service failed. Please try again.",
    });
  }
};

