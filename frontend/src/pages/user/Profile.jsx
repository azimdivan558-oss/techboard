import { useEffect, useState } from "react";
import API from "../../services/api";

function Field({ label, value, fullWidth }) {
  return (
    <div className={`form-group${fullWidth ? " full-width" : ""}`}>
      <label>{label}</label>
      <div className="profile-view-value">
        {value && String(value).trim() ? value : <span className="profile-view-empty">Not added</span>}
      </div>
    </div>
  );
}

export default function Profile() {
  const [u, setU] = useState({});
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const hasSavedData = (profile) => {
    const isCompanyProfile = profile.role === "company";
    return isCompanyProfile
      ? Boolean(profile.companyName || profile.industry || profile.companyDescription)
      : Boolean(profile.title || profile.bio || profile.phone || profile.location);
  };

  const loadProfile = async () => {
    try {
      const res = await API.get("/features/profile");
      const profile = res.data.user || {};
      setU(profile);
      setEditMode(!hasSavedData(profile));
    } catch (e) {
      setError(e.response?.data?.message || "Unable to load profile");
    } finally {
      setLoading(false);
    }
  };

  const ch = (e) => {
    setU({ ...u, [e.target.name]: e.target.value });
  };

  const save = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    setSaving(true);

    try {
      const res = await API.put("/features/profile", {
        ...u,
        skills: String(u.skills || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      });

      setU(res.data.user);

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...JSON.parse(localStorage.getItem("user") || "{}"),
          ...res.data.user,
        })
      );

      setMsg("Profile updated successfully");
      setEditMode(false);
      window.dispatchEvent(new Event("auth-changed"));
    } catch (e) {
      setError(e.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  // ---------------- Resume (stored in Cloudinary, never in localStorage) ----------------
  const uploadResume = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!/\.(pdf|doc|docx)$/i.test(file.name)) {
      setError("Only PDF, DOC and DOCX resumes are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Resume must be 5 MB or smaller");
      return;
    }

    setMsg("");
    setError("");
    setUploadingResume(true);

    try {
      const form = new FormData();
      form.append("resume", file);
      const res = await API.post("/features/profile/resume", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setU((prev) => ({ ...prev, ...res.data.user }));
      setMsg(res.data.message || "Resume uploaded successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Resume upload failed");
    } finally {
      setUploadingResume(false);
    }
  };

  const viewResume = async () => {
    try {
      const res = await API.get("/features/profile/resume", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setError("Unable to open resume");
    }
  };

  const removeResume = async () => {
    if (!window.confirm("Remove your uploaded resume?")) return;
    try {
      const res = await API.delete("/features/profile/resume");
      setU((prev) => ({ ...prev, ...res.data.user }));
      setMsg("Resume removed");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to remove resume");
    }
  };

  const resumeBlock = (
    <div className="resume-upload-box">
      {u.resume ? (
        <div className="resume-current">
          <span>📄 {u.resumeOriginalName || "Resume uploaded"}</span>
          <button type="button" className="btn btn-outline btn-sm" onClick={viewResume}>View</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={removeResume}>Remove</button>
        </div>
      ) : (
        <span className="profile-view-empty">No resume uploaded</span>
      )}
      <input
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={uploadResume}
        disabled={uploadingResume}
      />
      <small>
        {uploadingResume
          ? "Uploading to Cloudinary..."
          : "PDF, DOC or DOCX, max 5 MB. Used for job matching and applications."}
      </small>
    </div>
  );

  const isCompany = u.role === "company";
  const isAdmin = u.role === "admin";

  const initial = (u.name || u.companyName || "?").trim().charAt(0).toUpperCase();

  const roleLabel = isCompany
    ? "Company"
    : isAdmin
    ? "Admin"
    : "Candidate";

  const skillsText = Array.isArray(u.skills) ? u.skills.join(", ") : u.skills || "";

  if (loading) {
    return (
      <main className="form-page">
        <div className="form-container">
          <div className="loading">Loading profile...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="form-page">
      <div className="form-container">

        <div className="page-heading profile-page-heading">
          <div>
            <span className="small-title">PROFILE</span>
            <h1>{isCompany ? "Company Profile" : "Professional Profile"}</h1>
          </div>

          {!editMode && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setMsg("");
                setEditMode(true);
              }}
            >
              <i className="bi bi-pencil-square" aria-hidden="true"></i> Update Profile
            </button>
          )}
        </div>

        <div className="profile-header">
          <div className="avatar-circle">{initial}</div>
          <div className="profile-header-info">
            <h2>{isCompany ? u.companyName || u.name || "Your Company" : u.name || "Your Name"}</h2>
            <p>{u.email}</p>
            <span className="role-badge">{roleLabel}</span>
          </div>
        </div>

        {msg && <div className="success-message">{msg}</div>}
        {error && <div className="error-message">{error}</div>}

        {editMode ? (
          <form className="large-form" onSubmit={save}>

            {/* Basic Information */}
            <div className="form-section">
              <div className="form-section-title">Basic Information</div>
              <div className="form-section-subtitle">Your core contact details.</div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name</label>
                  <input name="name" value={u.name || ""} onChange={ch} />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input value={u.email || ""} disabled />
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <input name="phone" value={u.phone || ""} onChange={ch} />
                </div>

                <div className="form-group">
                  <label>Location</label>
                  <input name="location" value={u.location || ""} onChange={ch} />
                </div>
              </div>
            </div>

            {/* Candidate specific section */}
            {!isCompany && !isAdmin && (
              <div className="form-section">
                <div className="form-section-title">Candidate Details</div>
                <div className="form-section-subtitle">
                  Shown to companies when you apply for jobs.
                </div>

                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Professional Title</label>
                    <input
                      name="title"
                      placeholder="e.g. Frontend Developer"
                      value={u.title || ""}
                      onChange={ch}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>About / Summary</label>
                    <textarea
                      name="bio"
                      placeholder="A short summary about yourself"
                      value={u.bio || ""}
                      onChange={ch}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Skills (comma separated)</label>
                    <input
                      name="skills"
                      placeholder="React, Node.js, MongoDB"
                      value={skillsText}
                      onChange={ch}
                    />
                  </div>

                  <div className="form-group">
                    <label>Education</label>
                    <input name="education" value={u.education || ""} onChange={ch} />
                  </div>

                  <div className="form-group">
                    <label>Experience</label>
                    <input name="experience" value={u.experience || ""} onChange={ch} />
                  </div>

                  <div className="form-group full-width">
                    <label>Resume</label>
                    {resumeBlock}
                  </div>

                  <div className="form-group">
                    <label>LinkedIn</label>
                    <input name="linkedin" value={u.linkedin || ""} onChange={ch} />
                  </div>

                  <div className="form-group full-width">
                    <label>Website / GitHub</label>
                    <input name="website" value={u.website || ""} onChange={ch} />
                  </div>
                </div>
              </div>
            )}

            {/* Company specific section */}
            {isCompany && (
              <div className="form-section">
                <div className="form-section-title">Company Details</div>
                <div className="form-section-subtitle">
                  Shown to candidates on your job listings.
                </div>

                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Company Name</label>
                    <input name="companyName" value={u.companyName || ""} onChange={ch} />
                  </div>

                  <div className="form-group">
                    <label>Industry</label>
                    <input
                      name="industry"
                      placeholder="e.g. Information Technology"
                      value={u.industry || ""}
                      onChange={ch}
                    />
                  </div>

                  <div className="form-group">
                    <label>Company Size</label>
                    <input
                      name="companySize"
                      placeholder="e.g. 51-200 employees"
                      value={u.companySize || ""}
                      onChange={ch}
                    />
                  </div>

                  <div className="form-group">
                    <label>Founded Year</label>
                    <input
                      name="foundedYear"
                      placeholder="e.g. 2015"
                      value={u.foundedYear || ""}
                      onChange={ch}
                    />
                  </div>

                  <div className="form-group">
                    <label>LinkedIn</label>
                    <input name="linkedin" value={u.linkedin || ""} onChange={ch} />
                  </div>

                  <div className="form-group full-width">
                    <label>Company Description</label>
                    <textarea
                      name="companyDescription"
                      placeholder="Tell candidates about your company"
                      value={u.companyDescription || ""}
                      onChange={ch}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Website</label>
                    <input name="website" value={u.website || ""} onChange={ch} />
                  </div>
                </div>
              </div>
            )}

            <div className="profile-form-actions">
              <button className="primary-button" disabled={saving}>
                {saving ? "Saving..." : "Save Profile"}
              </button>

              {hasSavedData(u) && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setError("");
                    loadProfile();
                    setEditMode(false);
                  }}
                >
                  Cancel
                </button>
              )}
            </div>

          </form>
        ) : (
          <div className="large-form">

            <div className="form-section">
              <div className="form-section-title">Basic Information</div>
              <div className="form-grid">
                <Field label="Full Name" value={u.name} />
                <Field label="Email" value={u.email} />
                <Field label="Phone" value={u.phone} />
                <Field label="Location" value={u.location} />
              </div>
            </div>

            {!isCompany && !isAdmin && (
              <div className="form-section">
                <div className="form-section-title">Candidate Details</div>
                <div className="form-grid">
                  <Field label="Professional Title" value={u.title} fullWidth />
                  <Field label="About / Summary" value={u.bio} fullWidth />
                  <Field label="Skills" value={skillsText} fullWidth />
                  <Field label="Education" value={u.education} />
                  <Field label="Experience" value={u.experience} />
                  <div className="form-group">
                    <label>Resume</label>
                    {resumeBlock}
                  </div>
                  <Field label="LinkedIn" value={u.linkedin} />
                  <Field label="Website / GitHub" value={u.website} fullWidth />
                </div>
              </div>
            )}

            {isCompany && (
              <div className="form-section">
                <div className="form-section-title">Company Details</div>
                <div className="form-grid">
                  <Field label="Company Name" value={u.companyName} fullWidth />
                  <Field label="Industry" value={u.industry} />
                  <Field label="Company Size" value={u.companySize} />
                  <Field label="Founded Year" value={u.foundedYear} />
                  <Field label="LinkedIn" value={u.linkedin} />
                  <Field label="Company Description" value={u.companyDescription} fullWidth />
                  <Field label="Website" value={u.website} fullWidth />
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </main>
  );
}
