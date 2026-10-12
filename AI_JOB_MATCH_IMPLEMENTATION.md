# TechBoard AI Job Match – Browser OCR

The company Applications page now analyzes PDF resumes without requiring Poppler or Tesseract to be installed on Windows.

## Flow
1. Company opens Applications.
2. Clicks **Analyze / Re-analyze**.
3. For PDF resumes, PDF.js first extracts embedded text.
4. If the PDF is scanned/image-only, the browser renders pages and Tesseract.js performs OCR locally in the browser.
5. Extracted text is sent to the existing Job Match endpoint.
6. Backend compares the resume against the selected job's skills, keywords and experience and stores the result.
7. Company sees score, breakdown, matched skills and missing skills.

No Poppler, pdftoppm or Tesseract desktop installation is required. Browser OCR requires the browser to be able to download the Tesseract.js language/core assets on first use.


## Job Listing Resume Match Score

The public `GET /api/jobs` endpoint now uses optional authentication. Logged-in users with role `user` receive `matchScore`, `matchStatus`, `matchBreakdown`, `matchedSkills`, and `missingSkills` for every visible job.

The score is calculated with the existing TechBoard Job Match Engine. The candidate's uploaded/local resume is extracted once and reused for all jobs. If the profile contains an external resume link or no readable local resume is available, the candidate profile fields (title, bio, skills, education, experience) are used as the fallback candidate text.

The frontend `JobCard` displays the score on the right side as **Resume Match**, with:
- 80–100%: Excellent Match
- 60–79%: Strong/Good Match
- 40–59%: Potential/Average Match
- below 40%: Low Match

Unauthenticated visitors continue to see the normal job cards without a score.
