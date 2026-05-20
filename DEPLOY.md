# TimeBank App — Deployment Guide
## Push to GitHub → Live on app.timebank.academy

---

## Step 1 — Set up locally (one time)

Open your terminal and run these commands exactly:

```bash
# 1. Download the app files (or use the ones from Claude)
# Make sure you have Node.js installed: https://nodejs.org

# 2. Navigate to where you want the project
cd ~/Desktop   # or wherever you like

# 3. Clone your empty GitHub repo
git clone https://github.com/nairpicuctep-hub/timebank-app.git
cd timebank-app

# 4. Copy all the app files Claude generated into this folder
# (drag and drop the contents of timebank-app/ into the cloned folder)

# 5. Install dependencies
npm install

# 6. Create your local env file
cp .env.local.example .env.local
# Then open .env.local and add your real Supabase anon key
```

---

## Step 2 — Add your Supabase key

Open `.env.local` and fill in:
```
NEXT_PUBLIC_SUPABASE_URL=https://sdtyekfubixjsjmexygx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Get your anon key from: Supabase Dashboard → Settings → API → anon public

---

## Step 3 — Test locally

```bash
npm run dev
# Open http://localhost:3000
# You should see the auth page
```

---

## Step 4 — Push to GitHub

```bash
git add .
git commit -m "feat: initial TimeBank MVP app"
git push origin main
```

---

## Step 5 — Connect Vercel

1. Go to https://vercel.com
2. Click "Add New Project"
3. Import from GitHub → select `nairpicuctep-hub/timebank-app`
4. Vercel auto-detects Next.js — just click Deploy
5. Wait ~2 minutes for first deploy

---

## Step 6 — Add environment variables in Vercel

In your Vercel project → Settings → Environment Variables, add:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://sdtyekfubixjsjmexygx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon key |

Then go to Deployments → click the 3 dots on latest deploy → Redeploy.

---

## Step 7 — Add app.timebank.academy subdomain

In Vercel project → Settings → Domains → Add Domain:
```
app.timebank.academy
```

Since your DNS is on Vercel, it auto-configures. Done in 30 seconds.

---

## Step 8 — Enable Google OAuth in Supabase (optional)

1. Supabase Dashboard → Authentication → Providers → Google
2. Enable it
3. Get credentials from Google Cloud Console:
   - Create project → APIs & Services → Credentials → OAuth 2.0 Client
   - Authorized redirect URI: `https://sdtyekfubixjsjmexygx.supabase.co/auth/v1/callback`
4. Paste Client ID and Secret into Supabase

---

## Daily workflow after setup

```bash
# Make changes to code
# Then push:
git add .
git commit -m "your message"
git push origin main
# Vercel auto-deploys in ~60 seconds
```

---

## Pages in the app

| URL | What it does |
|-----|-------------|
| `app.timebank.academy` | Redirects to /home or /auth |
| `/auth` | Sign in with magic link or Google |
| `/auth/callback` | Handles redirect after login |
| `/onboarding` | Skill Mirror — 7 questions |
| `/home` | Dashboard with TC orb + matches |
| `/session` | Browse teachers, book sessions |
| `/wallet` | TC balance + transaction history |
| `/profile` | Skill graph, badges, settings |

---

## What's NOT built yet (next sprints)

- [ ] Individual session booking page (/session/[id])
- [ ] Post-session survey
- [ ] Teacher profile page
- [ ] WhatsApp booking flow
- [ ] Daily.co video integration
- [ ] Push notifications
- [ ] Admin grant via app (use admin dashboard HTML for now)
