# TechBoard Professional Reports

## 1. Install backend packages
From the `backend` folder:

```bash
npm install
```

The updated `package.json` adds:
- `pdfkit` — PDF report generation
- `exceljs` — Excel `.xlsx` report generation

## 2. Start backend
```bash
npm start
```

## 3. Start frontend
From `frontend`:
```bash
npm start
```

## 4. Features
### Admin
- Reports -> Application Report / Job Report
- Platform-wide data
- Date-wise filtering
- Job-wise filtering
- Application-status filtering
- PDF export
- Excel export
- Preview of report data

### Company
- Reports -> Application Report / Job Report
- Only the logged-in company's records are returned
- Date-wise filtering
- Job-wise filtering
- Application-status filtering
- PDF export
- Excel export

Existing `Reported Jobs` moderation remains available separately as `Reported Jobs` in the admin menu.
