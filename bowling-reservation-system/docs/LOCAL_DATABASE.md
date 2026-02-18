# Local PostgreSQL for development and testing

Using a local database avoids Neon connection timeouts, TLS issues, and cold starts. Use this for day-to-day development and testing.

## Option A: Docker (recommended)

1. **Start Postgres**
   ```bash
   cd bowling-reservation-system
   npm run db:local:up
   ```
   Or: `docker compose up -d`

2. **Point your app at the local DB**  
   In `.env.local` set:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bowling"
   ```

3. **Apply schema and seed**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
   If you see **"The column \`lanes\` does not exist"** when seeding or running the app, the `bookings` table is missing the optional `lanes` column. Add it with:
   ```bash
   npm run db:fix-lanes
   ```
   Then run `npm run db:seed` again if needed.

4. **Stop the database when finished (optional)**
   ```bash
   npm run db:local:down
   ```
   Or: `docker compose down`

Connection details (from `docker-compose.yml`):

- Host: `localhost`
- Port: `5432`
- Database: `bowling`
- User: `postgres`
- Password: `postgres`

## Option B: Homebrew (macOS)

1. **Install and start PostgreSQL**
   ```bash
   brew install postgresql@15
   brew services start postgresql@15
   ```

2. **Create the database**
   ```bash
   createdb bowling
   ```
   (Uses your macOS user by default; typical URL is `postgresql://localhost:5432/bowling` with no password, or add a user/password in Postgres and use that in `DATABASE_URL`.)

3. **In `.env.local`**
   ```env
   DATABASE_URL="postgresql://localhost:5432/bowling"
   ```
   If you created a user/password, use: `postgresql://USER:PASSWORD@localhost:5432/bowling`.

4. **Apply schema and seed**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

## Switching back to Neon

When you want to use Neon again (e.g. for production or a shared environment), set `DATABASE_URL` in `.env.local` back to your Neon connection string. No code changes are required.

## Troubleshooting: Prisma "bad certificate format" / TLS with Neon

If you see **`P1011: Error opening a TLS connection: bad certificate format`** when running `npm run db:push` or `npm run db:migrate` with a Neon `DATABASE_URL`, it’s a known TLS/certificate issue between Prisma and Neon on some machines (e.g. macOS + Node/OpenSSL).

**Workaround — use a local database for schema work:**

1. Use a local Postgres (Docker or Homebrew) and set `DATABASE_URL` in **`.env`** to your local URL (e.g. `postgresql://postgres:postgres@localhost:5432/bowling`).  
   Prisma CLI reads **`.env`** only (not `.env.local`), so `db:push` / `db:migrate` will use the local DB.
2. Run:
   ```bash
   npm run db:push
   # or
   npm run db:migrate
   ```
3. When you’re done, set `DATABASE_URL` in `.env` back to your Neon URL if you use it for the app.  
   For the running app, Next.js loads `.env.local` as well, so you can keep Neon in `.env` and use `.env.local` with a local `DATABASE_URL` for the dev server and use the steps above only when running Prisma CLI.

Alternatively, run migrations from an environment where the TLS error doesn’t occur (e.g. CI or another machine).

## Troubleshooting: "column \`lanes\` does not exist"

If the app or seed fails with **"The column \`lanes\` does not exist"** on the `bookings` table, your local DB was created without the migration that adds the optional `lanes` column. Fix it with:

```bash
npm run db:fix-lanes
```

Then run `npm run db:seed` again if you were seeding. The seed does not write `lanes`; the app expects the column to exist for queries.

## Quick reference

| Task              | Command                |
|-------------------|------------------------|
| Start local DB    | `npm run db:local:up`  |
| Stop local DB     | `npm run db:local:down`|
| Migrate           | `npm run db:migrate`   |
| Seed              | `npm run db:seed`      |
| Add lanes column  | `npm run db:fix-lanes` |
| Prisma Studio     | `npm run db:studio`    |
