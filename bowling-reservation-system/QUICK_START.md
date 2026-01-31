# Quick Start Guide

## 🚀 Fast Setup (5 minutes)

### 1. Install Dependencies
```bash
cd bowling-reservation-system
npm install
```

### 2. Set Up Environment
Create `.env.local` file:
```bash
# Minimum required for testing
DATABASE_URL="your-neon-connection-string"
NODE_ENV="development"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"
```

**Get Neon Database URL:**
1. Go to https://neon.tech
2. Sign up (free tier available)
3. Create new project
4. Copy connection string from dashboard

### 3. Set Up Database
```bash
npm run db:generate  # Generate Prisma Client
npm run db:push       # Create tables in database
```

### 4. Start Server
```bash
npm run dev
```

Visit **http://localhost:3000** 🎉

---

## ✅ Verification

Run the verification script:
```bash
./scripts/verify-setup.sh
```

Or manually check:
- [ ] `npm install` completed without errors
- [ ] `.env.local` exists with `DATABASE_URL`
- [ ] `npm run db:generate` succeeded
- [ ] `npm run db:push` succeeded
- [ ] `npm run dev` starts without errors
- [ ] Home page loads at http://localhost:3000

---

## 📚 Detailed Instructions

See `TEST_SETUP.md` for step-by-step testing guide with troubleshooting.

See `SETUP.md` for complete setup instructions.

---

## 🐛 Common Issues

**"Cannot find module '@prisma/client'"**
→ Run `npm run db:generate`

**"DATABASE_URL is not set"**
→ Check `.env.local` exists and has `DATABASE_URL`

**"Port 3000 already in use"**
→ Kill process or use `PORT=3001 npm run dev`

**Prisma connection errors**
→ Verify Neon database is active and connection string is correct

---

## ✨ Next Steps

Once setup is verified:
- ✅ Phase 0: Complete
- 🎯 Phase 1: Authentication (register/login)



