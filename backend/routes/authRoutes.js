import express from "express";

import {
  register,
  login,
  getMe,
  googleLogin,
  forgotPassword,
  verifyOTP,
  resetPassword,
} from "../controllers/auth.js";

import { protect } from "../middleware/auth.js";

const router = express.Router();

// ==========================================
// REGISTER
// ==========================================

router.post(
  "/register",
  register
);

// ==========================================
// LOGIN
// ==========================================

router.post(
  "/login",
  login
);

// ==========================================
// CURRENT USER
// ==========================================

router.get(
  "/me",
  protect,
  getMe
);

// ==========================================
// GOOGLE LOGIN
// ==========================================

router.post(
  "/google",
  googleLogin
);

// ==========================================
// FORGOT PASSWORD - SEND OTP
// ==========================================

router.post(
  "/forgot-password",
  forgotPassword
);

// ==========================================
// VERIFY OTP
// ==========================================

router.post(
  "/verify-otp",
  verifyOTP
);

// ==========================================
// RESET PASSWORD
// ==========================================

router.post(
  "/reset-password",
  resetPassword
);

export default router;

