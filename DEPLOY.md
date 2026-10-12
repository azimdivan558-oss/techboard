# Deploy: backend on Render, frontend on Netlify

## 0. Before anything
- Push this project to GitHub. `.gitignore` already excludes `.env`, `node_modules` and `backend/uploads`.
- NEVER commit `backend/.env`. Rotate any key that was shared in chats/zips.
- MongoDB Atlas: Network Access -> allow `0.0.0.0/0` (Render IPs change).

## 1. Backend -> Render
1. Render -> New -> Web Service -> connect the repo.
2. Root Directory: `backend`  | Build: `npm install` | Start: `npm start`  (or use the included `render.yaml` Blueprint).
3. Environment variables (copy from `backend/.env.example`):
   MONGO_URI, JWT_SECRET, GOOGLE_CLIENT_ID, GEMINI_API_KEY, GEMINI_MODEL, SMTP_EMAIL, SMTP_PASSWORD,
   CASHFREE_APP_ID, CASHFREE_SECRET_KEY, CASHFREE_ENV, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET,
   FRONTEND_URL = your Netlify URL (https://xxx.netlify.app), BACKEND_URL = your Render URL.
4. Deploy, then open `https://YOUR-BACKEND.onrender.com/api/health` -> should show `{"status":"ok"}`.
Note: Render free instances sleep after ~15 min idle (first request is slow). Resumes are in Cloudinary, so the ephemeral disk is not a problem.

## 2. Frontend -> Netlify
1. Netlify -> Add new site -> Import from Git -> same repo.
2. Base directory: `frontend` | Build: `npm run build` | Publish: `frontend/build` (also set by `netlify.toml`).
3. Environment variable: `REACT_APP_API_URL = https://YOUR-BACKEND.onrender.com` (no trailing slash). Redeploy after changing it.
4. `_redirects` / `netlify.toml` already make React Router refresh/deep links work.

## 3. After both are live
- Render: set `FRONTEND_URL` to the final Netlify URL (custom domain too; add more with `CORS_ORIGINS`).
- Google Cloud Console -> OAuth client -> add the Netlify URL under Authorised JavaScript origins.
- Cashfree: set webhook to `https://YOUR-BACKEND.onrender.com/api/webhooks/cashfree`, and use production keys + `CASHFREE_ENV=PRODUCTION` when going live.
- Cloudinary uploads must work first: run `node scripts/testCloudinary.js` locally.
