import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";

const PostJob = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    location: "",
    jobType: "",
    salaryMin: "",
    salaryMax: "",
    experience: "",
    skills: "",
    vacancies: "1",
    deadline: "",
    isFeatured: false,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const minDeadline = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setErrors((prev) => ({ ...prev, [name]: "", submit: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const newErrors = {};
    if (!form.title.trim()) newErrors.title = "Job title is required.";
    else if (form.title.trim().length < 3) newErrors.title = "Job title must be at least 3 characters.";
    else if (form.title.trim().length > 100) newErrors.title = "Job title cannot exceed 100 characters.";

    if (!form.description.trim()) newErrors.description = "Job description is required.";
    else if (form.description.trim().length < 20) newErrors.description = "Description must be at least 20 characters.";

    if (!form.category.trim()) newErrors.category = "Category is required.";
    if (!form.location.trim()) newErrors.location = "Location is required.";
    if (!form.jobType) newErrors.jobType = "Please select a job type.";

    if (form.salaryMin === "") newErrors.salaryMin = "Minimum salary is required.";
    else if (!Number.isFinite(Number(form.salaryMin)) || Number(form.salaryMin) < 0) newErrors.salaryMin = "Enter a valid non-negative salary.";

    if (form.salaryMax === "") newErrors.salaryMax = "Maximum salary is required.";
    else if (!Number.isFinite(Number(form.salaryMax)) || Number(form.salaryMax) < 0) newErrors.salaryMax = "Enter a valid non-negative salary.";
    else if (form.salaryMin !== "" && Number(form.salaryMin) > Number(form.salaryMax)) newErrors.salaryMax = "Maximum salary must be at least the minimum salary.";

    if (!String(form.experience).trim()) newErrors.experience = "Experience is required.";

    const skills = form.skills.split(",").map((skill) => skill.trim()).filter(Boolean);
    if (skills.length === 0) newErrors.skills = "Enter at least one required skill.";

    const vacancies = Number(form.vacancies);
    if (form.vacancies === "" || !Number.isInteger(vacancies) || vacancies < 1 || vacancies > 10000) {
      newErrors.vacancies = "Enter a whole number between 1 and 10000.";
    }

    if (!form.deadline) newErrors.deadline = "Application deadline is required.";
    else if (form.deadline < minDeadline) newErrors.deadline = "Deadline cannot be in the past.";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      setLoading(true);
      const payload = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        location: form.location.trim(),
        experience: form.experience.trim(),
        salaryMin: Number(form.salaryMin),
        salaryMax: Number(form.salaryMax),
        vacancies,
        skills,
      };
      const response = await API.post("/jobs", payload);
      navigate("/company-dashboard", {
        state: { successMessage: response.data?.message || "Job posted successfully." },
      });
    } catch (error) {
      console.error("Post job error:", error);
      setErrors((prev) => ({
        ...prev,
        submit: error.response?.data?.message || "Failed to post job. Please try again.",
      }));
    } finally {
      setLoading(false);
    }
  };

  const errorMessage = (name) =>
    errors[name] ? <div className="pj-error" id={`${name}-error`} role="alert">{errors[name]}</div> : null;

  const fieldClass = (name) => `pj-control${errors[name] ? " pj-control-error" : ""}`;

  return (
    <div className="pj-page">
      <style>{`
        .pj-page{min-height:calc(100vh - 80px);padding:34px 18px 56px;background:#f4f7fa;color:#183247;font-family:inherit}
        .pj-wrap{max-width:1040px;margin:0 auto}
        .pj-topline{display:flex;align-items:center;gap:9px;margin-bottom:10px;color:#087f8c;font-size:12px;font-weight:800;letter-spacing:1.25px;text-transform:uppercase}
        .pj-dot{width:8px;height:8px;border-radius:50%;background:#39b98a;display:inline-block;box-shadow:0 0 0 4px #e1f6ee}
        .pj-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:24px}
        .pj-title{font-size:clamp(27px,3vw,36px);font-weight:800;letter-spacing:-.8px;margin:0;color:#173247;line-height:1.2}
        .pj-subtitle{margin:9px 0 0;color:#6c8091;font-size:14px;line-height:1.65;max-width:680px}
        .pj-required-note{font-size:12px;color:#728596;background:#fff;border:1px solid #e2eaf0;border-radius:10px;padding:10px 13px;white-space:nowrap}
        .pj-card{background:#fff;border:1px solid #e3ebf1;border-radius:18px;box-shadow:0 8px 28px rgba(28,56,78,.06);overflow:hidden}
        .pj-section{padding:25px 28px;border-bottom:1px solid #edf1f5}
        .pj-section:last-of-type{border-bottom:0}
        .pj-section-heading{display:flex;align-items:flex-start;gap:13px;margin-bottom:21px}
        .pj-section-number{width:34px;height:34px;flex:0 0 34px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:#e8f5f6;color:#087f8c;font-size:14px;font-weight:800}
        .pj-section-title{font-size:16px;font-weight:800;color:#20394d;margin:1px 0 4px}
        .pj-section-desc{font-size:12px;color:#8191a0;margin:0;line-height:1.5}
        .pj-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 20px}
        .pj-field{min-width:0}
        .pj-field-full{grid-column:1/-1}
        .pj-label{display:block;font-size:13px;font-weight:700;color:#344d61;margin:0 0 8px}
        .pj-label span{color:#e05252}
        .pj-control{display:block;width:100%;box-sizing:border-box;border:1px solid #dbe5ed;border-radius:10px;background:#fbfcfe;color:#20394d;padding:11px 13px;font:inherit;font-size:13px;line-height:1.45;outline:none;transition:border-color .18s,box-shadow .18s,background .18s}
        .pj-control::placeholder{color:#a0adba}
        .pj-control:focus{border-color:#1596a0;background:#fff;box-shadow:0 0 0 3px rgba(21,150,160,.12)}
        .pj-control:disabled{opacity:.65;cursor:not-allowed}
        textarea.pj-control{min-height:130px;resize:vertical}
        select.pj-control{cursor:pointer}
        .pj-control-error{border-color:#e36a6a;background:#fffafa}
        .pj-error{font-size:12px;color:#d74444;margin-top:6px;line-height:1.45}
        .pj-hint{display:block;font-size:11px;color:#8594a2;margin-top:7px;line-height:1.5}
        .pj-featured{display:flex;align-items:flex-start;gap:12px;padding:15px 16px;background:#f7fafc;border:1px solid #e5edf2;border-radius:12px}
        .pj-featured input{width:17px;height:17px;margin:2px 0 0;accent-color:#087f8c;flex:0 0 auto}
        .pj-featured-title{font-size:13px;font-weight:750;color:#344d61;margin:0 0 4px}
        .pj-featured-desc{font-size:12px;color:#8191a0;margin:0;line-height:1.5}
        .pj-submit-error{padding:12px 14px;border-radius:10px;background:#fff2f2;border:1px solid #ffd8d8;color:#c63838;font-size:13px;margin:0 28px 18px}
        .pj-actions{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:20px 28px;background:#fbfcfd;border-top:1px solid #edf1f5}
        .pj-actions-note{font-size:12px;color:#8594a2;line-height:1.5}
        .pj-buttons{display:flex;gap:10px;align-items:center}
        .pj-btn{border:1px solid transparent;border-radius:10px;padding:11px 18px;font:inherit;font-size:13px;font-weight:750;cursor:pointer;transition:transform .15s,box-shadow .15s,background .15s}
        .pj-btn:disabled{opacity:.65;cursor:not-allowed;transform:none}
        .pj-btn-primary{background:#087f8c;color:#fff;box-shadow:0 5px 12px rgba(8,127,140,.17)}
        .pj-btn-primary:hover:not(:disabled){background:#066d78;transform:translateY(-1px);box-shadow:0 7px 15px rgba(8,127,140,.22)}
        .pj-btn-secondary{background:#fff;border-color:#dce6ed;color:#53697b}
        .pj-btn-secondary:hover:not(:disabled){background:#f3f7f9}
        .pj-spinner{display:inline-block;width:13px;height:13px;border:2px solid rgba(255,255,255,.45);border-top-color:#fff;border-radius:50%;animation:pj-spin .7s linear infinite}
        @keyframes pj-spin{to{transform:rotate(360deg)}}
        @media(max-width:700px){.pj-page{padding:24px 12px 36px}.pj-title-row{display:block}.pj-required-note{display:inline-block;margin-top:15px}.pj-section{padding:21px 17px}.pj-grid{grid-template-columns:1fr;gap:16px}.pj-field-full{grid-column:auto}.pj-actions{padding:18px 17px;align-items:stretch;flex-direction:column}.pj-buttons{width:100%}.pj-btn{flex:1}.pj-submit-error{margin:0 17px 16px}}
      `}</style>

      <div className="pj-wrap">
        <div className="pj-topline"><span className="pj-dot" /> Employer workspace</div>
        <div className="pj-title-row">
          <div>
            <h1 className="pj-title">Post a new job</h1>
            <p className="pj-subtitle">Share the role details with candidates and find the right person for your team.</p>
          </div>
          <div className="pj-required-note"><span style={{ color: "#e05252" }}>*</span> Required fields</div>
        </div>

        <form className="pj-card" onSubmit={handleSubmit} noValidate>
          <section className="pj-section">
            <div className="pj-section-heading">
              <div className="pj-section-number">01</div>
              <div><h2 className="pj-section-title">Job overview</h2><p className="pj-section-desc">Start with the role name and a clear description of the opportunity.</p></div>
            </div>
            <div className="pj-grid">
              <div className="pj-field pj-field-full">
                <label className="pj-label" htmlFor="title">Job title <span>*</span></label>
                <input id="title" name="title" type="text" className={fieldClass("title")} placeholder="e.g. Senior React Developer" value={form.title} onChange={handleChange} maxLength={100} disabled={loading} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "title-error" : undefined} />
                {errorMessage("title")}
              </div>
              <div className="pj-field">
  <label className="pj-label" htmlFor="category">
    Category <span>*</span>
  </label>

  <select
    id="category"
    name="category"
    className={fieldClass("category")}
    value={form.category}
    onChange={handleChange}
    disabled={loading}
    aria-invalid={Boolean(errors.category)}
  >
    <option value="">Select job category</option>
    <option value="IT & Software">IT & Software</option>
    <option value="Web Development">Web Development</option>
    <option value="Data Science">Data Science</option>
    <option value="Marketing">Marketing</option>
    <option value="Finance">Finance</option>
    <option value="Human Resources">Human Resources</option>
    <option value="Sales">Sales</option>
    <option value="Design">Design</option>
    <option value="Other">Other</option>
  </select>

  {errorMessage("category")}
</div>
              <div className="pj-field">
                <label className="pj-label" htmlFor="jobType">Employment type <span>*</span></label>
                <select id="jobType" name="jobType" className={fieldClass("jobType")} value={form.jobType} onChange={handleChange} disabled={loading} aria-invalid={Boolean(errors.jobType)}>
                  <option value="">Select employment type</option><option value="Full-time">Full-time</option><option value="Part-time">Part-time</option><option value="Contract">Contract</option><option value="Internship">Internship</option><option value="Remote">Remote</option>
                </select>
                {errorMessage("jobType")}
              </div>
              <div className="pj-field">
                <label className="pj-label" htmlFor="location">Location <span>*</span></label>
                <input id="location" name="location" type="text" className={fieldClass("location")} placeholder="e.g. Ahmedabad or Remote" value={form.location} onChange={handleChange} disabled={loading} aria-invalid={Boolean(errors.location)} />
                {errorMessage("location")}
              </div>
              <div className="pj-field">
                <label className="pj-label" htmlFor="experience">Required experience <span>*</span></label>
                <input id="experience" name="experience" type="text" className={fieldClass("experience")} placeholder="e.g. Fresher or 2+ years" value={form.experience} onChange={handleChange} disabled={loading} aria-invalid={Boolean(errors.experience)} />
                {errorMessage("experience")}
              </div>
              <div className="pj-field pj-field-full">
                <label className="pj-label" htmlFor="description">Job description <span>*</span></label>
                <textarea id="description" name="description" className={fieldClass("description")} rows={5} placeholder="Describe the responsibilities, qualifications and what success looks like in this role..." value={form.description} onChange={handleChange} disabled={loading} aria-invalid={Boolean(errors.description)} />
                <span className="pj-hint">Use at least 20 characters and include the main responsibilities and requirements.</span>
                {errorMessage("description")}
              </div>
            </div>
          </section>

          <section className="pj-section">
            <div className="pj-section-heading">
              <div className="pj-section-number">02</div>
              <div><h2 className="pj-section-title">Compensation & requirements</h2><p className="pj-section-desc">Help applicants understand the salary range and skills needed.</p></div>
            </div>
            <div className="pj-grid">
              <div className="pj-field">
                <label className="pj-label" htmlFor="salaryMin">Minimum salary <span>*</span></label>
                <input id="salaryMin" name="salaryMin" type="number" min="0" className={fieldClass("salaryMin")} placeholder="e.g. 15000" value={form.salaryMin} onChange={handleChange} disabled={loading} aria-invalid={Boolean(errors.salaryMin)} />
                <span className="pj-hint">Enter the amount in your configured currency.</span>
                {errorMessage("salaryMin")}
              </div>
              <div className="pj-field">
                <label className="pj-label" htmlFor="salaryMax">Maximum salary <span>*</span></label>
                <input id="salaryMax" name="salaryMax" type="number" min="0" className={fieldClass("salaryMax")} placeholder="e.g. 40000" value={form.salaryMax} onChange={handleChange} disabled={loading} aria-invalid={Boolean(errors.salaryMax)} />
                {errorMessage("salaryMax")}
              </div>
              <div className="pj-field pj-field-full">
                <label className="pj-label" htmlFor="skills">Required skills <span>*</span></label>
                <input id="skills" name="skills" type="text" className={fieldClass("skills")} placeholder="React, Node.js, MongoDB" value={form.skills} onChange={handleChange} disabled={loading} aria-invalid={Boolean(errors.skills)} />
                <span className="pj-hint">Separate each skill with a comma. These skills can help candidates understand the role requirements.</span>
                {errorMessage("skills")}
              </div>
            </div>
          </section>

          <section className="pj-section">
            <div className="pj-section-heading">
              <div className="pj-section-number">03</div>
              <div><h2 className="pj-section-title">Hiring details</h2><p className="pj-section-desc">Set the number of openings and the final date to apply.</p></div>
            </div>
            <div className="pj-grid">
              <div className="pj-field">
                <label className="pj-label" htmlFor="vacancies">Number of vacancies <span>*</span></label>
                <input id="vacancies" name="vacancies" type="number" min="1" max="10000" step="1" className={fieldClass("vacancies")} value={form.vacancies} onChange={handleChange} disabled={loading} aria-invalid={Boolean(errors.vacancies)} />
                {errorMessage("vacancies")}
              </div>
              <div className="pj-field">
                <label className="pj-label" htmlFor="deadline">Application deadline <span>*</span></label>
                <input id="deadline" name="deadline" type="date" min={minDeadline} className={fieldClass("deadline")} value={form.deadline} onChange={handleChange} disabled={loading} aria-invalid={Boolean(errors.deadline)} />
                {errorMessage("deadline")}
              </div>
              <div className="pj-field pj-field-full">
                <label className="pj-featured">
                  <input id="isFeatured" name="isFeatured" type="checkbox" checked={form.isFeatured} onChange={handleChange} disabled={loading} />
                  <span><span className="pj-featured-title">Mark as a featured job</span><span className="pj-featured-desc" style={{ display: "block" }}>Highlight this listing where featured jobs are supported. Availability may depend on your account plan.</span></span>
                </label>
              </div>
            </div>
          </section>

          {errors.submit && <div className="pj-submit-error" role="alert">{errors.submit}</div>}
          <div className="pj-actions">
            <div className="pj-actions-note">Please review the details before publishing your job.</div>
            <div className="pj-buttons">
              <button type="button" className="pj-btn pj-btn-secondary" disabled={loading} onClick={() => navigate("/company-dashboard")}>Cancel</button>
              <button type="submit" className="pj-btn pj-btn-primary" disabled={loading}>
                {loading && <span className="pj-spinner" role="status" aria-hidden="true" />}
                {loading ? "Posting job..." : "Post job"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostJob;
