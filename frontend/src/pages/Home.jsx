import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import JobCard from "../components/JobCard";
import robo from "../image/robo.png";

const categories = [
  ["bi-code-slash", "Software Development"],
  ["bi-bar-chart-fill", "Data Science"],
  ["bi-palette-fill", "Design"],
  ["bi-megaphone-fill", "Marketing"],
  ["bi-shield-lock-fill", "Cyber Security"],
];

export default function Home() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadHome = async () => {
      try {
        const res = await API.get("/jobs?featured=true");

        if (!mounted) return;

        setJobs(res.data.jobs || []);
      } catch (error) {
        console.error("HOME LOAD ERROR:", error);
        if (mounted) {
          setJobs([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadHome();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="home-page">

      {/* ================= HERO ================= */}

      <section className="hero home-hero">
        <div className="hero-content home-hero-content">

          <span className="hero-tag">
            <i className="bi bi-stars" aria-hidden="true"></i>
            Smarter way to build your career
          </span>

          <h1>
            Find work that moves
            <span> your career forward.</span>
          </h1>

          <p>
            Discover approved opportunities, connect with employers, track your
            applications, and use TechBoard AI to plan your next career move.
          </p>

          <div className="hero-buttons">

            <Link to="/jobs" className="primary-button">
              <i className="bi bi-search" aria-hidden="true"></i>
              Find Jobs
            </Link>

            <Link to="/register" className="secondary-button">
              Create Account
            </Link>

          </div>

          <div className="hero-trust-row">

            <span>
              <i className="bi bi-patch-check-fill"></i>
              Verified opportunities
            </span>

            <span>
              <i className="bi bi-shield-check"></i>
              Secure profiles
            </span>

            <span>
              <i className="bi bi-robot"></i>
              AI career support
            </span>

          </div>

        </div>

        {/* ================= HERO VISUAL ================= */}

        <div className="hero-visual" aria-hidden="true">

          <div className="hero-orbit orbit-a"></div>
          <div className="hero-orbit orbit-b"></div>
          <div className="hero-glow"></div>

          <div className="hero-logo-card">
            <img src={robo} alt="" />
          </div>

          <div className="hero-floating-card hero-card-top">
            <i className="bi bi-check-circle-fill"></i>

            <span>
              <strong>Profile ready</strong>
              <small>Stand out to employers</small>
            </span>
          </div>

          <div className="hero-floating-card hero-card-bottom">
            <i className="bi bi-graph-up-arrow"></i>

            <span>
              <strong>Career growth</strong>
              <small>Track your progress</small>
            </span>
          </div>

        </div>
      </section>


      {/* ================= STATIC STATS ================= */}

      <section
        className="stats home-stats"
        aria-label="TechBoard statistics"
      >

        <div>
          <span className="home-stat-icon">
            <i className="bi bi-briefcase"></i>
          </span>

          <div>
            <strong>10K+</strong>
            <span>Jobs Available</span>
          </div>
        </div>


        <div>
          <span className="home-stat-icon">
            <i className="bi bi-buildings"></i>
          </span>

          <div>
            <strong>5K+</strong>
            <span>Companies</span>
          </div>
        </div>


        <div>
          <span className="home-stat-icon">
            <i className="bi bi-people"></i>
          </span>

          <div>
            <strong>25K+</strong>
            <span>Job Seekers</span>
          </div>
        </div>


        <div>
          <span className="home-stat-icon">
            <i className="bi bi-graph-up-arrow"></i>
          </span>

          <div>
            <strong>95%</strong>
            <span>Success Rate</span>
          </div>
        </div>

      </section>


      {/* ================= FEATURED JOBS ================= */}

      <section className="section home-section">

        <div className="section-header">

          <div>
            <span className="small-title">
              OPPORTUNITIES
            </span>

            <h2>
              Featured Jobs
            </h2>

            <p className="section-subtitle">
              Fresh roles approved by TechBoard for your next move.
            </p>
          </div>

          <Link to="/jobs">
            View all jobs <i className="bi bi-arrow-right"></i>
          </Link>

        </div>


        {loading ? (

          <div
            className="home-job-skeletons"
            aria-label="Loading jobs"
          >
            {[1, 2, 3].map((item) => (
              <div
                className="job-skeleton"
                key={item}
              ></div>
            ))}
          </div>

        ) : jobs.length > 0 ? (

          <div className="jobs-grid">

            {jobs.slice(0, 6).map((job) => (
              <JobCard
                key={job._id}
                job={job}
              />
            ))}

          </div>

        ) : (

          <div className="empty home-empty">

            <i className="bi bi-briefcase"></i>

            <h3>
              No featured jobs right now
            </h3>

            <p>
              Explore all approved jobs to find your next opportunity.
            </p>

            <Link
              to="/jobs"
              className="primary-button"
            >
              Browse Jobs
            </Link>

          </div>

        )}

      </section>


      {/* ================= HOW IT WORKS ================= */}

      <section className="home-how">

        <div className="section home-how-inner">

          <div className="section-header">

            <div>

              <span className="small-title">
                HOW IT WORKS
              </span>

              <h2>
                Everything you need in one place
              </h2>

              <p className="section-subtitle">
                From discovery to interview, TechBoard keeps your job search
                organized.
              </p>

            </div>

          </div>


          <div className="how-grid">

            <div className="how-card">

              <span>01</span>

              <i className="bi bi-search"></i>

              <h3>
                Discover
              </h3>

              <p>
                Search approved jobs by role, location, category and skills.
              </p>

            </div>


            <div className="how-card">

              <span>02</span>

              <i className="bi bi-file-earmark-person"></i>

              <h3>
                Apply
              </h3>

              <p>
                Keep your profile and resume ready, then apply in a few clicks.
              </p>

            </div>


            <div className="how-card">

              <span>03</span>

              <i className="bi bi-chat-square-text"></i>

              <h3>
                Connect
              </h3>

              <p>
                Chat with eligible recruiters and stay updated on your
                applications.
              </p>

            </div>


            <div className="how-card">

              <span>04</span>

              <i className="bi bi-robot"></i>

              <h3>
                Grow
              </h3>

              <p>
                Use TechBoard AI for skills, interviews, resumes and career
                planning.
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* ================= CATEGORIES ================= */}

      <section className="categories home-categories">

        <div className="section-header home-category-heading">

          <div>

            <span className="small-title">
              EXPLORE
            </span>

            <h2>
              Browse by category
            </h2>

            <p className="section-subtitle">
              Start with a career area that matches your goals.
            </p>

          </div>

        </div>


        <div className="category-grid">

          {categories.map(([icon, name]) => (

            <Link
              key={name}
              to={`/jobs?category=${encodeURIComponent(name)}`}
              className="category-card"
            >

              <span>
                <i
                  className={`bi ${icon}`}
                  aria-hidden="true"
                ></i>
              </span>

              <h3>
                {name}
              </h3>

              <p>
                Explore opportunities
                <i className="bi bi-arrow-up-right"></i>
              </p>

            </Link>

          ))}


          <Link
            to="/jobs"
            className="category-card category-card-all"
          >

            <span>
              <i
                className="bi bi-grid-3x3-gap"
                aria-hidden="true"
              ></i>
            </span>

            <h3>
              All Categories
            </h3>

            <p>
              Explore every opportunity
              <i className="bi bi-arrow-up-right"></i>
            </p>

          </Link>

        </div>

      </section>

    </main>
  );
}