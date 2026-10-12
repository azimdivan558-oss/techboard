import express from "express";
import { cashfreeWebhook } from "../controllers/paymentController.js";

const router = express.Router();

router.post(
  "/cashfree",
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString("utf8");
    }
  }),
  cashfreeWebhook
);

export default router;
