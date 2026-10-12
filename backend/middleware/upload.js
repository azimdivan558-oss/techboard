import multer from "multer";
import path from "path";
import {
  uploadResumeBuffer,
  RESUME_EXTENSIONS,
} from "../utils/cloudinaryResume.js";

/**
 * Resume upload pipeline (NO local disk storage):
 *   multer (memory)  ->  validate file  ->  Cloudinary upload_stream
 *
 * After this middleware runs, for a successful upload:
 *   req.file.buffer    raw bytes (used for instant text extraction / job matching)
 *   req.file.path      Cloudinary secure URL  (this is what gets saved in MongoDB)
 *   req.file.publicId  Cloudinary public_id
 */

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();

  if (!RESUME_EXTENSIONS.includes(extension)) {
    return cb(new Error("Only PDF, DOC and DOCX files are allowed"));
  }

  cb(null, true);
};

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const hasValidSignature = (file) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const head = file.buffer.subarray(0, 8);

  if (ext === ".pdf") return head.subarray(0, 4).toString("latin1") === "%PDF";
  if (ext === ".docx") return head[0] === 0x50 && head[1] === 0x4b; // "PK" (zip)
  if (ext === ".doc") return head[0] === 0xd0 && head[1] === 0xcf; // OLE2
  return false;
};

const sendError = (res, status, message) =>
  res.status(status).json({ success: false, message });

const pushToCloudinary = async (req, res, next) => {
  if (!req.file) return next();

  if (!req.file.buffer?.length) {
    return sendError(res, 400, "Uploaded resume file is empty");
  }

  if (!hasValidSignature(req.file)) {
    return sendError(
      res,
      400,
      "The uploaded file is not a valid PDF, DOC or DOCX document"
    );
  }

  try {
    const uploaded = await uploadResumeBuffer(
      req.file.buffer,
      req.file.originalname
    );

    req.file.path = uploaded.url;
    req.file.publicId = uploaded.publicId;
    req.file.cloudinaryUrl = uploaded.url;
    return next();
  } catch (error) {
    console.error("CLOUDINARY UPLOAD ERROR:", error);
    return sendError(
      res,
      502,
      `Resume upload to Cloudinary failed: ${error.message || "unknown error"}`
    );
  }
};

const handleMulter = (field) => (req, res, next) =>
  memoryUpload.single(field)(req, res, (error) => {
    if (!error) return next();

    if (error.code === "LIMIT_FILE_SIZE") {
      return sendError(res, 400, "Resume must be 5 MB or smaller");
    }
    return sendError(res, 400, error.message || "Resume upload failed");
  });

// Drop-in replacement: routes keep using `upload.single("resume")`.
export const upload = {
  single: (field = "resume") => [handleMulter(field), pushToCloudinary],
};
