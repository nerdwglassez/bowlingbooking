# Setup Instructions

**Local vs live:** For local testing and debugging use `.env.local` with a **local** database only. For production (Vercel), set variables in Vercel and use Neon. See **[Local vs Live](docs/LOCAL_VS_LIVE.md)** for the full guide.

## Step 1: Create Environment File (local development)

Copy the example env for **local** use only (do not put production `DATABASE_URL` in `.env.local`):

```bash
cp .env.example .env.local
```

Edit `.env.local` and set `NEXTAUTH_SECRET` (e.g. `openssl rand -base64 32`). The default `DATABASE_URL` points to local PostgreSQL—see Step 2.

To use **Neon** for local testing (optional), you can replace `DATABASE_URL` in `.env.local` with a Neon connection string (see [Neon docs](docs/NEON_DATABASE.md)). For **production**, set `DATABASE_URL` in Vercel, not in `.env.local`.

## Step 2: Set Up Database

**Option A – Local PostgreSQL (recommended for development)**

1. Start local Postgres: `npm run db:local:up` (requires Docker), or install Postgres via Homebrew and create a `bowling` database—see [Local database guide](docs/LOCAL_DATABASE.md).
2. In `.env.local`, keep or set:  
   `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bowling"`

**Option B – Neon (cloud)**

1. Go to https://neon.tech and create a project.
2. Copy the connection string into `DATABASE_URL` in `.env.local`.

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Set Up Database Schema (local)

These commands use `DATABASE_URL` from `.env.local`, so they affect only your local database:

```bash
# Generate Prisma Client
npm run db:generate

# Apply schema (creates/updates tables)
npm run db:push

# Or use migrations instead
# npm run db:migrate

# Seed initial data (admin user, lanes, etc.)
npm run db:seed
```

## Step 5: Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000 to test and debug locally.

## Next Steps

- **Local:** Use [Local database](docs/LOCAL_DATABASE.md) and [Local vs Live](docs/LOCAL_VS_LIVE.md) for day-to-day development.
- **Deploy:** See [Deploy to Vercel](docs/DEPLOY_VERCEL.md) when you're ready to go live.



