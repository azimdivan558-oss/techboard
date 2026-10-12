import { useEffect, useState } from "react";
import API from "../../services/api";

export default function Reports() {

  const [r, setR] = useState([]);

  const load = () =>
    API.get("/features/reports")
      .then((x) => setR(x.data.reports || []))
      .catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const update = async (id, status) => {
    await API.put(`/features/reports/${id}`, { status });
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this report permanently?")) {
      return;
    }
    try {
      await API.delete(`/features/reports/${id}`);
      load();
    } catch (error) {
      alert(error.response?.data?.message || "Unable to delete report");
    }
  };

  return (
    <main className="dashboard-page">
      <div className="dashboard-container">
        <div className="page-heading">
          <span className="small-title">MODERATION</span>
          <h1>Reported Jobs</h1>
        </div>

        {!r.length ? (
          <div className="empty">No reports.</div>
        ) : (
          r.map((x) => (
            <div className="application-card" key={x._id}>
              <div>
                <h3>{x.job?.title || "Deleted job"}</h3>
                <p>
                  Reported by: {x.reportedBy?.name} · {x.reportedBy?.email}
                </p>
                <p>Reason: {x.reason}</p>
                <p>{x.details}</p>
              </div>

              <div className="table-actions">
                <span className="status">{x.status}</span>

                <select
                  value={x.status}
                  onChange={(e) => update(x._id, e.target.value)}
                >
                  <option>Open</option>
                  <option>Reviewed</option>
                  <option>Dismissed</option>
                </select>

                <button
                  className="danger-button"
                  onClick={() => remove(x._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
