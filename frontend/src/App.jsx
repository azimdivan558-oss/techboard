import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Jobs from "./pages/Jobs";
import Dashboard from "./pages/Dashboard";
import CompanyDashboard from "./pages/company/Dashboard";
import AdminDashboard from "./pages/admin/Dashboard";
import PostJob from "./pages/company/NewJob";
import MyApplications from "./pages/company/Applications";
import SavedApplications from "./pages/user/Applications";
import JobDetails from "./pages/JobDetails";
import Footer from "./components/Footer";
import ForgotPassword from "./pages/ForgotPassword";
import Analytics from "./pages/company/Analytics";
import SavedJobs from "./pages/user/SavedJobs";
import Profile from "./pages/user/Profile";
import Interviews from "./pages/user/Interviews";
import Notifications from "./pages/Notifications";
import CompanyInterviews from "./pages/company/Interviews";
import AdminReports from "./pages/admin/Reports";
import ActivityLogs from "./pages/admin/ActivityLogs";
import Chat from "./pages/chat/Chat";
import AIChat from "./pages/chat/AIChat";
import Membership from "./pages/Membership";
import ReportCenter from "./pages/ReportCenter";

function App() {
  return (
    <div className="app-shell">
      <Navbar />

      <div className="app-main">
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route path="/jobs" element={<Jobs />} />

        <Route path="/job/:id" element={<JobDetails />} />

        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/Dashboard" element={<Dashboard />} />

        <Route
          path="/company-dashboard"
          element={<CompanyDashboard />}
        />

        <Route
          path="/admin-dashboard"
          element={<AdminDashboard />}
        />

        <Route path="/post-job" element={<PostJob />} />
        <Route path="/company-analytics" element={<Analytics />} />

        <Route
          path="/my-applications"
          element={<SavedApplications />}
        />
        <Route
          path="/company-applications"
          element={<MyApplications />}
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/saved-jobs" element={<SavedJobs />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/interviews" element={<Interviews />} />
        <Route path="/company-interviews" element={<CompanyInterviews />} />
        <Route path="/admin-reports" element={<AdminReports />} />
        <Route path="/company-reports" element={<ReportCenter />} />
        <Route path="/admin-activity" element={<ActivityLogs />} />
        <Route path="/notifications" element={<Notifications />} />

       <Route path="/chat" element={<Chat />} />

       <Route path="/ai-chat" element={<AIChat />} />

       <Route
  path="/membership"
  element={<Membership />}
/>
      </Routes>

       <Footer />
      </div>
    </div>
  );
}

export default App;