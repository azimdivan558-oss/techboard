import JobPost from "../models/JobPost.js";
import JobApplication from "../models/JobApplication.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { calculateJobMatch } from "../utils/jobMatcher.js";
import { fetchResumeBuffer, contentTypeFor } from "../utils/cloudinaryResume.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

export const companyDashboard=async(req,res)=>{try{const [totalJobs,activeJobs,totalApplications,shortlistedApplications,jobs,recentApplications]=await Promise.all([JobPost.countDocuments({company:req.user._id}),JobPost.countDocuments({company:req.user._id,isActive:true,approvalStatus:"Approved"}),JobApplication.countDocuments({company:req.user._id}),JobApplication.countDocuments({company:req.user._id,status:"Shortlisted"}),JobPost.find({company:req.user._id}).sort({createdAt:-1}),JobApplication.find({company:req.user._id}).populate("applicant","name email resume").populate("job","title").sort({createdAt:-1}).limit(10)]);res.json({success:true,stats:{totalJobs,activeJobs,totalApplications,shortlistedApplications},jobs,recentApplications})}catch(e){res.status(500).json({success:false,message:e.message})}};
export const getCompanyApplications = async (req, res) => {
  try {
    const applications =
      await JobApplication.find({
        company: req.user._id
      })
        .populate(
          "applicant",
          "name email resume phone location skills"
        )
        .populate(
          "job",
          "title location jobType deadline skills experience description"
        )
        .sort({
          jobMatchScore: -1,
          atsScore: -1,
          createdAt: -1
        });

    res.json({
      success: true,
      applications
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: e.message
    });
  }
};

export const downloadApplicationResume = async (req, res) => {
  try {
    const application = await JobApplication.findOne({
      _id: req.params.id,
      company: req.user._id
    }).populate("applicant", "resume");

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found for this company"
      });
    }

    // Resume can be stored either on Application or User
    const storedResume =
      application.resume ||
      application.applicant?.resume ||
      "";

    if (!storedResume) {
      return res.status(404).json({
        success: false,
        message: "Candidate resume is not available"
      });
    }

    // Cloudinary URLs are already durable and should not be searched on local disk.
    // Stream the bytes through the API (a redirect breaks axios/CORS in the browser,
    // and Cloudinary may block public PDF delivery).
    if (/^https?:\/\//i.test(String(storedResume).trim())) {
      try {
        const buffer = await fetchResumeBuffer(
          String(storedResume).trim(),
          application.resumePublicId
        );
        const urlName = decodeURIComponent(
          String(storedResume).split("?")[0].split("/").pop() || "resume.pdf"
        );
        const downloadName = application.resumeOriginalName || urlName;

        res.setHeader("Content-Type", contentTypeFor(downloadName || urlName));
        res.setHeader(
          "Content-Disposition",
          `inline; filename="${String(downloadName).replace(/"/g, "")}"`
        );
        res.setHeader("Content-Length", buffer.length);
        return res.send(buffer);
      } catch (error) {
        console.error("RESUME DOWNLOAD ERROR:", error.message);
        return res.status(502).json({
          success: false,
          message: `Unable to fetch resume from Cloudinary: ${error.message}`
        });
      }
    }

    const controllerDir = path.dirname(fileURLToPath(import.meta.url));
    const backendRoot = path.resolve(controllerDir, "..");

    let raw = String(storedResume).trim();

    // Convert Windows backslashes to normal slashes
    raw = raw.replace(/\\/g, "/");

    // Remove query string if resume is stored as URL
    raw = raw.split("?")[0];

    const fileName = path.basename(raw);

    // Try all common locations used by the project
    const candidates = [
      path.resolve(backendRoot, "uploads", fileName),
      path.resolve(backendRoot, "uploads", "resumes", fileName),
      path.resolve(backendRoot, "uploads", "resume", fileName),

      path.resolve(backendRoot, "public", "uploads", fileName),
      path.resolve(backendRoot, "public", "resumes", fileName),

      path.resolve(process.cwd(), "uploads", fileName),
      path.resolve(process.cwd(), "uploads", "resumes", fileName),
      path.resolve(process.cwd(), "uploads", "resume", fileName),

      path.resolve(process.cwd(), "public", "uploads", fileName),
      path.resolve(process.cwd(), "public", "resumes", fileName)
    ];

    console.log("========== RESUME DOWNLOAD ==========");
    console.log("Application:", req.params.id);
    console.log("Stored resume:", storedResume);
    console.log("File name:", fileName);
    console.log("Searching:");
    console.log(candidates);

    const filePath = candidates.find((candidate) =>
      fs.existsSync(candidate)
    );

    if (!filePath) {
      console.error("❌ RESUME FILE NOT FOUND");
      console.error("Stored resume:", storedResume);
      console.error("Expected filename:", fileName);

      return res.status(404).json({
        success: false,
        message: `Resume file not found on server: ${fileName}`
      });
    }

    console.log("✅ RESUME FOUND:", filePath);

    return res.sendFile(filePath);

  } catch (error) {
    console.error("❌ RESUME DOWNLOAD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to download resume"
    });
  }
};

export const analyzeJobMatch = async (req, res) => {
  try {
    const application = await JobApplication.findOne({
      _id: req.params.id,
      company: req.user._id
    }).populate("job");

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    if (!application.resume) {
      return res.status(400).json({ success: false, message: "Candidate resume is not available" });
    }

    const browserResumeText = typeof req.body?.resumeText === "string"
      ? req.body.resumeText.trim()
      : "";
    const browserExtractionMethod = typeof req.body?.extractionMethod === "string"
      ? req.body.extractionMethod.trim()
      : "";

    const result = await calculateJobMatch({
      job: application.job,
      resumePath: application.resume,
      resumePublicId: application.resumePublicId,
      resumeText: browserResumeText || application.resumeText,
      extractionMethod: browserExtractionMethod
    });

    application.resumeText = result.resumeText || application.resumeText || "";
    application.extractedSkills = result.extractedSkills || [];
    application.matchedSkills = result.matchedSkills || [];
    application.missingSkills = result.missingSkills || [];
    application.jobMatchScore = result.score || 0;
    application.jobMatchStatus = result.status || "Not Analyzed";
    application.jobMatchBreakdown = result.breakdown || { skills: 0, keywords: 0, experience: 0 };
    application.jobMatchAnalyzedAt = result.analyzedAt || new Date();
    application.jobMatchEngine = result.engine || "TechBoard Job Match Engine v2";
    application.jobMatchExtractionMethod = result.extractionMethod || "";
    application.jobMatchError = result.error || "";

    await application.save();

    return res.json({
      success: true,
      message: "Job match analyzed successfully",
      match: {
        score: application.jobMatchScore,
        status: application.jobMatchStatus,
        matchedSkills: application.matchedSkills,
        missingSkills: application.missingSkills,
        breakdown: application.jobMatchBreakdown,
        analyzedAt: application.jobMatchAnalyzedAt,
        engine: application.jobMatchEngine,
        extractionMethod: application.jobMatchExtractionMethod,
        error: application.jobMatchError
      }
    });
  } catch (e) {
    console.error("JOB MATCH ANALYSIS ERROR:", e);
    res.status(500).json({ success: false, message: e.message });
  }
};

export const updateApplicationStatus=async(req,res)=>{try{const allowed=["Applied","Shortlisted","Interview","Selected","Rejected"];if(!allowed.includes(req.body.status))return res.status(400).json({success:false,message:"Invalid application status"});const application=await JobApplication.findOne({_id:req.params.id,company:req.user._id});if(!application)return res.status(404).json({success:false,message:"Application not found"});application.status=req.body.status;await application.save();await Notification.create({user:application.applicant,title:"Application status updated",message:`Your application status is now ${application.status}`,type:"application",link:"/my-applications"});res.json({success:true,message:"Application status updated",application})}catch(e){res.status(500).json({success:false,message:e.message})}};
export const updateCompanyProfile=async(req,res)=>{try{const company=await User.findOne({_id:req.user._id,role:"company"});if(!company)return res.status(404).json({success:false,message:"Company not found"});["companyName","companyDescription","website","linkedin","phone","location"].forEach(k=>{if(req.body[k]!==undefined)company[k]=req.body[k]});await company.save();res.json({success:true,company:company.toObject()})}catch(e){res.status(500).json({success:false,message:e.message})}};
export const analytics=async(req,res)=>{try{const jobs=await JobPost.find({company:req.user._id});const jobIds=jobs.map(j=>j._id);const counts=await JobApplication.aggregate([{$match:{company:req.user._id}},{$group:{_id:"$job",applications:{$sum:1}}}]);const map=new Map(counts.map(x=>[x._id.toString(),x.applications]));const topJobs=jobs.map(j=>({title:j.title,applications:map.get(j._id.toString())||0,views:j.views||0})).sort((a,b)=>b.applications-a.applications).slice(0,10);const totalApplications=counts.reduce((s,x)=>s+x.applications,0);const totalViews=jobs.reduce((s,j)=>s+(j.views||0),0);res.json({success:true,totalJobs:jobs.length,totalApplications,totalViews,averageApplicationsPerPost:jobs.length?Number((totalApplications/jobs.length).toFixed(2)):0,topJobs})}catch(e){res.status(500).json({success:false,message:e.message})}};
