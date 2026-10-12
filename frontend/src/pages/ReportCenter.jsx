import React, { useEffect, useMemo, useState } from "react";
import API, { SERVER_URL } from "../services/api";

const today = new Date().toISOString().slice(0, 10);

export default function ReportCenter() {
  const [type, setType] = useState("applications");

  // IMPORTANT: Empty by default = all records
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [jobId, setJobId] = useState("");
  const [status, setStatus] = useState("");

  const [jobs, setJobs] = useState([]);
  const [rows, setRows] = useState([]);

  const [loading, setLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // LOAD JOBS FOR FILTER
  // --------------------------------------------------
  useEffect(() => {
    const loadJobs = async () => {
      try {
        setJobsLoading(true);

        const res = await API.get("/reports/jobs");

        setJobs(res.data?.rows || []);
      } catch (err) {
        console.error("Jobs report error:", err);
        setJobs([]);
      } finally {
        setJobsLoading(false);
      }
    };

    loadJobs();
  }, []);

  // --------------------------------------------------
  // PARAMETERS
  // --------------------------------------------------
  const params = useMemo(() => {
    const p = {};

    if (from) {
      p.from = from;
    }

    if (to) {
      p.to = to;
    }

    if (type === "applications") {
      if (jobId) {
        p.jobId = jobId;
      }

      if (status) {
        p.status = status;
      }
    }

    return p;
  }, [type, from, to, jobId, status]);

  // --------------------------------------------------
  // LOAD REPORT
  // --------------------------------------------------
  const loadReport = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await API.get(`/reports/${type}`, {
        params,
      });

      console.log("REPORT RESPONSE:", response.data);

      setRows(response.data?.rows || []);
    } catch (err) {
      console.error("REPORT LOAD ERROR:", err);

      setRows([]);

      setError(
        err.response?.data?.message ||
          "Unable to load report. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // LOAD WHEN TYPE CHANGES
  // --------------------------------------------------
  useEffect(() => {
    loadReport();
    
  }, [type]);

  // --------------------------------------------------
  // APPLY FILTER
  // --------------------------------------------------
  const handleApplyFilters = () => {
    loadReport();
  };

  // --------------------------------------------------
  // RESET FILTER
  // --------------------------------------------------
  const resetFilters = () => {
    setFrom("");
    setTo("");
    setJobId("");
    setStatus("");

    // Load all data after reset
    setTimeout(() => {
      loadReport();
    }, 0);
  };

  // --------------------------------------------------
  // CHANGE REPORT TYPE
  // --------------------------------------------------
  const changeType = (newType) => {
    setType(newType);

    setFrom("");
    setTo("");
    setJobId("");
    setStatus("");
    setRows([]);
    setError("");
  };

  // --------------------------------------------------
  // EXPORT
  // --------------------------------------------------
  const exportReport = async (format) => {
    try {
      setError("");

      const query = new URLSearchParams();

      query.set("type", type);
      query.set("format", format);

      if (from) {
        query.set("from", from);
      }

      if (to) {
        query.set("to", to);
      }

      if (type === "applications") {
        if (jobId) {
          query.set("jobId", jobId);
        }

        if (status) {
          query.set("status", status);
        }
      }

      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken");

      const url = `${SERVER_URL}/api/reports/export?${query.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let message = "Export failed";

        try {
          const data = await response.json();
          message = data?.message || message;
        } catch {
          // Ignore JSON parse error
        }

        throw new Error(message);
      }

      const blob = await response.blob();

      const extension = format === "pdf" ? "pdf" : "xlsx";

      const fileName =
        type === "applications"
          ? `TechBoard-Application-Report.${extension}`
          : `TechBoard-Job-Report.${extension}`;

      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();

      link.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("EXPORT ERROR:", err);

      setError(err.message || "Unable to export report.");
    }
  };

  // --------------------------------------------------
  // FORMAT DATE
  // --------------------------------------------------
  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // --------------------------------------------------
  // STATS
  // --------------------------------------------------
  const totalRecords = rows.length;

  const selectedCount = rows.filter(
    (row) =>
      String(row.status || "").toLowerCase() === "selected"
  ).length;

  const pendingCount = rows.filter(
    (row) =>
      String(row.status || "").toLowerCase() === "pending"
  ).length;

  const approvedCount = rows.filter(
    (row) =>
      String(row.approvalStatus || "").toLowerCase() === "approved"
  ).length;

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <section className="report-center">
      <div className="report-hero">
        <div>
          <div className="report-eyebrow">
            TECHBOARD ANALYTICS
          </div>

          <h1>Report Center</h1>

          <p>
            Generate, filter and export detailed job and application
            reports.
          </p>
        </div>

        <div className="report-hero-icon">
          <i className="bi bi-bar-chart-line-fill"></i>
        </div>
      </div>

      {/* REPORT TYPE */}
      <div className="report-type-grid">
        <button
          type="button"
          className={`report-type-card ${
            type === "applications" ? "active" : ""
          }`}
          onClick={() => changeType("applications")}
        >
          <div className="report-type-icon">
            <i className="bi bi-people-fill"></i>
          </div>

          <div>
            <h3>Application Report</h3>

            <p>
              Candidate applications, ATS scores and statuses.
            </p>
          </div>

          {type === "applications" && (
            <span className="report-check">
              <i className="bi bi-check-lg"></i>
            </span>
          )}
        </button>

        <button
          type="button"
          className={`report-type-card ${
            type === "jobs" ? "active" : ""
          }`}
          onClick={() => changeType("jobs")}
        >
          <div className="report-type-icon">
            <i className="bi bi-briefcase-fill"></i>
          </div>

          <div>
            <h3>Job Report</h3>

            <p>
              Job posts, views, applications and selections.
            </p>
          </div>

          {type === "jobs" && (
            <span className="report-check">
              <i className="bi bi-check-lg"></i>
            </span>
          )}
        </button>
      </div>

      {/* FILTERS */}
      <div className="report-filter-card">
        <div className="filter-header">
          <div>
            <h2>
              <i className="bi bi-funnel-fill"></i>
              Filters
            </h2>

            <p>
              Select filters and click Apply Filters to update
              the report.
            </p>
          </div>

          <button
            type="button"
            className="btn-reset"
            onClick={resetFilters}
          >
            <i className="bi bi-arrow-counterclockwise"></i>
            Reset
          </button>
        </div>

        <div className="filter-grid">
          <div className="filter-field">
            <label>From Date</label>

            <input
              type="date"
              value={from}
              max={to || today}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div className="filter-field">
            <label>To Date</label>

            <input
              type="date"
              value={to}
              min={from || undefined}
              max={today}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          {type === "applications" && (
            <>
              <div className="filter-field">
                <label>Job</label>

                <select
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                >
                  <option value="">All Jobs</option>

                  {jobs.map((job) => (
                    <option
                      key={job.jobId}
                      value={job.jobId}
                    >
                      {job.title}
                    </option>
                  ))}
                </select>

                {jobsLoading && (
                  <small>Loading jobs...</small>
                )}
              </div>

              <div className="filter-field">
                <label>Status</label>

                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Shortlisted">Shortlisted</option>
                  <option value="Selected">Selected</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </>
          )}
        </div>

        <div className="filter-actions">
          <button
            type="button"
            className="btn-apply"
            onClick={handleApplyFilters}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="report-spinner"></span>
                Loading...
              </>
            ) : (
              <>
                <i className="bi bi-search"></i>
                Apply Filters
              </>
            )}
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="report-error">
          <i className="bi bi-exclamation-triangle-fill"></i>

          <div>
            <strong>Report Error</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* STAT CARDS */}
      <div className="report-stats">
        <div className="report-stat-card">
          <div className="stat-icon">
            <i className="bi bi-database-fill"></i>
          </div>

          <div>
            <span>Total Records</span>
            <strong>{totalRecords}</strong>
          </div>
        </div>

        {type === "applications" ? (
          <>
            <div className="report-stat-card">
              <div className="stat-icon">
                <i className="bi bi-check-circle-fill"></i>
              </div>

              <div>
                <span>Selected</span>
                <strong>{selectedCount}</strong>
              </div>
            </div>

            <div className="report-stat-card">
              <div className="stat-icon">
                <i className="bi bi-clock-fill"></i>
              </div>

              <div>
                <span>Pending</span>
                <strong>{pendingCount}</strong>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="report-stat-card">
              <div className="stat-icon">
                <i className="bi bi-check-circle-fill"></i>
              </div>

              <div>
                <span>Approved</span>
                <strong>{approvedCount}</strong>
              </div>
            </div>
          </>
        )}
      </div>

      {/* REPORT TABLE */}
      <div className="report-table-card">
        <div className="table-header">
          <div>
            <h2>
              {type === "applications"
                ? "Application Report"
                : "Job Report"}
            </h2>

            <p>
              {rows.length} record
              {rows.length !== 1 ? "s" : ""} found
            </p>
          </div>

          <div className="export-buttons">
            <button
              type="button"
              className="export-btn pdf"
              onClick={() => exportReport("pdf")}
              disabled={loading}
            >
              <i className="bi bi-file-earmark-pdf-fill"></i>
              PDF
            </button>

            <button
              type="button"
              className="export-btn excel"
              onClick={() => exportReport("excel")}
              disabled={loading}
            >
              <i className="bi bi-file-earmark-spreadsheet-fill"></i>
              Excel
            </button>
          </div>
        </div>

        {loading ? (
          <div className="report-loading">
            <div className="big-spinner"></div>

            <h3>Generating Report...</h3>

            <p>Please wait while we fetch the latest data.</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="report-empty">
            <div className="empty-icon">
              <i className="bi bi-inbox-fill"></i>
            </div>

            <h3>No Report Data Found</h3>

            <p>
              No records match the selected filters. Try removing
              filters or selecting a different date range.
            </p>

            <button
              type="button"
              onClick={resetFilters}
              className="btn-empty-reset"
            >
              <i className="bi bi-arrow-counterclockwise"></i>
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="professional-report-table">
              <thead>
                {type === "applications" ? (
                  <tr>
                    <th>#</th>
                    <th>Applicant</th>
                    <th>Email</th>
                    <th>Job</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>ATS</th>
                    <th>Applied</th>
                  </tr>
                ) : (
                  <tr>
                    <th>#</th>
                    <th>Job</th>
                    <th>Company</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Type</th>
                    <th>Approval</th>
                    <th>Views</th>
                    <th>Applications</th>
                    <th>Selected</th>
                  </tr>
                )}
              </thead>

              <tbody>
                {rows.map((row, index) => {
                  if (type === "applications") {
                    return (
                      <tr key={row.applicationId || index}>
                        <td>{index + 1}</td>

                        <td>
                          <div className="applicant-cell">
                            <div className="avatar">
                              {(row.applicant || "A")
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                {row.applicant || "Applicant"}
                              </strong>

                              {row.phone && (
                                <small>{row.phone}</small>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>{row.email || "-"}</td>

                        <td>
                          <strong>
                            {row.job || "Deleted Job"}
                          </strong>
                        </td>

                        <td>{row.company || "-"}</td>

                        <td>
                          <span
                            className={`status-badge status-${String(
                              row.status || "pending"
                            )
                              .toLowerCase()
                              .replace(/\s+/g, "-")}`}
                          >
                            {row.status || "Pending"}
                          </span>
                        </td>

                        <td>
                          <div className="ats-cell">
                            <strong>
                              {row.atsScore ?? 0}%
                            </strong>

                            <div className="ats-progress">
                              <span
                                style={{
                                  width: `${Math.min(
                                    Number(row.atsScore || 0),
                                    100
                                  )}%`,
                                }}
                              ></span>
                            </div>

                            <small>
                              {row.atsStatus || "Pending"}
                            </small>
                          </div>
                        </td>

                        <td>
                          {formatDate(row.appliedAt)}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={row.jobId || index}>
                      <td>{index + 1}</td>

                      <td>
                        <strong>
                          {row.title || "Untitled Job"}
                        </strong>
                      </td>

                      <td>{row.company || "-"}</td>

                      <td>{row.category || "-"}</td>

                      <td>{row.location || "-"}</td>

                      <td>{row.jobType || "-"}</td>

                      <td>
                        <span
                          className={`status-badge status-${String(
                            row.approvalStatus || "pending"
                          )
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                        >
                          {row.approvalStatus || "Pending"}
                        </span>
                      </td>

                      <td>{row.views ?? 0}</td>

                      <td>
                        <strong>
                          {row.applications ?? 0}
                        </strong>
                      </td>

                      <td>
                        <strong>
                          {row.selected ?? 0}
                        </strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}