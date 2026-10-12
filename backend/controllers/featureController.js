import User from "../models/User.js";
import JobPost from "../models/JobPost.js";
import JobApplication from "../models/JobApplication.js";
import Interview from "../models/Interview.js";
import Notification from "../models/Notification.js";
import JobReport from "../models/JobReport.js";
import Report from "../models/JobReport.js";

const notify=async(user,title,message,type="system",link="")=>{await Notification.create({user,title,message,type,link});};

export const getProfile=async(req,res)=>{const u=await User.findById(req.user._id).select("-password");res.json({success:true,user:u});};
export const updateProfile=async(req,res)=>{try{const allowed=["name","phone","location","title","bio","skills","education","experience","linkedin","website","companyName","companyDescription","industry","companySize","foundedYear"];const u=await User.findById(req.user._id);allowed.forEach(k=>{if(req.body[k]!==undefined)u[k]=k==="skills"?(Array.isArray(req.body[k])?req.body[k]:String(req.body[k]).split(",").map(x=>x.trim()).filter(Boolean)):req.body[k]});await u.save();res.json({success:true,user:await User.findById(u._id).select("-password")});}catch(e){res.status(500).json({success:false,message:e.message})}};
export const getNotifications=async(req,res)=>{const n=await Notification.find({user:req.user._id}).sort({createdAt:-1}).limit(50);res.json({success:true,notifications:n})};
export const markNotificationRead=async(req,res)=>{await Notification.findOneAndUpdate({_id:req.params.id,user:req.user._id},{read:true});res.json({success:true})};
export const deleteNotification=async(req,res)=>{const n=await Notification.findOneAndDelete({_id:req.params.id,user:req.user._id});if(!n)return res.status(404).json({success:false,message:"Notification not found"});res.json({success:true,message:"Notification deleted"})};
export const clearAllNotifications=async(req,res)=>{await Notification.deleteMany({user:req.user._id});res.json({success:true,message:"All notifications cleared"})};
export const scheduleInterview=async(req,res)=>{try{const {date,type,meetingLink,location,notes}=req.body;if(!date||new Date(date)<=new Date())return res.status(400).json({success:false,message:"Interview date must be in the future"});const app=await JobApplication.findOne({_id:req.params.id,company:req.user._id}).populate("job","title");if(!app)return res.status(404).json({success:false,message:"Application not found"});const interview=await Interview.findOneAndUpdate({application:app._id},{application:app._id,job:app.job._id,candidate:app.applicant,company:req.user._id,date,type,meetingLink:meetingLink||"",location:location||"",notes:notes||"",status:"Scheduled"},{new:true,upsert:true,setDefaultsOnInsert:true});app.status="Interview";await app.save();await notify(app.applicant,"Interview scheduled",`Interview for ${app.job.title} is scheduled on ${new Date(date).toLocaleString()}`,"interview");res.json({success:true,interview})}catch(e){res.status(500).json({success:false,message:e.message})}};
export const getCompanyInterviews=async(req,res)=>{const x=await Interview.find({company:req.user._id}).populate("candidate","name email").populate("job","title").sort({date:1});res.json({success:true,interviews:x})};
export const getMyInterviews=async(req,res)=>{const x=await Interview.find({candidate:req.user._id}).populate("company","name companyName").populate("job","title").sort({date:1});res.json({success:true,interviews:x})};
export const reportJob=async(req,res)=>{try{const {reason,details}=req.body;const r=await JobReport.create({job:req.params.id,reportedBy:req.user._id,reason,details});res.status(201).json({success:true,message:"Report submitted",report:r})}catch(e){if(e.code===11000)return res.status(409).json({success:false,message:"You already reported this job"});res.status(500).json({success:false,message:e.message})}};
export const getReports=async(req,res)=>{const r=await JobReport.find().populate("job","title").populate("reportedBy","name email").sort({createdAt:-1});res.json({success:true,reports:r})};
export const updateReport = async (req, res) => {
  try {
    const { status } = req.body;

    // Allowed statuses
    if (!["Open", "Reviewed", "Dismissed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report status",
      });
    }

    // Find report
    const report = await JobReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    // =====================================================
    // REVIEWED = HIDE JOB FROM PUBLIC
    // =====================================================
    if (status === "Reviewed") {
      console.log("REPORT JOB ID:", report.job);

      const job = await JobPost.findById(report.job);

      // IMPORTANT:
      // If job is not found, don't silently continue
      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Reported job not found",
        });
      }

      console.log("JOB BEFORE:", {
        id: job._id,
        title: job.title,
        isActive: job.isActive,
      });

      // Hide job
      job.isActive = false;

      await job.save();

      console.log("JOB AFTER:", {
        id: job._id,
        title: job.title,
        isActive: job.isActive,
      });
    }

    // =====================================================
    // UPDATE REPORT STATUS
    // =====================================================
    report.status = status;

    await report.save();

    return res.json({
      success: true,
      message:
        status === "Reviewed"
          ? "Report reviewed and job removed from public listings."
          : status === "Dismissed"
          ? "Report dismissed. Job remains active."
          : "Report status updated.",
      report,
    });
  } catch (error) {
    console.error("UPDATE REPORT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



export const notifyApplicationStatus=async(app,status)=>{const messages={Shortlisted:"Your application has been shortlisted.",Interview:"An interview has been scheduled.",Selected:"Congratulations! You have been selected.",Rejected:"Your application was rejected."};if(messages[status])await notify(app.applicant,messages[status],`Application status for ${app.job?.title||"your job"}: ${status}`,"application","/my-applications")};
export const deleteReport = async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    res.json({ success: true, message: "Report deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};