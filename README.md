# TechBoard MERN Job Portal - Advanced Fixed Version

## Features
- JWT login/register with user, company and admin roles
- Google login integration
- Forgot password
- Job creation with admin approval workflow
- Job search: keyword, location, category, type, experience, minimum salary
- Job deadline/expiry
- Save/unsave jobs
- Job seeker professional profile
- Apply with resume and cover letter
- Application status tracking and timeline
- Company applicant management
- Interview scheduling and interview lists
- In-app notifications
- Company verification by admin
- Job reporting and admin moderation
- Company analytics
- Admin dashboard, user block/unblock and job approval

## Setup

### Backend
1. Copy `backend/.env.example` to `backend/.env`.
2. Set `MONGO_URI` and `JWT_SECRET`.
3. Optional email/Google variables can be configured as needed.
4. Run:

```bash
cd backend
npm install
npm run dev
```

Backend: http://localhost:5000

### Frontend
1. Copy `frontend/.env.example` to `frontend/.env` if needed.
2. Run:

```bash
cd frontend
npm install
npm start
```

Frontend: http://localhost:3000

## Demo admin
Run `npm run seed` in backend after setting MONGO_URI. The seed script creates the demo admin/company and sample approved jobs if they do not already exist.

Always change demo credentials before real deployment.
