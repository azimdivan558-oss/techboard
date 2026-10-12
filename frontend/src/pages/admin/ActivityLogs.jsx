import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";

const actionIcons = {
  "Job Approved": "bi-check-circle",
  "Job Rejected": "bi-x-circle",
  "Job Pending": "bi-hourglass-split",
  "Blocked User": "bi-person-lock",
  "Unblocked User": "bi-person-check",
  "Deleted User": "bi-person-x",
  "Verified Company": "bi-patch-check",
  "Unverified Company": "bi-patch-exclamation",
};

export default function ActivityLogs() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role !== "admin") {
      navigate("/dashboard");
      return;
    }
    loadActivities();
  }, [navigate]);

  const loadActivities = async () => {
    try {
      const res = await API.get("/admin/activities?limit=200");
      setActivities(res.data.activities || []);
    } catch (error) {
      console.error("ACTIVITY LOG ERROR:", error);
    } finally {
      setLoading(false);
    }
  };

  const visibleActivities = useMemo(() => {
    const query = search.trim().toLowerCase();

    return activities.filter((item) => {
      const typeMatch = filter === "all" || item.targetType === filter;
      const text = `${item.action} ${item.description} ${item.admin?.name || ""} ${item.admin?.email || ""}`.toLowerCase();
      return typeMatch && (!query || text.includes(query));
    });
  }, [activities, filter, search]);

  if (loading) {
    return <div className="loading">Loading activity logs...</div>;
  }

  return (
    <main className="dashboard-page">
      <div className="dashboard-container">
        <section className="page-heading activity-heading">
          <div>
            <span className="small-title">AUDIT TRAIL</span>
            <h1>Admin Activity</h1>
            <p>Review important actions performed across the TechBoard platform.</p>
          </div>
          <button className="secondary-button" onClick={loadActivities}>
            <i className="bi bi-arrow-clockwise" aria-hidden="true" /> Refresh
          </button>
        </section>

        <section className="activity-toolbar">
          <div className="activity-search">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search activities..."
              aria-label="Search activities"
            />
          </div>

          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter activity type">
            <option value="all">All activity</option>
            <option value="Job">Jobs</option>
            <option value="User">Users</option>
            <option value="Company">Companies</option>
            <option value="Membership">Memberships</option>
            <option value="System">System</option>
          </select>
        </section>

        <section className="activity-list-card">
          {visibleActivities.length === 0 ? (
            <div className="empty activity-empty">
              <i className="bi bi-clock-history" aria-hidden="true" />
              <h3>No activity found</h3>
              <p>Admin actions will appear here automatically.</p>
            </div>
          ) : (
            <div className="activity-list">
              {visibleActivities.map((item) => (
                <article className="activity-row" key={item._id}>
                  <div className="activity-action-icon">
                    <i className={`bi ${actionIcons[item.action] || "bi-activity"}`} aria-hidden="true" />
                  </div>
                  <div className="activity-main">
                    <div className="activity-row-top">
                      <strong>{item.action}</strong>
                      <time dateTime={item.createdAt}>
                        {new Date(item.createdAt).toLocaleString()}
                      </time>
                    </div>
                    <p>{item.description}</p>
                    <span>
                      <i className="bi bi-person" aria-hidden="true" />
                      {item.admin?.name || item.admin?.email || "Administrator"}
                      <b>{item.targetType}</b>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
