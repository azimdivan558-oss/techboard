import express from "express";
import {
  companyDashboard,
  updateApplicationStatus,
  updateCompanyProfile,
  analytics,
  getCompanyApplications,
  analyzeJobMatch,
  downloadApplicationResume,
} from "../controllers/companyController.js";

import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.get(
  "/dashboard",
  protect,
  authorize("company"),
  companyDashboard
);

router.get("/analytics", protect, authorize("company"), analytics);
router.get("/applications", protect, authorize("company"), getCompanyApplications);
router.get("/application/:id/resume", protect, authorize("company"), downloadApplicationResume);
router.post("/application/:id/job-match", protect, authorize("company"), analyzeJobMatch);

router.put(
  "/profile",
  protect,
  authorize("company"),
  updateCompanyProfile
);

router.put(
  "/application/:id",
  protect,
  authorize("company"),
  updateApplicationStatus
);

export default router;