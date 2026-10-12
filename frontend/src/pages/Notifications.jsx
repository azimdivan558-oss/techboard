import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    API.get("/features/notifications")
      .then((r) => setItems(r.data.notifications || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const read = async (id) => {
    await API.put(`/features/notifications/${id}/read`);
    load();
    window.dispatchEvent(new Event("auth-changed"));
  };

  const remove = async (id) => {
    setItems((prev) => prev.filter((n) => n._id !== id));
    try {
      await API.delete(`/features/notifications/${id}`);
      window.dispatchEvent(new Event("auth-changed"));
    } catch (e) {
      load();
    }
  };

  const clearAll = async () => {
    if (!window.confirm("Delete all notifications? This cannot be undone.")) return;
    const prev = items;
    setItems([]);
    try {
      await API.delete("/features/notifications");
      window.dispatchEvent(new Event("auth-changed"));
    } catch (e) {
      setItems(prev);
    }
  };

  return (
    <main className="dashboard-page">
      <div className="dashboard-container">
        <div className="page-heading notifications-heading">
          <div>
            <span className="small-title">ACCOUNT</span>
            <h1>Notifications</h1>
          </div>

          {items.length > 0 && (
            <button className="danger-button" onClick={clearAll}>
              <i className="bi bi-trash3-fill" aria-hidden="true"></i> Clear All
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : items.length === 0 ? (
          <div className="empty">
            <h3>No notifications</h3>
            <p>You're all caught up.</p>
          </div>
        ) : (
          <div className="applications-list">
            {items.map((n) => (
              <div
                key={n._id}
                className="application-card notification-card"
                style={{ opacity: n.read ? 0.65 : 1 }}
              >
                <div
                  className={`notification-icon ${n.type === "application" ? "is-application" : ""}`}
                >
                  <i
                    className={
                      n.type === "application"
                        ? "bi bi-person-fill-add"
                        : "bi bi-bell-fill"
                    }
                    aria-hidden="true"
                  ></i>
                </div>

                <div className="application-info">
                  <h3>{n.title}</h3>
                  <p>{n.message}</p>

                  {n.meta?.applicantEmail && (
                    <small>
                      <i className="bi bi-envelope-fill" aria-hidden="true"></i>{" "}
                      {n.meta.applicantEmail}
                    </small>
                  )}

                  <small>{new Date(n.createdAt).toLocaleString()}</small>
                </div>

                <div className="application-right">
                  {n.link && (
                    <Link className="view-job" to={n.link}>
                      Open
                    </Link>
                  )}

                  {!n.read && (
                    <button className="secondary-button" onClick={() => read(n._id)}>
                      Mark read
                    </button>
                  )}

                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Delete notification"
                    onClick={() => remove(n._id)}
                  >
                    <i className="bi bi-trash3-fill" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
