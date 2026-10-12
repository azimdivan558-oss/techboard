import { useEffect, useState } from "react";
import { api } from "../../services/api";

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load applications
  const loadApplications = async () => {
    try {
      setLoading(true);

      const response = await api.get("/jobs/applications/me");

      setApplications(response.data.applications || []);
    } catch (error) {
      console.error("LOAD APPLICATIONS ERROR:", error);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  // Withdraw application
  const withdraw = async (id) => {
    const confirmed = window.confirm(
      "Withdraw this application? This cannot be undone."
    );

    if (!confirmed) return;

    const previousApplications = applications;

    setApplications(
      applications.filter(
        (application) => application._id !== id
      )
    );

    try {
      await api.delete(`/jobs/applications/${id}`);
    } catch (error) {
      console.error("WITHDRAW APPLICATION ERROR:", error);

      setApplications(previousApplications);

      alert(
        error.response?.data?.message ||
          "Unable to withdraw application."
      );
    }
  };

  return (
    <section className="section applications-page">

      {/* Page Header */}
      <div className="section-header">
        <div>
          <p className="eyebrow">JOB SEEKER</p>

          <h1>My Applications</h1>

          <p className="section-subtitle">
            Track and manage your job applications.
          </p>
        </div>
      </div>

      {/* Applications */}
      <div className="table applications-table">

        {loading ? (
          <div className="applications-empty">
            <i className="bi bi-hourglass-split"></i>
            <p>Loading applications...</p>
          </div>
        ) : applications.length > 0 ? (
          applications.map((application) => {
            const companyName =
              application.company?.companyName ||
              application.company?.name ||
              "Company";

            const appliedDate = application.createdAt
              ? new Date(
                  application.createdAt
                ).toLocaleDateString()
              : "N/A";

            return (
              <div
                className="row application-row"
                key={application._id}
              >

                {/* Job Details */}
                <div className="application-info">
                  <b>
                    {application.job?.title || "Job"}
                  </b>

                  <small>
                    {companyName} · {appliedDate}
                  </small>
                </div>

                {/* Status */}
                <div className="application-actions">

                  <span
                    className={`status ${
                      application.status
                        ?.toLowerCase()
                        .replace(/\s+/g, "-") || "pending"
                    }`}
                  >
                    {application.status || "Pending"}
                  </span>

                  <button
                    type="button"
                    className="icon-button"
                    title="Withdraw application"
                    aria-label="Withdraw application"
                    onClick={() =>
                      withdraw(application._id)
                    }
                  >
                    <i className="bi bi-trash3-fill"></i>
                  </button>

                </div>

              </div>
            );
          })
        ) : (
          <div className="applications-empty">
            <i className="bi bi-file-earmark-text"></i>

            <h3>No applications yet</h3>

            <p>
              You have not applied for any jobs yet.
            </p>
          </div>
        )}

      </div>

    </section>
  );
}