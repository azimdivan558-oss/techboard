import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function ProtectedRoute({ roles }) {
  const location = useLocation();

  const token = localStorage.getItem("token");

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  // 1. Login nahi hai to login page par bhejo
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 2. Role allowed nahi hai to uska apna dashboard dikhao
  if (roles && !roles.includes(user?.role)) {
    const home =
      user?.role === "admin"
        ? "/admin-dashboard"
        : user?.role === "company"
        ? "/company-dashboard"
        : "/dashboard";

    return <Navigate to={home} replace />;
  }

  // 3. Sab theek hai to page dikhao
  return <Outlet />;
}