import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    title: {
      type: String,
      required: true
    },

    message: {
      type: String,
      required: true
    },

    type: {
      type: String,
      default: "system"
    },

    read: {
      type: Boolean,
      default: false
    },

    link: {
      type: String,
      default: ""
    },

    meta: {
      applicantName: {
        type: String,
        default: ""
      },

      applicantEmail: {
        type: String,
        default: ""
      },

      jobTitle: {
        type: String,
        default: ""
      },

      applicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "JobApplication",
        default: null
      },

      jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "JobPost",
        default: null
      },

      companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },

      approvalStatus: {
        type: String,
        default: ""
      }
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Notification", notificationSchema);