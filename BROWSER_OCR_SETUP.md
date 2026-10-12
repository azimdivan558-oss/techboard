# TechBoard Browser OCR Setup

This version does **not** require Poppler, pdftoppm, or Tesseract to be installed on Windows.

## First run

From the frontend folder:

```bash
npm install
npm start
```

The frontend uses:

- PDF.js to read PDF pages in the browser.
- Tesseract.js to OCR scanned/image-only PDF pages in the browser.
- JSZip to read DOCX resumes in the browser.

## Company flow

Company -> Applications -> Analyze / Re-analyze

For a scanned PDF, the first analysis downloads the OCR engine/language assets and may take longer. After that, the browser can reuse the worker during the session.

## Important

The browser must be able to access the Tesseract.js language/core assets on first OCR use. No desktop OCR software or Windows PATH configuration is required.
