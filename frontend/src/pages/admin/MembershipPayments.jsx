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
  if (["SUCCESS", "PAID", "COMPLETED"].includes(status))
    return "mp-status-success";
  if (["FAILED", "CANCELLED", "ERROR"].includes(status))
    return "mp-status-failed";
  return "mp-status-pending";
};

// Reads payment method fields if the backend stores them.
// Do not infer GPay or Card when the actual method is unknown.
const getPaymentMethod = (payment) => {
  const details = payment.paymentDetails || payment.payment_details || {};
  const paymentInfo = Array.isArray(payment.payments)
    ? payment.payments[0] || {}
    : {};

  const rawMethod =
    payment.paymentMethod ||
    payment.method ||
    payment.paymentMode ||
    payment.payment_mode ||
    payment.paymentGroup ||
    paymentInfo.paymentGroup ||
    paymentInfo.paymentMethod ||
    details.paymentMethod ||
    details.payment_method ||
    payment.channel ||
    "";

  const rawType =
    paymentInfo.paymentMethod ||
    paymentInfo.payment_method ||
    details.type ||
    "";

  const value = `${rawMethod} ${rawType}`.trim().toUpperCase();

  if (!value) return { label: "Not available", icon: "bi-question-circle" };

  if (
    value.includes("GOOGLE_PAY") ||
    value.includes("GOOGLE PAY") ||
    value.includes("GPAY") ||
    value.includes("G_PAY")
  ) {
    return { label: "Google Pay", icon: "bi-phone" };
  }

  if (
    value.includes("PHONEPE") ||
    value.includes("PHONE PE")
  ) {
    return { label: "PhonePe", icon: "bi-phone" };
  }

  if (value.includes("PAYTM")) {
    return { label: "Paytm", icon: "bi-phone" };
  }

  if (value.includes("UPI")) {
    return { label: "UPI", icon: "bi-qr-code" };
  }

  if (
    value.includes("CREDIT") ||
    value.includes("DEBIT") ||
    value.includes("CARD")
  ) {
    return { label: "Card", icon: "bi-credit-card-2-front" };
  }

  if (value.includes("NETBANKING") || value.includes("NET BANKING")) {
    return { label: "Net Banking", icon: "bi-bank" };
  }

  if (value.includes("WALLET")) {
    return { label: "Wallet", icon: "bi-wallet2" };
  }

  if (value.includes("PAYPAL")) {
    return { label: "PayPal", icon: "bi-credit-card" };
  }

  if (value.includes("CASH")) {
    return { label: "Cash", icon: "bi-cash" };
  }

  return {
    label: String(rawMethod || rawType).replace(/[_-]/g, " "),
    icon: "bi-wallet2",
  };
};

export default function MembershipPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("newest");

  const loadPayments = useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      const response = await API.get("/admin/membership-payments");
      const data = response.data;

      const records = Array.isArray(data)
        ? data
        : Array.isArray(data?.payments)
        ? data.payments
        : [];

      setPayments(records);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.response?.status === 404
            ? "Membership payments API returned 404. Check the backend route and deployment."
            : err.response?.status === 401
            ? "Your session may have expired. Please log in again."
            : err.response?.status === 403
            ? "Admin access is required to view payments."
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
    const successful = payments.filter((p) =>
      ["SUCCESS", "PAID", "COMPLETED"].includes(getStatus(p))
    );

    return {
      total: payments.length,
      successful: successful.length,
      pending: payments.filter((p) =>
        ["PENDING", "PROCESSING", "INITIATED"].includes(getStatus(p))
      ).length,
      failed: payments.filter((p) =>
        ["FAILED", "CANCELLED", "ERROR"].includes(getStatus(p))
      ).length,
      revenue: successful.reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0
      ),
    };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payments
      .filter((p) => {
        const member =
          p.userId?.name || p.user?.name || p.userName || "";
        const email = p.userId?.email || p.user?.email || p.email || "";
        const plan =
          p.tierId?.name || p.plan?.name || p.planName || p.tier || "";
        const reference =
          p.paymentId || p.orderId || p.cfPaymentId || "";
        const method = getPaymentMethod(p).label;
        const status = getStatus(p);

        const matchesSearch = [
          member,
          email,
          plan,
          reference,
          method,
          status,
        ].some((value) => String(value).toLowerCase().includes(query));

        const matchesStatus =
          statusFilter === "ALL" || status === statusFilter;

        const matchesMethod =
          methodFilter === "ALL" || method === methodFilter;

        return matchesSearch && matchesStatus && matchesMethod;
      })
      .sort((a, b) => {
        const first = new Date(a.createdAt || 0).getTime();
        const second = new Date(b.createdAt || 0).getTime();
        return sortOrder === "newest" ? second - first : first - second;
      });
  }, [payments, search, statusFilter, methodFilter, sortOrder]);

  return (
    <main className="mp-page">
      <style>{`
        .mp-page {
          --ink:#16213e; --muted:#748198; --line:#e8edf5;
          min-height:75vh; padding:28px; border-radius:18px;
          background:#f5f7fc; color:var(--ink);
        }
        .mp-page * { box-sizing:border-box; }
        .mp-header {
          display:flex; justify-content:space-between; align-items:center;
          gap:18px; flex-wrap:wrap; margin-bottom:26px;
        }
        .mp-eyebrow {
          font-size:11px; font-weight:800; color:#5b68d9;
          letter-spacing:1.5px; text-transform:uppercase; margin-bottom:8px;
        }
        .mp-title {
          margin:0 0 8px; font-size:clamp(25px,3vw,34px);
          font-weight:850; letter-spacing:-1px;
        }
        .mp-subtitle { color:var(--muted); font-size:14px; margin:0; }
        .mp-btn {
          display:inline-flex; align-items:center; justify-content:center;
          gap:8px; padding:11px 15px; border:1px solid #dce3f0;
          border-radius:10px; background:white; color:#293852;
          font-size:13px; font-weight:750; cursor:pointer;
        }
        .mp-btn:hover:not(:disabled) { border-color:#9aa9f5; color:#4c5fd0; }
        .mp-btn:disabled { opacity:.6; cursor:wait; }
        .mp-stats {
          display:grid; grid-template-columns:repeat(4,minmax(0,1fr));
          gap:15px; margin-bottom:23px;
        }
        .mp-stat {
          background:white; border:1px solid var(--line); border-radius:16px;
          padding:21px; box-shadow:0 5px 20px #192b5208; min-width:0;
        }
        .mp-stat-top {
          display:flex; justify-content:space-between; align-items:center;
          gap:8px; margin-bottom:19px;
        }
        .mp-stat-label { color:var(--muted); font-size:12px; font-weight:750; }
        .mp-stat-icon {
          width:40px; height:40px; display:grid; place-items:center;
          border-radius:12px; font-size:19px; flex-shrink:0;
        }
        .mp-purple { background:#efecff; color:#6c55d9; }
        .mp-green { background:#e4f8ed; color:#168653; }
        .mp-amber { background:#fff3d9; color:#b77912; }
        .mp-red { background:#ffebed; color:#d34859; }
        .mp-stat-value {
          font-size:clamp(21px,2vw,28px); font-weight:850;
          letter-spacing:-.7px; overflow-wrap:anywhere;
        }
        .mp-stat-foot { color:var(--muted); font-size:11px; margin-top:8px; }
        .mp-panel {
          background:white; border:1px solid var(--line); border-radius:16px;
          overflow:hidden; box-shadow:0 5px 20px #192b5208;
        }
        .mp-panel-head {
          display:flex; justify-content:space-between; align-items:center;
          flex-wrap:wrap; gap:14px; padding:21px 23px;
          border-bottom:1px solid var(--line);
        }
        .mp-panel-title { font-size:17px; font-weight:850; margin:0 0 5px; }
        .mp-panel-desc { font-size:12px; color:var(--muted); margin:0; }
        .mp-count {
          background:#eef0ff; color:#515fc8; border-radius:8px;
          padding:7px 10px; font-size:11px; font-weight:850;
        }
        .mp-filters {
          display:flex; flex-wrap:wrap; gap:11px; padding:16px 22px;
          border-bottom:1px solid var(--line);
        }
        .mp-search-wrap { flex:1 1 230px; position:relative; }
        .mp-search-icon {
          position:absolute; left:13px; top:50%; transform:translateY(-50%);
          color:#8995aa; pointer-events:none;
        }
        .mp-input,.mp-select {
          width:100%; min-height:42px; border:1px solid #dfe5ef;
          border-radius:10px; padding:10px 12px; background:white;
          color:#293852; font-size:12px; outline:none;
        }
        .mp-input { padding-left:37px; }
        .mp-input:focus,.mp-select:focus {
          border-color:#8b9af5; box-shadow:0 0 0 3px #e9ecff;
        }
        .mp-select { width:auto; min-width:135px; }
        .mp-table-wrap { width:100%; overflow-x:auto; }
        .mp-table { width:100%; min-width:1040px; border-collapse:collapse; text-align:left; }
        .mp-table th {
          background:#f8faff; color:#78859a; font-size:10px;
          text-transform:uppercase; letter-spacing:.7px; padding:14px 16px;
          white-space:nowrap; font-weight:850;
        }
        .mp-table td {
          padding:16px; border-top:1px solid #edf0f6;
          font-size:12px; vertical-align:middle;
        }
        .mp-table tbody tr:hover { background:#fafbff; }
        .mp-member { display:flex; align-items:center; gap:10px; min-width:175px; }
        .mp-avatar {
          width:38px; height:38px; flex-shrink:0; display:grid; place-items:center;
          border-radius:12px; background:#e9edff; color:#5266d6; font-weight:850;
        }
        .mp-member-name { color:#263550; font-weight:800; font-size:12px; }
        .mp-email { color:#8994a7; font-size:10px; margin-top:4px; overflow-wrap:anywhere; }
        .mp-plan,.mp-method {
          display:inline-flex; align-items:center; gap:7px; padding:7px 9px;
          border-radius:8px; font-size:11px; font-weight:750; white-space:nowrap;
        }
        .mp-plan { background:#f0edff; color:#6752c7; }
        .mp-method { border:1px solid #e4e9f2; background:#f8faff; color:#354563; }
        .mp-amount { font-weight:850; font-size:12px; white-space:nowrap; }
        .mp-reference { max-width:150px; color:#65728a; font-family:monospace; font-size:10px; overflow-wrap:anywhere; }
        .mp-status {
          display:inline-flex; align-items:center; gap:6px; padding:6px 9px;
          border-radius:30px; font-size:10px; font-weight:850; white-space:nowrap;
        }
        .mp-dot { width:6px; height:6px; border-radius:50%; background:currentColor; }
        .mp-status-success { background:#e4f8ed; color:#168653; }
        .mp-status-failed { background:#ffebed; color:#cb394c; }
        .mp-status-pending { background:#fff4dc; color:#a46a0b; }
        .mp-date { color:#66748b; white-space:nowrap; font-size:11px; }
        .mp-empty,.mp-loading { text-align:center; padding:48px 20px; color:#78859a; }
        .mp-empty-icon {
          width:52px; height:52px; display:grid; place-items:center; margin:0 auto 13px;
          border-radius:15px; background:#f0f2ff; color:#6474db; font-size:23px;
        }
        .mp-empty strong { display:block; color:#293852; margin-bottom:6px; }
        .mp-empty p { margin:0; font-size:12px; }
        .mp-error {
          border:1px solid #ffd4d8; background:#fff3f4; color:#b42335;
          border-radius:12px; padding:16px; margin-bottom:18px; font-size:13px;
        }
        .mp-error strong { display:block; margin-bottom:5px; }
        .mp-spinner {
          width:27px; height:27px; display:inline-block; border-radius:50%;
          border:3px solid #e1e6ff; border-top-color:#5a6de0;
          animation:mp-spin .7s linear infinite; margin-bottom:12px;
        }
        @keyframes mp-spin { to { transform:rotate(360deg); } }
        .mp-footer {
          display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;
          padding:15px 22px; border-top:1px solid var(--line);
          color:#7c889c; font-size:11px;
        }
        @media(max-width:1100px) { .mp-stats { grid-template-columns:repeat(2,minmax(0,1fr)); } }
        @media(max-width:600px) {
          .mp-page { padding:14px; }
          .mp-stats { gap:10px; }
          .mp-stat { padding:14px; }
          .mp-stat-icon { width:34px; height:34px; }
          .mp-panel-head,.mp-filters { padding:14px; }
          .mp-select { flex:1; min-width:0; }
        }
      `}</style>

      <header className="mp-header">
        <div>
          <div className="mp-eyebrow">Administration / Finance</div>
          <h1 className="mp-title">Membership Payments</h1>
          <p className="mp-subtitle">
            Monitor subscription revenue and review transaction activity.
          </p>
        </div>

        <button
          type="button"
          className="mp-btn"
          onClick={() => loadPayments(true)}
          disabled={loading || refreshing}
        >
          <i className="bi bi-arrow-clockwise" />
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

      <section className="mp-stats">
        <article className="mp-stat">
          <div className="mp-stat-top">
            <span className="mp-stat-label">Successful Revenue</span>
            <span className="mp-stat-icon mp-purple"><i className="bi bi-currency-rupee" /></span>
          </div>
          <div className="mp-stat-value">{formatCurrency(stats.revenue)}</div>
          <div className="mp-stat-foot">From successful payments</div>
        </article>

        <article className="mp-stat">
          <div className="mp-stat-top">
            <span className="mp-stat-label">Total Transactions</span>
            <span className="mp-stat-icon mp-green"><i className="bi bi-receipt" /></span>
          </div>
          <div className="mp-stat-value">{stats.total.toLocaleString("en-IN")}</div>
          <div className="mp-stat-foot">All returned payment records</div>
        </article>

        <article className="mp-stat">
          <div className="mp-stat-top">
            <span className="mp-stat-label">Pending Payments</span>
            <span className="mp-stat-icon mp-amber"><i className="bi bi-hourglass-split" /></span>
          </div>
          <div className="mp-stat-value">{stats.pending.toLocaleString("en-IN")}</div>
          <div className="mp-stat-foot">Awaiting payment confirmation</div>
        </article>

        <article className="mp-stat">
          <div className="mp-stat-top">
            <span className="mp-stat-label">Failed Payments</span>
            <span className="mp-stat-icon mp-red"><i className="bi bi-x-circle" /></span>
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
              Search payments by member, reference, plan or payment method.
            </p>
          </div>
          <span className="mp-count">{filteredPayments.length} RECORDS</span>
        </div>

        <div className="mp-filters">
          <div className="mp-search-wrap">
            <i className="bi bi-search mp-search-icon" />
            <input
              className="mp-input"
              type="search"
              placeholder="Search member, email, plan, payment ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search payments"
            />
          </div>

          <select className="mp-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
            <option value="ALL">All statuses</option>
            <option value="SUCCESS">Successful</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="PROCESSING">Processing</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select className="mp-select" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} aria-label="Filter by payment method">
            <option value="ALL">All methods</option>
            {[...new Set(payments.map((p) => getPaymentMethod(p).label))]
              .map((method) => <option key={method} value={method}>{method}</option>)}
          </select>

          <select className="mp-select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} aria-label="Sort by date">
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
                  <th>Membership Plan</th>
                  <th>Amount</th>
                  <th>Payment Reference</th>
                  <th>Payment Method</th>
                  <th>Status</th>
                  <th>Payment Date</th>
                </tr>
              </thead>

              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="mp-empty">
                        <div className="mp-empty-icon"><i className="bi bi-receipt-cutoff" /></div>
                        <strong>{payments.length === 0 ? "No payment records yet" : "No matching transactions"}</strong>
                        <p>{payments.length === 0 ? "Transactions will appear when the backend returns payment records." : "Try a different search term or clear the filters."}</p>
                        {(search || statusFilter !== "ALL" || methodFilter !== "ALL") && (
                          <button
                            className="mp-btn"
                            style={{ marginTop: 15 }}
                            onClick={() => {
                              setSearch("");
                              setStatusFilter("ALL");
                              setMethodFilter("ALL");
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
                    const reference =
                      payment.paymentId ||
                      payment.orderId ||
                      payment.cfPaymentId ||
                      payment._id ||
                      "—";
                    const method = getPaymentMethod(payment);

                    return (
                      <tr key={payment._id || reference || index}>
                        <td>
                          <div className="mp-member">
                            <div className="mp-avatar">{memberName.trim().charAt(0).toUpperCase() || "M"}</div>
                            <div>
                              <div className="mp-member-name">{memberName}</div>
                              <div className="mp-email">{email || "Email unavailable"}</div>
                            </div>
                          </div>
                        </td>

                        <td><span className="mp-plan"><i className="bi bi-gem" />{plan}</span></td>
                        <td className="mp-amount">{formatCurrency(payment.amount)}</td>
                        <td><div className="mp-reference" title={reference}>{reference}</div></td>

                        <td>
                          <span className="mp-method">
                            <i className={`bi ${method.icon}`} />
                            {method.label}
                          </span>
                        </td>

                        <td>
                          <span className={`mp-status ${getStatusStyle(status)}`}>
                            <span className="mp-dot" />
                            {status}
                          </span>
                        </td>

                        <td className="mp-date">{formatDate(payment.createdAt)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        <footer className="mp-footer">
          <span>Showing {filteredPayments.length} of {payments.length} transactions</span>
          <span><i className="bi bi-shield-check me-1" /> Admin transaction overview</span>
        </footer>
      </section>
    </main>
  );
}