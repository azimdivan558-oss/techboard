import express from "express";
import { protect } from "../middleware/auth.js";
import {
  createCashfreeOrder,
  getCashfreePaymentStatus
} from "../controllers/paymentController.js";

const router = express.Router();

router.post("/create-order", protect, createCashfreeOrder);
router.get("/status/:orderId", protect, getCashfreePaymentStatus);

export default router;
