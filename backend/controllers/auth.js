
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import PasswordResetOTP from "../models/PasswordResetOTP.js";
import nodemailer from "nodemailer";

// ==========================================
// GENERATE JWT
// ==========================================

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};


console.log("========== SMTP DEBUG ==========");
console.log("SMTP_EMAIL:", process.env.SMTP_EMAIL);
console.log(
  "SMTP_PASSWORD EXISTS:",
  !!process.env.SMTP_PASSWORD
);
console.log("================================");

// ==========================================
// EMAIL TRANSPORTER
// ==========================================

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

// ==========================================
// REGISTER
// ==========================================

export const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = "user",
    } = req.body;

    const safeRole =
      role === "company" ? "company" : "user";

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: safeRole,
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
};

// ==========================================
// LOGIN
// ==========================================

export const login = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter email and password",
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    console.log(
      "LOGIN EMAIL:",
      normalizedEmail
    );

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (user?.isBlocked) {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been blocked by the administrator",
      });
    }

    console.log(
      "USER FOUND:",
      user ? "YES" : "NO"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch =
      await user.comparePassword(password);

    console.log(
      "PASSWORD MATCH:",
      isMatch
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(
      "LOGIN ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

// ==========================================
// FORGOT PASSWORD - SEND OTP
// ==========================================

export const forgotPassword = async (
  req,
  res
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please enter your email",
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "No account found with this email",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been blocked by the administrator",
      });
    }

    // Generate 6 digit OTP
    const otp = crypto
      .randomInt(100000, 1000000)
      .toString();

    // Hash OTP before storing
    const otpHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    // OTP valid for 10 minutes
    const expiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    );

    // Delete old OTP
    await PasswordResetOTP.deleteOne({
      email: normalizedEmail,
    });

    // Save new OTP
    await PasswordResetOTP.create({
      email: normalizedEmail,
      otpHash,
      expiresAt,
      verified: false,
    });

    // Send email
    await transporter.sendMail({
      from: `"TechBoard" <${process.env.SMTP_EMAIL}>`,
      to: normalizedEmail,
      subject: "TechBoard - Password Reset OTP",
      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: auto;
          padding: 30px;
          border: 1px solid #ddd;
          border-radius: 10px;
        ">

          <h2 style="color:#2563eb;">
            TechBoard Password Reset
          </h2>

          <p>
            Hello ${user.name || "User"},
          </p>

          <p>
            We received a request to reset your TechBoard password.
          </p>

          <p>
            Your One-Time Password (OTP) is:
          </p>

          <div style="
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #2563eb;
            padding: 20px;
            text-align: center;
            background: #f3f6ff;
            border-radius: 8px;
          ">
            ${otp}
          </div>

          <p>
            This OTP is valid for
            <strong>10 minutes</strong>.
          </p>

          <p>
            If you did not request a password reset,
            you can safely ignore this email.
          </p>

          <hr />

          <p style="color:#777;font-size:13px;">
            © ${new Date().getFullYear()} TechBoard
          </p>

        </div>
      `,
    });

    console.log(
      `PASSWORD RESET OTP SENT TO: ${normalizedEmail}`
    );

    return res.status(200).json({
      success: true,
      message:
        "OTP has been sent to your registered email",
    });
  } catch (error) {
    console.error(
      "FORGOT PASSWORD ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to send OTP. Please try again.",
    });
  }
};

// ==========================================
// VERIFY OTP
// ==========================================

export const verifyOTP = async (
  req,
  res
) => {
  try {
    const {
      email,
      otp,
    } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const record =
      await PasswordResetOTP.findOne({
        email: normalizedEmail,
      });

    if (!record) {
      return res.status(400).json({
        success: false,
        message:
          "OTP not found. Please request a new OTP.",
      });
    }

    if (
      new Date(record.expiresAt) < new Date()
    ) {
      await PasswordResetOTP.deleteOne({
        email: normalizedEmail,
      });

      return res.status(400).json({
        success: false,
        message:
          "OTP has expired. Please request a new OTP.",
      });
    }

    if (record.verified) {
      return res.status(400).json({
        success: false,
        message: "OTP has already been verified",
      });
    }

    const otpHash = crypto
      .createHash("sha256")
      .update(otp.toString())
      .digest("hex");

    if (otpHash !== record.otpHash) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    record.verified = true;

    await record.save();

    return res.status(200).json({
      success: true,
      message:
        "OTP verified successfully",
    });
  } catch (error) {
    console.error(
      "VERIFY OTP ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to verify OTP",
    });
  }
};

// ==========================================
// RESET PASSWORD
// ==========================================

export const resetPassword = async (
  req,
  res
) => {
  try {
    const {
      email,
      password,
      confirmPassword,
    } = req.body;

    if (
      !email ||
      !password ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please fill all password fields",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Passwords do not match",
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const record =
      await PasswordResetOTP.findOne({
        email: normalizedEmail,
      });

    if (!record) {
      return res.status(400).json({
        success: false,
        message:
          "Password reset session not found. Please request a new OTP.",
      });
    }

    if (!record.verified) {
      return res.status(403).json({
        success: false,
        message:
          "Please verify the OTP first",
      });
    }

    if (
      new Date(record.expiresAt) < new Date()
    ) {
      await PasswordResetOTP.deleteOne({
        email: normalizedEmail,
      });

      return res.status(400).json({
        success: false,
        message:
          "OTP session expired. Please request a new OTP.",
      });
    }

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "No account found with this email",
      });
    }

    // User.js pre-save middleware hashes password
    user.password = password;

    await user.save();

    // OTP can no longer be reused
    await PasswordResetOTP.deleteOne({
      email: normalizedEmail,
    });

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. You can now login.",
    });
  } catch (error) {
    console.error(
      "RESET PASSWORD ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to reset password",
    });
  }
};

// ==========================================
// GET CURRENT USER
// ==========================================

export const getMe = async (
  req,
  res
) => {
  try {
    const user =
      await User.findById(
        req.user.id
      ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(
      "GET ME ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to get user",
    });
  }
};

// ==========================================
// GOOGLE LOGIN
// ==========================================

export const googleLogin = async (
  req,
  res
) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message:
          "Google credential is required",
      });
    }

    const { OAuth2Client } =
      await import("google-auth-library");

    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID
    );

    const ticket =
      await client.verifyIdToken({
        idToken: credential,
        audience:
          process.env.GOOGLE_CLIENT_ID,
      });

    const payload =
      ticket.getPayload();

    if (!payload?.email) {
      return res.status(400).json({
        success: false,
        message:
          "Google account email is required",
      });
    }

    const normalizedEmail =
      payload.email.toLowerCase();

    let user =
      await User.findOne({
        email: normalizedEmail,
      });

    if (user?.isBlocked) {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been blocked by the administrator",
      });
    }

    if (!user) {
      user = await User.create({
        name:
          payload.name ||
          "Google User",
        email: normalizedEmail,
        password:
          crypto.randomBytes(32).toString("hex"),
        role: "user",
        googleId: payload.sub,
      });
    } else if (!user.googleId) {
      user.googleId = payload.sub;
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message:
        "Google login successful",
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(
      "GOOGLE LOGIN ERROR:",
      error
    );

    return res.status(401).json({
      success: false,
      message:
        "Google login failed or credential is invalid",
    });
  }
};

