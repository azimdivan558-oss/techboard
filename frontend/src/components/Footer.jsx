import { Link } from "react-router-dom";
import logo from "../image/Logo.png";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div>
          <img src={logo} alt="TechBoard" className="footer-logo" />
          <p>
            Find your dream job and build your professional career with
            TechBoard.
          </p>
        </div>

        <div>
          <h3>Quick Links</h3>
          <Link to="/">Home</Link>
          <Link to="/jobs">Find Jobs</Link>
          <Link to="/register">Create Account</Link>
          <Link to="/login">Login</Link>
        </div>

        <div>
          <h3>For Employers</h3>
          <Link to="/register">Post a Job</Link>
          <Link to="/company-dashboard">Employer Dashboard</Link>
          <Link to="/company-analytics">Analytics</Link>
        </div>

        <div>
          <h3>Contact</h3>
          <p><i className="bi bi-envelope"></i>ajimdiwan04570457@gmail.com</p>
          <p><i className="bi bi-telephone"></i> +91 6454099136</p>
          <p><i className="bi bi-geo-alt"></i> India</p>
        </div>
      </div>

      <div className="footer-bottom">
        © 2026 TechBoard. All rights reserved.
      </div>
    </footer>
  );
}
