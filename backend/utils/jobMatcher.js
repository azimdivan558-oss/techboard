import fs from "fs";
import path from "path";
import os from "os";
import zlib from "zlib";
import { execFile, execFileSync } from "child_process";
import { promisify } from "util";
import { fetchResumeBuffer, isUrl } from "./cloudinaryResume.js";

const execFileAsync = promisify(execFile);

const SKILL_ALIASES = {
  "react": ["react", "reactjs", "react.js"],
  "node.js": ["node", "nodejs", "node.js"],
  "express.js": ["express", "expressjs", "express.js"],
  "mongodb": ["mongodb", "mongo db", "mongo"],
  "javascript": ["javascript", "js", "ecmascript"],
  "typescript": ["typescript", "ts"],
  "html": ["html", "html5"],
  "css": ["css", "css3"],
  "tailwind css": ["tailwind", "tailwindcss", "tailwind css"],
  "bootstrap": ["bootstrap"],
  "python": ["python", "python3"],
  "java": ["java"],
  "c++": ["c++", "cpp"],
  "c#": ["c#", "csharp", "c sharp"],
  "sql": ["sql", "mysql", "postgresql", "postgres", "sql server"],
  "mysql": ["mysql"],
  "postgresql": ["postgresql", "postgres"],
  "git": ["git", "github", "gitlab"],
  "docker": ["docker", "docker compose", "containerization"],
  "aws": ["aws", "amazon web services"],
  "azure": ["azure", "microsoft azure"],
  "gcp": ["gcp", "google cloud", "google cloud platform"],
  "rest api": ["rest api", "restful api", "rest apis", "rest"],
  "graphql": ["graphql"],
  "redux": ["redux", "redux toolkit"],
  "next.js": ["next.js", "nextjs", "next js"],
  "angular": ["angular", "angularjs"],
  "vue.js": ["vue", "vue.js", "vuejs"],
  "figma": ["figma"],
  "machine learning": ["machine learning", "ml"],
  "artificial intelligence": ["artificial intelligence", "ai"],
  "data analysis": ["data analysis", "data analytics"],
  "power bi": ["power bi", "powerbi"],
  "excel": ["excel", "microsoft excel"],
  "ms office programs": ["ms office programs", "microsoft office", "ms office", "office programs"],
  "windows & mac osx": ["windows and mac osx", "windows mac osx", "windows & mac osx", "windows and macos", "macos", "windows"],
  "asana": ["asana"],
  "salesforce": ["salesforce"],
  "agile": ["agile", "agile methodology", "agile methodologies"],
  "crm systems": ["crm systems", "crm system", "crm"],
  "hubspot": ["hubspot", "hub spot"],
  "communication": ["communication", "communication skills"],
  "leadership": ["leadership", "leadership skills"],
};

const STOP_WORDS = new Set(
  "a an and are as at be by for from has have in is it its of on or our that the their this to with you your we will work working role position looking required requirement responsibilities developer engineer software senior junior years year team skills experience company using use build building strong good knowledge ability candidate candidates must should including into about over under through web job jobs seeking provide providing responsible responsibilities based one two three four five six"
    .split(/\s+/)
);

const normalize = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+#.\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const containsTerm = (text, term) => {
  const t = normalize(text);
  const aliases = SKILL_ALIASES[normalize(term)] || [term];
  return aliases.some((alias) => {
    const a = normalize(alias);
    if (!a) return false;
    const escaped = escapeRegExp(a);
    return new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, "i").test(t);
  });
};

const unique = (items) => [...new Set(items.filter(Boolean).map((x) => String(x).trim()).filter(Boolean))];

const decodePdfLiteral = (raw) => {
  let value = raw.replace(/\\([\\()\\\\])/g, "$1");
  value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t");
  value = value.replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
  return value;
};

const extractPdfFallback = (buffer) => {
  const source = buffer.toString("latin1");
  const chunks = [];
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  while ((match = streamRegex.exec(source))) {
    let data = Buffer.from(match[1], "latin1");
    const before = source.slice(Math.max(0, match.index - 400), match.index);
    if (/\/FlateDecode/.test(before)) {
      try { data = zlib.inflateSync(data); } catch { /* OCR fallback */ }
    }
    const text = data.toString("latin1");
    for (const m of text.matchAll(/\(([^()]*)\)\s*Tj/g)) chunks.push(decodePdfLiteral(m[1]));
    for (const m of text.matchAll(/\[(.*?)\]\s*TJ/gs)) {
      for (const part of m[1].matchAll(/\(([^()]*)\)/g)) chunks.push(decodePdfLiteral(part[1]));
    }
  }
  if (!chunks.length) {
    for (const m of source.matchAll(/\(([^()]{2,})\)\s*Tj/g)) chunks.push(decodePdfLiteral(m[1]));
  }
  return chunks.join(" ").replace(/\s+/g, " ").trim();
};

const commandExists = (command) => {
  try {
    if (process.platform === "win32") {
      execFileSync("where", [command], { stdio: "ignore", windowsHide: true });
    } else {
      execFileSync("which", [command], { stdio: "ignore" });
    }
    return true;
  } catch {
    return false;
  }
};

const resolveCommand = (envName, command, localCandidates = []) => {
  const configured = process.env[envName];
  if (configured && fs.existsSync(configured)) return configured;

  for (const candidate of localCandidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return commandExists(command) ? command : "";
};

const getOcrTools = () => {
  const backendRoot = process.cwd();
  const localRoot = path.join(backendRoot, "tools", "ocr");
  const bin = path.join(localRoot, "bin");
  const windowsProgramFiles = process.platform === "win32"
    ? [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], "C:\\Program Files", "C:\\Program Files (x86)"].filter(Boolean)
    : [];
  const commonTesseract = windowsProgramFiles.flatMap((root) => [
    path.join(root, "Tesseract-OCR", "tesseract.exe"),
  ]);
  const commonPoppler = process.platform === "win32"
    ? [
        "C:\\poppler\\Library\\bin\\pdftoppm.exe",
        "C:\\poppler\\bin\\pdftoppm.exe",
        ...windowsProgramFiles.map((root) => path.join(root, "poppler", "Library", "bin", "pdftoppm.exe")),
      ]
    : [];

  return {
    pdftoppm: resolveCommand("PDFTOPPM_PATH", "pdftoppm", [
      path.join(bin, process.platform === "win32" ? "pdftoppm.exe" : "pdftoppm"),
      ...commonPoppler,
    ]),
    tesseract: resolveCommand("TESSERACT_PATH", "tesseract", [
      path.join(bin, process.platform === "win32" ? "tesseract.exe" : "tesseract"),
      ...commonTesseract,
    ]),
    tessdata: path.join(localRoot, "tessdata"),
  };
};

const extractPdfWithOcr = async (filePath) => {
  const tools = getOcrTools();
  if (!tools.pdftoppm || !tools.tesseract) {
    const missing = [!tools.pdftoppm ? "Poppler/pdftoppm" : "", !tools.tesseract ? "Tesseract OCR" : ""].filter(Boolean).join(" and ");
    return {
      text: "",
      error: `${missing} is not configured. Install the OCR tools or set PDFTOPPM_PATH and TESSERACT_PATH in backend/.env.`,
      method: "ocr-unavailable",
    };
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "techboard-ocr-"));
  try {
    const prefix = path.join(tempDir, "page");
    await execFileAsync(tools.pdftoppm, ["-jpeg", "-r", "220", filePath, prefix], {
      timeout: 60000,
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true,
    });

    const images = fs.readdirSync(tempDir).filter((name) => /\.jpg$/i.test(name)).sort();
    if (!images.length) {
      return { text: "", error: "OCR could not render the PDF into images.", method: "ocr-failed" };
    }

    const pages = [];
    for (const image of images.slice(0, 8)) {
      try {
        const args = [path.join(tempDir, image), "stdout", "-l", "eng", "--psm", "6"];
        if (fs.existsSync(tools.tessdata)) args.push("--tessdata-dir", tools.tessdata);
        const { stdout } = await execFileAsync(tools.tesseract, args, {
          timeout: 60000,
          maxBuffer: 10 * 1024 * 1024,
          windowsHide: true,
        });
        if (stdout.trim()) pages.push(stdout.trim());
      } catch (error) {
        if (!pages.length) {
          return { text: "", error: `Tesseract OCR failed: ${error.message}`, method: "ocr-failed" };
        }
      }
    }

    const text = pages.join(" ").replace(/\s+/g, " ").trim();
    return text
      ? { text, error: "", method: "ocr" }
      : { text: "", error: "OCR completed but no readable text was detected in the resume.", method: "ocr-empty" };
  } catch (error) {
    return { text: "", error: `PDF OCR failed: ${error.message}`, method: "ocr-failed" };
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }
};

const toAbsolutePath = (filePath) => {
  if (!filePath) return "";
  const value = String(filePath).trim().replace(/\\/g, path.sep);
  if (path.isAbsolute(value) || path.win32.isAbsolute(String(filePath))) return value;
  // Legacy local uploads were stored as "uploads/resume.pdf".
  return path.resolve(process.cwd(), value.replace(/^[/\\]+/, ""));
};

const cleanText = (value = "") => String(value).replace(/\s+/g, " ").trim();

const withTempFile = async (buffer, extension, work) => {
  const tempPath = path.join(
    os.tmpdir(),
    `techboard-resume-${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`
  );
  await fs.promises.writeFile(tempPath, buffer);
  try {
    return await work(tempPath);
  } finally {
    try { await fs.promises.unlink(tempPath); } catch {}
  }
};

const detectExtension = (buffer, hint = "") => {
  let ext = "";
  try {
    const clean = isUrl(hint) ? new URL(hint).pathname : String(hint).split("?")[0];
    ext = path.extname(clean).toLowerCase();
  } catch { /* sniff below */ }

  if ([".pdf", ".doc", ".docx"].includes(ext)) return ext;

  const head = buffer.subarray(0, 4);
  if (head.toString("latin1") === "%PDF") return ".pdf";
  if (head[0] === 0x50 && head[1] === 0x4b) return ".docx";
  if (head[0] === 0xd0 && head[1] === 0xcf) return ".doc";
  return ext || ".pdf";
};

const extractDocxBuffer = async (buffer) => {
  // 1) Pure JS (works everywhere, incl. Windows/Render/Railway)
  try {
    const mammoth = (await import("mammoth")).default;
    const { value } = await mammoth.extractRawText({ buffer });
    const text = cleanText(value);
    if (text) return text;
  } catch { /* fall through */ }

  // 2) unzip CLI fallback
  try {
    return await withTempFile(buffer, ".docx", async (file) => {
      const { stdout } = await execFileAsync("unzip", ["-p", file, "word/document.xml"], { maxBuffer: 10 * 1024 * 1024 });
      return cleanText(
        stdout
          .replace(/<w:tab\s*\/?>/g, " ")
          .replace(/<w:br\s*\/?>/g, "\n")
          .replace(/<[^>]+>/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
      );
    });
  } catch {
    return "";
  }
};

const extractPdfBuffer = async (buffer) => {
  // 1) Pure JS text extraction
  try {
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const data = await pdfParse(buffer);
    const text = cleanText(data?.text);
    if (text) return { text, error: "", method: "pdf-parse" };
  } catch { /* fall through */ }

  // 2) pdftotext (poppler) if installed
  try {
    const text = await withTempFile(buffer, ".pdf", async (file) => {
      const out = `${file}.txt`;
      try {
        await execFileAsync(
          resolveCommand("PDFTOTEXT_PATH", "pdftotext", [
            path.join(process.cwd(), "tools", "ocr", "bin", process.platform === "win32" ? "pdftotext.exe" : "pdftotext"),
            ...(process.platform === "win32"
              ? ["C:\\poppler\\Library\\bin\\pdftotext.exe", "C:\\poppler\\bin\\pdftotext.exe"]
              : []),
          ]),
          ["-layout", file, out],
          { timeout: 20000, maxBuffer: 10 * 1024 * 1024, windowsHide: true }
        );
        return cleanText(fs.readFileSync(out, "utf8"));
      } finally {
        try { fs.unlinkSync(out); } catch {}
      }
    });
    if (text) return { text, error: "", method: "pdf-text" };
  } catch { /* fall through */ }

  // 3) very small built-in parser
  try {
    const fallback = extractPdfFallback(buffer);
    if (fallback) return { text: fallback, error: "", method: "pdf-fallback" };
  } catch { /* fall through */ }

  // 4) OCR for scanned PDFs (needs poppler + tesseract on the server)
  return withTempFile(buffer, ".pdf", (file) => extractPdfWithOcr(file));
};

const extractDocBuffer = async (buffer) => {
  try {
    return await withTempFile(buffer, ".doc", async (file) => {
      const { stdout } = await execFileAsync("antiword", [file], { timeout: 15000, maxBuffer: 10 * 1024 * 1024, windowsHide: true });
      return cleanText(stdout);
    });
  } catch {
    return "";
  }
};

/**
 * Extract text from a resume.
 *  - options.buffer   : raw file bytes (fastest; used right after upload)
 *  - source           : Cloudinary URL (downloaded to memory) or legacy local path
 *  - options.publicId : Cloudinary public_id (enables signed-download fallback)
 */
export const extractResumeTextDetailed = async (source, options = {}) => {
  let buffer = options.buffer && options.buffer.length ? options.buffer : null;
  const hint = options.filename || source || "";

  if (!buffer) {
    if (isUrl(source)) {
      try {
        buffer = await fetchResumeBuffer(source, options.publicId);
      } catch (error) {
        console.error("RESUME DOWNLOAD ERROR:", error.message);
        return { text: "", error: error.message, method: "cloudinary-download-failed" };
      }
    } else {
      // Legacy: files saved on local disk before the Cloudinary migration.
      const resolvedPath = toAbsolutePath(source);
      if (!resolvedPath || !fs.existsSync(resolvedPath)) {
        return {
          text: "",
          error: `Resume file was not found: ${resolvedPath || source}`,
          method: "file-missing",
        };
      }
      buffer = await fs.promises.readFile(resolvedPath);
    }
  }

  if (!buffer || !buffer.length) {
    return { text: "", error: "Resume file is empty.", method: "empty" };
  }

  const ext = detectExtension(buffer, hint);

  if (ext === ".docx") {
    const text = await extractDocxBuffer(buffer);
    return text
      ? { text, error: "", method: "docx" }
      : { text: "", error: "DOCX text could not be extracted.", method: "docx-failed" };
  }

  if (ext === ".pdf") return extractPdfBuffer(buffer);

  if (ext === ".doc") {
    const text = await extractDocBuffer(buffer);
    return text
      ? { text, error: "", method: "doc" }
      : { text: "", error: "Legacy DOC extraction is unavailable on this server. Please upload the resume as PDF or DOCX.", method: "doc-failed" };
  }

  const text = cleanText(buffer.toString("utf8"));
  return text
    ? { text, error: "", method: "text" }
    : { text: "", error: "Unsupported resume format.", method: "unsupported" };
};

export const extractResumeText = async (source, options = {}) => {
  const result = await extractResumeTextDetailed(source, options);
  return result.text;
};

const canonicalSkill = (skill) => {
  const normalized = normalize(skill);
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (normalize(canonical) === normalized || aliases.some((alias) => normalize(alias) === normalized)) return canonical;
  }
  return String(skill).trim();
};

const findKnownSkills = (text, candidates = []) => {
  const pool = unique([...candidates, ...Object.keys(SKILL_ALIASES)]);
  return unique(pool.filter((skill) => containsTerm(text, skill)).map(canonicalSkill));
};

const extractKeywords = (job) => {
  const source = normalize(`${job.title || ""} ${job.description || ""}`);
  const words = source
    .split(/\s+/)
    .map((word) => word.replace(/^[^a-z0-9+#]+|[^a-z0-9+#]+$/g, ""))
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word));
  return unique(words).slice(0, 40);
};

const parseRequiredYears = (experience = "") => {
  const text = normalize(experience);
  const nums = [...text.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
  if (!nums.length) return 0;
  if (/\+/.test(text)) return nums[0];
  return Math.min(...nums);
};

const extractCandidateYears = (text = "") => {
  const normalized = normalize(text);
  const patterns = [
    /(?:over|more than)\s+(\d+(?:\.\d+)?)\s+years?/,
    /(\d+(?:\.\d+)?)\+?\s+years?\s+(?:of\s+)?(?:professional\s+)?experience/,
    /experience\s*(?:of|:)?\s*(\d+(?:\.\d+)?)\s*years?/,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) return Number(match[1]);
  }

  const ranges = [...normalized.matchAll(/(20\d{2})\s*(?:-|to)\s*(20\d{2}|current|present)/g)];
  if (ranges.length) {
    let total = 0;
    for (const match of ranges) {
      const start = Number(match[1]);
      const end = /current|present/.test(match[2]) ? new Date().getFullYear() : Number(match[2]);
      if (end >= start) total += end - start;
    }
    if (total > 0) return total;
  }

  return 0;
};

export const calculateJobMatch = async ({
  job,
  resumePath,
  resumeBuffer = null,
  resumeFilename = "",
  resumePublicId = "",
  resumeText: suppliedText = "",
  extractionMethod: suppliedMethod = "",
}) => {
  console.log("========== JOB MATCH ENGINE ==========");
  console.log("Job ID:", job?._id);
  console.log("Job Title:", job?.title);
  console.log("Supplied resume text length:", String(suppliedText || "").length);
  console.log("Supplied extraction method:", suppliedMethod);

  const extraction = suppliedText
    ? {
        text: String(suppliedText),
        error: "",
        method: suppliedMethod || "browser-text",
      }
    : await extractResumeTextDetailed(resumePath, {
        buffer: resumeBuffer,
        filename: resumeFilename,
        publicId: resumePublicId,
      });

  const resumeText = String(extraction.text || "").trim();

  console.log("Final resume text length:", resumeText.length);
  console.log("Final extraction method:", extraction.method);

  const jobSkills = unique(
    (Array.isArray(job?.skills) ? job.skills : []).map(canonicalSkill)
  );

  const descriptionSkills = findKnownSkills(
    `${job?.title || ""} ${job?.description || ""}`,
    jobSkills
  );

  const requiredSkills = unique([
    ...jobSkills,
    ...descriptionSkills,
  ]);

  console.log("JOB SKILLS:", jobSkills);
  console.log("REQUIRED SKILLS:", requiredSkills);

  if (!resumeText) {
    console.log("❌ NO RESUME TEXT AVAILABLE");

    return {
      score: 0,
      status: "Not Analyzed",
      resumeText: "",
      extractedSkills: [],
      matchedSkills: [],
      missingSkills: requiredSkills,
      breakdown: {
        skills: 0,
        keywords: 0,
        experience: 0,
      },
      matchedKeywords: [],
      requiredSkills,
      analyzedAt: null,
      engine: "TechBoard Job Match Engine v2",
      extractionMethod: extraction.method,
      error:
        extraction.error ||
        "Resume text could not be extracted.",
    };
  }

  const candidateSkills = findKnownSkills(
    resumeText,
    requiredSkills.length
      ? requiredSkills
      : Object.keys(SKILL_ALIASES)
  );

  const matchedSkills = requiredSkills.filter((skill) =>
    candidateSkills.some(
      (candidate) =>
        normalize(candidate) === normalize(skill) ||
        containsTerm(resumeText, skill)
    )
  );

  const missingSkills = requiredSkills.filter(
    (skill) =>
      !matchedSkills.some(
        (match) =>
          normalize(match) === normalize(skill)
      )
  );

  console.log("CANDIDATE SKILLS:", candidateSkills);
  console.log("MATCHED SKILLS:", matchedSkills);
  console.log("MISSING SKILLS:", missingSkills);

  const skillScore = requiredSkills.length
    ? (matchedSkills.length / requiredSkills.length) * 100
    : 100;

  const keywords = extractKeywords(job);
  const matchedKeywords = keywords.filter((keyword) =>
    containsTerm(resumeText, keyword)
  );

  const keywordScore = keywords.length
    ? (matchedKeywords.length / keywords.length) * 100
    : 100;

  const requiredYears = parseRequiredYears(
    job?.experience
  );

  const candidateYears = extractCandidateYears(
    resumeText
  );

  const experienceScore =
    requiredYears <= 0
      ? 100
      : Math.min(
          100,
          Math.round(
            (candidateYears / requiredYears) * 100
          )
        );

  let score;

  if (requiredSkills.length) {
    score = Math.round(
      skillScore * 0.7 +
      keywordScore * 0.2 +
      experienceScore * 0.1
    );
  } else {
    score = Math.round(
      keywordScore * 0.8 +
      experienceScore * 0.2
    );
  }

  score = Math.max(
    0,
    Math.min(100, score)
  );

  const status =
    score >= 85
      ? "Excellent Match"
      : score >= 70
      ? "Strong Match"
      : score >= 50
      ? "Potential Match"
      : "Low Match";

  console.log("SKILL SCORE:", Math.round(skillScore));
  console.log("KEYWORD SCORE:", Math.round(keywordScore));
  console.log("EXPERIENCE SCORE:", Math.round(experienceScore));
  console.log("FINAL SCORE:", score);
  console.log("FINAL STATUS:", status);
  console.log("======================================");

  return {
    score,
    status,
    resumeText,
    extractedSkills: candidateSkills,
    matchedSkills,
    missingSkills,
    breakdown: {
      skills: Math.round(skillScore),
      keywords: Math.round(keywordScore),
      experience: Math.round(experienceScore),
    },
    matchedKeywords: matchedKeywords.slice(0, 12),
    requiredSkills,
    analyzedAt: new Date(),
    engine: "TechBoard Job Match Engine v2",
    extractionMethod: extraction.method,
    error: "",
  };
};