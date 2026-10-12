import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../services/api";
import logo from "../../image/Logo.png";

export default function Register() {

  const navigate =
    useNavigate();


  const [form, setForm] =
    useState({
      name: "",
      email: "",
      password: "",
      role: "user",
    });


  const [error, setError] =
    useState("");


  const [loading, setLoading] =
    useState(false);


  const handleChange = (e) => {

    setForm({
      ...form,
      [e.target.name]:
        e.target.value,
    });
  };


  const submit = async (e) => {

    e.preventDefault();

    setError("");
    setLoading(true);

    try {

      await API.post(
        "/auth/register",
        form
      );


      // Registration successful
      // Go to login page

      navigate("/login");

    } catch (err) {

      setError(
        err.response?.data?.message ||
          "Registration failed"
      );

    } finally {

      setLoading(false);
    }
  };


  return (
    <div className="auth-page">

      <div className="auth-card">

        <div className="auth-header">

          <div className="auth-logo">
            <img src={logo} alt="TechBoard" />
          </div>

          <h1>
            Create Account
          </h1>

          <p>
            Join TechBoard today
          </p>

        </div>


        {error && (
          <div className="error-message">
            {error}
          </div>
        )}


        <form
          onSubmit={submit}
        >

          <label>
            Full Name
          </label>

          <input
            name="name"
            placeholder="Enter your full name"
            value={form.name}
            onChange={handleChange}
            required
          />


          <label>
            Email Address
          </label>

          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            value={form.email}
            onChange={handleChange}
            required
          />


          <label>
            Password
          </label>

          <input
            type="password"
            name="password"
            placeholder="Create password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={6}
          />


          <label>
            Account Type
          </label>

          <select
            name="role"
            value={form.role}
            onChange={handleChange}
          >

            <option value="user">
              Job Seeker
            </option>

            <option value="company">
              Recruiter / Company
            </option>

          </select>


          <button
            type="submit"
            className="primary-button full"
            disabled={loading}
          >

            {loading
              ? "Creating..."
              : "Create Account"}

          </button>

        </form>


        <p className="auth-footer">

          Already have an account?{" "}

          <Link to="/login">
            Login
          </Link>

        </p>

      </div>

    </div>
  );
}