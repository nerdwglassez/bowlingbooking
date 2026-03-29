# Deploy to Vercel

This guide covers deploying the Bowling Reservation System to Vercel (going live). **For local testing and debugging**, use `.env.local` and a local database—see **[Local vs Live](LOCAL_VS_LIVE.md)**.

## Before you commit

- **Never commit** `.env`, `.env.local`, or any file containing secrets. They are listed in `.gitignore`.
- Ensure `.env.example` is committed so others (and Vercel) know which variables to set.
- Run locally: `npm run build` and `npm run lint` to catch errors.
- From the **`bowling-reservation-system`** directory: `npm run build` (and `npm run lint`). If your repo root is the parent folder, set Vercel’s **Root Directory** to `bowling-reservation-system`.

## Deploy to Vercel

### 1. Push your code

Use GitHub, GitLab, or Bitbucket and push the `bowling-reservation-system` app (or repo root if this is the only app).

### 2. Import the project in Vercel

1. Go to [vercel.com](https://vercel.com) and sign in.
2. **Add New** → **Project** and import your Git repository.
3. Set the **Root Directory** to `bowling-reservation-system` if the repo contains multiple projects.
4. Vercel will detect Next.js; leave **Build Command** as `next build` and **Output Directory** as default.

### 3. Environment variables

In the Vercel project: **Settings** → **Environment Variables**. Add the following (use **Production**, and optionally **Preview** for branch deploys).

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | **Yes** | Neon (or other Postgres) connection string. Use the **pooled** connection string for serverless (e.g. `?sslmode=require`). |
| `NEXTAUTH_SECRET` | **Yes** | Random secret for session signing (min 32 characters). Generate with `openssl rand -base64 32`. |
| `NEXTAUTH_URL` | **Yes** | Full URL of the app, e.g. `https://your-app.vercel.app`. |
| `CRON_SECRET` | **Yes** (for crons) | Secret used to authenticate Vercel Cron requests. Set a long random value; Vercel will send it when invoking cron routes. |
| `STRIPE_SECRET_KEY` | Optional | Stripe secret key for payments. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional | Stripe publishable key (client-side). |
| `STRIPE_WEBHOOK_SECRET` | Optional | Stripe webhook signing secret for `/api/webhooks/stripe` (if used). |
| `RESEND_API_KEY` | Optional | Resend API key for transactional email. |
| `EMAIL_FROM` | Optional | Sender address for emails (e.g. `noreply@yourdomain.com`). |

After adding variables, redeploy so the new build uses them.

**Root Directory:** If your Git repo contains more than this app (e.g. repo root is `Tech Tim Tutorial`), set **Root Directory** in Vercel to `bowling-reservation-system` so the build runs in the correct folder.

### 4. Database

- **First-time setup:** Run the schema against your production DB once (from your machine or a one-off script):
  ```bash
  DATABASE_URL="your-production-url" npm run db:push
  ```
- Optionally seed an admin user:
  ```bash
  DATABASE_URL="your-production-url" npm run db:seed
  ```
- Use Neon’s **pooled** connection string for Vercel to avoid connection limits.

### 5. Cron jobs

`vercel.json` defines two crons:

- **`/api/cron/send-reminders`** – hourly; sends 24h-before booking reminders.
- **`/api/cron/marketing-automation`** – daily at 1:00 AM UTC; post-visit and lapsed-customer emails.

Vercel Cron sends requests with `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is set. The API routes validate this before running.

### 6. Post-deploy checks

- Open the deployed URL and confirm the app loads.
- Test login/register and a booking flow if Stripe and DB are configured.
- In Vercel dashboard: **Logs** or **Cron** tab to confirm cron invocations (and that they return 200 when `CRON_SECRET` is set).

## Troubleshooting

- **Build fails on Prisma:** `postinstall` runs `prisma generate`; ensure `prisma/schema.prisma` is committed and `DATABASE_URL` is not required for `prisma generate` (it is not; only for `db:push`/runtime).
- **Cron returns 401:** Ensure `CRON_SECRET` is set in Vercel and matches what the API expects (Bearer token or `x-cron-secret` header).
- **DB connection errors:** Use the pooled connection string and ensure the DB allows connections from Vercel’s IPs (Neon does by default).
