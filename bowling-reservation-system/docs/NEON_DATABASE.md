# Neon database: "Seed failed" / "bad certificate format"

If you see **"Error opening a TLS connection: bad certificate format"** when running `npm run db:seed` or `npm run db:migrate`, the connection to Neon is failing due to TLS/SSL. Try one of these:

## Fix 1: Use the Direct connection string (recommended)

1. Open [Neon Console](https://console.neon.tech) → your project.
2. Go to **Connection details** (or Dashboard).
3. Switch to **"Direct connection"** (not "Pooled connection").
4. Copy the connection string (looks like `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require` — host does **not** contain `-pooler`).
5. In your `.env` or `.env.local`, set:
   ```env
   DATABASE_URL="<paste the Direct connection string here>"
   ```
6. Run again from the **bowling-reservation-system** folder:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

Using the **Direct** URL often fixes the TLS error. You can switch back to the **Pooled** URL later for the app if you prefer (after migrations and seed have run once).

## Fix 2: Simplify the Pooled URL

If you want to keep using the Pooled connection string, try removing `&channel_binding=require`:

- **Before:** `...neon.tech/neondb?sslmode=require&channel_binding=require`
- **After:** `...neon.tech/neondb?sslmode=require`

Then run `npm run db:seed` again from the **bowling-reservation-system** folder.

## Fix 3: "Bad certificate format" still happening

This error can be caused by your Node/OpenSSL environment not accepting Neon’s certificate chain. Try in order:

1. **New connection string from Neon**
   - In [Neon Console](https://console.neon.tech) → your project → **Connection details**.
   - Use **"Reset password"** (or create a new role) and copy the **new** connection string into `.env.local` as `DATABASE_URL`.
   - Sometimes an old or cached URL works better after a reset.

2. **Try Direct + minimal SSL**
   - Use the **Direct** connection (host **without** `-pooler`).
   - Use only `?sslmode=require` in the URL (no `sslrootcert`, no `channel_binding`).
   - Example: `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require`

3. **Node version**
   - Prisma uses the Node runtime for TLS. Try Node 18 LTS or 20 LTS:
     ```bash
     node -v
     nvm use 18   # or 20, if you use nvm
     npm run db:seed
     ```

4. **Run in a normal terminal**
   - Run `npm run db:seed` from a normal system terminal (outside Cursor/IDE) to rule out environment or proxy issues.

5. **Confirm Neon is reachable**
   - In Neon Console, open **SQL Editor** and run `SELECT 1`. If that works, the problem is between your machine and Neon (TLS/Node), not the database.

## Always run from the app folder

Run all DB commands from the project root (where `package.json` and `prisma/` live):

```bash
cd bowling-reservation-system
npm run db:generate
npm run db:migrate
npm run db:seed
```
