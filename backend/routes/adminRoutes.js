import express from "express";
import {
  adminDashboard,
  getAllUsers,
  blockUser,
  deleteUser,
  getPendingJobs,
  updateJobApproval,
  verifyCompany,
  getAdminActivities,
} from "../controllers/adminController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.get("/dashboard", protect, authorize("admin"), adminDashboard);
router.get("/users", protect, authorize("admin"), getAllUsers);
router.put("/users/:id/block", protect, authorize("admin"), blockUser);
router.delete("/users/:id", protect, authorize("admin"), deleteUser);
router.get("/jobs/pending", protect, authorize("admin"), getPendingJobs);
router.put("/jobs/:id/approval", protect, authorize("admin"), updateJobApproval);
router.put("/companies/:id/verify", protect, authorize("admin"), verifyCompany);
router.get("/activities", protect, authorize("admin"), getAdminActivities);

export default router;
