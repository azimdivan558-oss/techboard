import User from "../models/User.js";
import JobPost from "../models/JobPost.js";
import JobApplication from "../models/JobApplication.js";
import AdminActivity from "../models/AdminActivity.js";
import Notification from "../models/Notification.js";
import Payment from "../models/Payment.js";

export const getMembershipPayments = async (req, res) => {
  try {
    const [payments, totalPayments, successfulPayments, pendingPayments, failedPayments, revenueResult] =
      await Promise.all([
        Payment.find()
          .populate("userId", "name email role")
          .populate("tierId", "name price duration")
          .sort({ createdAt: -1 })
          .lean(),

        Payment.countDocuments(),

        Payment.countDocuments({ status: "SUCCESS" }),

        Payment.countDocuments({ status: "PENDING" }),

        Payment.countDocuments({ status: "FAILED" }),

        Payment.aggregate([
          { $match: { status: "SUCCESS" } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$amount" },
            },
          },
        ]),
      ]);

    res.json({
      success: true,
      stats: {
        totalPayments,
        successfulPayments,
        pendingPayments,
        failedPayments,
        totalRevenue: revenueResult[0]?.totalRevenue || 0,
      },
      payments,
    });
  } catch (error) {
    console.error("ADMIN MEMBERSHIP PAYMENTS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load membership payments.",
    });
  }
};

const logAdminActivity = async ({ admin, action, targetType, targetId = null, description }) => {
  try {
    await AdminActivity.create({ admin, action, targetType, targetId, description });
  } catch (error) {
    // Activity logging must never break the admin action itself.
    console.error("ADMIN ACTIVITY LOG ERROR:", error.message);
  }
};

export const adminDashboard = async (req, res) => {
  try {
    const [totalUsers, totalCompanies, totalJobs, totalApplications, pendingJobs, verifiedCompanies] = await Promise.all([
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "company" }),
      JobPost.countDocuments(),
      JobApplication.countDocuments(),
      JobPost.countDocuments({ approvalStatus: "Pending" }),
      User.countDocuments({ role: "company", isVerified: true }),
    ]);

    res.json({
      success: true,
      stats: { totalUsers, totalCompanies, totalJobs, totalApplications, pendingJobs, verifiedCompanies },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    res.json(await User.find().select("-password").sort({ createdAt: -1 }));
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const blockUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "You cannot block yourself" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role === "admin") {
      return res.status(403).json({ success: false, message: "Admin accounts cannot be blocked" });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    await logAdminActivity({
      admin: req.user._id,
      action: user.isBlocked ? "Blocked User" : "Unblocked User",
      targetType: "User",
      targetId: user._id,
      description: `${user.isBlocked ? "Blocked" : "Unblocked"} user ${user.name || user.email}.`,
    });

    res.json({ success: true, message: user.isBlocked ? "User blocked" : "User unblocked" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "You cannot delete yourself" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role === "admin") {
      return res.status(403).json({ success: false, message: "Admin accounts cannot be deleted from this panel" });
    }

    await User.deleteOne({ _id: user._id });

    await logAdminActivity({
      admin: req.user._id,
      action: "Deleted User",
      targetType: user.role === "company" ? "Company" : "User",
      targetId: user._id,
      description: `Deleted ${user.role === "company" ? "company" : "user"} ${user.name || user.email}.`,
    });

    res.json({ success: true, message: "User deleted" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const getPendingJobs = async (req, res) => {
  try {
    const jobs = await JobPost.find({ approvalStatus: "Pending" })
      .populate("company", "name companyName email")
      .sort({ createdAt: -1 });

    res.json({ success: true, jobs });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const updateJobApproval = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Approved", "Rejected", "Pending"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid approval status" });
    }

    const job = await JobPost.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });

    job.approvalStatus = status;
    job.approvedBy = status === "Approved" ? req.user._id : null;
    job.approvedAt = status === "Approved" ? new Date() : null;
    job.isActive = status === "Approved";
    await job.save();

    // =====================================================
// SEND NOTIFICATION TO COMPANY
// =====================================================

try {
  await Notification.create({
    user: job.company,

    title:
      status === "Approved"
        ? "Job Approved"
        : status === "Rejected"
        ? "Job Rejected"
        : "Job Approval Updated",

    message:
      status === "Approved"
        ? `Your job "${job.title}" has been approved and is now visible to job seekers.`
        : status === "Rejected"
        ? `Your job "${job.title}" has been rejected by the admin.`
        : `The approval status of your job "${job.title}" has been changed to Pending.`,

    type: "system",

    link: "/company-dashboard",

    meta: {
      jobId: job._id,
      jobTitle: job.title,
      approvalStatus: status
    },

    read: false
  });

  console.log(
    "✅ COMPANY NOTIFICATION CREATED:",
    job.company
  );

} catch (notificationError) {
  console.error(
    "❌ COMPANY NOTIFICATION ERROR:",
    notificationError.message
  );
}

    await logAdminActivity({
      admin: req.user._id,
      action: `Job ${status}`,
      targetType: "Job",
      targetId: job._id,
      description: `Job "${job.title}" was ${status.toLowerCase()}.`,
    });

    res.json({ success: true, message: `Job ${status.toLowerCase()}`, job });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const verifyCompany = async (req, res) => {
  try {
    const company = await User.findOne({ _id: req.params.id, role: "company" });
    if (!company) return res.status(404).json({ success: false, message: "Company not found" });

    company.isVerified = !company.isVerified;
    await company.save();

    await logAdminActivity({
      admin: req.user._id,
      action: company.isVerified ? "Verified Company" : "Unverified Company",
      targetType: "Company",
      targetId: company._id,
      description: `${company.companyName || company.name} was ${company.isVerified ? "verified" : "unverified"}.`,
    });

    res.json({
      success: true,
      verified: company.isVerified,
      message: company.isVerified ? "Company verified" : "Company verification removed",
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const getAdminActivities = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);
    const activities = await AdminActivity.find()
      .populate("admin", "name email")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, activities });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
