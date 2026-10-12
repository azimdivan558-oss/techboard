import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API, { resumeUrl } from "../../services/api";
import RecruiterCopilot from "../../components/company/RecruiterCopilot";

export default function CompanyDashboard() {

  const navigate = useNavigate();

  const [data, setData] = useState({
    stats: {
      totalJobs: 0,
      activeJobs: 0,
      totalApplications: 0,
      shortlistedApplications: 0,
    },
    jobs: [],
    recentApplications: [],
  });

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    const user =
      JSON.parse(
        localStorage.getItem("user")
      );

    if (!user) {
      navigate("/login");
      return;
    }

    if (user.role !== "company") {
      navigate("/dashboard");
      return;
    }

    loadDashboard();

  }, []);

  const loadDashboard = async () => {

    try {

      const res =
        await API.get(
          "/company/dashboard"
        );

      setData(res.data);

    } catch (error) {

      console.log(error);

    } finally {

      setLoading(false);

    }
  };

  const updateStatus = async (
    id,
    status
  ) => {

    try {

      await API.put(
        `/company/application/${id}`,
        { status }
      );

      loadDashboard();

    } catch (error) {

      alert(
        error.response?.data?.message ||
        "Failed to update"
      );

    }
  };

  const deleteJob = async (id) => {

    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this job?"
      );

    if (!confirmDelete) return;

    try {

      await API.delete(
        `/jobs/${id}`
      );

      loadDashboard();

    } catch (error) {

      alert("Unable to delete job");

    }
  };

  if (loading) {
    return (
      <div className="loading">
        Loading dashboard...
      </div>
    );
  }

  return (
    <main className="dashboard-page">

      <div className="dashboard-container">

        {/* Header */}

        <section className="welcome-card">

          <div>

            <span className="small-title">
              EMPLOYER DASHBOARD
            </span>

            <h1>
              Company Dashboard
            </h1>

            <p>
              Manage your jobs and applicants
              from one place.
            </p>

          </div>

          <div style={{display:"flex",gap:"10px",alignItems:"center",flexWrap:"wrap"}}>
            <RecruiterCopilot compact />
            <Link to="/post-job" className="primary-button">+ Post New Job</Link>
          </div>

        </section>

        {/* Stats */}

        <section className="dashboard-stats">

          <div className="dashboard-stat">

            <div className="stat-icon">
              <i className="bi bi-briefcase-fill" aria-hidden="true"></i>
            </div>

            <div>
              <strong>
                {data.stats.totalJobs}
              </strong>

              <span>
                Total Jobs
              </span>
            </div>

          </div>

          <div className="dashboard-stat">

            <div className="stat-icon">
              <i className="bi bi-check-circle-fill" aria-hidden="true"></i>
            </div>

            <div>
              <strong>
                {data.stats.activeJobs}
              </strong>

              <span>
                Active Jobs
              </span>
            </div>

          </div>

          <div className="dashboard-stat">

            <div className="stat-icon">
              <i className="bi bi-people-fill" aria-hidden="true"></i>
            </div>

            <div>
              <strong>
                {data.stats.totalApplications}
              </strong>

              <span>
                Applications
              </span>
            </div>

          </div>

          <div className="dashboard-stat">

            <div className="stat-icon">
              <i className="bi bi-star-fill" aria-hidden="true"></i>
            </div>

            <div>
              <strong>
                {data.stats.shortlistedApplications || 0}
              </strong>

              <span>
                Shortlisted
              </span>
            </div>

          </div>

        </section>

        {/* Jobs */}

        <section className="dashboard-section">

          <div className="section-header">

            <div>

              <span className="small-title">
                MANAGEMENT
              </span>

              <h2>
                Your Job Posts
              </h2>

            </div>

            <Link
              to="/post-job"
              className="secondary-button"
            >
              + Add Job
            </Link>

          </div>

          {data.jobs.length === 0 ? (

            <div className="empty">

              <h3>
                No jobs posted
              </h3>

              <p>
                Create your first job posting
                to start receiving applications.
              </p>

              <Link
                to="/post-job"
                className="primary-button"
              >
                Post a Job
              </Link>

            </div>

          ) : (

            <div className="table-container">

              <table>

                <thead>

                  <tr>

                    <th>
                      Job
                    </th>

                    <th>
                      Location
                    </th>

                    <th>
                      Type
                    </th>

                    <th>
                      Views
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {data.jobs.map(
                    (job) => (

                      <tr
                        key={job._id}
                      >

                        <td>

                          <strong>
                            {job.title}
                          </strong>

                          <small>
                            {job.category}
                          </small>

                        </td>

                        <td>
                          <i className="bi bi-geo-alt-fill" aria-hidden="true"></i> {job.location}
                        </td>

                        <td>
                          {job.jobType}
                        </td>

                        <td>
                          {job.views || 0}
                        </td>

                        <td>

                          <span
  className={
    job.approvalStatus === "Approved"
      ? "active-badge"
      : job.approvalStatus === "Rejected"
      ? "inactive-badge"
      : "pending-badge"
  }
>
  {job.approvalStatus === "Approved"
    ? "Active"
    : job.approvalStatus === "Rejected"
    ? "Rejected"
    : "Pending"}
</span>

                        </td>

                        <td>

                          <div className="table-actions">

                            <Link
                              to={`/job/${job._id}`}
                            >
                              View
                            </Link>

                            <button
                              onClick={() =>
                                deleteJob(
                                  job._id
                                )
                              }
                            >
                              Delete
                            </button>

                          </div>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>

        {/* Applications */}

        <section className="dashboard-section">

          <div className="section-header">

            <div>

              <span className="small-title">
                APPLICANTS
              </span>

              <h2>
                Recent Applications
              </h2>

            </div>

          </div>

          {data.recentApplications.length === 0 ? (

            <div className="empty">
              No applications received yet.
            </div>

          ) : (

            <div className="table-container">

              <table>

                <thead>

                  <tr>

                    <th>
                      Candidate
                    </th>

                    <th>
                      Job
                    </th>

                    <th>
                      Applied
                    </th>

                    <th>
                      Resume
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Update
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {data.recentApplications.map(
                    (application) => (

                      <tr
                        key={application._id}
                      >

                        <td>

                          <strong>
                            {application.applicant?.name}
                          </strong>

                          <small>
                            {application.applicant?.email}
                          </small>

                        </td>

                        <td>
                          {application.job?.title}
                        </td>

                        <td>
                          {new Date(
                            application.createdAt
                          ).toLocaleDateString()}
                        </td>

                        <td>
                          {(application.resume || application.applicant?.resume) ? (
                            <a
                              href={resumeUrl(application.resume || application.applicant?.resume)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <i className="bi bi-file-earmark-text-fill" aria-hidden="true"></i> View
                            </a>
                          ) : (
                            <span style={{ color: "var(--muted)" }}>—</span>
                          )}
                        </td>

                        <td>

                          <span
                            className={`status ${application.status.toLowerCase()}`}
                          >
                            {application.status}
                          </span>

                        </td>

                        <td>

                          <select
                            value={
                              application.status
                            }
                            onChange={(e) =>
                              updateStatus(
                                application._id,
                                e.target.value
                              )
                            }
                          >

                            <option>
                              Applied
                            </option>

                            <option>
                              Shortlisted
                            </option>

                            <option>
                              Interview
                            </option>

                            <option>
                              Selected
                            </option>

                            <option>
                              Rejected
                            </option>

                          </select>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>

      </div>

    </main>
  );
}