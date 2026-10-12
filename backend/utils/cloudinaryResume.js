import path from "path";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";

// Configure lazily so .env is always loaded before we read it.
let configured = false;
export const ensureCloudinary = () => {
  if (configured) return cloudinary;

  // Trim spaces / stray quotes that often sneak into .env values.
  const clean = (v) => String(v || "").trim().replace(/^["']|["']$/g, "");
  const CLOUDINARY_CLOUD_NAME = clean(process.env.CLOUDINARY_CLOUD_NAME);
  const CLOUDINARY_API_KEY = clean(process.env.CLOUDINARY_API_KEY);
  const CLOUDINARY_API_SECRET = clean(process.env.CLOUDINARY_API_SECRET);

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in backend/.env"
    );
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
  return cloudinary;
};

export const isUrl = (value) => /^https?:\/\//i.test(String(value || "").trim());

export const RESUME_EXTENSIONS = [".pdf", ".doc", ".docx"];

const uploadStreamOnce = (options, buffer) =>
  new Promise((resolve, reject) => {
    const stream = ensureCloudinary().uploader.upload_stream(options, (error, result) =>
      error ? reject(error) : resolve(result)
    );
    stream.end(buffer);
  });

// raw ids carry their extension (resume-123.pdf); image ids do not.
export const resourceTypeFromPublicId = (publicId = "") =>
  /\.(pdf|docx?)$/i.test(String(publicId)) ? "raw" : "image";

/**
 * Upload a resume buffer to Cloudinary (folder techboard/resumes). Nothing touches disk.
 * 1) normal "raw" upload
 * 2) PDFs only: if the account rejects raw uploads (HTTP 403), upload as an "image"
 *    resource (Cloudinary natively supports PDF as image).
 */
export const uploadResumeBuffer = async (buffer, originalName = "resume.pdf") => {
  ensureCloudinary();

  const ext = path.extname(originalName).toLowerCase() || ".pdf";
  const base = `resume-${Date.now()}-${Math.round(Math.random() * 1e9)}`;

  try {
    const r = await uploadStreamOnce(
      { folder: "techboard/resumes", resource_type: "raw", public_id: `${base}${ext}` },
      buffer
    );
    return { url: r.secure_url, publicId: r.public_id, bytes: r.bytes, extension: ext };
  } catch (rawError) {
    console.error("CLOUDINARY RAW UPLOAD FAILED:", {
      http_code: rawError.http_code,
      message: rawError.message,
    });

    if (ext !== ".pdf") throw rawError;

    try {
      const r = await uploadStreamOnce(
        { folder: "techboard/resumes", resource_type: "image", public_id: base, format: "pdf" },
        buffer
      );
      console.log("Resume stored as Cloudinary image/PDF fallback:", r.public_id);
      return { url: r.secure_url, publicId: r.public_id, bytes: r.bytes, extension: ext };
    } catch (imageError) {
      console.error("CLOUDINARY IMAGE UPLOAD FAILED:", {
        http_code: imageError.http_code,
        message: imageError.message,
      });
      throw rawError;
    }
  }
};

/** Extract the Cloudinary public_id (including extension for raw files) from a delivery URL. */
export const publicIdFromUrl = (url) => {
  try {
    const pathname = new URL(String(url).trim()).pathname;
    const match = pathname.match(/\/(?:raw|image|video)\/(?:upload|authenticated|private)\/(?:[^/]+\/)*?(?:v\d+\/)?(techboard\/.+)$/);
    if (match) return decodeURIComponent(match[1]);

    const generic = pathname.match(/\/upload\/(?:v\d+\/)?(.+)$/);
    return generic ? decodeURIComponent(generic[1]) : "";
  } catch {
    return "";
  }
};

const toBuffer = (data) => (Buffer.isBuffer(data) ? data : Buffer.from(data));

const looksLikeHtmlError = (buffer) => {
  const head = buffer.subarray(0, 200).toString("utf8").trim().toLowerCase();
  return head.startsWith("<!doctype html") || head.startsWith("<html") || head.startsWith("{\"error\"");
};

/**
 * Download a resume stored in Cloudinary.
 * 1) Try the public URL.
 * 2) If Cloudinary blocks public delivery of PDFs (HTTP 401/403/404 – very common on new
 *    accounts), fall back to a signed API download URL, which always works for our own files.
 */
export const fetchResumeBuffer = async (url, publicId = "") => {
  const cleanUrl = String(url || "").trim();
  const errors = [];

  if (cleanUrl) {
    try {
      const response = await axios.get(cleanUrl, {
        responseType: "arraybuffer",
        timeout: 30000,
        maxContentLength: 15 * 1024 * 1024,
        validateStatus: () => true,
      });
      if (response.status >= 200 && response.status < 300) {
        const buffer = toBuffer(response.data);
        if (buffer.length && !looksLikeHtmlError(buffer)) return buffer;
      }
      errors.push(`public URL returned HTTP ${response.status}`);
    } catch (error) {
      errors.push(`public URL failed: ${error.message}`);
    }
  }

  const id = publicId || publicIdFromUrl(cleanUrl);
  if (id) {
    try {
      const cld = ensureCloudinary();
      const kind = resourceTypeFromPublicId(id);
      const signed = cld.utils.private_download_url(id, kind === "image" ? "pdf" : "", {
        resource_type: kind,
        type: "upload",
        attachment: false,
        expires_at: Math.floor(Date.now() / 1000) + 600,
      });
      const response = await axios.get(signed, {
        responseType: "arraybuffer",
        timeout: 30000,
        maxContentLength: 15 * 1024 * 1024,
        validateStatus: () => true,
      });
      if (response.status >= 200 && response.status < 300) {
        const buffer = toBuffer(response.data);
        if (buffer.length) return buffer;
      }
      errors.push(`signed download returned HTTP ${response.status}`);
    } catch (error) {
      errors.push(`signed download failed: ${error.message}`);
    }
  }

  throw new Error(`Could not download resume from Cloudinary (${errors.join("; ")})`);
};

export const deleteCloudinaryResume = async (publicId) => {
  if (!publicId) return;
  try {
    await ensureCloudinary().uploader.destroy(publicId, {
      resource_type: resourceTypeFromPublicId(publicId),
    });
  } catch (error) {
    console.error("CLOUDINARY DELETE ERROR:", error.message);
  }
};

export const contentTypeFor = (name = "") => {
  const ext = path.extname(String(name).split("?")[0]).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".docx")
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === ".doc") return "application/msword";
  return "application/octet-stream";
};
