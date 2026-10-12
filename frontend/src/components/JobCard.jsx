import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../services/api";

export default function JobCard({ job }) {
  const [saved, setSaved] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    if (localStorage.getItem("token") && currentUser?.role === "user") {
      API.get("/jobs/saved")
        .then((r) =>
          setSaved((r.data.jobs || []).some((x) => x._id === job._id))
        )
        .catch(() => {});
    }
  }, [job._id]);

  const toggle = async () => {
    if (!localStorage.getItem("token")) {
      window.location.href = "/login";
      return;
    }

    try {
      const r = await API.put(`/jobs/${job._id}/save`);
      setSaved(r.data.saved);
    } catch (e) {
      alert(e.response?.data?.message || "Unable to save job");
    }
  };

  const hasMatchScore =
    currentUser?.role === "user" && typeof job.matchScore === "number";

  const score = hasMatchScore ? Math.max(0, Math.min(100, job.matchScore)) : 0;
  const scoreClass =
    score >= 80 ? "excellent" : score >= 60 ? "good" : score >= 40 ? "average" : "low";

  const matchLabel =
    job.matchStatus ||
    (score >= 80
      ? "Excellent Match"
      : score >= 60
      ? "Good Match"
      : score >= 40
      ? "Potential Match"
      : "Low Match");

  return (
    <article className="job-card">
      <div className="job-card-head">
        <div className="company-logo-wrap">
          <div className="company-logo">
            {(job.company?.companyName || job.company?.name || "C")[0].toUpperCase()}
          </div>
          {job.isFeatured && <span className="featured-badge">FEATURED</span>}
        </div>

        {hasMatchScore && (
          <div
            className={`resume-match ${scoreClass}`}
            title={`AI resume/profile match: ${score}%`}
            aria-label={`Resume match ${score}%`}
          >
            <div className="resume-match-ring" style={{ "--score": `${score}%` }}>
              <div className="resume-match-inner">
                <strong>{score}%</strong>
              </div>
            </div>
            <div className="resume-match-copy">
              <span>AI MATCH</span>
              <small>{matchLabel}</small>
            </div>
          </div>
        )}
      </div>

      <div className="job-card-content">
        <div className="job-title-row">
          <div className="job-title-block">
            <h3>{job.title}</h3>
            <p className="company-name">
              {job.company?.companyName || job.company?.name || "Company"}
              {job.company?.isVerified && (
                <i className="bi bi-patch-check-fill verified-icon" title="Verified company" />
              )}
            </p>
          </div>

          {currentUser?.role === "user" && (
            <button
              type="button"
              className={`job-save-button ${saved ? "saved" : ""}`}
              aria-label={saved ? "Remove from saved jobs" : "Save job"}
              onClick={toggle}
            >
              <i className={saved ? "bi bi-heart-fill" : "bi bi-heart"} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="job-meta-grid">
          <span>
            <i className="bi bi-geo-alt-fill" aria-hidden="true" />
            {job.location}
          </span>
          <span>
            <i className="bi bi-briefcase-fill" aria-hidden="true" />
            {job.jobType}
          </span>
          <span>
            <i className="bi bi-cash-stack" aria-hidden="true" />
            ₹{job.salaryMin || 0} – ₹{job.salaryMax || 0}
          </span>
          <span>
            <i className="bi bi-mortarboard-fill" aria-hidden="true" />
            {job.experience}
          </span>
        </div>

        <div className="skills">
          {job.skills?.slice(0, 4).map((s, i) => (
            <span key={i}>{s}</span>
          ))}
          {(job.skills?.length || 0) > 4 && <span className="more-skill">+{job.skills.length - 4}</span>}
        </div>

        <div className="job-card-footer">
          {job.deadline ? (
            <span className="deadline">
              <i className="bi bi-clock-history" aria-hidden="true" />
              Apply by {new Date(job.deadline).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          ) : (
            <span className="deadline open-deadline">
              <i className="bi bi-lightning-charge-fill" aria-hidden="true" />
              Applications open
            </span>
          )}

          <Link to={`/job/${job._id}`} className="view-job">
            View Job <i className="bi bi-arrow-up-right" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
