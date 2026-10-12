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

      const res =
        await API.post(
          "/auth/login",
          form
        );


      localStorage.setItem(
        "token",
        res.data.token
      );


      localStorage.setItem(
        "user",
        JSON.stringify(
          res.data.user
        )
      );

      window.dispatchEvent(new Event("auth-changed"));

      const role =
        res.data.user.role;


      if (role === "company") {

        navigate(
          "/company-dashboard"
        );

      } else if (
        role === "admin"
      ) {

        navigate(
          "/admin-dashboard"
        );

      } else {

        navigate(
          "/dashboard"
        );
      }

    } catch (err) {

      setError(
        err.response?.data?.message ||
          "Login failed"
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
            Welcome Back
          </h1>

          <p>
            Login to continue to
            TechBoard
          </p>

        </div>


        {error && (
          <div className="error-message">
            {error}
          </div>
        )}


        <GoogleButton />


        <div className="or-divider">
          <span>OR</span>
        </div>


        <form
          onSubmit={submit}
        >

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
            placeholder="Enter your password"
            value={form.password}
            onChange={handleChange}
            required
          />


          <div className="forgot-password">

            <Link
              to="/forgot-password"
            >
              Forgot Password?
            </Link>

          </div>


          <button
            type="submit"
            className="primary-button full"
            disabled={loading}
          >

            {loading
              ? "Logging in..."
              : "Login"}

          </button>

        </form>


        <p className="auth-footer">

          Don't have an account?{" "}

          <Link to="/register">
            Create Account
          </Link>

        </p>

      </div>

    </div>
  );
}