import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../../services/api";

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStatus = (payment) =>
  String(payment.status || "PENDING").toUpperCase();

const getStatusStyle = (status) => {
  if (["SUCCESS", "PAID", "COMPLETED"].includes(status)) {
    return "mp-status-success";
  }

  if (["FAILED", "CANCELLED", "ERROR"].includes(status)) {
    return "mp-status-failed";
  }

  return "mp-status-pending";
};

export default function MembershipPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("newest");

  const loadPayments = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await API.get("/admin/membership-payments");
      const result = response.data;

      const records = Array.isArray(result)
        ? result
        : Array.isArray(result?.payments)
        ? result.payments
        : [];

      setPayments(records);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.response?.status === 404
            ? "Membership payments API was not found. Check the backend route and Render deployment."
            : err.response?.status === 401
            ? "Your session has expired. Please log in again."
            : err.response?.status === 403
            ? "You do not have permission to view these transactions."
            : "Unable to load payment records. Please try again.")
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const stats = useMemo(() => {
    const successful = payments.filter((payment) =>
      ["SUCCESS", "PAID", "COMPLETED"].includes(getStatus(payment))
    );

    const pending = payments.filter((payment) =>
      ["PENDING", "PROCESSING", "INITIATED"].includes(getStatus(payment))
    );

    const failed = payments.filter((payment) =>
      ["FAILED", "CANCELLED", "ERROR"].includes(getStatus(payment))
    );

    return {
      total: payments.length,
      successful: successful.length,
      pending: pending.length,
      failed: failed.length,
      revenue: successful.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      ),
    };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payments
      .filter((payment) => {
        const status = getStatus(payment);

        const memberName =
          payment.userId?.name ||
          payment.user?.name ||
          payment.userName ||
          "";

        const email =
          payment.userId?.email ||
          payment.user?.email ||
          payment.email ||
          "";

        const plan =
          payment.tierId?.name ||
          payment.plan?.name ||
          payment.planName ||
          payment.tier ||
          "";

        const paymentId =
          payment.paymentId ||
          payment.orderId ||
          payment.cfPaymentId ||
          "";

        const matchesSearch = [
          memberName,
          email,
          plan,
          paymentId,
          status,
        ].some((value) => String(value).toLowerCase().includes(query));

        const matchesStatus =
          statusFilter === "ALL" || status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const first = new Date(a.createdAt || 0).getTime();
        const second = new Date(b.createdAt || 0).getTime();

        return sortOrder === "newest" ? second - first : first - second;
      });
  }, [payments, search, statusFilter, sortOrder]);

  return (
    <div className="mp-page">
      <style>{`
        .mp-page {
          --mp-ink: #14213d;
          --mp-muted: #718096;
          --mp-line: #e8edf5;
          color: var(--mp-ink);
          padding: 28px;
          min-height: 75vh;
          background: #f5f7fc;
          border-radius: 18px;
        }
        .mp-page * { box-sizing: border-box; }
        .mp-header {
          display:flex; justify-content:space-between; align-items:center;
          gap:18px; flex-wrap:wrap; margin-bottom:28px;
        }
        .mp-eyebrow {
          color:#5268d9; text-transform:uppercase; letter-spacing:1.6px;
          font-size:11px; font-weight:800; margin-bottom:8px;
        }
        .mp-title {
          font-size:clamp(25px, 3vw, 34px); letter-spacing:-1.1px;
          font-weight:850; margin:0 0 8px; color:#14213d;
        }
        .mp-subtitle { color:var(--mp-muted); margin:0; font-size:14px; }
        .mp-btn {
          display:inline-flex; align-items:center; justify-content:center;
          gap:9px; padding:11px 16px; border:1px solid #dce3f0;
          border-radius:11px; background:white; color:#253653;
          font-weight:700; font-size:13px; cursor:pointer;
          transition:all .2s ease;
        }
        .mp-btn:hover:not(:disabled) {
          border-color:#9baaf8; color:#4559cc; transform:translateY(-1px);
        }
        .mp-btn:disabled { opacity:.65; cursor:wait; }
        .mp-stats {
          display:grid; grid-template-columns:repeat(4,minmax(0,1fr));
          gap:16px; margin-bottom:24px;
        }
        .mp-stat {
          background:#fff; border:1px solid var(--mp-line);
          border-radius:17px; padding:21px; min-width:0;
          box-shadow:0 5px 20px rgba(25,43,82,.035);
        }
        .mp-stat-top {
          display:flex; justify-content:space-between; align-items:center;
          gap:8px; margin-bottom:21px;
        }
        .mp-stat-label { color:var(--mp-muted); font-size:12px; font-weight:700; }
        .mp-stat-icon {
          width:42px; height:42px; display:grid; place-items:center;
          border-radius:13px; font-size:20px; flex-shrink:0;
        }
        .mp-icon-purple { background:#eeebff; color:#6d54dd; }
        .mp-icon-green { background:#e3f8ed; color:#16945b; }
        .mp-icon-amber { background:#fff3d9; color:#c18316; }
        .mp-icon-red { background:#ffebed; color:#d84b5b; }
        .mp-stat-value {
          font-size:clamp(22px,2vw,29px); line-height:1.15;
          font-weight:850; letter-spacing:-.8px; overflow-wrap:anywhere;
        }
        .mp-stat-foot { margin-top:9px; color:var(--mp-muted); font-size:12px; }
        .mp-panel {
          background:white; border:1px solid var(--mp-line);
          border-radius:17px; overflow:hidden;
          box-shadow:0 5px 20px rgba(25,43,82,.035);
        }
        .mp-panel-head {
          padding:21px 23px; display:flex; align-items:center;
          justify-content:space-between; gap:14px; flex-wrap:wrap;
          border-bottom:1px solid var(--mp-line);
        }
        .mp-panel-title { font-size:17px; font-weight:800; margin:0 0 5px; }
        .mp-panel-desc { font-size:12px; color:var(--mp-muted); margin:0; }
        .mp-count {
          background:#eef1ff; color:#4d5dd0; border-radius:8px;
          padding:6px 10px; font-size:12px; font-weight:800;
        }
        .mp-filters {
          padding:17px 23px; display:flex; gap:12px;
          flex-wrap:wrap; border-bottom:1px solid var(--mp-line);
        }
        .mp-search-wrap { flex:1 1 250px; position:relative; }
        .mp-search-icon {
          position:absolute; left:13px; top:50%; transform:translateY(-50%);
          color:#8895aa; font-size:16px; pointer-events:none;
        }
        .mp-input, .mp-select {
          width:100%; min-height:43px; border:1px solid #dfe5ef;
          border-radius:10px; padding:10px 12px; outline:none;
          color:#293852; background:white; font-size:13px;
        }
        .mp-input { padding-left:38px; }
        .mp-input:focus, .mp-select:focus {
          border-color:#8495f6; box-shadow:0 0 0 3px #e9ecff;
        }
        .mp-select { width:auto; min-width:145px; }
        .mp-table-wrap { width:100%; overflow-x:auto; }
        .mp-table {
          width:100%; min-width:830px; border-collapse:collapse;
          text-align:left;
        }
        .mp-table th {
          background:#f8faff; color:#78859a; font-size:10px;
          text-transform:uppercase; letter-spacing:.8px;
          padding:14px 19px; white-space:nowrap; font-weight:800;
        }
        .mp-table td {
          padding:17px 19px; border-top:1px solid #edf0f6;
          font-size:12px; vertical-align:middle;
        }
        .mp-table tbody tr { transition:background .15s ease; }
        .mp-table tbody tr:hover { background:#fafbff; }
        .mp-member { display:flex; align-items:center; gap:11px; min-width:180px; }
        .mp-avatar {
          width:39px; height:39px; flex-shrink:0; display:grid;
          place-items:center; border-radius:12px; background:#e9edff;
          color:#5366d8; font-size:14px; font-weight:850;
        }
        .mp-member-name { font-size:12px; font-weight:800; color:#23324d; }
        .mp-email {
          color:#8994a7; font-size:11px; margin-top:4px;
          max-width:210px; overflow-wrap:anywhere;
        }
        .mp-plan {
          display:inline-flex; align-items:center; gap:7px;
          background:#f1efff; color:#6853ca; border-radius:8px;
          padding:7px 10px; font-size:11px; font-weight:800;
        }
        .mp-amount { font-size:13px; font-weight:850; white-space:nowrap; }
        .mp-payment-id {
          color:#64728a; font-family:monospace; font-size:11px;
          overflow-wrap:anywhere; max-width:160px;
        }
        .mp-status {
          display:inline-flex; align-items:center; gap:6px;
          padding:6px 9px; border-radius:30px;
          font-size:10px; font-weight:850; white-space:nowrap;
        }
        .mp-status-dot { width:6px; height:6px; border-radius:50%; background:currentColor; }
        .mp-status-success { background:#e4f8ed; color:#168653; }
        .mp-status-failed { background:#ffebed; color:#cb394c; }
        .mp-status-pending { background:#fff4dc; color:#a46a0b; }
        .mp-date { color:#66748b; white-space:nowrap; font-size:11px; }
        .mp-empty { text-align:center; padding:55px 20px; color:#78859a; }
        .mp-empty-icon {
          width:54px; height:54px; display:grid; place-items:center;
          border-radius:16px; margin:0 auto 14px; background:#f0f2ff;
          color:#6474db; font-size:24px;
        }
        .mp-empty strong { display:block; color:#293852; margin-bottom:6px; }
        .mp-empty p { margin:0; font-size:12px; }
        .mp-error {
          border:1px solid #ffd4d8; background:#fff3f4; color:#b42335;
          border-radius:13px; padding:17px; margin-bottom:18px; font-size:13px;
        }
        .mp-error strong { display:block; margin-bottom:5px; }
        .mp-loading { text-align:center; padding:55px 20px; color:#78859a; }
        .mp-spinner {
          width:27px; height:27px; display:inline-block; border-radius:50%;
          border:3px solid #e1e6ff; border-top-color:#5a6de0;
          animation:mp-spin .7s linear infinite; margin-bottom:12px;
        }
        @keyframes mp-spin { to { transform:rotate(360deg); } }
        .mp-footer {
          display:flex; justify-content:space-between; gap:12px;
          padding:15px 22px; border-top:1px solid var(--mp-line);
          color:#7c889c; font-size:11px; flex-wrap:wrap;
        }
        @media(max-width:1100px) {
          .mp-stats { grid-template-columns:repeat(2,minmax(0,1fr)); }
        }
        @media(max-width:600px) {
          .mp-page { padding:15px; border-radius:12px; }
          .mp-stats { gap:10px; }
          .mp-stat { padding:15px; border-radius:13px; }
          .mp-stat-icon { width:35px; height:35px; font-size:17px; }
          .mp-stat-top { margin-bottom:16px; }
          .mp-panel-head, .mp-filters { padding:15px; }
          .mp-select { flex:1; min-width:0; }
        }
      `}</style>

      <header className="mp-header">
        <div>
          <div className="mp-eyebrow">Administration / Finance</div>
          <h1 className="mp-title">Membership Payments</h1>
          <p className="mp-subtitle">
            Monitor subscription revenue and manage transaction activity.
          </p>
        </div>

        <button
          type="button"
          className="mp-btn"
          onClick={() => loadPayments(true)}
          disabled={loading || refreshing}
        >
          <i className={`bi ${refreshing ? "bi-arrow-repeat" : "bi-arrow-clockwise"}`} />
          {refreshing ? "Refreshing..." : "Refresh data"}
        </button>
      </header>

      {error && (
        <div className="mp-error" role="alert">
          <strong>
            <i className="bi bi-exclamation-triangle me-2" />
            Unable to load transactions
          </strong>
          {error}
          <div style={{ marginTop: 12 }}>
            <button className="mp-btn" onClick={() => loadPayments()}>
              Try again
            </button>
          </div>
        </div>
      )}

      <section className="mp-stats" aria-label="Payment statistics">
        <article className="mp-stat">
          <div className="mp-stat-top">
            <span className="mp-stat-label">Successful Revenue</span>
            <span className="mp-stat-icon mp-icon-purple">
              <i className="bi bi-currency-rupee" />
            </span>
          </div>
          <div className="mp-stat-value">{formatCurrency(stats.revenue)}</div>
          <div className="mp-stat-foot">From successful payments</div>
        </article>

        <article className="mp-stat">
          <div className="mp-stat-top">
            <span className="mp-stat-label">Total Transactions</span>
            <span className="mp-stat-icon mp-icon-green">
              <i className="bi bi-receipt" />
            </span>
          </div>
          <div className="mp-stat-value">{stats.total.toLocaleString("en-IN")}</div>
          <div className="mp-stat-foot">All returned payment records</div>
        </article>

        <article className="mp-stat">
          <div className="mp-stat-top">
            <span className="mp-stat-label">Pending Payments</span>
            <span className="mp-stat-icon mp-icon-amber">
              <i className="bi bi-hourglass-split" />
            </span>
          </div>
          <div className="mp-stat-value">{stats.pending.toLocaleString("en-IN")}</div>
          <div className="mp-stat-foot">Awaiting final payment status</div>
        </article>

        <article className="mp-stat">
          <div className="mp-stat-top">
            <span className="mp-stat-label">Failed Payments</span>
            <span className="mp-stat-icon mp-icon-red">
              <i className="bi bi-x-circle" />
            </span>
          </div>
          <div className="mp-stat-value">{stats.failed.toLocaleString("en-IN")}</div>
          <div className="mp-stat-foot">Failed or cancelled transactions</div>
        </article>
      </section>

      <section className="mp-panel">
        <div className="mp-panel-head">
          <div>
            <h2 className="mp-panel-title">Transaction History</h2>
            <p className="mp-panel-desc">
              Search and filter membership payment records.
            </p>
          </div>
          <span className="mp-count">
            {filteredPayments.length} RECORDS
          </span>
        </div>

        <div className="mp-filters">
          <div className="mp-search-wrap">
            <i className="bi bi-search mp-search-icon" />
            <input
              className="mp-input"
              type="search"
              placeholder="Search member, email, plan or payment ID..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search payments"
            />
          </div>

          <select
            className="mp-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by payment status"
          >
            <option value="ALL">All statuses</option>
            <option value="SUCCESS">Successful</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="PROCESSING">Processing</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            className="mp-select"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            aria-label="Sort payments by date"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        {loading ? (
          <div className="mp-loading">
            <span className="mp-spinner" />
            <div>Loading payment transactions...</div>
          </div>
        ) : (
          <div className="mp-table-wrap">
            <table className="mp-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Membership plan</th>
                  <th>Amount</th>
                  <th>Payment reference</th>
                  <th>Status</th>
                  <th>Payment date</th>
                </tr>
              </thead>

              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="mp-empty">
                        <div className="mp-empty-icon">
                          <i className="bi bi-receipt-cutoff" />
                        </div>
                        <strong>
                          {payments.length === 0
                            ? "No payment records yet"
                            : "No matching transactions"}
                        </strong>
                        <p>
                          {payments.length === 0
                            ? "Membership transactions will appear here when available."
                            : "Try another search term or change your filters."}
                        </p>
                        {(search || statusFilter !== "ALL") && (
                          <button
                            className="mp-btn"
                            style={{ marginTop: 15 }}
                            onClick={() => {
                              setSearch("");
                              setStatusFilter("ALL");
                            }}
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment, index) => {
                    const status = getStatus(payment);
                    const memberName =
                      payment.userId?.name ||
                      payment.user?.name ||
                      payment.userName ||
                      "Unknown member";

                    const email =
                      payment.userId?.email ||
                      payment.user?.email ||
                      payment.email ||
                      "";

                    const plan =
                      payment.tierId?.name ||
                      payment.plan?.name ||
                      payment.planName ||
                      payment.tier ||
                      "Membership";

                    const paymentId =
                      payment.paymentId ||
                      payment.orderId ||
                      payment.cfPaymentId ||
                      payment._id ||
                      "—";

                    return (
                      <tr key={payment._id || paymentId || index}>
                        <td>
                          <div className="mp-member">
                            <div className="mp-avatar">
                              {memberName.trim().charAt(0).toUpperCase() || "M"}
                            </div>
                            <div>
                              <div className="mp-member-name">{memberName}</div>
                              <div className="mp-email">{email || "Email unavailable"}</div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="mp-plan">
                            <i className="bi bi-gem" />
                            {plan}
                          </span>
                        </td>

                        <td className="mp-amount">
                          {formatCurrency(payment.amount)}
                        </td>

                        <td>
                          <div className="mp-payment-id" title={paymentId}>
                            {paymentId}
                          </div>
                        </td>

                        <td>
                          <span className={`mp-status ${getStatusStyle(status)}`}>
                            <span className="mp-status-dot" />
                            {status}
                          </span>
                        </td>

                        <td className="mp-date">
                          {formatDate(payment.createdAt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mp-footer">
          <span>
            Showing {filteredPayments.length} of {payments.length} transactions
          </span>
          <span>
            <i className="bi bi-shield-check me-1" />
            Admin transaction overview
          </span>
        </div>
      </section>
    </div>
  );
}