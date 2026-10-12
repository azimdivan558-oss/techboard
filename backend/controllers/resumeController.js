import User from "../models/User.js";
import { extractResumeTextDetailed } from "../utils/jobMatcher.js";
import {
  fetchResumeBuffer,
  deleteCloudinaryResume,
  contentTypeFor,
  isUrl,
} from "../utils/cloudinaryResume.js";

/**
 * POST /api/features/profile/resume   (multipart field: "resume")
 * Uploads to Cloudinary (via middleware), extracts text once and caches it on the user
 * so the JobMatcher never has to re-read the file for every job.
 */
export const uploadProfileResume = async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res
        .status(400)
        .json({ success: false, message: "Please choose a resume file (PDF, DOC or DOCX)" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const oldPublicId = user.resumePublicId;

    const extraction = await extractResumeTextDetailed(req.file.path, {
      buffer: req.file.buffer,
      filename: req.file.originalname,
      publicId: req.file.publicId,
    });

    user.resume = req.file.path;
    user.resumePublicId = req.file.publicId || "";
    user.resumeOriginalName = req.file.originalname || "";
    user.resumeText = extraction.text || "";
    user.resumeUpdatedAt = new Date();
    await user.save();

    // Remove the replaced file from Cloudinary (best effort).
    if (oldPublicId && oldPublicId !== user.resumePublicId) {
      deleteCloudinaryResume(oldPublicId);
    }

    const fresh = await User.findById(user._id).select("-password");

    return res.json({
      success: true,
      message: extraction.text
        ? "Resume uploaded successfully"
        : "Resume uploaded, but no readable text was found (scanned PDF?). Job matching will use your profile skills.",
      textExtracted: Boolean(extraction.text),
      extractionMethod: extraction.method,
      user: fresh,
    });
  } catch (error) {
    console.error("UPLOAD PROFILE RESUME ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** GET /api/features/profile/resume  -> streams the signed-in user's own resume. */
export const downloadMyResume = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "resume resumePublicId resumeOriginalName"
    );

    if (!user?.resume || !isUrl(user.resume)) {
      return res
        .status(404)
        .json({ success: false, message: "No resume uploaded" });
    }

    const buffer = await fetchResumeBuffer(user.resume, user.resumePublicId);
    const name = user.resumeOriginalName || "resume.pdf";

    res.setHeader("Content-Type", contentTypeFor(name));
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${name.replace(/"/g, "")}"`
    );
    res.setHeader("Content-Length", buffer.length);
    return res.send(buffer);
  } catch (error) {
    console.error("DOWNLOAD MY RESUME ERROR:", error.message);
    return res.status(502).json({ success: false, message: error.message });
  }
};

/** DELETE /api/features/profile/resume */
export const removeProfileResume = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const publicId = user.resumePublicId;

    user.resume = "";
    user.resumePublicId = "";
    user.resumeOriginalName = "";
    user.resumeText = "";
    user.resumeUpdatedAt = null;
    await user.save();

    deleteCloudinaryResume(publicId);

    const fresh = await User.findById(user._id).select("-password");
    return res.json({ success: true, message: "Resume removed", user: fresh });
  } catch (error) {
    console.error("REMOVE PROFILE RESUME ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
