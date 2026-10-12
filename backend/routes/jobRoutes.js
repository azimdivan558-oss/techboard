import express from "express";
import {
  createJob,
  getJobs,
  getJob,
  getPlatformStats,
  updateJob,
  deleteJob,
  applyJob,
  getMyApplications,
  getMyApplication,
  withdrawApplication,
  saveJob,
  getSavedJobs,
} from "../controllers/jobs.js";
import { protect, authorize, optionalProtect } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.get("/stats", getPlatformStats);
router.get("/", optionalProtect, getJobs);
router.get("/applications/me", protect, authorize("user"), getMyApplications);
router.delete("/applications/:id", protect, authorize("user"), withdrawApplication);
router.get("/saved", protect, authorize("user"), getSavedJobs);
router.post("/", protect, authorize("company"), createJob);
router.post("/:id/apply", protect, authorize("user"), upload.single("resume"), applyJob);
router.get("/:id/my-application", protect, authorize("user"), getMyApplication);
router.put("/:id/save", protect, authorize("user"), saveJob);
router.put("/:id", protect, authorize("company"), updateJob);
router.delete("/:id", protect, authorize("company"), deleteJob);
router.get("/:id", getJob);

export default router;
