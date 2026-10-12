import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../services/api";
import JobCard from "../components/JobCard";

export default function Jobs() {

  const [searchParams] =
    useSearchParams();

  const [jobs, setJobs] = useState([]);

  const [filters, setFilters] = useState({
    keyword:
      searchParams.get("keyword") || "",
    location:
      searchParams.get("location") || "",
    category:
      searchParams.get("category") || "",
    jobType: "",
    experience: "",
    minSalary: "",
  });

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    searchJobs();
  }, []);

  const searchJobs = async () => {

    try {

      setLoading(true);

      const params =
        new URLSearchParams();

      Object.entries(filters).forEach(
        ([key, value]) => {
          if (value) {
            params.append(key, value);
          }
        }
      );

      const res =
        await API.get(
          `/jobs?${params.toString()}`
        );

      // Sort on the frontend too, so the highest resume-match
      // percentage always appears first even if the API returns
      // jobs in a different order. Jobs without a score stay last.
      const fetchedJobs = res.data.jobs || [];
      fetchedJobs.sort((a, b) => {
        const scoreA = a.matchScore === null || a.matchScore === undefined || a.matchScore === ""
          ? Number.NEGATIVE_INFINITY
          : Number(a.matchScore);
        const scoreB = b.matchScore === null || b.matchScore === undefined || b.matchScore === ""
          ? Number.NEGATIVE_INFINITY
          : Number(b.matchScore);

        const validA = Number.isFinite(scoreA);
        const validB = Number.isFinite(scoreB);
        if (validA && validB) return scoreB - scoreA;
        if (validA) return -1;
        if (validB) return 1;
        return 0;
      });
      setJobs(fetchedJobs);

    } catch (error) {

      console.log(error);

    } finally {

      setLoading(false);

    }
  };

  const handleChange = (e) => {

    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });

  };

  return (
    <main>

      <section className="jobs-header">

        <div>
          <span className="small-title">
            OPPORTUNITIES
          </span>

          <h1>
            Find Your Next Job
          </h1>

          <p>
            Search thousands of jobs from
            top companies.
          </p>
        </div>

      </section>

      <section className="search-section">

        <div className="search-box">

          <input
            name="keyword"
            placeholder="Job title, skills..."
            value={filters.keyword}
            onChange={handleChange}
          />

          <input
            name="location"
            placeholder="Location"
            value={filters.location}
            onChange={handleChange}
          />

          <select
            name="category"
            value={filters.category}
            onChange={handleChange}
          >
            <option value="">
              All Categories
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

          <input name="experience" placeholder="Experience" value={filters.experience} onChange={handleChange}/>
          <input type="number" name="minSalary" placeholder="Min salary" value={filters.minSalary} onChange={handleChange}/>
          <select
            name="jobType"
            value={filters.jobType}
            onChange={handleChange}
          >
            <option value="">
              All Types
            </option>

            <option>Full Time</option>
            <option>Part Time</option>
            <option>Internship</option>
            <option>Contract</option>
            <option>Remote</option>
          </select>

          <button
            className="primary-button"
            onClick={searchJobs}
          >
            Search
          </button>

        </div>

      </section>

      <section className="section">

        <div className="results-header">

          <h2>
            {jobs.length} Jobs Found
          </h2>

        </div>

        {loading ? (

          <div className="loading">
            Loading jobs...
          </div>

        ) : jobs.length === 0 ? (

          <div className="empty">
            No jobs found.
            Try different search filters.
          </div>

        ) : (

          <div className="jobs-grid">

            {jobs.map((job) => (
              <JobCard
                key={job._id}
                job={job}
              />
            ))}

          </div>

        )}

      </section>

    </main>
  );
}