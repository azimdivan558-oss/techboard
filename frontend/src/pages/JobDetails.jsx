import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../services/api";

export default function JobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // =========================================================
  // JOB STATES
  // =========================================================
  const [job, setJob] = useState(null);

  // =========================================================
  // APPLICATION STATES
  // =========================================================
  const [coverLetter, setCoverLetter] = useState("");
  const [resume, setResume] = useState(null);
  const [hasApplied, setHasApplied] = useState(false);

  // =========================================================
  // MESSAGE STATES
  // =========================================================
  const [message, setMessage] = useState("");
  const [limitReached, setLimitReached] = useState(false);

  // =========================================================
  // MEMBERSHIP STATES
  // =========================================================
  const [membershipUsage, setMembershipUsage] = useState(null);

  // =========================================================
  // REPORT STATES
  // =========================================================
  const [reportReason, setReportReason] = useState("Fake job");
  const [reportDetails, setReportDetails] = useState("");
  const [reported, setReported] = useState(false);

  // =========================================================
  // PAGE LOAD
  // =========================================================
  useEffect(() => {
    loadJob();
    checkIfApplied();
    loadMembership();
  }, [id]);

  // =========================================================
  // LOAD JOB DETAILS
  // =========================================================
  const loadJob = async () => {
    try {
      const response = await API.get(`/jobs/${id}`);

      setJob(response.data.job);
    } catch (error) {
      console.error("LOAD JOB ERROR:", error);

      setMessage(
        error.response?.data?.message ||
          "Unable to load job details."
      );
    }
  };

  // =========================================================
  // CHECK IF USER ALREADY APPLIED
  // =========================================================
  const checkIfApplied = async () => {
    const user = JSON.parse(
      localStorage.getItem("user")
    );

    if (!user || user.role !== "user") {
      return;
    }

    try {
      const response = await API.get(
        `/jobs/${id}/my-application`
      );

      if (response.data?.applied) {
        setHasApplied(true);
      }
    } catch (error) {
      console.error(
        "CHECK APPLICATION ERROR:",
        error
      );
    }
  };

  // =========================================================
  // LOAD MEMBERSHIP + APPLICATION USAGE
  // =========================================================
  const loadMembership = async () => {
    const user = JSON.parse(
      localStorage.getItem("user")
    );

    if (!user || user.role !== "user") {
      return;
    }

    try {
      // -----------------------------------------
      // GET CURRENT MEMBERSHIP
      // -----------------------------------------
      const membershipResponse = await API.get(
        "/membership/my"
      );

      const membership = membershipResponse.data;

      let membershipName =
        membership.membershipTier?.name || "Free";

      let jobLimit =
        membership.membershipTier?.jobLimit ?? 5;

      // -----------------------------------------
      // EXPIRED MEMBERSHIP = FREE
      // -----------------------------------------
      if (
        membership.membershipStatus === "expired"
      ) {
        membershipName = "Free";
        jobLimit = 5;
      }

      // -----------------------------------------
      // GET USER APPLICATIONS
      // -----------------------------------------
      const applicationsResponse = await API.get(
        "/jobs/applications/me"
      );

      const applications =
        applicationsResponse.data?.applications || [];

      const used = applications.length;

      const remaining = Math.max(
        jobLimit - used,
        0
      );

      // -----------------------------------------
      // SET MEMBERSHIP USAGE
      // -----------------------------------------
      setMembershipUsage({
        name: membershipName,
        limit: jobLimit,
        used,
        remaining,
      });

      // -----------------------------------------
      // LIMIT CHECK
      // -----------------------------------------
      if (used >= jobLimit) {
        setLimitReached(true);
      } else {
        setLimitReached(false);
      }
    } catch (error) {
      console.error(
        "LOAD MEMBERSHIP ERROR:",
        error
      );
    }
  };

  // =========================================================
  // APPLY FOR JOB
  // =========================================================
  const apply = async () => {
    const user = JSON.parse(
      localStorage.getItem("user")
    );

    // -----------------------------------------
    // LOGIN CHECK
    // -----------------------------------------
    if (!user) {
      navigate("/login");
      return;
    }

    // -----------------------------------------
    // ROLE CHECK
    // -----------------------------------------
    if (user.role !== "user") {
      setMessage(
        "Only job seekers can apply."
      );
      return;
    }

    // -----------------------------------------
    // ALREADY APPLIED CHECK
    // -----------------------------------------
    if (hasApplied) {
      setMessage(
        "You have already applied for this job."
      );
      return;
    }

    // -----------------------------------------
    // MEMBERSHIP LIMIT CHECK
    // -----------------------------------------
    if (limitReached) {
      setMessage(
        membershipUsage?.name === "Free"
          ? `You have reached your Free membership limit of ${membershipUsage.limit} job applications.`
          : `You have reached your ${membershipUsage?.name} membership limit of ${membershipUsage?.limit} job applications.`
      );

      return;
    }

    // -----------------------------------------
    // RESUME + COVER LETTER VALIDATION
    // -----------------------------------------
    if (!resume && !coverLetter.trim()) {
      setMessage(
        "Please upload your resume and write a cover letter before applying."
      );
      return;
    }

    if (!resume) {
      setMessage(
        "Please upload your resume before applying."
      );
      return;
    }

    if (!coverLetter.trim()) {
      setMessage(
        "Please write your cover letter before applying."
      );
      return;
    }

    // -----------------------------------------
    // SUBMIT APPLICATION
    // -----------------------------------------
    try {
      setMessage("");

      const formData = new FormData();

      formData.append(
        "coverLetter",
        coverLetter.trim()
      );

      formData.append(
        "resume",
        resume
      );

      const response = await API.post(
        `/jobs/${id}/apply`,
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

      // -----------------------------------------
      // UPDATE MEMBERSHIP USAGE
      // -----------------------------------------
      if (response.data?.membership) {
        setMembershipUsage(
          response.data.membership
        );

        if (
          response.data.membership.remaining <= 0
        ) {
          setLimitReached(true);
        }
      }

      // -----------------------------------------
      // SUCCESS
      // -----------------------------------------
      setMessage(
        response.data?.message ||
          "Application submitted successfully!"
      );

      setHasApplied(true);

      // -----------------------------------------
      // RESET FORM
      // -----------------------------------------
      setCoverLetter("");
      setResume(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error(
        "APPLY JOB ERROR:",
        error
      );

      const data =
        error.response?.data;

      // -----------------------------------------
      // MEMBERSHIP LIMIT REACHED
      // -----------------------------------------
      if (
        error.response?.status === 403 &&
        data?.limitReached
      ) {
        setLimitReached(true);

        if (data?.membership) {
          setMembershipUsage(
            {
              ...data.membership,
              remaining: Math.max(
                data.membership.limit -
                  data.membership.used,
                0
              ),
            }
          );
        }

        setMessage(
          data.message ||
            "You have reached your job application limit."
        );

        return;
      }

      // -----------------------------------------
      // ALREADY APPLIED
      // -----------------------------------------
      if (
        error.response?.status === 409
      ) {
        setHasApplied(true);

        setMessage(
          data?.message ||
            "You have already applied for this job."
        );

        return;
      }

      // -----------------------------------------
      // OTHER ERROR
      // -----------------------------------------
      setMessage(
        data?.message ||
          "Application failed. Please try again."
      );
    }
  };

  // =========================================================
  // REPORT JOB
  // =========================================================
  const report = async () => {
    const token =
      localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      await API.post(
        `/features/jobs/${id}/report`,
        {
          reason: reportReason,
          details: reportDetails,
        }
      );

      setReported(true);

      setMessage(
        "Job reported successfully."
      );
    } catch (error) {
      console.error(
        "REPORT JOB ERROR:",
        error
      );

      setMessage(
        error.response?.data?.message ||
          "Unable to report job."
      );
    }
  };

  // =========================================================
  // LOADING
  // =========================================================
  if (!job) {
    return (
      <div className="loading">
        Loading...
      </div>
    );
  }

  // =========================================================
  // MEMBERSHIP PROGRESS
  // =========================================================
  const usagePercentage =
    membershipUsage &&
    membershipUsage.limit > 0
      ? Math.min(
          (membershipUsage.used /
            membershipUsage.limit) *
            100,
          100
        )
      : 0;

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <main className="job-details-page">
      <div className="job-details-container">

        {/* =====================================================
            LEFT SIDE
        ====================================================== */}
        <section className="job-main">

          {/* JOB HEADER */}
          <div className="job-detail-top">
            <div className="large-company-logo">
              {(
                job.company?.companyName ||
                job.company?.name ||
                "C"
              )[0]}
            </div>

            <div>
              <h1>{job.title}</h1>

              <h3>
                {job.company?.companyName ||
                  job.company?.name}
              </h3>

              <p>
                <i
                  className="bi bi-geo-alt-fill"
                  aria-hidden="true"
                ></i>{" "}
                {job.location}
              </p>
            </div>
          </div>

          {/* JOB TAGS */}
          <div className="detail-tags">

            <span>
              <i
                className="bi bi-briefcase-fill"
                aria-hidden="true"
              ></i>{" "}
              {job.jobType}
            </span>

            <span>
              <i
                className="bi bi-cash-stack"
                aria-hidden="true"
              ></i>{" "}
              ₹{job.salaryMin} - ₹
              {job.salaryMax}
            </span>

            <span>
              <i
                className="bi bi-mortarboard-fill"
                aria-hidden="true"
              ></i>{" "}
              {job.experience}
            </span>

            <span>
              <i
                className="bi bi-eye-fill"
                aria-hidden="true"
              ></i>{" "}
              {job.views} views
            </span>

            {job.deadline && (
              <span>
                <i
                  className="bi bi-clock-fill"
                  aria-hidden="true"
                ></i>{" "}
                Deadline:{" "}
                {new Date(
                  job.deadline
                ).toLocaleDateString()}
              </span>
            )}
          </div>

          <hr />

          {/* JOB DESCRIPTION */}
          <h2>Job Description</h2>

          <p className="description">
            {job.description}
          </p>

          {/* REQUIRED SKILLS */}
          <h2>Required Skills</h2>

          <div className="skills detail-skills">
            {job.skills?.map(
              (skill, index) => (
                <span key={index}>
                  {skill}
                </span>
              )
            )}
          </div>

          {/* ABOUT COMPANY */}
          <h2>About Company</h2>

          <p>
            {job.company?.companyDescription ||
              "Company information is not available."}
          </p>
        </section>


        {/* =====================================================
            RIGHT SIDE
        ====================================================== */}
        <aside className="apply-card">

          {/* APPLY TITLE */}
          <h2>
            Apply for this Job
          </h2>


          {/* =================================================
              MESSAGE
          ================================================== */}
          {message && (
            <div
              className={
                limitReached
                  ? "membership-limit-message"
                  : hasApplied
                  ? "success-message"
                  : "application-message"
              }
            >
              <i
                className={
                  limitReached
                    ? "bi bi-exclamation-triangle-fill"
                    : hasApplied
                    ? "bi bi-check-circle-fill"
                    : "bi bi-info-circle-fill"
                }
              ></i>

              <span>
                {message}
              </span>
            </div>
          )}


          {/* =================================================
              MEMBERSHIP USAGE
          ================================================== */}
          {membershipUsage && (
            <div className="membership-usage-box">

              {/* MEMBERSHIP HEADER */}
              <div className="membership-usage-header">

                <div>
                  <small>
                    Current Membership
                  </small>

                  <strong>
                    {membershipUsage.name}
                  </strong>
                </div>

                <i className="bi bi-gem"></i>
              </div>


              {/* APPLICATION USAGE */}
              <div className="usage-text">

                <span>
                  Job applications
                </span>

                <strong>
                  {membershipUsage.used} /{" "}
                  {membershipUsage.limit}
                </strong>
              </div>


              {/* PROGRESS BAR */}
              <div className="usage-progress">
                <div
                  className="usage-progress-bar"
                  style={{
                    width: `${usagePercentage}%`,
                  }}
                ></div>
              </div>


              {/* REMAINING */}
              <p>
                {membershipUsage.remaining >
                0
                  ? `${membershipUsage.remaining} applications remaining`
                  : "Application limit reached"}
              </p>


              {/* UPGRADE BUTTON */}
              {membershipUsage.name ===
                "Free" &&
                membershipUsage.remaining <=
                  0 && (
                  <button
                    type="button"
                    className="upgrade-membership-button"
                    onClick={() =>
                      navigate(
                        "/membership"
                      )
                    }
                  >
                    <i className="bi bi-gem"></i>

                    Upgrade to Pro
                  </button>
                )}
            </div>
          )}


          {/* =================================================
              APPLICATION FORM / ALREADY APPLIED
          ================================================== */}
          {hasApplied ? (

            <div className="already-applied-box">

              <p
                style={{
                  color: "green",
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                <i
                  className="bi bi-check-circle-fill"
                  aria-hidden="true"
                ></i>{" "}
                You have already applied
                for this job.
              </p>

              <button
                type="button"
                className="primary-button full"
                disabled
              >
                Already Applied
              </button>

            </div>

          ) : (

            <>

              {/* RESUME */}
              <label htmlFor="resume">
                Resume
              </label>

              <input
                id="resume"
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(event) =>
                  setResume(
                    event.target.files?.[0] ||
                      null
                  )
                }
              />


              {/* COVER LETTER */}
              <label htmlFor="coverLetter">
                Cover Letter
              </label>

              <textarea
                id="coverLetter"
                rows="8"
                placeholder="Write your cover letter..."
                value={coverLetter}
                onChange={(event) =>
                  setCoverLetter(
                    event.target.value
                  )
                }
              />


              {/* APPLY BUTTON */}
              <button
                type="button"
                className="primary-button full"
                onClick={apply}
                disabled={limitReached}
              >
                {limitReached
                  ? "Application Limit Reached"
                  : "Apply Now"}
              </button>


              <p className="apply-note">
                Your application will be sent
                directly to the company.
              </p>

            </>
          )}


          {/* =================================================
              REPORT JOB
          ================================================== */}
          <div className="report-box">

            <h3>
              Report this job
            </h3>

            {/* REPORT REASON */}
            <select
              value={reportReason}
              onChange={(event) =>
                setReportReason(
                  event.target.value
                )
              }
              disabled={reported}
            >
              <option value="Fake job">
                Fake job
              </option>

              <option value="Fraud">
                Fraud
              </option>

              <option value="Wrong information">
                Wrong information
              </option>

              <option value="Spam">
                Spam
              </option>

              <option value="Other">
                Other
              </option>
            </select>


            {/* REPORT DETAILS */}
            <textarea
              rows="3"
              placeholder="Optional details"
              value={reportDetails}
              onChange={(event) =>
                setReportDetails(
                  event.target.value
                )
              }
              disabled={reported}
            />


            {/* REPORT BUTTON */}
            <button
              type="button"
              className="secondary-button full"
              onClick={report}
              disabled={reported}
            >
              {reported
                ? "Report Submitted"
                : "Report Job"}
            </button>

          </div>

        </aside>
      </div>
    </main>
  );
}