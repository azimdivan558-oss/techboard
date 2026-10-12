import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import { recruiterCopilotChat, copilotOverview, topCandidates, compareCandidates, generateInterviewQuestions, copilotSessions } from "../controllers/recruiterCopilotController.js";

const router = express.Router();
const companyOnly = [protect, authorize("company")];

router.get("/overview", ...companyOnly, copilotOverview);
router.get("/sessions", ...companyOnly, copilotSessions);
router.get("/top-candidates/:jobId", ...companyOnly, topCandidates);
router.post("/chat", ...companyOnly, recruiterCopilotChat);
router.post("/compare", ...companyOnly, compareCandidates);
router.post("/interview-questions/:applicationId", ...companyOnly, generateInterviewQuestions);

export default router;
