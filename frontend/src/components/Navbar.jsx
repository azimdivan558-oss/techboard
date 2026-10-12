import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../services/api";
import logo from "../image/Logo.png";

export default function Navbar() {
  const nav = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const load = () => {
    try {
      setUser(JSON.parse(localStorage.getItem("user")) || null);
    } catch {
      setUser(null);
    }

    if (localStorage.getItem("token")) {
      API.get("/features/notifications")
        .then((r) =>
          setUnread((r.data.notifications || []).filter((n) => !n.read).length)
        )
        .catch(() => {});
    }
  };

  useEffect(() => {
    load();
    window.addEventListener("auth-changed", load);
    return () => window.removeEventListener("auth-changed", load);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setUnread(0);
    window.dispatchEvent(new Event("auth-changed"));
    nav("/login");
  };

  const displayName =
    user?.role === "company" ? user?.companyName || user?.name : user?.name;

  const initial = (displayName || "?").trim().charAt(0).toUpperCase();

  const roleLabel =
    user?.role === "company"
      ? "Employer"
      : user?.role === "admin"
      ? "Administrator"
      : "Job Seeker";

  const linkClass = ({ isActive }) =>
    `sidebar-link${isActive ? " active" : ""}`;

  const Item = ({ to, icon, label, end, badge }) => (
    <NavLink to={to} end={end} className={linkClass}>
      <i className={`bi ${icon}`} aria-hidden="true"></i>
      <span>{label}</span>
      {badge > 0 && (
        <span className="sidebar-badge">{badge > 9 ? "9+" : badge}</span>
      )}
    </NavLink>
  );

  return (
    <>
      {/* Top bar: hamburger opens the sidebar */}
      <header className="topbar">
        <button
          type="button"
          className="nav-toggle"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <i className="bi bi-list" aria-hidden="true"></i>
        </button>

        <Link to="/" className="logo" aria-label="TechBoard home">
          <img src={logo} alt="TechBoard" />
        </Link>

        <div className="topbar-actions">
          {!user ? (
            <>
              <Link to="/login" className="topbar-login">Login</Link>
              <Link to="/register" className="topbar-register">Register</Link>
            </>
          ) : (
            <>
              <Link to="/notifications" className="topbar-bell" aria-label="Notifications">
                <i className="bi bi-bell" aria-hidden="true"></i>
                {unread > 0 && (
                  <span className="topbar-dot">{unread > 9 ? "9+" : unread}</span>
                )}
              </Link>
              <Link to="/profile" className="navbar-avatar" title={displayName || "Profile"}>
                {initial}
              </Link>
            </>
          )}
        </div>
      </header>

      {menuOpen && (
        <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />
      )}

      <aside className={`sidebar${menuOpen ? " open" : ""}`}>
        <div className="sidebar-head">
          <Link to="/" className="sidebar-brand" aria-label="TechBoard home">
            <img src={logo} alt="TechBoard" />
          </Link>
          <button
            type="button"
            className="sidebar-close"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            <i className="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main menu">
          <div className="sidebar-label">Explore</div>
          <Item to="/" end icon="bi-house-door" label="Home" />
          <Item to="/jobs" icon="bi-briefcase" label="Jobs" />

          {user?.role === "user" && (
            <>
              <div className="sidebar-label">My Career</div>
              <Item to="/dashboard" icon="bi-grid-1x2" label="Dashboard" />
              <Item to="/my-applications" icon="bi-file-earmark-text" label="Applications" />
              <Item to="/saved-jobs" icon="bi-bookmark" label="Saved Jobs" />
              <Item to="/interviews" icon="bi-calendar-event" label="Interviews" />

              <div className="sidebar-label">Tools</div>
              <Item to="/chat" icon="bi-chat-dots" label="Chat" />
              <Item to="/ai-chat" icon="bi-robot" label="AI Assistant" />
              <Item to="/membership" icon="bi-gem" label="Membership" />
              <Item to="/notifications" icon="bi-bell" label="Notifications" badge={unread} />
            </>
          )}

          {user?.role === "company" && (
            <>
              <div className="sidebar-label">Manage</div>
              <Item to="/company-dashboard" icon="bi-grid-1x2" label="Dashboard" />
              <Item to="/post-job" icon="bi-plus-square" label="Post Job" />
              <Item to="/company-analytics" icon="bi-bar-chart" label="Analytics" />
              <Item to="/company-applications" icon="bi-file-earmark-text" label="Applications" />
              <Item to="/company-interviews" icon="bi-calendar-event" label="Interviews" />

              <div className="sidebar-label">Tools</div>
              <Item to="/chat" icon="bi-chat-dots" label="Chat" />
              <Item to="/notifications" icon="bi-bell" label="Notifications" badge={unread} />
            </>
          )}

          {user?.role === "admin" && (
            <>
              <div className="sidebar-label">Admin</div>
              
    <Item
      to="/admin-dashboard"
      icon="bi-shield-check"
      label="Admin"
    />

    <Item
      to="/company-reports"
      icon="bi-flag"
      label="Reported Jobs"
    />

    <Item
      to="/admin-reports"
      icon="bi-file-earmark-bar-graph"
      label="Reports"
    />

    <Item
      to="/admin-activity"
      icon="bi-clock-history"
      label="Activity Log"
    />

    <Item
      to="/notifications"
      icon="bi-bell"
      label="Notifications"
      badge={unread}
    />
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          {!user ? (
            <>
              <Link to="/login" className="sidebar-btn sidebar-btn-outline">
                Login
              </Link>
              <Link to="/register" className="sidebar-btn sidebar-btn-primary">
                Register
              </Link>
            </>
          ) : (
            <>
              <Link to="/profile" className="sidebar-user" title="View profile">
                <span className="navbar-avatar">{initial}</span>
                <span className="sidebar-user-info">
                  <strong>{displayName || "Profile"}</strong>
                  <small>{roleLabel}</small>
                </span>
              </Link>

              <button type="button" className="sidebar-logout" onClick={logout}>
                <i className="bi bi-box-arrow-right" aria-hidden="true"></i>
                Logout
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
