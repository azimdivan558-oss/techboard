import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    email: "",
    otp: "",
    password: "",
    confirmPassword: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // ==========================================
  // STEP 1 - SEND OTP
  // ==========================================

  const sendOTP = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!form.email.trim()) {
      setError("Please enter your email");
      return;
    }

    setLoading(true);

    try {
      const res = await API.post(
        "/auth/forgot-password",
        {
          email: form.email.trim(),
        }
      );

      setMessage(
        res.data?.message ||
          "OTP sent to your email"
      );

      setStep(2);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to send OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // STEP 2 - VERIFY OTP
  // ==========================================

  const verifyOTP = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!form.otp.trim()) {
      setError("Please enter the OTP");
      return;
    }

    if (form.otp.length !== 6) {
      setError("OTP must be 6 digits");
      return;
    }

    setLoading(true);

    try {
      const res = await API.post(
        "/auth/verify-otp",
        {
          email: form.email.trim(),
          otp: form.otp.trim(),
        }
      );

      setMessage(
        res.data?.message ||
          "OTP verified successfully"
      );

      setStep(3);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Invalid OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // STEP 3 - RESET PASSWORD
  // ==========================================

  const resetPassword = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (
      !form.password ||
      !form.confirmPassword
    ) {
      setError(
        "Please fill both password fields"
      );
      return;
    }

    if (form.password.length < 6) {
      setError(
        "Password must be at least 6 characters"
      );
      return;
    }

    if (
      form.password !==
      form.confirmPassword
    ) {
      setError(
        "Passwords do not match"
      );
      return;
    }

    setLoading(true);

    try {
      const res = await API.post(
        "/auth/reset-password",
        {
          email: form.email.trim(),
          password: form.password,
          confirmPassword:
            form.confirmPassword,
        }
      );

      setMessage(
        res.data?.message ||
          "Password reset successfully"
      );

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to reset password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      <div className="auth-card">

        {/* HEADER */}
        <div className="auth-header">

          <div className="auth-logo">
            TB
          </div>

          <h1>
            {step === 1
              ? "Forgot Password"
              : step === 2
              ? "Verify OTP"
              : "Create New Password"}
          </h1>

          <p>
            {step === 1
              ? "Enter your registered email to receive an OTP."
              : step === 2
              ? "Enter the 6-digit OTP sent to your Gmail."
              : "Create a new password for your account."}
          </p>

        </div>

        {/* STEP INDICATOR */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "8px",
            marginBottom: "20px",
          }}
        >
          <span
            style={{
              width: "30px",
              height: "6px",
              borderRadius: "10px",
              background:
                step >= 1
                  ? "#2563eb"
                  : "#ddd",
            }}
          />

          <span
            style={{
              width: "30px",
              height: "6px",
              borderRadius: "10px",
              background:
                step >= 2
                  ? "#2563eb"
                  : "#ddd",
            }}
          />

          <span
            style={{
              width: "30px",
              height: "6px",
              borderRadius: "10px",
              background:
                step >= 3
                  ? "#2563eb"
                  : "#ddd",
            }}
          />
        </div>

        {/* MESSAGE */}
        {message && (
          <div className="success-message">
            {message}
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* =====================================
            STEP 1
        ===================================== */}

        {step === 1 && (
          <form onSubmit={sendOTP}>

            <label>
              Email Address
            </label>

            <input
              type="email"
              name="email"
              placeholder="Enter your registered Gmail"
              value={form.email}
              onChange={handleChange}
              required
            />

            <button
              type="submit"
              className="primary-button full"
              disabled={loading}
            >
              {loading
                ? "Sending OTP..."
                : "Send OTP"}
            </button>

          </form>
        )}

        {/* =====================================
            STEP 2
        ===================================== */}

        {step === 2 && (
          <form onSubmit={verifyOTP}>

            <label>
              Enter OTP
            </label>

            <input
              type="text"
              name="otp"
              placeholder="Enter 6-digit OTP"
              value={form.otp}
              onChange={(e) => {
                const value =
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6);

                setForm({
                  ...form,
                  otp: value,
                });
              }}
              maxLength={6}
              inputMode="numeric"
              required
            />

            <p
              style={{
                fontSize: "13px",
                color: "#666",
                marginTop: "8px",
              }}
            >
              OTP sent to:
              <br />
              <strong>
                {form.email}
              </strong>
            </p>

            <button
              type="submit"
              className="primary-button full"
              disabled={loading}
            >
              {loading
                ? "Verifying..."
                : "Verify OTP"}
            </button>

            <button
              type="button"
              className="secondary-button full"
              style={{
                marginTop: "10px",
              }}
              onClick={() => {
                setStep(1);
                setMessage("");
                setError("");
              }}
            >
              Change Email
            </button>

          </form>
        )}

        {/* =====================================
            STEP 3
        ===================================== */}

        {step === 3 && (
          <form onSubmit={resetPassword}>

            <label>
              New Password
            </label>

            <input
              type="password"
              name="password"
              placeholder="Enter new password"
              value={form.password}
              onChange={handleChange}
              minLength={6}
              required
            />

            <label>
              Confirm Password
            </label>

            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm new password"
              value={form.confirmPassword}
              onChange={handleChange}
              minLength={6}
              required
            />

            <button
              type="submit"
              className="primary-button full"
              disabled={loading}
            >
              {loading
                ? "Changing Password..."
                : "Change Password"}
            </button>

          </form>
        )}

        {/* FOOTER */}
        <p className="auth-footer">

          Remember your password?{" "}

          <Link to="/login">
            Back to Login
          </Link>

        </p>

      </div>

    </div>
  );
}

