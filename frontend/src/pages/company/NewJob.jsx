
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

  const [loading, setLoading] = useState(false);

  // Get today's date in YYYY-MM-DD format
  const now = new Date();

  const minDeadline = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  // Handle form fields
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Validate and submit job
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    // Job title validation
    if (!form.title.trim()) {
      alert("Please enter job title.");
      return;
    }

    if (form.title.trim().length < 3) {
      alert("Job title must contain at least 3 characters.");
      return;
    }

    if (form.title.trim().length > 100) {
      alert("Job title cannot exceed 100 characters.");
      return;
    }

    // Job description validation
    if (!form.description.trim()) {
      alert("Please enter job description.");
      return;
    }

    if (form.description.trim().length < 20) {
      alert("Job description must contain at least 20 characters.");
      return;
    }

    // Category validation
    if (!form.category.trim()) {
      alert("Please enter job category.");
      return;
    }

    // Location validation
    if (!form.location.trim()) {
      alert("Please enter job location.");
      return;
    }

    // Job type validation
    if (!form.jobType) {
      alert("Please select job type.");
      return;
    }

    // Salary validation
    if (form.salaryMin === "" || form.salaryMax === "") {
      alert("Please enter both minimum and maximum salary.");
      return;
    }

    const minSalary = Number(form.salaryMin);
    const maxSalary = Number(form.salaryMax);

    if (
      !Number.isFinite(minSalary) ||
      !Number.isFinite(maxSalary) ||
      minSalary < 0 ||
      maxSalary < 0
    ) {
      alert("Salary must be a valid non-negative number.");
      return;
    }

    if (minSalary > maxSalary) {
      alert("Minimum salary cannot be greater than maximum salary.");
      return;
    }

    // Experience validation
    if (!String(form.experience).trim()) {
      alert("Please enter required experience.");
      return;
    }

    // Skills validation
    const skills = form.skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);

    if (skills.length === 0) {
      alert("Please enter at least one required skill.");
      return;
    }

    // Vacancies validation
    const vacancies = Number(form.vacancies);

    if (
      form.vacancies === "" ||
      !Number.isInteger(vacancies) ||
      vacancies < 1 ||
      vacancies > 10000
    ) {
      alert("Vacancies must be a whole number between 1 and 10000.");
      return;
    }

    // Deadline validation
    if (!form.deadline) {
      alert("Please select application deadline.");
      return;
    }

    if (form.deadline < minDeadline) {
      alert("Application deadline cannot be in the past.");
      return;
    }

    // Send request to backend
    try {
      setLoading(true);

      const payload = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        location: form.location.trim(),
        experience: form.experience.trim(),
        salaryMin: minSalary,
        salaryMax: maxSalary,
        vacancies,
        skills,
      };

      const response = await API.post("/jobs", payload);

      alert(response.data?.message || "Job posted successfully!");

      navigate("/company-dashboard");
    } catch (error) {
      console.error("Post job error:", error);

      alert(
        error.response?.data?.message ||
          "Failed to post job. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-lg-9 col-md-11">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-primary text-white py-3">
              <h3 className="mb-0">Post a Job</h3>
              <small>
                Enter the details below to publish a job opportunity.
              </small>
            </div>

            <div className="card-body p-4">
              <form onSubmit={handleSubmit} noValidate>
                {/* Job Title */}
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
                  />
                </div>

                {/* Description */}
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
                  />
                  <small className="text-muted">
                    Minimum 20 characters.
                  </small>
                </div>

                {/* Category and Location */}
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
                    />
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
                      placeholder="e.g. Ahmedabad or Remote"
                      value={form.location}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Job Type and Experience */}
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
                    >
                      <option value="">Select job type</option>
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                      <option value="Remote">Remote</option>
                    </select>
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
                    />
                  </div>
                </div>

                {/* Salary */}
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
                    />
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
                    />
                  </div>
                </div>

                {/* Skills */}
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
                  />

                  <small className="text-muted">
                    Separate skills with commas.
                  </small>
                </div>

                {/* Vacancies and Deadline */}
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
                    />
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
                    />
                  </div>
                </div>

                {/* Featured Job */}
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

                {/* Submit and Cancel */}
                <div className="d-flex gap-2 flex-wrap">
                  <button
                    type="submit"
                    className="btn btn-primary d-inline-flex align-items-center justify-content-center gap-2"
                    disabled={loading}
                  >
                    {loading && (
                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                        aria-hidden="true"
                      />
                    )}

                    {loading ? "Posting Job..." : "Post Job"}
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
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
