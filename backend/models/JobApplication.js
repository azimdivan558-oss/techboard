import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPost",
      required: true
    },

    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    resume: {
      type: String,
      default: ""
    },

    resumePublicId: {
      type: String,
      default: ""
    },

    resumeOriginalName: {
      type: String,
      default: ""
    },

    resumeText: {
      type: String,
      default: ""
    },

    extractedSkills: {
      type: [String],
      default: []
    },

    matchedSkills: {
      type: [String],
      default: []
    },

    missingSkills: {
      type: [String],
      default: []
    },

    atsScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },

    // Job-specific candidate matching
    jobMatchScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },

    jobMatchStatus: {
      type: String,
      enum: [
        "Not Analyzed",
        "Excellent Match",
        "Strong Match",
        "Potential Match",
        "Low Match"
      ],
      default: "Not Analyzed"
    },

    jobMatchBreakdown: {
      skills: { type: Number, default: 0, min: 0, max: 100 },
      keywords: { type: Number, default: 0, min: 0, max: 100 },
      experience: { type: Number, default: 0, min: 0, max: 100 }
    },

    jobMatchAnalyzedAt: {
      type: Date,
      default: null
    },

    jobMatchEngine: {
      type: String,
      default: ""
    },

    jobMatchExtractionMethod: {
      type: String,
      default: ""
    },

    jobMatchError: {
      type: String,
      default: ""
    },

    atsStatus: {
      type: String,
      enum: [
        "Pending",
        "Screened",
        "Shortlisted",
        "Rejected"
      ],
      default: "Pending"
    },

    coverLetter: {
      type: String,
      default: ""
    },

    notes: {
      type: String,
      default: ""
    },

    status: {
      type: String,
      enum: [
        "Applied",
        "Shortlisted",
        "Interview",
        "Selected",
        "Rejected"
      ],
      default: "Applied"
    }
  },
  {
    timestamps: true
  }
);

applicationSchema.index(
  {
    job: 1,
    applicant: 1
  },
  {
    unique: true
  }
);

export default mongoose.model(
  "JobApplication",
  applicationSchema
);