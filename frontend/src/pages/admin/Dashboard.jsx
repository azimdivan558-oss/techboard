import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";

export default function AdminDashboard() {

  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCompanies: 0,
    totalJobs: 0,
    totalApplications: 0,
  });

  const [users, setUsers] = useState([]);
  const [pendingJobs, setPendingJobs] = useState([]);

  const [roleFilter, setRoleFilter] = useState("all");

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    const user =
      JSON.parse(
        localStorage.getItem("user")
      );

    if (!user) {
      navigate("/login");
      return;
    }

    if (user.role !== "admin") {
      navigate("/dashboard");
      return;
    }

    loadAdmin();

  }, []);

  const loadAdmin = async () => {

    try {

      const dashboard =
        await API.get(
          "/admin/dashboard"
        );

      const usersRes = await API.get("/admin/users");
      const pendingRes = await API.get("/admin/jobs/pending");

      setStats(
        dashboard.data.stats
      );

      setUsers(usersRes.data);
      setPendingJobs(pendingRes.data.jobs || []);

    } catch (error) {

      console.log(error);

    } finally {

      setLoading(false);

    }
  };

  const toggleBlock = async (id) => {

    try {

      await API.put(
        `/admin/users/${id}/block`
      );

      loadAdmin();

    } catch (error) {

      alert(
        error.response?.data?.message ||
        "Failed to update"
      );

    }
  };

  const updateJobApproval = async (id, status) => {
    try {
      await API.put(`/admin/jobs/${id}/approval`, { status });
      loadAdmin();
    } catch (error) {
      alert(error.response?.data?.message || "Unable to update job approval");
    }
  };

  const verifyCompany = async (id) => {
    try {
      await API.put(`/admin/companies/${id}/verify`);
      loadAdmin();
    } catch (error) {
      alert(error.response?.data?.message || "Unable to verify company");
    }
  };

  const deleteUser = async (id) => {

    if (
      !window.confirm(
        "Delete this account permanently?"
      )
    ) {
      return;
    }

    try {

      await API.delete(
        `/admin/users/${id}`
      );

      loadAdmin();

    } catch (error) {

      alert("Unable to delete user");

    }
  };

  // Filter users based on the selected dropdown value
  const filteredUsers = users.filter((user) => {
    if (roleFilter === "all") return true;
    return user.role === roleFilter;
  });

  if (loading) {
    return (
      <div className="loading">
        Loading admin panel...
      </div>
    );
  }

  return (
    <main className="dashboard-page">

      <div className="dashboard-container">

        {/* Header */}

        <section className="welcome-card admin-welcome">

          <div>

            <span className="small-title">
              ADMINISTRATION
            </span>

            <h1>
              Admin Dashboard
            </h1>

            <p>
              Monitor and manage the TechBoard
              platform.
            </p>

          </div>

        </section>

        {/* Stats */}

        <section className="dashboard-stats">

          <div className="dashboard-stat">

            <div className="stat-icon">
              <i className="bi bi-people-fill" aria-hidden="true"></i>
            </div>

            <div>

              <strong>
                {stats.totalUsers}
              </strong>

              <span>
                Job Seekers
              </span>

            </div>

          </div>

          <div className="dashboard-stat">

            <div className="stat-icon">
              <i className="bi bi-building" aria-hidden="true"></i>
            </div>

            <div>

              <strong>
                {stats.totalCompanies}
              </strong>

              <span>
                Companies
              </span>

            </div>

          </div>

          <div className="dashboard-stat">

            <div className="stat-icon">
              <i className="bi bi-briefcase-fill" aria-hidden="true"></i>
            </div>

            <div>

              <strong>
                {stats.totalJobs}
              </strong>

              <span>
                Jobs
              </span>

            </div>

          </div>

          <div className="dashboard-stat">

            <div className="stat-icon">
              <i className="bi bi-file-earmark-text-fill" aria-hidden="true"></i>
            </div>

            <div>

              <strong>
                {stats.totalApplications}
              </strong>

              <span>
                Applications
              </span>

            </div>

          </div>

        </section>

        {/* Pending Jobs */}
        <section className="dashboard-section">
          <div className="section-header"><div><span className="small-title">APPROVALS</span><h2>Pending Jobs ({pendingJobs.length})</h2></div></div>
          {pendingJobs.length === 0 ? <div className="empty">No pending jobs.</div> : <div className="table-container"><table><thead><tr><th>Job</th><th>Company</th><th>Posted</th><th>Action</th></tr></thead><tbody>{pendingJobs.map(job=><tr key={job._id}><td><strong>{job.title}</strong><small>{job.category} · {job.location}</small></td><td>{job.company?.companyName || job.company?.name || "Company"}<small>{job.company?.email}</small></td><td>{new Date(job.createdAt).toLocaleDateString()}</td><td><div className="table-actions"><button onClick={()=>updateJobApproval(job._id,"Approved")}>Approve</button><button className="danger-button" onClick={()=>updateJobApproval(job._id,"Rejected")}>Reject</button></div></td></tr>)}</tbody></table></div>}
        </section>

        {/* Users */}

        <section className="dashboard-section">

          <div className="section-header">

            <div>

              <span className="small-title">
                MANAGEMENT
              </span>

              <h2>
                Users & Companies
              </h2>

            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="role-filter-dropdown"
            >
              <option value="all">All</option>
              <option value="user">Job Seekers</option>
              <option value="company">Companies</option>
            </select>

          </div>

          <div className="table-container">

            <table>

              <thead>

                <tr>

                  <th>
                    Name
                  </th>

                  <th>
                    Email
                  </th>

                  <th>
                    Role
                  </th>

                  <th>
                    Joined
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredUsers.length === 0 ? (

                  <tr>
                    <td colSpan={6} className="empty">
                      No records found.
                    </td>
                  </tr>

                ) : (

                  filteredUsers.map(
                    (user) => (

                      <tr
                        key={user._id}
                      >

                        <td>

                          <strong>
                            {user.name}
                          </strong>

                        </td>

                        <td>
                          {user.email}
                        </td>

                        <td>

                          <span className="role-badge">
                            {user.role}
                          </span>

                          {user.role === "company" && user.isVerified && (
                            <span className="active-badge" style={{ marginLeft: 6 }}>
                              Verified
                            </span>
                          )}

                        </td>

                        <td>
                          {new Date(
                            user.createdAt
                          ).toLocaleDateString()}
                        </td>

                        <td>

                          {user.isBlocked ? (

                            <span className="inactive-badge">
                              Blocked
                            </span>

                          ) : (

                            <span className="active-badge">
                              Active
                            </span>

                          )}

                        </td>

                        <td>

                          <div className="table-actions">

                            {user.role === "company" && (
                              <button
                                onClick={() =>
                                  verifyCompany(
                                    user._id
                                  )
                                }
                              >
                                {user.isVerified
                                  ? "Unverify"
                                  : "Verify"}
                              </button>
                            )}

                            <button
                              onClick={() =>
                                toggleBlock(
                                  user._id
                                )
                              }
                            >
                              {user.isBlocked
                                ? "Unblock"
                                : "Block"}
                            </button>

                            <button
                              className="danger-button"
                              onClick={() =>
                                deleteUser(
                                  user._id
                                )
                              }
                            >
                              Delete
                            </button>

                          </div>

                        </td>

                      </tr>

                    )
                  )
                )}

              </tbody>

            </table>

          </div>

        </section>

      </div>

    </main>
  );
}
