import { useEffect, useMemo, useRef, useState } from "react";
import API, { resumeUrl } from "../../services/api";
import RecruiterCopilot from "../../components/company/RecruiterCopilot";

import { createWorker } from "tesseract.js";
import JSZip from "jszip";

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.min.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const STATUS_OPTIONS = [
  "Applied",
  "Shortlisted",
  "Interview",
  "Selected",
  "Rejected",
];

const statusClass = (status = "") =>
  String(status).toLowerCase().replace(/\s+/g, "-");

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState("");
  const [scheduling, setScheduling] = useState("");
  const [analyzing, setAnalyzing] = useState("");

  const [analysisMessage, setAnalysisMessage] = useState("");

  const ocrWorkerRef = useRef(null);

  // =========================================================
  // LOAD APPLICATIONS
  // =========================================================

  const load = async () => {
    try {
      setLoading(true);

      const response = await API.get("/company/applications");

      console.log(
        "📋 COMPANY APPLICATIONS:",
        response.data?.applications
      );

      setApplications(response.data?.applications || []);
    } catch (error) {
      console.error("❌ LOAD APPLICATIONS ERROR:", error);

      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // =========================================================
  // COUNTS
  // =========================================================

  const counts = useMemo(
    () => ({
      total: applications.length,

      shortlisted: applications.filter(
        (x) => x.status === "Shortlisted"
      ).length,

      interviews: applications.filter(
        (x) => x.status === "Interview"
      ).length,

      selected: applications.filter(
        (x) => x.status === "Selected"
      ).length,
    }),
    [applications]
  );

  // =========================================================
  // FILTER
  // =========================================================

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return applications.filter((x) => {
      const name = x.applicant?.name || "";
      const email = x.applicant?.email || "";
      const job = x.job?.title || "";

      const matchesSearch =
        !q ||
        name.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        job.toLowerCase().includes(q);

      const matchesStatus =
        filter === "All" || x.status === filter;

      return matchesSearch && matchesStatus;
    });
  }, [applications, search, filter]);

  // =========================================================
  // PDF TEXT + BROWSER OCR
  // =========================================================

  const extractPdfTextAndOcr = async (buffer) => {
    try {
      setAnalysisMessage("Reading resume PDF...");

      const pdf = await pdfjsLib
        .getDocument({
          data: buffer,
          disableWorker: true,
        })
        .promise;

      console.log("📄 PDF PAGES:", pdf.numPages);

      const textPages = [];

      // -------------------------------------------------------
      // STEP 1: NORMAL PDF TEXT EXTRACTION
      // -------------------------------------------------------

      for (
        let pageNumber = 1;
        pageNumber <= Math.min(pdf.numPages, 8);
        pageNumber += 1
      ) {
        const page = await pdf.getPage(pageNumber);

        const content = await page.getTextContent();

        const pageText = content.items
          .map((item) => item.str || "")
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        if (pageText) {
          textPages.push(pageText);
        }
      }

      const embeddedText = textPages
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      console.log(
        "📄 NORMAL PDF TEXT LENGTH:",
        embeddedText.length
      );

      // -------------------------------------------------------
      // IF NORMAL TEXT EXISTS, DON'T USE OCR
      // -------------------------------------------------------

      if (embeddedText.length >= 80) {
        console.log(
          "✅ NORMAL PDF TEXT EXTRACTION SUCCESS"
        );

        return {
          text: embeddedText,
          method: "browser-pdf-text",
        };
      }

      // -------------------------------------------------------
      // STEP 2: BROWSER OCR
      // -------------------------------------------------------

      console.log(
        "⚠️ PDF appears scanned. Starting browser OCR..."
      );

      setAnalysisMessage(
        "Scanned PDF detected. Starting browser OCR..."
      );

      if (!ocrWorkerRef.current) {
        console.log("🔧 Creating Tesseract OCR worker...");

        ocrWorkerRef.current = await createWorker("eng", 1, {
          logger: (info) => {
            if (
              info.status &&
              typeof info.progress === "number"
            ) {
              const percent = Math.round(
                info.progress * 100
              );

              setAnalysisMessage(
                `OCR ${info.status}... ${percent}%`
              );
            }
          },
        });

        console.log("✅ Tesseract OCR worker ready");
      }

      const pages = [];

      const totalPages = Math.min(pdf.numPages, 8);

      // -------------------------------------------------------
      // OCR EACH PAGE
      // -------------------------------------------------------

      for (
        let pageNumber = 1;
        pageNumber <= totalPages;
        pageNumber += 1
      ) {
        setAnalysisMessage(
          `Scanning resume page ${pageNumber} of ${totalPages}...`
        );

        console.log(
          `🔍 OCR PAGE ${pageNumber}/${totalPages}`
        );

        const page = await pdf.getPage(pageNumber);

        const viewport = page.getViewport({
          scale: 2,
        });

        const canvas = document.createElement("canvas");

        const context = canvas.getContext("2d", {
          willReadFrequently: true,
        });

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        const result =
          await ocrWorkerRef.current.recognize(canvas);

        const pageText = result?.data?.text || "";

        console.log(
          `📝 OCR PAGE ${pageNumber} TEXT LENGTH:`,
          pageText.length
        );

        if (pageText.trim()) {
          pages.push(pageText);
        }

        canvas.width = 1;
        canvas.height = 1;
      }

      const ocrText = pages
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      console.log(
        "🧠 FINAL OCR TEXT LENGTH:",
        ocrText.length
      );

      console.log(
        "🧠 FINAL OCR TEXT:",
        ocrText
      );

      if (!ocrText) {
        throw new Error(
          "Browser OCR could not detect readable text in this resume."
        );
      }

      return {
        text: ocrText,
        method: "browser-tesseract-ocr",
      };
    } catch (error) {
      console.error(
        "❌ PDF/OCR ERROR:",
        error
      );

      throw error;
    }
  };

  // =========================================================
  // DOCX TEXT EXTRACTION
  // =========================================================

  const extractDocxTextInBrowser = async (buffer) => {
    try {
      setAnalysisMessage("Reading DOCX resume...");

      const zip = await JSZip.loadAsync(buffer);

      const documentFile =
        zip.file("word/document.xml");

      if (!documentFile) {
        throw new Error(
          "DOCX document content could not be read."
        );
      }

      const documentXml =
        await documentFile.async("text");

      const text = documentXml
        .replace(/<w:tab\s*\/?>(?:)/g, " ")
        .replace(/<w:br\s*\/?>(?:)/g, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();

      console.log(
        "📄 DOCX TEXT LENGTH:",
        text.length
      );

      if (!text) {
        throw new Error(
          "DOCX resume contains no readable text."
        );
      }

      console.log(
        "📄 DOCX TEXT:",
        text
      );

      return {
        text,
        method: "browser-docx-text",
      };
    } catch (error) {
      console.error(
        "❌ DOCX EXTRACTION ERROR:",
        error
      );

      throw error;
    }
  };

  // =========================================================
  // APPLY MATCH RESULT TO CURRENT STATE
  // =========================================================

  const updateApplicationWithMatch = (
    applicationId,
    match
  ) => {
    if (!match) {
      console.warn(
        "⚠️ No match object returned from backend"
      );

      return;
    }

    console.log(
      "🎯 APPLYING MATCH TO UI:",
      match
    );

    setApplications((current) =>
      current.map((item) => {
        if (item._id !== applicationId) {
          return item;
        }

        return {
          ...item,

          jobMatchScore: Number(
            match.score ?? 0
          ),

          jobMatchStatus:
            match.status ||
            "Analyzed",

          matchedSkills:
            Array.isArray(match.matchedSkills)
              ? match.matchedSkills
              : [],

          missingSkills:
            Array.isArray(match.missingSkills)
              ? match.missingSkills
              : [],

          jobMatchBreakdown:
            match.breakdown || {
              skills: 0,
              keywords: 0,
              experience: 0,
            },

          jobMatchAnalyzedAt:
            match.analyzedAt ||
            new Date().toISOString(),

          jobMatchEngine:
            match.engine ||
            "TechBoard Job Match Engine v2",

          jobMatchExtractionMethod:
            match.extractionMethod || "",

          jobMatchError:
            match.error || "",
        };
      })
    );
  };

  // =========================================================
  // ANALYZE JOB MATCH
  // =========================================================

  const analyzeMatch = async (application) => {

    console.log("🔥🔥🔥 analyzeMatch FUNCTION CALLED 🔥🔥🔥");
    const id = application?._id;

    if (!id) {
      alert("Invalid application.");
      return;
    }

    try {
      setAnalyzing(id);

      setAnalysisMessage(
        "Preparing resume analysis..."
      );

      console.log(
        "======================================"
      );

      console.log(
        "🚀 STARTING JOB MATCH ANALYSIS"
      );

      console.log(
        "Application ID:",
        id
      );

      console.log(
        "Candidate:",
        application.applicant?.name
      );

      console.log(
        "Job:",
        application.job?.title
      );

      console.log(
        "======================================"
      );

      // -------------------------------------------------------
      // GET RESUME NAME
      // -------------------------------------------------------

      const resume =
        application.resume ||
        application.applicant?.resume;

      if (!resume) {
        throw new Error(
          "Candidate resume is not available."
        );
      }

      const resumeName = String(resume)
        .split(/[\\/]/)
        .pop()
        .split("?")[0]
        .toLowerCase();

      console.log(
        "📎 RESUME:",
        resume
      );

      console.log(
        "📎 RESUME NAME:",
        resumeName
      );

      let payload = {};

      // -------------------------------------------------------
      // DOWNLOAD RESUME FROM PROTECTED BACKEND ENDPOINT
      // -------------------------------------------------------

      let resumeResponse;

      try {
        console.log(
          "⬇️ Downloading resume..."
        );

        resumeResponse = await API.get(
          `/company/application/${id}/resume`,
          {
            responseType: "arraybuffer",
          }
        );

        console.log(
          "✅ Resume downloaded"
        );

        console.log(
          "Resume bytes:",
          resumeResponse?.data?.byteLength
        );
      } catch (downloadError) {
        console.error(
          "❌ RESUME DOWNLOAD ERROR:",
          downloadError
        );

        const status =
          downloadError.response?.status;

        const serverMessage =
          downloadError.response?.data?.message;

        throw new Error(
          serverMessage ||
            (status === 404
              ? "Resume download endpoint returned 404. Restart the latest backend and try again."
              : `Resume download failed${
                  status
                    ? ` (${status})`
                    : ""
                }.`)
        );
      }

      const buffer = resumeResponse.data;

      if (
        !buffer ||
        buffer.byteLength === 0
      ) {
        throw new Error(
          "Resume download returned an empty file."
        );
      }

      // -------------------------------------------------------
      // PDF
      // -------------------------------------------------------

      if (resumeName.endsWith(".pdf")) {
        payload =
          await extractPdfTextAndOcr(
            buffer
          );
      }

      // -------------------------------------------------------
      // DOCX
      // -------------------------------------------------------

      else if (
        resumeName.endsWith(".docx")
      ) {
        payload =
          await extractDocxTextInBrowser(
            buffer
          );
      }

      // -------------------------------------------------------
      // OTHER FILES
      // -------------------------------------------------------

      else {
        console.log(
          "⚠️ Unsupported browser extraction type."
        );

        setAnalysisMessage(
          "Analyzing resume on the server..."
        );
      }

      // -------------------------------------------------------
      // DEBUG EXTRACTION
      // -------------------------------------------------------

      console.log(
        "======================================"
      );

      console.log(
        "🔥 EXTRACTION METHOD:",
        payload.method
      );

      console.log(
        "🔥 EXTRACTED TEXT LENGTH:",
        payload.text?.length || 0
      );

      console.log(
        "🔥 EXTRACTED RESUME TEXT:",
        payload.text || ""
      );

      console.log(
        "======================================"
      );

      // -------------------------------------------------------
      // VALIDATE EXTRACTED TEXT
      // -------------------------------------------------------

      if (
        resumeName.endsWith(".pdf") ||
        resumeName.endsWith(".docx")
      ) {
        if (
          !payload.text ||
          payload.text.trim().length < 10
        ) {
          throw new Error(
            "Resume text could not be extracted. Please use a clearer PDF/DOCX resume."
          );
        }
      }

      // -------------------------------------------------------
      // SEND TO JOB MATCH ENGINE
      // -------------------------------------------------------

      setAnalysisMessage(
        "Comparing resume with job requirements..."
      );

      console.log(
        "📤 Sending resume text to Job Match API..."
      );

      const matchPayload = {
  resumeText: payload?.text || "",
  extractionMethod: payload?.method || "",
};

console.log("📦 JOB MATCH PAYLOAD:", {
  extractionMethod: matchPayload.extractionMethod,
  resumeTextLength: matchPayload.resumeText.length,
});

const matchResponse =
  await API.post(
    `/company/application/${id}/job-match`,
    matchPayload
  );

      // -------------------------------------------------------
      // DEBUG API RESPONSE
      // -------------------------------------------------------

      console.log(
        "======================================"
      );

      console.log(
        "🔥 JOB MATCH RESPONSE:",
        matchResponse.data
      );

      console.log(
        "🔥 MATCH:",
        matchResponse.data?.match
      );

      console.log(
        "======================================"
      );

      const match =
        matchResponse.data?.match;

      if (!match) {
        throw new Error(
          "Job Match API returned no match result."
        );
      }

      // -------------------------------------------------------
      // UPDATE UI IMMEDIATELY
      // -------------------------------------------------------

      updateApplicationWithMatch(
        id,
        match
      );

      // -------------------------------------------------------
      // GET FRESH DATA FROM SERVER
      // -------------------------------------------------------

      await load();

      setAnalysisMessage(
        "Job match analysis completed."
      );
    } catch (error) {
      console.error(
        "❌ JOB MATCH ANALYSIS ERROR:",
        error
      );

      console.error(
        "Response:",
        error.response?.data
      );

      alert(
        error.response?.data?.message ||
          error.message ||
          "Unable to analyze job match."
      );
    } finally {
      setAnalyzing("");

      setTimeout(() => {
        setAnalysisMessage("");
      }, 500);
    }
  };

  // =========================================================
  // TERMINATE OCR WORKER
  // =========================================================

  useEffect(() => {
    return () => {
      if (ocrWorkerRef.current) {
        console.log(
          "🛑 Terminating OCR worker..."
        );

        ocrWorkerRef.current.terminate();

        ocrWorkerRef.current = null;
      }
    };
  }, []);

  // =========================================================
  // UPDATE STATUS
  // =========================================================

  const updateStatus = async (
    id,
    value
  ) => {
    try {
      setUpdating(id);

      await API.put(
        `/company/application/${id}`,
        {
          status: value,
        }
      );

      await load();
    } catch (error) {
      console.error(
        "❌ UPDATE STATUS ERROR:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Unable to update application status."
      );
    } finally {
      setUpdating("");
    }
  };

  // =========================================================
  // FORM
  // =========================================================

  const setField = (
    id,
    field,
    value
  ) => {
    setForm((current) => ({
      ...current,

      [id]: {
        ...(current[id] || {}),
        [field]: value,
      },
    }));
  };

  // =========================================================
  // SCHEDULE INTERVIEW
  // =========================================================

  const schedule = async (id) => {
    const f = form[id] || {};

    if (!f.date) {
      alert(
        "Please select an interview date and time."
      );

      return;
    }

    try {
      setScheduling(id);

      await API.post(
        `/features/applications/${id}/interview`,
        {
          ...f,
        }
      );

      setForm((current) => ({
        ...current,
        [id]: {},
      }));

      await load();

      alert(
        "Interview scheduled successfully."
      );
    } catch (error) {
      console.error(
        "❌ SCHEDULE ERROR:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Unable to schedule interview."
      );
    } finally {
      setScheduling("");
    }
  };

  // =========================================================
  // CLEAR FILTERS
  // =========================================================

  const clearFilters = () => {
    setSearch("");
    setFilter("All");
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className="company-applications-page">
      <div className="company-applications-container">
        <div style={{ marginBottom: "18px" }}><RecruiterCopilot compact /></div>

        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="applications-hero">
          <div className="applications-hero-content">

            <div className="applications-eyebrow">
              <span className="applications-eyebrow-dot" />
              EMPLOYER WORKSPACE
            </div>

            <h1>Applicants</h1>

            <p>
              Review candidates, manage application
              status and schedule interviews from one
              professional workspace.
            </p>

            <div className="applications-hero-meta">

              <span>
                <i className="bi bi-shield-check" />
                Candidate-ready workflow
              </span>

              <span>
                <i className="bi bi-lightning-charge" />
                Real-time status updates
              </span>

            </div>
          </div>

          <div className="applications-hero-total">
            <strong>{counts.total}</strong>

            <span>Total applications</span>

            <small>
              {counts.interviews > 0
                ? `${counts.interviews} interview${
                    counts.interviews > 1
                      ? "s"
                      : ""
                  } in progress`
                : "No interviews scheduled"}
            </small>
          </div>
        </section>

        {/* =====================================================
            STATS
        ===================================================== */}

        <section
          className="application-stat-grid"
          aria-label="Application summary"
        >

          <div className="application-stat-card">
            <div className="application-stat-icon total">
              <i className="bi bi-files" />
            </div>

            <div>
              <span>Total</span>
              <strong>{counts.total}</strong>
              <small>All applications</small>
            </div>
          </div>

          <div className="application-stat-card">
            <div className="application-stat-icon shortlist">
              <i className="bi bi-star-fill" />
            </div>

            <div>
              <span>Shortlisted</span>
              <strong>{counts.shortlisted}</strong>
              <small>Ready for next step</small>
            </div>
          </div>

          <div className="application-stat-card">
            <div className="application-stat-icon interview">
              <i className="bi bi-calendar2-check" />
            </div>

            <div>
              <span>Interviews</span>
              <strong>{counts.interviews}</strong>
              <small>Interview stage</small>
            </div>
          </div>

          <div className="application-stat-card">
            <div className="application-stat-icon selected">
              <i className="bi bi-person-check-fill" />
            </div>

            <div>
              <span>Selected</span>
              <strong>{counts.selected}</strong>
              <small>Final selections</small>
            </div>
          </div>

          <div className="application-stat-card match-stat-card">
            <div className="application-stat-icon match">
              <i className="bi bi-stars" />
            </div>

            <div>
              <span>Top match</span>

              <strong>
                {applications.length
                  ? Math.max(
                      ...applications.map(
                        (x) =>
                          Number(
                            x.jobMatchScore || 0
                          )
                      )
                    )
                  : 0}
                %
              </strong>

              <small>Best job match</small>
            </div>
          </div>

        </section>

        {/* =====================================================
            TOOLBAR
        ===================================================== */}

        <section className="applications-toolbar-card">

          <div className="applications-toolbar-copy">

            <div className="section-kicker">
              CANDIDATE PIPELINE
            </div>

            <h2>Manage applications</h2>

            <p>
              Search candidates and filter the hiring
              pipeline by status.
            </p>

          </div>

          <div className="applications-toolbar-controls">

            <label className="applications-search">

              <i className="bi bi-search" />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search candidate, email or position..."
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <i className="bi bi-x-circle-fill" />
                </button>
              )}

            </label>

            <select
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value)
              }
            >
              <option value="All">
                All statuses
              </option>

              {STATUS_OPTIONS.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                )
              )}
            </select>

          </div>
        </section>

        {/* =====================================================
            LOADING
        ===================================================== */}

        {loading ? (
          <section className="applications-state-card">

            <div className="applications-spinner" />

            <h3>
              Loading applications
            </h3>

            <p>
              Preparing your candidate pipeline...
            </p>

          </section>

        ) : !filtered.length ? (

          /* ===================================================
             EMPTY
          =================================================== */

          <section className="applications-state-card">

            <div className="applications-empty-icon">
              <i className="bi bi-person-lines-fill" />
            </div>

            <h3>
              {applications.length
                ? "No matching applications"
                : "No applications yet"}
            </h3>

            <p>
              {applications.length
                ? "Try another search term or reset your status filter."
                : "New candidate applications will appear here."}
            </p>

            {(search ||
              filter !== "All") && (
              <button
                className="secondary-button"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}

          </section>

        ) : (

          /* ===================================================
             APPLICATION RESULTS
          =================================================== */

          <section className="applications-results">

            <div className="applications-results-head">

              <div>
                <span>SHOWING</span>

                <strong>
                  {filtered.length}
                </strong>

                <span>
                  candidate
                  {filtered.length !== 1
                    ? "s"
                    : ""}
                </span>
              </div>

              <div className="results-live">
                <span />
                Hiring pipeline live
              </div>

            </div>

            <div className="professional-applications-list">

              {filtered.map(
                (application) => {

                  const applicantName =
                    application.applicant
                      ?.name ||
                    "Candidate";

                  const initial =
                    applicantName
                      .trim()
                      .charAt(0)
                      .toUpperCase() ||
                    "C";

                  const resume =
                    application.resume ||
                    application.applicant
                      ?.resume;

                  const currentForm =
                    form[
                      application._id
                    ] || {};

                  const matchScore =
                    Number(
                      application.jobMatchScore ||
                        0
                    );

                  const breakdown =
                    application.jobMatchBreakdown ||
                    {};

                  return (

                    <article
                      className="professional-application-card"
                      key={
                        application._id
                      }
                    >

                      {/* =====================================
                          CANDIDATE HEADER
                      ===================================== */}

                      <div className="candidate-top">

                        <div className="candidate-identity">

                          <div className="candidate-avatar">
                            {initial}
                          </div>

                          <div>

                            <div className="candidate-name-row">

                              <h3>
                                {applicantName}
                              </h3>

                              <span
                                className={`candidate-status ${statusClass(
                                  application.status
                                )}`}
                              >
                                <span />
                                {application.status}
                              </span>

                            </div>

                            <p>
                              <i className="bi bi-envelope" />
                              {application.applicant
                                ?.email ||
                                "Email not available"}
                            </p>

                            <div className="candidate-meta">

                              <span>
                                <i className="bi bi-briefcase" />
                                {application.job
                                  ?.title ||
                                  "Job position"}
                              </span>

                              <span>
                                <i className="bi bi-calendar3" />
                                Applied{" "}
                                {new Date(
                                  application.createdAt
                                ).toLocaleDateString()}
                              </span>

                            </div>

                          </div>

                        </div>

                        {/* STATUS */}

                        <div className="candidate-status-control">

                          <label>
                            APPLICATION STATUS
                          </label>

                          <select
                            value={
                              application.status
                            }
                            disabled={
                              updating ===
                              application._id
                            }
                            onChange={(e) =>
                              updateStatus(
                                application._id,
                                e.target.value
                              )
                            }
                          >

                            {STATUS_OPTIONS.map(
                              (status) => (
                                <option
                                  key={status}
                                  value={status}
                                >
                                  {status}
                                </option>
                              )
                            )}

                          </select>

                          {updating ===
                            application._id && (
                            <small>
                              Updating...
                            </small>
                          )}

                        </div>

                      </div>

                      {/* =====================================
                          DETAILS
                      ===================================== */}

                      <div className="candidate-detail-grid">

                        <div className="candidate-detail-box">
                          <span>POSITION</span>

                          <strong>
                            {application.job
                              ?.title ||
                              "Job Position"}
                          </strong>

                          <small>
                            Candidate application
                          </small>
                        </div>

                        <div className="candidate-detail-box">
                          <span>APPLIED ON</span>

                          <strong>
                            {new Date(
                              application.createdAt
                            ).toLocaleDateString()}
                          </strong>

                          <small>
                            Application received
                          </small>
                        </div>

                        <div className="candidate-detail-box resume-box">

                          <span>RESUME</span>

                          {resume ? (
                            <a
                              href={resumeUrl(
                                resume
                              )}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <i className="bi bi-file-earmark-pdf-fill" />
                              View Resume
                            </a>
                          ) : (
                            <strong className="muted-value">
                              Not provided
                            </strong>
                          )}

                          <small>
                            Candidate document
                          </small>

                        </div>

                      </div>

                      {/* =====================================
                          AI JOB MATCH
                      ===================================== */}

                      <div className="job-match-panel">

                        <div className="job-match-header">

                          <div className="job-match-heading">

                            <div className="job-match-icon">
                              <i className="bi bi-stars" />
                            </div>

                            <div>

                              <div className="job-match-title-row">

                                <h3>
                                  AI Job Match
                                </h3>

                                <span
                                  className={`job-match-badge ${String(
                                    application.jobMatchStatus ||
                                      ""
                                  )
                                    .toLowerCase()
                                    .replace(
                                      /\s+/g,
                                      "-"
                                    )}`}
                                >
                                  {application.jobMatchStatus ||
                                    "Not Analyzed"}
                                </span>

                              </div>

                              <p>
                                Resume compared with
                                the requirements of
                                this specific job.
                              </p>

                            </div>

                          </div>

                          {/* SCORE */}

                          <div
                            className="job-match-score"
                            style={{
                              "--match-score": `${
                                Math.max(
                                  0,
                                  Math.min(
                                    100,
                                    matchScore
                                  )
                                ) * 3.6
                              }deg`,
                            }}
                          >

                            <div>

                              <strong>
                                {matchScore}%
                              </strong>

                              <span>
                                match
                              </span>

                            </div>

                          </div>

                        </div>

                        {/* =================================
                            ERROR
                        ================================= */}

                        {application.jobMatchError && (
                          <div className="job-match-error">

                            <div className="job-match-error-icon">
                              <i className="bi bi-exclamation-triangle-fill" />
                            </div>

                            <div>

                              <strong>
                                Resume analysis needs attention
                              </strong>

                              <p>
                                {
                                  application.jobMatchError
                                }
                              </p>

                              <small>
                                Browser-based OCR is
                                used for scanned PDFs.
                                Poppler and desktop
                                Tesseract are not
                                required.
                              </small>

                            </div>

                          </div>
                        )}

                        {/* =================================
                            MATCH BODY
                        ================================= */}

                        <div className="job-match-body">

                          {/* BREAKDOWN */}

                          <div className="job-match-breakdown">

                            {[
                              [
                                "Skills match",
                                breakdown.skills ||
                                  0,
                                "bi-tools",
                              ],

                              [
                                "Keyword match",
                                breakdown.keywords ||
                                  0,
                                "bi-search",
                              ],

                              [
                                "Experience",
                                breakdown.experience ||
                                  0,
                                "bi-briefcase",
                              ],
                            ].map(
                              ([
                                label,
                                value,
                                icon,
                              ]) => (

                                <div
                                  className="match-metric"
                                  key={label}
                                >

                                  <div className="match-metric-top">

                                    <span>
                                      <i
                                        className={`bi ${icon}`}
                                      />
                                      {label}
                                    </span>

                                    <strong>
                                      {Number(
                                        value
                                      )}%
                                    </strong>

                                  </div>

                                  <div className="match-progress">

                                    <span
                                      style={{
                                        width: `${Math.max(
                                          0,
                                          Math.min(
                                            100,
                                            Number(
                                              value
                                            )
                                          )
                                        )}%`,
                                      }}
                                    />

                                  </div>

                                </div>

                              )
                            )}

                          </div>

                          {/* SKILLS */}

                          <div className="job-match-skills">

                            {/* MATCHED */}

                            <div>

                              <span className="match-label matched-label">
                                MATCHED SKILLS
                              </span>

                              <div className="match-chip-list">

                                {(
                                  application.matchedSkills ||
                                  []
                                ).length ? (

                                  application.matchedSkills.map(
                                    (skill) => (
                                      <span
                                        className="match-chip matched"
                                        key={skill}
                                      >
                                        <i className="bi bi-check2" />
                                        {skill}
                                      </span>
                                    )
                                  )

                                ) : (

                                  <small>
                                    No matched skills
                                    detected yet.
                                  </small>

                                )}

                              </div>

                            </div>

                            {/* MISSING */}

                            <div>

                              <span className="match-label missing-label">
                                MISSING SKILLS
                              </span>

                              <div className="match-chip-list">

                                {(
                                  application.missingSkills ||
                                  []
                                ).length ? (

                                  application.missingSkills.map(
                                    (skill) => (
                                      <span
                                        className="match-chip missing"
                                        key={skill}
                                      >
                                        <i className="bi bi-dash" />
                                        {skill}
                                      </span>
                                    )
                                  )

                                ) : (

                                  <small>
                                    No missing required
                                    skills.
                                  </small>

                                )}

                              </div>

                            </div>

                          </div>

                        </div>

                        {/* =================================
                            ANALYSIS PROGRESS
                        ================================= */}

                        {analyzing ===
                          application._id &&
                          analysisMessage && (

                            <div
                              className="job-match-progress"
                              role="status"
                            >

                              <span className="job-match-progress-spinner" />

                              <span>
                                {analysisMessage}
                              </span>

                            </div>

                          )}

                        {/* =================================
                            FOOTER
                        ================================= */}

                        <div className="job-match-footer">

                          <span>
                            <i className="bi bi-shield-check" />

                            {application.jobMatchEngine ||
                              "Smart matching engine"}
                          </span>

                          {application.jobMatchAnalyzedAt && (
                            <span>
                              Analyzed{" "}
                              {new Date(
                                application.jobMatchAnalyzedAt
                              ).toLocaleDateString()}
                            </span>
                          )}

                          <button
                            type="button"
                            className="job-match-reanalyze"
                            disabled={
                              analyzing ===
                              application._id
                            }
                            onClick={() =>
                              analyzeMatch(
                                application
                              )
                            }
                          >

                            <i className="bi bi-arrow-repeat" />

                            {analyzing ===
                            application._id
                              ? "Analyzing..."
                              : "Analyze / Re-analyze"}

                          </button>

                        </div>

                      </div>

                      {/* =====================================
                          COVER LETTER
                      ===================================== */}

                      {application.coverLetter && (

                        <div className="candidate-cover-letter">

                          <div className="cover-letter-title">

                            <i className="bi bi-chat-left-quote-fill" />

                            <span>
                              Cover letter
                            </span>

                          </div>

                          <p>
                            {
                              application.coverLetter
                            }
                          </p>

                        </div>

                      )}

                      {/* =====================================
                          INTERVIEW
                      ===================================== */}

                      {application.status ===
                        "Interview" && (

                        <div className="interview-scheduler">

                          <div className="scheduler-heading">

                            <div className="scheduler-icon">
                              <i className="bi bi-calendar2-plus" />
                            </div>

                            <div>

                              <h3>
                                Schedule interview
                              </h3>

                              <p>
                                Set the interview
                                details for this
                                candidate.
                              </p>

                            </div>

                          </div>

                          <div className="scheduler-fields">

                            <label>

                              <span>
                                Interview date & time
                              </span>

                              <div className="field-with-icon">

                                <i className="bi bi-calendar-event" />

                                <input
                                  type="datetime-local"
                                  value={
                                    currentForm.date ||
                                    ""
                                  }
                                  onChange={(e) =>
                                    setField(
                                      application._id,
                                      "date",
                                      e.target.value
                                    )
                                  }
                                />

                              </div>

                            </label>

                            <label>

                              <span>
                                Interview type
                              </span>

                              <div className="field-with-icon">

                                <i className="bi bi-camera-video" />

                                <select
                                  value={
                                    currentForm.type ||
                                    "Online"
                                  }
                                  onChange={(e) =>
                                    setField(
                                      application._id,
                                      "type",
                                      e.target.value
                                    )
                                  }
                                >
                                  <option>
                                    Online
                                  </option>

                                  <option>
                                    Offline
                                  </option>
                                </select>

                              </div>

                            </label>

                            <label className="scheduler-location">

                              <span>
                                Meeting link / location
                              </span>

                              <div className="field-with-icon">

                                <i className="bi bi-geo-alt" />

                                <input
                                  placeholder="Meeting link or office location"
                                  value={
                                    currentForm.meetingLink ||
                                    ""
                                  }
                                  onChange={(e) =>
                                    setField(
                                      application._id,
                                      "meetingLink",
                                      e.target.value
                                    )
                                  }
                                />

                              </div>

                            </label>

                            <button
                              className="primary-button scheduler-button"
                              disabled={
                                scheduling ===
                                application._id
                              }
                              onClick={() =>
                                schedule(
                                  application._id
                                )
                              }
                            >

                              <i className="bi bi-calendar2-check" />

                              {scheduling ===
                              application._id
                                ? "Scheduling..."
                                : "Schedule Interview"}

                            </button>

                          </div>

                        </div>

                      )}

                    </article>
                  );
                }
              )}

            </div>

          </section>
        )}

      </div>
    </main>
  );
}