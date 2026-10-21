import { useEffect, useState } from "react";
import API from "../../api/axios";

export default function MembershipPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    API.get("/admin/membership-payments")
      .then((res) => {
        setPayments(res.data.payments || []);
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ||
          "Unable to load membership payments."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const revenue = payments
    .filter((p) => p.status === "SUCCESS")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <div className="container-fluid py-4">
      <h2>Membership Payments</h2>
      <p>Manage member subscriptions and transactions.</p>

      <div className="card p-4 mb-4">
        <small>Total Successful Revenue</small>
        <h3>
          {revenue.toLocaleString("en-IN", {
            style: "currency",
            currency: "INR",
          })}
        </h3>
        <span>{payments.length} transactions</span>
      </div>

      {loading ? (
        <p>Loading payments...</p>
      ) : error ? (
        <p className="text-danger">{error}</p>
      ) : (
        <div className="card p-3">
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Payment ID</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p._id}>
                      <td>
                        <strong>
                          {p.userId?.name || "Unknown"}
                        </strong>
                        <div className="text-muted small">
                          {p.userId?.email || "—"}
                        </div>
                      </td>

                      <td>{p.tierId?.name || "Membership"}</td>

                      <td>
                        ₹{Number(p.amount || 0).toLocaleString("en-IN")}
                      </td>

                      <td>{p.paymentId || p.orderId || "—"}</td>

                      <td>
                        <span
                          className={`badge ${
                            p.status === "SUCCESS"
                              ? "bg-success"
                              : p.status === "FAILED"
                              ? "bg-danger"
                              : "bg-warning text-dark"
                          }`}
                        >
                          {p.status || "PENDING"}
                        </span>
                      </td>

                      <td>
                        {p.createdAt
                          ? new Date(p.createdAt).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}