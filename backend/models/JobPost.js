import mongoose from "mongoose";

const jobPostSchema=new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId, ref: "User", required: true
  }

  ,
  title: {
    type: String, required: true, trim: true
  }

  ,
  description: {
    type: String, required: true
  }

  ,
  category: {
    type: String, default: "Other"
  }

  ,
  location: {
    type: String, default: "Remote"
  }

  ,
  jobType: {
    type: String, enum: ["Full Time", "Part Time", "Internship", "Contract", "Remote"], default: "Full Time"
  }

  ,
  salaryMin: {
    type: Number, default: 0
  }

  ,
  salaryMax: {
    type: Number, default: 0
  }

  ,
  experience: {
    type: String, default: "0-1 Years"
  }

  ,
  skills: {
    type: [String], default: []
  }

  ,
  deadline: {
    type: Date, default: null
  }

  ,
  vacancies: {
    type: Number, default: 1, min: 1
  }

  ,
  isFeatured: {
    type: Boolean, default: false
  }

  ,
  isActive: {
    type: Boolean, default: false
  }

  ,
  approvalStatus: {
    type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending"
  }

  ,
  approvedAt: {
    type: Date, default: null
  }

  ,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId, ref: "User", default: null
  }

  ,
  views: {
    type: Number, default: 0
  }
}

, {
timestamps: true
});

export default mongoose.model("JobPost", jobPostSchema);