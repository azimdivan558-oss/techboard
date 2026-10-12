import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../services/api";

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    const storedUser = JSON.parse(
      localStorage.getItem("user")
    );

    if (!storedUser) {
      navigate("/login");
      return;
    }

    setUser(storedUser);

    if (storedUser.role === "company") {
      navigate("/company-dashboard");
    }

    if (storedUser.role === "admin") {
      navigate("/admin-dashboard");
    }

    if (storedUser.role === "user") {
      loadApplications();
    }
  }, []);

  const loadApplications = async () => {
    try {
      const res = await API.get(
        "/jobs/applications/me"
      );

      setApplications(
        res.data.applications || []
      );
    } catch (error) {
      console.log(error);
    }
  };

  if (!user) {
    return (
      <div className="loading">
        Loading...
      </div>
    );
  }

  return (
    <main className="dashboard-page">

      <div className="dashboard-container">

        {/* Welcome */}
        <section className="welcome-card">

          <div>
            <span className="small-title">
              JOB SEEKER DASHBOARD
            </span>

            <h1>
              Welcome, {user.name}
            </h1>

            <p>
              Manage your applications and
              discover new career opportunities.
            </p>
          </div>

          <Link
            to="/jobs"
            className="primary-button"
          >
            Find Jobs
          </Link>

        </section>

        {/* Statistics */}
        <section className="dashboard-stats">

          <div className="dashboard-stat">
            <div className="stat-icon">
              <i className="bi bi-file-earmark-text-fill" aria-hidden="true"></i>
            </div>

            <div>
              <strong>
                {applications.length}
              </strong>

              <span>
                Applications
              </span>
            </div>
          </div>

          <div className="dashboard-stat">
            <div className="stat-icon">
              <i className="bi bi-hourglass-split" aria-hidden="true"></i>
            </div>

            <div>
              <strong>
                {
                  applications.filter(
                    (a) =>
                      a.status === "Applied"
                  ).length
                }
              </strong>

              <span>
                Pending
              </span>
            </div>
          </div>

          <div className="dashboard-stat">
            <div className="stat-icon">
              <i className="bi bi-star-fill" aria-hidden="true"></i>
            </div>

            <div>
              <strong>
                {
                  applications.filter(
                    (a) =>
                      a.status ===
                      "Shortlisted"
                  ).length
                }
              </strong>

              <span>
                Shortlisted
              </span>
            </div>
          </div>

          <div className="dashboard-stat">
            <div className="stat-icon">
              <i className="bi bi-check-circle-fill" aria-hidden="true"></i>
            </div>

            <div>
              <strong>
                {
                  applications.filter(
                    (a) =>
                      a.status ===
                      "Selected"
                  ).length
                }
              </strong>

              <span>
                Selected
              </span>
            </div>
          </div>

        </section>

        {/* Quick Actions */}
        <section className="quick-actions">

          <div className="section-header">
            <div>
              <span className="small-title">
                QUICK ACCESS
              </span>

              <h2>
                What would you like to do?
              </h2>
            </div>
          </div>

          <div className="action-grid">

            <Link
              to="/jobs"
              className="action-card"
            >
              <div className="action-icon">
                <i className="bi bi-search" aria-hidden="true"></i>
              </div>

              <h3>
                Find Jobs
              </h3>

              <p>
                Search for your dream job.
              </p>
            </Link>

            <Link
              to="/my-applications"
              className="action-card"
            >
              <div className="action-icon">
                <i className="bi bi-clipboard-check-fill" aria-hidden="true"></i>
              </div>

              <h3>
                My Applications
              </h3>

              <p>
                Track your application status.
              </p>
            </Link>

            <Link to="/profile" className="action-card">
              <div className="action-icon">
                <i className="bi bi-person-circle" aria-hidden="true"></i>
              </div>

              <h3>
                My Profile
              </h3>

              <p>
                Update your professional profile.
              </p>
            </Link>

          </div>

        </section>

        {/* Recent Applications */}
        <section className="section">

          <div className="section-header">

            <div>
              <span className="small-title">
                ACTIVITY
              </span>

              <h2>
                Recent Applications
              </h2>
            </div>

            <Link to="/my-applications">
              View All →
            </Link>

          </div>

          {applications.length === 0 ? (

            <div className="empty">
              <h3>
                No applications yet
              </h3>

              <p>
                Start exploring jobs and
                apply for your next opportunity.
              </p>

              <Link
                to="/jobs"
                className="primary-button"
              >
                Browse Jobs
              </Link>
            </div>

          ) : (

            <div className="applications-list">

              {applications
                .slice(0, 5)
                .map((application) => (

                  <div
                    className="application-card"
                    key={application._id}
                  >

                    <div className="application-company-logo">
                      {(application.company
                        ?.companyName ||
                        application.company?.name ||
                        "C")[0].toUpperCase()}
                    </div>

                    <div className="application-info">

                      <h3>
                        {application.job?.title}
                      </h3>

                      <p>
                        {application.company
                          ?.companyName ||
                          application.company?.name}
                      </p>

                      <small>
                        Applied on{" "}
                        {new Date(
                          application.createdAt
                        ).toLocaleDateString()}
                      </small>

                    </div>

                    <span
                      className={`status ${application.status.toLowerCase()}`}
                    >
                      {application.status}
                    </span>

                  </div>

                ))}

            </div>

          )}

        </section>

      </div>

    </main>
  );
}