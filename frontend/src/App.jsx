import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";

/* ---------- Public pages ---------- */
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));

/* ---------- Common (login zaroori) ---------- */
const Home = lazy(() => import("./pages/Home"));
const Jobs = lazy(() => import("./pages/Jobs"));
const JobDetails = lazy(() => import("./pages/JobDetails"));
const Profile = lazy(() => import("./pages/user/Profile"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Chat = lazy(() => import("./pages/chat/Chat"));
const AIChat = lazy(() => import("./pages/chat/AIChat"));
const Membership = lazy(() => import("./pages/Membership"));

/* ---------- User pages ---------- */
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SavedApplications = lazy(() => import("./pages/user/Applications"));
const SavedJobs = lazy(() => import("./pages/user/SavedJobs"));
const Interviews = lazy(() => import("./pages/user/Interviews"));

/* ---------- Company pages ---------- */
const CompanyDashboard = lazy(() => import("./pages/company/Dashboard"));
const PostJob = lazy(() => import("./pages/company/NewJob"));
const CompanyApplications = lazy(() => import("./pages/company/Applications"));
const Analytics = lazy(() => import("./pages/company/Analytics"));
const CompanyInterviews = lazy(() => import("./pages/company/Interviews"));
const ReportCenter = lazy(() => import("./pages/ReportCenter"));

/* ---------- Admin pages ---------- */
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminReports = lazy(() => import("./pages/admin/Reports"));
const ActivityLogs = lazy(() => import("./pages/admin/ActivityLogs"));

function PageLoader() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
      Loading...
    </div>
  );
}

function App() {
  return (
    <div className="app-shell">
      <Navbar />

      <div className="app-main">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ===== PUBLIC ===== */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/" element={<Home />} />
            <Route path="/jobs" element={<Jobs />} />

            {/* ===== LOGIN ZAROORI (sab roles) ===== */}
            <Route element={<ProtectedRoute />}>             
              <Route path="/job/:id" element={<JobDetails />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/ai-chat" element={<AIChat />} />
              <Route path="/membership" element={<Membership />} />
            </Route>

            {/* ===== SIRF USER ===== */}
            <Route element={<ProtectedRoute roles={["user"]} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/my-applications" element={<SavedApplications />} />
              <Route path="/saved-jobs" element={<SavedJobs />} />
              <Route path="/interviews" element={<Interviews />} />
            </Route>

            {/* ===== SIRF COMPANY ===== */}
            <Route element={<ProtectedRoute roles={["company"]} />}>
              <Route path="/company-dashboard" element={<CompanyDashboard />} />
              <Route path="/post-job" element={<PostJob />} />
              <Route path="/company-applications" element={<CompanyApplications />} />
              <Route path="/company-analytics" element={<Analytics />} />
              <Route path="/company-interviews" element={<CompanyInterviews />} />
              
            </Route>

            {/* ===== SIRF ADMIN ===== */}
            <Route element={<ProtectedRoute roles={["admin"]} />}>
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              <Route path="/company-reports" element={<ReportCenter />} />
              <Route path="/admin-reports" element={<AdminReports />} />
              <Route path="/admin-activity" element={<ActivityLogs />} />
            </Route>

            {/* Galat URL */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>

        <Footer />
      </div>
    </div>
  );
}

export default App;