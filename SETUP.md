# DeployDash — Complete Setup Guide

## What's in this package

| Directory | Purpose |
|---|---|
| `artifacts/deployment-dashboard/` | React + Vite frontend (runs standalone, no backend needed) |
| `artifacts/api-server/` | Express API server (only needed for email invites) |
| `lib/` | Shared TypeScript packages (db, api-zod) |

**Default login:** `admin@deploydash.local` / `admin123`

---

## Step 1 — Install dependencies

You need **Node.js 18+** and **pnpm 9+** installed.

```bash
# Install pnpm if you don't have it
npm install -g pnpm

# Install all workspace dependencies
pnpm install
```

---

## Step 2 — Run locally

### Frontend only (no email needed)
```bash
pnpm --filter @workspace/deployment-dashboard run dev
```
Open http://localhost:5173

### Frontend + API server (with email invites)
```bash
# Terminal 1 — Frontend
pnpm --filter @workspace/deployment-dashboard run dev

# Terminal 2 — API server
cp artifacts/api-server/.env.example artifacts/api-server/.env
# Edit .env with your SMTP credentials (see Step 4)
pnpm --filter @workspace/api-server run dev
```

---

## Step 3 — Push to GitHub

### 3a. Create repo on GitHub
1. Go to https://github.com/new
2. Create a **new empty repo** (no README, no .gitignore)
3. Copy the repo URL (e.g. `https://github.com/yourname/deploydash.git`)

### 3b. Push from your machine
```bash
# Inside the project folder:
git init
git add .
git commit -m "Initial commit: DeployDash Enterprise Pro"
git branch -M main
git remote add origin https://github.com/yourname/deploydash.git
git push -u origin main
```

---

## Step 4 — Add SMTP (email invites)

The API server uses environment variables for SMTP. Create `artifacts/api-server/.env`:

```env
# ── Required for email invites ──────────────────────────────
SMTP_HOST=smtp.gmail.com          # or smtp.mailgun.org, etc.
SMTP_PORT=587                     # 587 = TLS (recommended), 465 = SSL
SMTP_USER=you@gmail.com           # your SMTP username / email
SMTP_PASS=your-app-password       # see provider-specific notes below
SMTP_FROM=DeployDash <you@gmail.com>  # display name + address

# ── API key (protects the /send-invite endpoint) ────────────
INVITE_API_KEY=change-me-to-a-long-random-secret

# ── Server ──────────────────────────────────────────────────
PORT=3001
NODE_ENV=development
```

### SMTP provider quick-start

#### Gmail (easiest for testing)
1. Go to https://myaccount.google.com/security
2. Enable **2-Step Verification**
3. Search for "App passwords" → create one for "Mail"
4. Use the 16-character app password as `SMTP_PASS`
5. `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`

#### SendGrid (recommended for production)
1. Create account at https://sendgrid.com (free tier: 100 emails/day)
2. Settings → API Keys → Create API Key (full access)
3. `SMTP_HOST=smtp.sendgrid.net`, `SMTP_PORT=587`
4. `SMTP_USER=apikey`, `SMTP_PASS=<your-sendgrid-api-key>`

#### Mailgun
1. https://mailgun.com → Add Domain → verify DNS
2. `SMTP_HOST=smtp.mailgun.org`, `SMTP_PORT=587`
3. `SMTP_USER=postmaster@yourdomain.com`, `SMTP_PASS=<mailgun-password>`

#### Resend (modern, developer-friendly)
1. https://resend.com → API Keys → Create Key
2. `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=587`
3. `SMTP_USER=resend`, `SMTP_PASS=<your-resend-api-key>`

---

## Step 5 — Deploy to Vercel (frontend)

The frontend deploys as a static site — zero server cost.

### Via Vercel dashboard (easiest)
1. Push code to GitHub (Step 3)
2. Go to https://vercel.com/new
3. Click **"Import Git Repository"** → select your repo
4. Vercel auto-detects settings from `vercel.json` — **don't change anything**
5. Click **Deploy**

### Via Vercel CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

> **Note:** The frontend stores all data in the browser's localStorage.
> No database or server is needed for the core app to work.

---

## Step 6 — Deploy API server (optional, for email)

Deploy the Express API server if you want email invite functionality.

### Option A — Railway (recommended, free tier available)
1. https://railway.app → New Project → Deploy from GitHub repo
2. Set **Root Directory** to `artifacts/api-server`
3. Add environment variables (from Step 4) in Railway dashboard
4. Railway auto-detects Node.js and runs `pnpm run build && pnpm start`

### Option B — Render
1. https://render.com → New → Web Service → connect GitHub repo
2. **Root Directory:** `artifacts/api-server`
3. **Build Command:** `pnpm install && pnpm run build`
4. **Start Command:** `node --enable-source-maps dist/index.mjs`
5. Add environment variables in Render dashboard

### Option C — Fly.io
```bash
cd artifacts/api-server
fly launch
fly secrets set SMTP_HOST=... SMTP_USER=... SMTP_PASS=... INVITE_API_KEY=...
fly deploy
```

### After deploying the API server
Update the frontend's API URL in `artifacts/deployment-dashboard/src/lib/api.ts`:
```ts
// Change this to your deployed API server URL:
const API_BASE = "https://your-api-server.railway.app";
```

---

## Environment variable reference

### API Server (`artifacts/api-server/.env`)

| Variable | Required | Description |
|---|---|---|
| `SMTP_HOST` | Yes (for email) | SMTP server hostname |
| `SMTP_PORT` | No | Default: `587` |
| `SMTP_USER` | Yes (for email) | SMTP username |
| `SMTP_PASS` | Yes (for email) | SMTP password or API key |
| `SMTP_FROM` | No | From address (defaults to SMTP_USER) |
| `INVITE_API_KEY` | Yes (for email) | Secret key — admins enter this in the UI when sending invites |
| `PORT` | No | Default: `3001` |
| `NODE_ENV` | No | `development` or `production` |

---

## Customizing the app

### Add more products
Edit `artifacts/deployment-dashboard/src/types.ts`:
```ts
export type ProductId = "climagro" | "ehm" | "yourproduct";
```
Then add entries in:
- `src/data/checklists.ts` — checklist items per product
- `src/pages/Dashboard.tsx` — `PRODUCT_LABELS` map

### Change checklist items
Edit `artifacts/deployment-dashboard/src/data/checklists.ts`.
Admins can also customize checklists live in the **Admin Panel**.

### Change default admin credentials
Edit `artifacts/deployment-dashboard/src/lib/users.ts` (or wherever seed users are defined).

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `pnpm: command not found` | `npm install -g pnpm` |
| Email not sending | Check SMTP credentials; for Gmail use an App Password, not your regular password |
| Vercel build fails | Make sure `vercel.json` is in the repo root and unchanged |
| Blank page after deploy | Check Vercel output directory is `artifacts/deployment-dashboard/dist/public` |
| API server CORS error | Set `FRONTEND_URL` env var to your Vercel domain on the API server |
