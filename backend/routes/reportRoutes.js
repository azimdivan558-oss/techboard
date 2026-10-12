import express from "express";

import {
  protect,
  authorize,
} from "../middleware/auth.js";

import {
  reportJobs,
  reportApplications,
  exportReport,
} from "../controllers/reportController.js";

const router = express.Router();

router.get(
  "/jobs",
  protect,
  authorize("admin", "company"),
  reportJobs
);

router.get(
  "/applications",
  protect,
  authorize("admin", "company"),
  reportApplications
);

router.get(
  "/export",
  protect,
  authorize("admin", "company"),
  exportReport
);

export default router;