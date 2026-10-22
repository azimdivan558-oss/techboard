
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

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
      submit: "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    const newErrors = {};

    // Title
    if (!form.title.trim()) {
      newErrors.title = "Job title is required.";
    } else if (form.title.trim().length < 3) {
      newErrors.title = "Job title must be at least 3 characters.";
    } else if (form.title.trim().length > 100) {
      newErrors.title = "Job title cannot exceed 100 characters.";
    }

    // Description
    if (!form.description.trim()) {
      newErrors.description = "Job description is required.";
    } else if (form.description.trim().length < 20) {
      newErrors.description =
        "Description must be at least 20 characters.";
    }

    // Category
    if (!form.category.trim()) {
      newErrors.category = "Category is required.";
    }

    // Location
    if (!form.location.trim()) {
      newErrors.location = "Location is required.";
    }

    // Job type
    if (!form.jobType) {
      newErrors.jobType = "Please select a job type.";
    }

    // Minimum salary
    if (form.salaryMin === "") {
      newErrors.salaryMin = "Minimum salary is required.";
    } else if (
      !Number.isFinite(Number(form.salaryMin)) ||
      Number(form.salaryMin) < 0
    ) {
      newErrors.salaryMin = "Enter a valid non-negative salary.";
    }

    // Maximum salary
    if (form.salaryMax === "") {
      newErrors.salaryMax = "Maximum salary is required.";
    } else if (
      !Number.isFinite(Number(form.salaryMax)) ||
      Number(form.salaryMax) < 0
    ) {
      newErrors.salaryMax = "Enter a valid non-negative salary.";
    } else if (
      form.salaryMin !== "" &&
      Number(form.salaryMin) > Number(form.salaryMax)
    ) {
      newErrors.salaryMax =
        "Maximum salary must be at least the minimum salary.";
    }

    // Experience
    if (!String(form.experience).trim()) {
      newErrors.experience = "Experience is required.";
    }

    // Skills
    const skills = form.skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);

    if (skills.length === 0) {
      newErrors.skills = "Enter at least one required skill.";
    }

    // Vacancies
    const vacancies = Number(form.vacancies);

    if (
      form.vacancies === "" ||
      !Number.isInteger(vacancies) ||
      vacancies < 1 ||
      vacancies > 10000
    ) {
      newErrors.vacancies =
        "Enter a whole number between 1 and 10000.";
    }

    // Deadline
    if (!form.deadline) {
      newErrors.deadline = "Application deadline is required.";
    } else if (form.deadline < minDeadline) {
      newErrors.deadline = "Deadline cannot be in the past.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

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
        state: {
          successMessage:
            response.data?.message || "Job posted successfully.",
        },
      });
    } catch (error) {
      console.error("Post job error:", error);

      setErrors((prev) => ({
        ...prev,
        submit:
          error.response?.data?.message ||
          "Failed to post job. Please try again.",
      }));
    } finally {
      setLoading(false);
    }
  };

  const errorMessage = (name) =>
    errors[name] ? (
      <div className="text-danger small mt-1" role="alert">
        {errors[name]}
      </div>
    ) : null;

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-lg-9 col-md-11">
          <div className="card shadow-sm">
            <div className="card-header py-3">
              <h3 className="mb-0">Post a Job</h3>
            </div>

            <div className="card-body p-4">
              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-3">
                  <label htmlFor="title" className="form-label">
                    Job Title *
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    className="form-control"
                    placeholder="e.g. React Developer"
                    value={form.title}
                    onChange={handleChange}
                    maxLength={100}
                    disabled={loading}
                    aria-invalid={Boolean(errors.title)}
                    aria-describedby={errors.title ? "title-error" : undefined}
                  />
                  {errorMessage("title")}
                </div>

                <div className="mb-3">
                  <label htmlFor="description" className="form-label">
                    Job Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    className="form-control"
                    rows={5}
                    placeholder="Enter job responsibilities and requirements"
                    value={form.description}
                    onChange={handleChange}
                    disabled={loading}
                    aria-invalid={Boolean(errors.description)}
                  />
                  {errorMessage("description")}
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="category" className="form-label">
                      Category *
                    </label>
                    <input
                      id="category"
                      name="category"
                      type="text"
                      className="form-control"
                      placeholder="e.g. IT, Marketing"
                      value={form.category}
                      onChange={handleChange}
                      disabled={loading}
                      aria-invalid={Boolean(errors.category)}
                    />
                    {errorMessage("category")}
                  </div>

                  <div className="col-md-6 mb-3">
                    <label htmlFor="location" className="form-label">
                      Location *
                    </label>
                    <input
                      id="location"
                      name="location"
                      type="text"
                      className="form-control"
                      placeholder="e.g. Ahmedabad"
                      value={form.location}
                      onChange={handleChange}
                      disabled={loading}
                      aria-invalid={Boolean(errors.location)}
                    />
                    {errorMessage("location")}
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="jobType" className="form-label">
                      Job Type *
                    </label>
                    <select
                      id="jobType"
                      name="jobType"
                      className="form-select"
                      value={form.jobType}
                      onChange={handleChange}
                      disabled={loading}
                      aria-invalid={Boolean(errors.jobType)}
                    >
                      <option value="">Select job type</option>
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                      <option value="Remote">Remote</option>
                    </select>
                    {errorMessage("jobType")}
                  </div>

                  <div className="col-md-6 mb-3">
                    <label htmlFor="experience" className="form-label">
                      Required Experience *
                    </label>
                    <input
                      id="experience"
                      name="experience"
                      type="text"
                      className="form-control"
                      placeholder="e.g. Fresher or 2 years"
                      value={form.experience}
                      onChange={handleChange}
                      disabled={loading}
                      aria-invalid={Boolean(errors.experience)}
                    />
                    {errorMessage("experience")}
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="salaryMin" className="form-label">
                      Minimum Salary *
                    </label>
                    <input
                      id="salaryMin"
                      name="salaryMin"
                      type="number"
                      className="form-control"
                      placeholder="e.g. 15000"
                      min="0"
                      value={form.salaryMin}
                      onChange={handleChange}
                      disabled={loading}
                      aria-invalid={Boolean(errors.salaryMin)}
                    />
                    {errorMessage("salaryMin")}
                  </div>

                  <div className="col-md-6 mb-3">
                    <label htmlFor="salaryMax" className="form-label">
                      Maximum Salary *
                    </label>
                    <input
                      id="salaryMax"
                      name="salaryMax"
                      type="number"
                      className="form-control"
                      placeholder="e.g. 40000"
                      min="0"
                      value={form.salaryMax}
                      onChange={handleChange}
                      disabled={loading}
                      aria-invalid={Boolean(errors.salaryMax)}
                    />
                    {errorMessage("salaryMax")}
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="skills" className="form-label">
                    Required Skills *
                  </label>
                  <input
                    id="skills"
                    name="skills"
                    type="text"
                    className="form-control"
                    placeholder="React, Node.js, MongoDB"
                    value={form.skills}
                    onChange={handleChange}
                    disabled={loading}
                    aria-invalid={Boolean(errors.skills)}
                  />
                  <small className="text-muted">
                    Separate skills with commas.
                  </small>
                  {errorMessage("skills")}
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="vacancies" className="form-label">
                      Number of Vacancies *
                    </label>
                    <input
                      id="vacancies"
                      name="vacancies"
                      type="number"
                      className="form-control"
                      min="1"
                      max="10000"
                      step="1"
                      value={form.vacancies}
                      onChange={handleChange}
                      disabled={loading}
                      aria-invalid={Boolean(errors.vacancies)}
                    />
                    {errorMessage("vacancies")}
                  </div>

                  <div className="col-md-6 mb-3">
                    <label htmlFor="deadline" className="form-label">
                      Application Deadline *
                    </label>
                    <input
                      id="deadline"
                      name="deadline"
                      type="date"
                      className="form-control"
                      min={minDeadline}
                      value={form.deadline}
                      onChange={handleChange}
                      disabled={loading}
                      aria-invalid={Boolean(errors.deadline)}
                    />
                    {errorMessage("deadline")}
                  </div>
                </div>

                <div className="form-check mb-4">
                  <input
                    id="isFeatured"
                    name="isFeatured"
                    type="checkbox"
                    className="form-check-input"
                    checked={form.isFeatured}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  <label
                    htmlFor="isFeatured"
                    className="form-check-label"
                  >
                    Mark as featured job
                  </label>
                </div>

                {errors.submit && (
                  <div className="text-danger small mb-3" role="alert">
                    {errors.submit}
                  </div>
                )}

                <div className="d-flex gap-2 flex-wrap">
                  <button
                    type="submit"
                    className="btn btn-primary d-inline-flex align-items-center gap-2"
                    disabled={loading}
                  >
                    {loading && (
                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                        aria-hidden="true"
                      />
                    )}
                    {loading ? "Posting..." : "Post Job"}
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={loading}
                    onClick={() => navigate("/company-dashboard")}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostJob;
