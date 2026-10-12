import mongoose from "mongoose";

const membershipSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    price: {
      type: Number,
      default: 0
    },

    duration: {
      type: Number,
      default: 30
    },

    jobLimit: {
      type: Number,
      default: 5
    },

    featuredJobs: {
      type: Number,
      default: 0
    },

    description: {
      type: String,
      default: ""
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model(
  "MembershipTier",
  membershipSchema
);