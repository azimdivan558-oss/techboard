import JobApplication from "../models/JobApplication.js";
import Message from "../models/Message.js";

export const getChat = async (req, res) => {
  try {
    const application = await JobApplication.findById(req.params.applicationId)
      .populate("applicant", "name email")
      .populate("company", "name companyName email")
      .populate("job", "title");

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    const userId = req.user._id.toString();
    const isParticipant =
      application.applicant._id.toString() === userId ||
      application.company._id.toString() === userId;

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "You are not part of this application" });
    }

    if (!["Shortlisted", "Interview", "Selected"].includes(application.status)) {
      return res.status(403).json({
        success: false,
        message: "Chat is available after the candidate is shortlisted"
      });
    }

    const conversationId = application._id.toString();
    const messages = await Message.find({ conversationId })
      .populate("sender", "name role")
      .sort({ createdAt: 1 });

    await Message.updateMany(
      { conversationId, receiver: req.user._id, read: false },
      { $set: { read: true } }
    );

    res.json({
      success: true,
      application: {
        _id: application._id,
        status: application.status,
        job: application.job,
        applicant: application.applicant,
        company: application.company
      },
      conversationId,
      messages
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const applications = await JobApplication.find({
      $or: [{ applicant: req.user._id }, { company: req.user._id }],
      status: { $in: ["Shortlisted", "Interview", "Selected"] }
    }).select("_id");

    const applicationIds = applications.map((item) => item._id);
    const count = await Message.countDocuments({
      application: { $in: applicationIds },
      receiver: req.user._id,
      read: false
    });

    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
