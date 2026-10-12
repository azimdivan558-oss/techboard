import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";

export default function PostJob() {

  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    location: "",
    jobType: "Full Time",
    salaryMin: "",
    salaryMax: "",
    experience: "",
    skills: "",
    vacancies: 1,
    deadline: "",
    isFeatured: false,
  });

  const [message, setMessage] =
    useState("");

  const handleChange = (e) => {

    const { name, value, type, checked } =
      e.target;

    setForm({
      ...form,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    });
  };

  const submit = async (e) => {

    e.preventDefault();

    try {

      await API.post("/jobs", {
        ...form,
        skills: form.skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
      });

      setMessage(
        "Job posted successfully!"
      );

      setTimeout(() => {
        navigate("/company-dashboard");
      }, 1200);

    } catch (error) {

      setMessage(
        error.response?.data?.message ||
        "Failed to post job"
      );

    }
  };

  return (
    <main className="form-page">

      <div className="form-container">

        <div className="page-heading">
          <span className="small-title">
            EMPLOYER
          </span>

          <h1>Post a New Job</h1>

          <p>
            Find the perfect candidate for
            your organization.
          </p>
        </div>

        {message && (
          <div className="success-message">
            {message}
          </div>
        )}

        <form
          className="large-form"
          onSubmit={submit}
        >

          <div className="form-grid">

            <div className="form-group full-width">

              <label>Job Title *</label>

              <input
                name="title"
                placeholder="e.g. Senior React Developer"
                value={form.title}
                onChange={handleChange}
                required
              />

            </div>

            <div className="form-group">

              <label>Category</label>

              <select
                name="category"
                value={form.category}
                onChange={handleChange}
              >
                <option value="">
                  Select Category
                </option>

                <option>
                  Software Development
                </option>

                <option>
                  Data Science
                </option>

                <option>
                  Design
                </option>

                <option>
                  Marketing
                </option>

                <option>
                  Cyber Security
                </option>
              </select>

            </div>

            <div className="form-group">

              <label>Location</label>

              <input
                name="location"
                placeholder="Ahmedabad / Remote"
                value={form.location}
                onChange={handleChange}
              />

            </div>

            <div className="form-group">

              <label>Job Type</label>

              <select
                name="jobType"
                value={form.jobType}
                onChange={handleChange}
              >
                <option>Full Time</option>
                <option>Part Time</option>
                <option>Internship</option>
                <option>Contract</option>
                <option>Remote</option>
              </select>

            </div>

            <div className="form-group">

              <label>Experience</label>

              <input
                name="experience"
                placeholder="e.g. 2-4 Years"
                value={form.experience}
                onChange={handleChange}
              />

            </div>

            <div className="form-group">

              <label>Minimum Salary</label>

              <input
                type="number"
                name="salaryMin"
                value={form.salaryMin}
                onChange={handleChange}
              />

            </div>

            <div className="form-group">

              <label>Maximum Salary</label>

              <input
                type="number"
                name="salaryMax"
                value={form.salaryMax}
                onChange={handleChange}
              />

            </div>

            <div className="form-group">

              <label>Vacancies</label>

              <input
                type="number"
                name="vacancies"
                min="1"
                value={form.vacancies}
                onChange={handleChange}
              />

            </div>

            <div className="form-group">

              <label>Application Deadline</label>

              <input
                type="date"
                name="deadline"
                value={form.deadline}
                onChange={handleChange}
              />

            </div>

            <div className="form-group full-width">

              <label>
                Skills
              </label>

              <input
                name="skills"
                placeholder="React, Node.js, MongoDB, JavaScript"
                value={form.skills}
                onChange={handleChange}
              />

              <small>
                Separate skills with commas
              </small>

            </div>

            <div className="form-group full-width">

              <label>
                Job Description *
              </label>

              <textarea
                name="description"
                rows="10"
                placeholder="Describe the role, responsibilities and requirements..."
                value={form.description}
                onChange={handleChange}
                required
              />

            </div>

            <div className="checkbox-group">

              <input
                type="checkbox"
                name="isFeatured"
                checked={form.isFeatured}
                onChange={handleChange}
                id="featured"
              />

              <label htmlFor="featured">
                Make this a featured job
              </label>

            </div>

          </div>

          <button
            type="submit"
            className="primary-button"
          >
            Publish Job
          </button>

        </form>

      </div>

    </main>
  );
}