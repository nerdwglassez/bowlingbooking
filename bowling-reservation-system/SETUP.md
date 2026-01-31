# Setup Instructions

## Step 1: Create Environment File

Create a `.env.local` file in the root directory with the following content:

```env
# Database (Neon Postgres)
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# App
NODE_ENV="development"
NEXTAUTH_SECRET="generate-a-random-secret-here-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email (Resend - recommended for simplicity)
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@yourdomain.com"
```

## Step 2: Set Up Neon Database

1. Go to https://neon.tech and create an account
2. Create a new project
3. Copy the connection string
4. Replace the `DATABASE_URL` in your `.env.local` file

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Set Up Database Schema

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push
```

## Step 5: Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000 to see your app!

## Next Steps

After setup is complete, proceed to Phase 1: Authentication.



