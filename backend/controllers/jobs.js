import JobPost from "../models/JobPost.js";
import JobApplication from "../models/JobApplication.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import MembershipTier from "../models/MembershipTier.js";
import { calculateJobMatch, extractResumeTextDetailed } from "../utils/jobMatcher.js";

const publicFilter = { isActive: true, $or: [{ approvalStatus: "Approved" }, { approvalStatus: { $exists: false } }] };

export const createJob = async (req, res) => {
  console.log("🔥🔥🔥 CREATE JOB CONTROLLER HIT 🔥🔥🔥");

  try {
    const {
      title,
      description,
      category,
      location,
      jobType,
      salaryMin,
      salaryMax,
      experience,
      skills,
      vacancies,
      deadline,
      isFeatured
    } = req.body;

    console.log("COMPANY:", req.user?._id);
    console.log("ROLE:", req.user?.role);

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Job title and description are required"
      });
    }

    if (deadline && new Date(deadline) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Deadline must be a future date"
      });
    }

    if (
      (Number(salaryMin) || 0) >
        (Number(salaryMax) || 0) &&
      Number(salaryMax) > 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Maximum salary must be greater than minimum salary"
      });
    }

    // =====================================================
    // CREATE JOB
    // =====================================================

    const job = await JobPost.create({
      title: title.trim(),

      description: description.trim(),

      category,

      location,

      jobType,

      salaryMin: Number(salaryMin) || 0,

      salaryMax: Number(salaryMax) || 0,

      experience,

      skills: Array.isArray(skills)
        ? skills
        : [],

      vacancies: Number(vacancies) || 1,

      deadline: deadline || null,

      isFeatured:
        isFeatured === true ||
        isFeatured === "true",

      company: req.user._id,

      // IMPORTANT
      approvalStatus: "Pending",

      isActive: false,

      approvedBy: null,

      approvedAt: null
    });

    console.log("✅ JOB CREATED:", job._id);
    console.log("JOB TITLE:", job.title);

    // =====================================================
    // FIND ADMINS
    // =====================================================

    const admins = await User.find({
      role: "admin"
    }).select("_id name email role");

    console.log("👑 ADMINS FOUND:", admins.length);

    // =====================================================
    // SEND NOTIFICATION TO ALL ADMINS
    // =====================================================

    for (const admin of admins) {
      try {

        const notification = await Notification.create({
          user: admin._id,

          title: "New Job Pending Approval",

          message:
            `A new job "${job.title}" has been posted and is waiting for your approval.`,

          type: "system",

          link: "/admin-dashboard",

          read: false,

          meta: {
            jobTitle: job.title,

            jobId: job._id,

            companyId: req.user._id
          }
        });

        console.log(
          "✅ ADMIN NOTIFICATION CREATED:",
          notification._id
        );

        console.log(
          "ADMIN EMAIL:",
          admin.email
        );

      } catch (notificationError) {

        console.error(
          "❌ ADMIN NOTIFICATION ERROR:",
          notificationError
        );

      }
    }

    // =====================================================
    // POPULATE JOB
    // =====================================================

    const populatedJob =
      await JobPost.findById(job._id)
        .populate(
          "company",
          "name companyName email website"
        );

    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(201).json({
      success: true,

      message:
        "Job submitted for admin approval",

      job: populatedJob
    });

  } catch (error) {

    console.error(
      "❌ CREATE JOB ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getPlatformStats = async (req, res) => {
  try {
    const now = new Date();
    const publicJobsFilter = {
      isActive: true,
      $and: [
        { $or: [{ approvalStatus: "Approved" }, { approvalStatus: { $exists: false } }] },
        { $or: [{ deadline: null }, { deadline: { $exists: false } }, { deadline: { $gte: now } }] },
      ],
    };

    const [jobs, companies, jobSeekers, applications] = await Promise.all([
      JobPost.countDocuments(publicJobsFilter),
      User.countDocuments({ role: "company", isBlocked: false }),
      User.countDocuments({ role: "user", isBlocked: false }),
      JobApplication.countDocuments(),
    ]);

    res.json({
      success: true,
      stats: { jobs, companies, jobSeekers, applications },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to load platform statistics" });
  }
};

export const getJobs = async (req, res) => {
  try {
    const {
      keyword,
      location,
      category,
      jobType,
      experience,
      minSalary,
      featured
    } = req.query;

    const filter = { ...publicFilter };

    if (keyword) {
      filter.$and = [
        {
          $or: [
            { title: { $regex: keyword, $options: "i" } },
            { description: { $regex: keyword, $options: "i" } },
            { skills: { $regex: keyword, $options: "i" } }
          ]
        }
      ];
    }

    if (location) filter.location = { $regex: location, $options: "i" };
    if (category) filter.category = category;
    if (jobType) filter.jobType = jobType;
    if (experience) filter.experience = { $regex: experience, $options: "i" };
    if (minSalary) filter.salaryMax = { $gte: Number(minSalary) };
    if (featured === "true") filter.isFeatured = true;

    const jobs = await JobPost.find(filter)
      .populate(
        "company",
        "name companyName companyDescription website linkedin isVerified"
      )
      .sort({ createdAt: -1 });

    const now = new Date();
    const visible = jobs.filter(
      (job) => !job.deadline || new Date(job.deadline) >= now
    );

    // ---------------------------------------------------------
    // Resume Match Score
    // ---------------------------------------------------------
    // Only logged-in candidates get scores. Public visitors
    // continue to see the normal job listing.
    let jobsWithMatch = visible.map((job) => job.toObject());

    if (req.user?.role === "user" && visible.length) {
      let resumeText = "";

      // Resume text is extracted ONCE (at upload time) and cached on the user.
      // If it is missing (old users / failed extraction) we read the Cloudinary
      // file once, cache the text, and reuse it for every job in the list.
      try {
        const candidate = await User.findById(req.user._id).select(
          "resume resumePublicId resumeText"
        );

        resumeText = candidate?.resumeText || "";

        if (!resumeText && candidate?.resume) {
          const analysis = await extractResumeTextDetailed(candidate.resume, {
            publicId: candidate.resumePublicId
          });

          resumeText = analysis.text || "";

          if (resumeText) {
            await User.updateOne(
              { _id: candidate._id },
              { $set: { resumeText } }
            );
          } else {
            console.error("LISTING RESUME EXTRACTION FAILED:", analysis.error);
          }
        }
      } catch (error) {
        console.error("RESUME MATCH BASE EXTRACTION ERROR:", error);
      }

      // Fallback: candidate profile data (only when no readable resume exists).
      if (!resumeText) {
        resumeText = [
          req.user.title,
          req.user.bio,
          Array.isArray(req.user.skills)
            ? req.user.skills.join(" ")
            : req.user.skills,
          req.user.education,
          req.user.experience
        ]
          .filter(Boolean)
          .join(" ");
      }

      if (resumeText.trim()) {
        jobsWithMatch = await Promise.all(
          visible.map(async (job) => {
            try {
              const match = await calculateJobMatch({
                job,
                resumeText,
                extractionMethod: "cached-resume"
              });

              return {
                ...job.toObject(),
                matchScore: match.score,
                matchStatus: match.status,
                matchBreakdown: match.breakdown,
                matchedSkills: match.matchedSkills,
                missingSkills: match.missingSkills
              };
            } catch (error) {
              console.error(
                `JOB MATCH ERROR ${job._id}:`,
                error.message
              );

              return {
                ...job.toObject(),
                matchScore: null,
                matchStatus: "Not Analyzed"
              };
            }
          })
        );
      } else {
        jobsWithMatch = jobsWithMatch.map((job) => ({
          ...job,
          matchScore: null,
          matchStatus: "Resume not available"
        }));
      }

      // Show the best resume matches first for candidates.
      // Jobs without a calculated score stay at the bottom.
      jobsWithMatch.sort((a, b) => {
        const scoreA = Number(a.matchScore);
        const scoreB = Number(b.matchScore);
        const hasA = Number.isFinite(scoreA);
        const hasB = Number.isFinite(scoreB);

        if (hasA && hasB) return scoreB - scoreA;
        if (hasA) return -1;
        if (hasB) return 1;
        return 0;
      });
    }

    return res.json({
      success: true,
      count: jobsWithMatch.length,
      jobs: jobsWithMatch
    });
  } catch (error) {
    console.error("GET JOBS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getJob = async (req,res) => {
  try {
    const job=await JobPost.findOne({_id:req.params.id,...publicFilter}).populate("company", "name companyName companyDescription website linkedin isVerified");
    if(!job) return res.status(404).json({success:false,message:"Job not found or not approved"});
    if(job.deadline && new Date(job.deadline)<new Date()) return res.status(410).json({success:false,message:"This job has expired"});
    job.views += 1; await job.save(); res.json({success:true,job});
  } catch(error) { res.status(500).json({success:false,message:error.message}); }
};

export const updateJob = async (req,res) => {
  try {
    const job=await JobPost.findOne({_id:req.params.id,company:req.user._id});
    if(!job) return res.status(404).json({success:false,message:"Job not found"});
    const allowed=["title","description","category","location","jobType","salaryMin","salaryMax","experience","skills","vacancies","deadline","isFeatured","isActive"];
    allowed.forEach(k=>{if(req.body[k]!==undefined) job[k]=req.body[k];});
    if(job.deadline && new Date(job.deadline)<new Date()) return res.status(400).json({success:false,message:"Deadline must be a future date"});
    job.approvalStatus="Pending"; job.isActive=false; job.approvedAt=null; job.approvedBy=null;
    await job.save(); res.json({success:true,message:"Job updated and sent for admin approval",job});
  } catch(error) { res.status(500).json({success:false,message:error.message}); }
};

export const deleteJob = async (req,res) => {
  try { const job=await JobPost.findOneAndDelete({_id:req.params.id,company:req.user._id}); if(!job)return res.status(404).json({success:false,message:"Job not found"}); res.json({success:true,message:"Job deleted successfully"}); }
  catch(error){res.status(500).json({success:false,message:error.message});}
};

export const applyJob = async (req, res) => {
  try {

    // =====================================================
    // 1. CHECK JOB
    // =====================================================

    const job = await JobPost.findOne({
      _id: req.params.id,
      ...publicFilter
    });

    if (
      !job ||
      (job.deadline && new Date(job.deadline) < new Date())
    ) {
      return res.status(404).json({
        success: false,
        message: "Job is not available"
      });
    }


    // =====================================================
    // 2. CHECK DUPLICATE APPLICATION
    // =====================================================

    const already = await JobApplication.findOne({
      job: job._id,
      applicant: req.user._id
    });

    if (already) {
      return res.status(409).json({
        success: false,
        message: "You have already applied"
      });
    }


    // =====================================================
    // 3. CHECK RESUME
    // =====================================================

    if (!req.file && !req.user.resume) {
      return res.status(400).json({
        success: false,
        message: "Please upload a resume"
      });
    }


    // =====================================================
    // 4. GET USER WITH MEMBERSHIP
    // =====================================================

    const user = await User.findById(req.user._id)
      .select("+resumeText")
      .populate("membershipTier");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }


    // =====================================================
    // 5. CHECK MEMBERSHIP
    // =====================================================

    let membership = user.membershipTier;

    let membershipName = "Free";
    let jobLimit = 5;


    // -----------------------------------------------------
    // NO MEMBERSHIP
    // Treat user as Free
    // -----------------------------------------------------

    if (!membership) {

      const freePlan = await MembershipTier.findOne({
        isActive: true,
        price: 0
      });

      if (freePlan) {
        membership = freePlan;
        membershipName = freePlan.name;
        jobLimit = freePlan.jobLimit;
      }

    }


    // -----------------------------------------------------
    // ACTIVE MEMBERSHIP
    // -----------------------------------------------------

    if (
      membership &&
      user.membershipStatus === "active" &&
      user.membershipEnd &&
      new Date(user.membershipEnd) >= new Date()
    ) {

      membershipName = membership.name;

      jobLimit = membership.jobLimit;

    }


    // -----------------------------------------------------
    // EXPIRED MEMBERSHIP
    // -----------------------------------------------------

    if (
      user.membershipStatus === "expired" ||
      (
        user.membershipEnd &&
        new Date(user.membershipEnd) < new Date()
      )
    ) {

      const freePlan = await MembershipTier.findOne({
        isActive: true,
        price: 0
      });

      membershipName = freePlan?.name || "Free";

      jobLimit = freePlan?.jobLimit ?? 5;

    }


    // =====================================================
    // 6. COUNT USER APPLICATIONS
    // =====================================================

    const applicationCount = await JobApplication.countDocuments({
      applicant: user._id
    });


    // =====================================================
    // 7. CHECK APPLICATION LIMIT
    // =====================================================

    if (applicationCount >= jobLimit) {

      return res.status(403).json({
        success: false,

        message:
          membershipName === "Free"
            ? `You have reached your Free membership limit of ${jobLimit} job applications. Upgrade to Pro to apply for more jobs.`
            : `You have reached your ${membershipName} membership limit of ${jobLimit} job applications.`,

        limitReached: true,

        membership: {
          name: membershipName,
          limit: jobLimit,
          used: applicationCount
        }
      });

    }


    // =====================================================
    // 8. ANALYZE RESUME AGAINST THIS SPECIFIC JOB
    // =====================================================

    // New upload -> Cloudinary URL (req.file.path). Otherwise reuse profile resume.
    const resumePath = req.file ? req.file.path : user.resume;
    const resumePublicId = req.file ? req.file.publicId : user.resumePublicId;
    const resumeOriginalName = req.file
      ? req.file.originalname
      : user.resumeOriginalName || "";

    let jobMatch = {
      score: 0,
      status: "Not Analyzed",
      resumeText: "",
      extractedSkills: [],
      matchedSkills: [],
      missingSkills: [],
      breakdown: { skills: 0, keywords: 0, experience: 0 },
      analyzedAt: null,
      engine: "",
      extractionMethod: "",
      error: ""
    };

    try {
      jobMatch = await calculateJobMatch({
        job,
        resumePath,
        // Freshly uploaded file: analyse straight from memory (no re-download).
        resumeBuffer: req.file ? req.file.buffer : null,
        resumeFilename: resumeOriginalName,
        resumePublicId,
        // Reusing the profile resume: use the text cached at upload time.
        resumeText: !req.file ? user.resumeText || "" : "",
        extractionMethod: !req.file && user.resumeText ? "profile-resume" : ""
      });
    } catch (matchError) {
      console.error("JOB MATCH ANALYSIS ERROR:", matchError);
    }

    // =====================================================
    // 9. CREATE APPLICATION
    // =====================================================

    const application = await JobApplication.create({

      job: job._id,

      applicant: user._id,

      company: job.company,

      resume: resumePath,

      resumePublicId: resumePublicId || "",

      resumeOriginalName,

      resumeText: jobMatch.resumeText || "",

      extractedSkills: jobMatch.extractedSkills || [],

      matchedSkills: jobMatch.matchedSkills || [],

      missingSkills: jobMatch.missingSkills || [],

      jobMatchScore: jobMatch.score || 0,

      jobMatchStatus: jobMatch.status || "Not Analyzed",

      jobMatchBreakdown: jobMatch.breakdown || { skills: 0, keywords: 0, experience: 0 },

      jobMatchAnalyzedAt: jobMatch.analyzedAt || null,

      jobMatchEngine: jobMatch.engine || "",

      jobMatchExtractionMethod: jobMatch.extractionMethod || "",

      jobMatchError: jobMatch.error || "",

      coverLetter:
        req.body.coverLetter || "",

      notes:
        req.body.notes || ""

    });


    // =====================================================
    // 9. POPULATE APPLICATION
    // =====================================================

    const result =
      await JobApplication.findById(
        application._id
      )
        .populate(
          "job",
          "title location jobType skills experience"
        )
        .populate(
          "company",
          "name companyName"
        );


    // =====================================================
    // 10. CREATE COMPANY NOTIFICATION
    // =====================================================

    const applicantName =
      user.name || "A candidate";

    const applicantEmail =
      user.email || "";

    await Notification.create({

      user: job.company,

      title:
        "New job application",

      message:
        `${applicantName} (${applicantEmail}) applied for ${job.title}`,

      type:
        "application",

      link:
        "/company-applications",

      meta: {

        applicantName,

        applicantEmail,

        jobTitle:
          job.title,

        applicationId:
          application._id

      }

    });


    // =====================================================
    // 11. SUCCESS RESPONSE
    // =====================================================

    const newApplicationCount =
      applicationCount + 1;

    res.status(201).json({

      success: true,

      message:
        "Application submitted successfully",

      application: result,

      membership: {

        name:
          membershipName,

        limit:
          jobLimit,

        used:
          newApplicationCount,

        remaining:
          Math.max(
            jobLimit - newApplicationCount,
            0
          )

      }

    });

  } catch (error) {

    console.error(
      "APPLY JOB ERROR:",
      error
    );

    if (error.code === 11000) {

      return res.status(409).json({

        success: false,

        message:
          "You have already applied"

      });

    }

    res.status(500).json({

      success: false,

      message:
        error.message

    });

  }
};

export const getMyApplications = async (req,res) => {
  try { const applications=await JobApplication.find({applicant:req.user._id}).populate("job","title location jobType company deadline").populate("company","name companyName").sort({createdAt:-1}); res.json({success:true,applications}); }
  catch(error){res.status(500).json({success:false,message:error.message});}
};

export const getMyApplication = async (req,res) => {
  try { const application=await JobApplication.findOne({job:req.params.id,applicant:req.user._id}); res.json({success:true,applied:!!application,application:application||null}); }
  catch(error){res.status(500).json({success:false,message:error.message});}
};

export const withdrawApplication = async (req,res) => {
  try {
    const application = await JobApplication.findOneAndDelete({ _id: req.params.id, applicant: req.user._id });
    if (!application) return res.status(404).json({ success:false, message:"Application not found" });
    res.json({ success:true, message:"Application withdrawn successfully" });
  } catch(error) { res.status(500).json({ success:false, message:error.message }); }
};

export const saveJob = async (req,res) => {
  try { const job=await JobPost.findOne({_id:req.params.id,...publicFilter}); if(!job)return res.status(404).json({success:false,message:"Job not found"}); const user=await User.findById(req.user._id); const exists=user.savedJobs.some(id=>id.toString()===job._id.toString()); if(exists) user.savedJobs.pull(job._id); else user.savedJobs.push(job._id); await user.save(); res.json({success:true,saved:!exists,message:exists?"Job removed from saved jobs":"Job saved successfully"}); }
  catch(error){res.status(500).json({success:false,message:error.message});}
};

export const getSavedJobs = async (req,res) => {
  try { const user=await User.findById(req.user._id).populate({path:"savedJobs",populate:{path:"company",select:"name companyName companyDescription website isVerified"}}); res.json({success:true,jobs:user.savedJobs||[]}); }
  catch(error){res.status(500).json({success:false,message:error.message});}
};
