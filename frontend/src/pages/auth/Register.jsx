import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../services/api";
import logo from "../../image/Logo.png";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) setError("");
    if (success) setSuccess("");
  };

  // JavaScript validation + registration
  const submit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const name = form.name.trim();
    const email = form.email.trim();
    const password = form.password;
    const role = form.role;

    // 1. Name validation
    if (!name) {
      setError("Please enter your full name.");
      return;
    }

    if (name.length < 2) {
      setError("Name must contain at least 2 characters.");
      return;
    }

    // 2. Email required validation
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    // 3. Email format validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    // 4. Password required validation
    if (!password.trim()) {
      setError("Please create a password.");
      return;
    }

    // 5. Password length validation
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    // 6. Account type validation
    if (!["user", "company"].includes(role)) {
      setError("Please select a valid account type.");
      return;
    }

    setLoading(true);

    try {
      await API.post("/auth/register", {
        name,
        email,
        password,
        role,
      });

      setSuccess("Account created successfully! Redirecting to login...");

      // Redirect to login after successful registration
      navigate("/login", {
        replace: true,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Registration failed. Please try again."
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

          <h1>Create Account</h1>

          <p>Join TechBoard today</p>
        </div>

        {/* JavaScript validation error */}
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message" role="status">
            {success}
          </div>
        )}

        {/* Disable browser HTML validation */}
        <form onSubmit={submit} noValidate>
          <label htmlFor="name">Full Name</label>

          <input
            id="name"
            type="text"
            name="name"
            placeholder="Enter your full name"
            value={form.name}
            onChange={handleChange}
            autoComplete="name"
          />

          <label htmlFor="email">Email Address</label>

          <input
            id="email"
            type="email"
            name="email"
            placeholder="Enter your email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
          />

          <label htmlFor="password">Password</label>

          <input
            id="password"
            type="password"
            name="password"
            placeholder="Create password"
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
          />

          <label htmlFor="role">Account Type</label>

          <select
            id="role"
            name="role"
            value={form.role}
            onChange={handleChange}
          >
            <option value="user">Job Seeker</option>
            <option value="company">Recruiter / Company</option>
          </select>

          <button
            type="submit"
            className="primary-button full"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
