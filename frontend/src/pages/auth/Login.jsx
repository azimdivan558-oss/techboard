import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../services/api";
import GoogleButton from "../../components/GoogleButton";
import logo from "../../image/Logo.png";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Input change handler
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  // JavaScript validation + Login
  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const email = form.email.trim();
    const password = form.password;

    // 1. Email required validation
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    // 2. Email format validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    // 3. Password required validation
    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const res = await API.post("/auth/login", {
        email,
        password,
      });

      if (!res.data?.token || !res.data?.user) {
        setError("Invalid login response. Please try again.");
        return;
      }

      // Save login information
      localStorage.setItem("token", res.data.token);

      localStorage.setItem(
        "user",
        JSON.stringify(res.data.user)
      );

      window.dispatchEvent(new Event("auth-changed"));

      // Redirect according to user role
      const role = res.data.user.role;

      if (role === "company") {
        navigate("/company-dashboard", { replace: true });
      } else if (role === "admin") {
        navigate("/admin-dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-logo">
            <img src={logo} alt="TechBoard" />
          </div>

          <h1>Welcome Back</h1>

          <p>Login to continue to TechBoard</p>
        </div>

        {/* JavaScript validation / API error */}
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {/* Google Login */}
        <GoogleButton />

        <div className="or-divider">
          <span>OR</span>
        </div>

        {/* noValidate disables browser HTML validation */}
        <form onSubmit={submit} noValidate>
          <label htmlFor="email">Email Address</label>

          <input
            id="email"
            type="email"
            name="email"
            placeholder="Enter your email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            aria-invalid={Boolean(error)}
          />

          <label htmlFor="password">Password</label>

          <input
            id="password"
            type="password"
            name="password"
            placeholder="Enter your password"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
          />

          <div className="forgot-password">
            <Link to="/forgot-password">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            className="primary-button full"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* Register link */}
        <p className="auth-footer">
          Don't have an account?{" "}
          <Link to="/register">Create Account</Link>
        </p>
      </div>
    </div>
  );
}
