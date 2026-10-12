# Cloudinary resume uploads (final flow)

1. `backend/.env` needs: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
2. `cd backend && npm install` (adds `pdf-parse` and `mammoth` for PDF/DOCX text extraction; works on any OS, no Poppler needed) then restart.

## How it works
- Upload: multer (memory) -> file signature check -> Cloudinary `upload_stream` (folder `techboard/resumes`). Nothing is written to server disk.
- MongoDB stores only the Cloudinary URL + public_id (`User.resume`, `User.resumePublicId`, same on `JobApplication`).
- Profile page: upload / view / remove resume (`POST|GET|DELETE /api/features/profile/resume`).
- JobMatcher: text is extracted from the uploaded bytes at upload time and cached on the user (`resumeText`), so the jobs list scores every job from the cache. If the cache is empty it downloads from Cloudinary once and caches it.
- Applying: a newly attached file is analysed straight from memory; otherwise the profile resume is used.
- Company "download resume": the API streams the file (no redirect).
- If Cloudinary blocks public PDF delivery (HTTP 401), the backend automatically uses a signed API download. To also allow opening links directly: Cloudinary Settings -> Security -> enable "PDF and ZIP files delivery".
- Old local resumes (`uploads/xyz.pdf`) still work for analysis; candidates should re-upload from Profile to move to Cloudinary.
