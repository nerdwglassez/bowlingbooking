# Setup Testing Checklist

Follow these steps to test your setup:

## Prerequisites Check

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Neon account created (https://neon.tech)

## Step 1: Install Dependencies

```bash
cd bowling-reservation-system
npm install
```

**Expected:** All packages install without errors.

**Common Issues:**
- If you get network errors, check your internet connection
- If you get permission errors, try `sudo npm install` (Mac/Linux) or run terminal as admin (Windows)

## Step 2: Create Environment File

Create `.env.local` in the project root:

```bash
# Copy this template and fill in your values
cat > .env.local << 'EOF'
# Database (Neon Postgres) - REQUIRED
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# App - REQUIRED
NODE_ENV="development"
NEXTAUTH_SECRET="your-random-secret-min-32-characters-long"
NEXTAUTH_URL="http://localhost:3000"

# Stripe - Optional for now (can add later)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email - Optional for now
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@yourdomain.com"
EOF
```

**To get Neon DATABASE_URL:**
1. Go to https://neon.tech
2. Sign up/login
3. Create a new project
4. Go to your project dashboard
5. Click "Connection Details"
6. Copy the connection string
7. Paste it as `DATABASE_URL` in `.env.local`

**To generate NEXTAUTH_SECRET:**
```bash
# Run this command to generate a random secret:
openssl rand -base64 32
```

## Step 3: Generate Prisma Client

```bash
npm run db:generate
```

**Expected:** 
- Creates `node_modules/.prisma/client` directory
- No errors in output

**If you get errors:**
- Make sure `DATABASE_URL` is set in `.env.local`
- Check that the connection string is valid

## Step 4: Push Database Schema

```bash
npm run db:push
```

**Expected:**
- Creates all tables in your Neon database
- Shows "Your database is now in sync with your Prisma schema"
- No errors

**If you get connection errors:**
- Verify your `DATABASE_URL` is correct
- Check that your Neon database is active
- Make sure the connection string includes `?sslmode=require`

## Step 5: Verify Database

```bash
npm run db:studio
```

**Expected:**
- Opens Prisma Studio in your browser (usually http://localhost:5555)
- You should see all your tables: users, sessions, bookings, etc.
- Tables are empty (no data yet)

**To exit:** Press Ctrl+C in terminal

## Step 6: Start Development Server

```bash
npm run dev
```

**Expected:**
- Server starts on http://localhost:3000
- No compilation errors
- You see: "Ready in X seconds"

## Step 7: Test the Home Page

1. Open http://localhost:3000 in your browser
2. You should see:
   - "Bowling Alley Reservation System" heading
   - "Book your lane online, anytime" subtitle
   - "Book a Lane" button
   - "Login" button

**If you see errors:**
- Check the terminal for error messages
- Make sure port 3000 is not in use
- Try `npm run build` to see if there are TypeScript errors

## Step 8: Verify TypeScript Compilation

```bash
npm run build
```

**Expected:**
- Compiles successfully
- Creates `.next` directory
- Shows "Compiled successfully" or similar

**If you get TypeScript errors:**
- Check the error messages
- Make sure all imports are correct
- Verify `tsconfig.json` is valid

## Troubleshooting

### "Cannot find module '@prisma/client'"
- Run `npm run db:generate` again
- Make sure `node_modules` exists

### "DATABASE_URL is not set"
- Check `.env.local` exists
- Verify the file is in the project root (same level as `package.json`)
- Make sure there are no quotes around the URL in the file

### "Port 3000 is already in use"
- Kill the process using port 3000
- Or change the port: `PORT=3001 npm run dev`

### Prisma connection errors
- Verify your Neon database is active (not paused)
- Check the connection string format
- Make sure `sslmode=require` is in the URL

## Success Criteria

✅ All dependencies install  
✅ Prisma client generates  
✅ Database schema pushes successfully  
✅ Development server starts  
✅ Home page loads without errors  
✅ TypeScript compiles successfully  

Once all checks pass, you're ready for Phase 1!



