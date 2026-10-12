import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true,
      minlength: 6
    },

    role: {
      type: String,
      enum: ["user", "company", "admin"],
      default: "user"
    },

    googleId: {
      type: String,
      default: null
    },

    isBlocked: {
      type: Boolean,
      default: false
    },

    isVerified: {
      type: Boolean,
      default: false
    },

    companyName: {
      type: String,
      default: ""
    },

    companyDescription: {
      type: String,
      default: ""
    },

    industry: {
      type: String,
      default: ""
    },

    companySize: {
      type: String,
      default: ""
    },

    foundedYear: {
      type: String,
      default: ""
    },

    website: {
      type: String,
      default: ""
    },

    linkedin: {
      type: String,
      default: ""
    },

    phone: {
      type: String,
      default: ""
    },

    location: {
      type: String,
      default: ""
    },

    title: {
      type: String,
      default: ""
    },

    bio: {
      type: String,
      default: ""
    },

    skills: {
      type: [String],
      default: []
    },

    education: {
      type: String,
      default: ""
    },

    experience: {
      type: String,
      default: ""
    },

    resume: {
      type: String,
      default: ""
    },

    // Cloudinary public_id of the uploaded resume (used for signed download / delete)
    resumePublicId: {
      type: String,
      default: ""
    },

    resumeOriginalName: {
      type: String,
      default: ""
    },

    // Text extracted once at upload time and cached for the JobMatcher
    resumeText: {
      type: String,
      default: "",
      select: false
    },

    resumeUpdatedAt: {
      type: Date,
      default: null
    },

    savedJobs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "JobPost"
      }
    ],

    // =========================================
    // MEMBERSHIP
    // =========================================

    membershipTier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MembershipTier",
      default: null
    },

    membershipStatus: {
      type: String,
      enum: ["free", "active", "expired"],
      default: "free"
    },

    membershipStart: {
      type: Date,
      default: null
    },

    membershipEnd: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);

  next();
});

userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model("User", userSchema);