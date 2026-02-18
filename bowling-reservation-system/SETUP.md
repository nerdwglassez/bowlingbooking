# Setup Instructions

## Step 1: Create Environment File

Copy the example env and use the **local database** URL (recommended for development):

```bash
cp .env.example .env.local
```

Edit `.env.local` and set `NEXTAUTH_SECRET` (e.g. `openssl rand -base64 32`). The default `DATABASE_URL` points to local PostgreSQL—see Step 2.

To use **Neon** instead, replace `DATABASE_URL` with your Neon connection string (see [Neon docs](docs/NEON_DATABASE.md)).

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

## Step 4: Set Up Database Schema

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations (creates/updates tables)
npm run db:migrate

# Seed initial data (admin user, lanes, etc.)
npm run db:seed
```

## Step 5: Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000 to see your app!

## Next Steps

After setup is complete, proceed to Phase 1: Authentication.



