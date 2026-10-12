import JobPost from "../models/JobPost.js";
import JobApplication from "../models/JobApplication.js";
import RecruiterCopilotSession from "../models/RecruiterCopilotSession.js";
import { callGemini } from "./aiController.js";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.7-flash";

const cleanNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

const recruiterScore = (app) => {
  const match = cleanNumber(app.jobMatchScore);
  const ats = cleanNumber(app.atsScore);
  const skills = cleanNumber(app.jobMatchBreakdown?.skills || (app.matchedSkills?.length ? Math.min(100, app.matchedSkills.length * 20) : 0));
  const experience = cleanNumber(app.jobMatchBreakdown?.experience);
  return Math.round((match * 0.5 + ats * 0.2 + skills * 0.2 + experience * 0.1) * 10) / 10;
};

const candidateView = (app) => ({
  applicationId: app._id,
  name: app.applicant?.name || "Unknown candidate",
  email: app.applicant?.email || "",
  skills: app.applicant?.skills || [],
  experience: app.applicant?.experience || "",
  job: app.job ? { id: app.job._id, title: app.job.title, skills: app.job.skills || [], experience: app.job.experience || "" } : null,
  status: app.status,
  jobMatchScore: cleanNumber(app.jobMatchScore),
  atsScore: cleanNumber(app.atsScore),
  matchedSkills: app.matchedSkills || [],
  missingSkills: app.missingSkills || [],
  breakdown: app.jobMatchBreakdown || {},
  recruiterScore: recruiterScore(app),
});

const getApplications = async (companyId, jobId = null) => {
  const query = { company: companyId };
  if (jobId) query.job = jobId;
  return JobApplication.find(query)
    .populate("applicant", "name email skills experience")
    .populate("job", "title skills experience description location jobType")
    .sort({ jobMatchScore: -1, atsScore: -1, createdAt: -1 })
    .lean();
};

const aiText = (result) => result?.output_text?.trim() || result?.steps?.filter(s => s.type === "model_output")?.flatMap(s => s.content || [])?.filter(c => c.type === "text")?.map(c => c.text)?.join("\n")?.trim() || "";

const fallbackChat = (message, candidates) => {
  const q = message.toLowerCase();
  if (q.includes("top") || q.includes("best") || q.includes("rank") || q.includes("shortlist")) {
    return `Top candidates based on the existing job-match, ATS, skill and experience data:\n\n${candidates.slice(0, 5).map((c, i) => `${i + 1}. ${c.name} — Recruiter Score ${c.recruiterScore}/100 | Job Match ${c.jobMatchScore}% | ATS ${c.atsScore}%`).join("\n")}`;
  }
  return "I can rank candidates, compare applicants, explain match scores, find candidates by skills, and generate interview questions. Try: “Rank the top candidates for this job.”";
};

export const copilotOverview = async (req, res) => {
  try {
    const company = req.user._id;
    const [jobs, applications] = await Promise.all([
      JobPost.find({ company }).select("title skills experience isActive approvalStatus").sort({ createdAt: -1 }).lean(),
      getApplications(company),
    ]);
    const candidates = applications.map(candidateView).sort((a, b) => b.recruiterScore - a.recruiterScore);
    res.json({ success: true, overview: { jobs, totalApplications: candidates.length, shortlisted: candidates.filter(c => c.status === "Shortlisted").length, interviews: candidates.filter(c => c.status === "Interview").length, topCandidates: candidates.slice(0, 5) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const topCandidates = async (req, res) => {
  try {
    const job = await JobPost.findOne({ _id: req.params.jobId, company: req.user._id }).lean();
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });
    const applications = await getApplications(req.user._id, job._id);
    res.json({ success: true, job, candidates: applications.map(candidateView).sort((a, b) => b.recruiterScore - a.recruiterScore) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const compareCandidates = async (req, res) => {
  try {
    const ids = Array.isArray(req.body.applicationIds) ? req.body.applicationIds.slice(0, 4) : [];
    if (ids.length < 2) return res.status(400).json({ success: false, message: "Select at least two candidates" });
    const applications = await JobApplication.find({ _id: { $in: ids }, company: req.user._id }).populate("applicant", "name email skills experience").populate("job", "title skills experience").lean();
    const candidates = applications.map(candidateView).sort((a, b) => b.recruiterScore - a.recruiterScore);
    res.json({ success: true, candidates, recommendation: candidates[0] ? `${candidates[0].name} has the highest overall recruiter score at ${candidates[0].recruiterScore}/100.` : "No candidates found." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const generateInterviewQuestions = async (req, res) => {
  try {
    const app = await JobApplication.findOne({ _id: req.params.applicationId, company: req.user._id }).populate("applicant", "name skills experience").populate("job", "title skills experience description").lean();
    if (!app) return res.status(404).json({ success: false, message: "Application not found" });
    if (!process.env.GEMINI_API_KEY) return res.json({ success: true, questions: ["Tell us about your most relevant project for this role.", "Explain your experience with the main required technologies.", "Describe a difficult technical problem you solved.", "How would you improve the solution if you had more time?", "What would you do in your first 30 days in this role?"] });
    const prompt = `Candidate: ${app.applicant?.name}\nSkills: ${(app.applicant?.skills || []).join(", ")}\nExperience: ${app.applicant?.experience || "Not provided"}\nJob: ${app.job?.title}\nRequired skills: ${(app.job?.skills || []).join(", ")}\nJob description: ${app.job?.description || ""}`;
    const result = await callGemini({ model: MODEL, conversation: prompt, systemInstruction: "You are a professional recruiter assistant. Generate exactly 8 tailored interview questions for the candidate and job. Return a numbered list only. Do not invent candidate experience." });
    res.json({ success: true, questionsText: aiText(result) || "Unable to generate questions." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.response?.data?.error?.message || error.message });
  }
};

export const recruiterCopilotChat = async (req, res) => {
  try {
    const message = String(req.body.message || "").trim();
    if (!message) return res.status(400).json({ success: false, message: "Message is required" });

    const applications = await getApplications(req.user._id, req.body.jobId || null);
    const candidates = applications.map(candidateView).sort((a, b) => b.recruiterScore - a.recruiterScore);
    const jobs = await JobPost.find({ company: req.user._id }).select("title skills experience description").sort({ createdAt: -1 }).limit(20).lean();

    let reply = "";
    if (process.env.GEMINI_API_KEY) {
      const context = JSON.stringify({ jobs, candidates: candidates.slice(0, 60) });
      const result = await callGemini({ model: MODEL, conversation: `Recruiter request: ${message}\n\nCompany recruitment data:\n${context}`, systemInstruction: "You are TechBoard AI Recruiter Copilot. Help a recruiter rank, compare, search and understand candidates. Use only supplied data. Never invent qualifications. Never use protected or sensitive attributes for recommendations. Explain recommendations using job match, ATS, skills, experience and application status. Keep answers concise and actionable." });
      reply = aiText(result);
    }
    if (!reply) reply = fallbackChat(message, candidates);

    let session = null;
    if (req.body.sessionId) session = await RecruiterCopilotSession.findOne({ _id: req.body.sessionId, company: req.user._id });
    if (!session) session = await RecruiterCopilotSession.create({ company: req.user._id, title: message.slice(0, 70), messages: [] });
    session.messages.push({ role: "user", content: message }, { role: "assistant", content: reply });
    await session.save();

    res.json({ success: true, message: reply, sessionId: session._id, topCandidates: candidates.slice(0, 5) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.response?.data?.error?.message || error.message });
  }
};

export const copilotSessions = async (req, res) => {
  try {
    const sessions = await RecruiterCopilotSession.find({ company: req.user._id }).select("title updatedAt createdAt").sort({ updatedAt: -1 }).limit(20).lean();
    res.json({ success: true, sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
