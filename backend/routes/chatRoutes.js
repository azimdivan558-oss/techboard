import express from "express";
import { protect } from "../middleware/auth.js";
import JobApplication from "../models/JobApplication.js";
import Message from "../models/Message.js";

const router = express.Router();

/*
========================================
GET CHAT CONTACTS
========================================
*/

router.get("/contacts", protect, async (req, res) => {
  try {
    let contacts = [];

    /*
    ========================================
    COMPANY -> CANDIDATES
    ========================================
    */

    if (req.user.role === "company") {
      const applications = await JobApplication.find({
        status: {
          $in: ["Shortlisted", "Interview", "Selected"],
        },
      })
        .populate({
          path: "applicant",
          select: "name email role",
        })
        .populate({
          path: "job",
          select: "title company",
          populate: {
            path: "company",
            select: "name companyName email role",
          },
        });

      contacts = applications
        .filter((application) => {
          const applicant = application.applicant;
          const jobCompany = application.job?.company;

          return (
            applicant &&
            applicant.role === "user" &&
            jobCompany &&
            jobCompany.role === "company" &&
            jobCompany._id.toString() === req.user._id.toString()
          );
        })
        .map((application) => ({
          applicationId: application._id,
          userId: application.applicant._id,
          name: application.applicant.name,
          email: application.applicant.email,
          role: "user",
          jobTitle: application.job?.title || "",
        }));
    }

    /*
    ========================================
    USER/CANDIDATE -> COMPANY
    ========================================
    */

    else if (req.user.role === "user") {
      const applications = await JobApplication.find({
        applicant: req.user._id,
        status: {
          $in: ["Shortlisted", "Interview", "Selected"],
        },
      })
        .populate({
          path: "job",
          select: "title company",
          populate: {
            path: "company",
            select: "name companyName email role",
          },
        });

      contacts = applications
        .filter((application) => {
          const company = application.job?.company;

          return (
            company &&
            company.role === "company" &&
            company._id.toString() !== req.user._id.toString()
          );
        })
        .map((application) => {
          const company = application.job.company;

          return {
            applicationId: application._id,
            userId: company._id,
            name: company.companyName || company.name,
            email: company.email,
            role: "company",
            jobTitle: application.job?.title || "",
          };
        });
    }

    /*
    ========================================
    RETURN CONTACTS
    ========================================
    */

    return res.json({
      success: true,
      contacts,
    });
  } catch (error) {
    console.error("CHAT CONTACTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load chat contacts",
    });
  }
});

/*
========================================
GET CHAT MESSAGES
========================================
*/

router.get("/messages/:userId", protect, async (req, res) => {
  try {
    const otherUserId = req.params.userId;

    const roomId = [
      req.user._id.toString(),
      otherUserId,
    ]
      .sort()
      .join("_");

    const messages = await Message.find({
      roomId,
    })
      .populate("sender", "name companyName role")
      .populate("receiver", "name companyName role")
      .sort({ createdAt: 1 });

    return res.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("GET MESSAGES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load messages",
    });
  }
});

/*
========================================
DELETE MESSAGE
========================================
*/

router.delete("/messages/:id", protect, async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      sender: req.user._id,
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    await message.deleteOne();

    return res.json({
      success: true,
      message: "Message deleted",
    });
  } catch (error) {
    console.error("DELETE MESSAGE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete message",
    });
  }
});

export default router;