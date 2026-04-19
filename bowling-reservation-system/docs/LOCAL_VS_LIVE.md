# Local Development vs Going Live

Use this guide to keep **local testing and debugging** separate from **production (Vercel)**.

## Quick reference

| | **Local (test & debug)** | **Live (production)** |
|---|---------------------------|-------------------------|
| **Config** | `.env.local` (git-ignored) | Vercel Environment Variables |
| **Database** | Local Postgres (Docker or Homebrew) | Neon (or other hosted Postgres) |
| **URL** | `http://localhost:3000` | Your Vercel URL (e.g. `https://your-app.vercel.app`) |
| **Run** | `npm run dev` | Deploy via Vercel (git push or manual deploy) |
| **Schema / seed** | `npm run db:push` then `npm run db:seed` (uses `.env.local`) | Run once with production URL; Vercel uses same DB at runtime |

---

## Local development (test & debug)

1. **Use local config only**  
   Copy `.env.example` to `.env.local` and keep it pointed at your **local** database and URLs. Never put production secrets or production `DATABASE_URL` in `.env.local`.

   ```bash
   cp .env.example .env.local
   ```

2. **Set up local database**  
   - Start Postgres: `npm run db:local:up` (Docker) or use [Homebrew](LOCAL_DATABASE.md).  
   - In `.env.local`:
     ```env
     DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bowling"
     NEXTAUTH_URL="http://localhost:3000"
     NODE_ENV="development"
     ```
   - Generate secret: `openssl rand -base64 32` → set `NEXTAUTH_SECRET` in `.env.local`.

3. **Apply schema and seed (local only)**  
   These commands use `DATABASE_URL` from `.env.local`, so they affect only your local DB:

   ```bash
   npm run db:push
   npm run db:seed
   ```

4. **Run the app**  
   Next.js loads `.env.local` automatically in development:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000 and test/debug there.

5. **Optional: Prisma Studio**  
   Inspect local data:

   ```bash
   npm run db:studio
   ```

---

## Going live (production on Vercel)

- **Do not** put production `DATABASE_URL` or production secrets in `.env.local`.  
- Set all production values in **Vercel** → Project → **Settings** → **Environment Variables** (see [Deploy to Vercel](DEPLOY_VERCEL.md)).
- Production database (e.g. Neon): run schema/seed **once** from your machine with an explicit URL, or from a one-off script, e.g.:

  ```bash
  DATABASE_URL="postgresql://...neon.tech/...?sslmode=require" npm run db:push
  DATABASE_URL="postgresql://...neon.tech/...?sslmode=require" npm run db:seed
  ```

  Use the **pooled** connection string for serverless. After that, the live app uses the same DB via the `DATABASE_URL` set in Vercel.

---

## Switching between local and production DB from your machine

- **Always use local in `.env.local`** for day-to-day dev so `npm run dev`, `npm run db:push`, and `npm run db:seed` never touch production.
- **To run a one-off command against production** (e.g. push schema or seed), pass `DATABASE_URL` on the command line and do **not** rely on `.env.local` for that run:

  ```bash
  DATABASE_URL="postgresql://your-neon-url" npm run db:push
  ```

---

## Summary

- **Local working**: `.env.local` + local Postgres + `npm run dev` + `npm run db:push` / `npm run db:seed` (no override).
- **Going live**: Vercel env vars + Neon (or other) + deploy; run `db:push`/`db:seed` with production URL only when you need to update production DB from your machine.
