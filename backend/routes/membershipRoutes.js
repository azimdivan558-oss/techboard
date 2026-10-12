import express from "express";

import {
  getMembershipTiers,
  getMyMembership,
  activateMembership,
  demoPayment
} from "../controllers/membershipController.js";

import { protect } from "../middleware/auth.js";

const router = express.Router();

console.log("✅ MEMBERSHIP ROUTES LOADED");

router.get("/tiers", getMembershipTiers);

router.get("/my", protect, getMyMembership);

router.post("/activate", protect, activateMembership);

router.post("/demo-payment", protect, demoPayment);

export default router;