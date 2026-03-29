# Bowling Alley Reservation System

A comprehensive online reservation system for bowling alley lane bookings.

## Documentation map (start here)

| Topic | Document |
|--------|----------|
| **All docs in `/docs` (index)** | [docs/README.md](docs/README.md) |
| **Customer booking and post-booking** | [docs/RESERVATION_FLOW.md](docs/RESERVATION_FLOW.md) |
| **Staff, manager, admin, kiosk** | [docs/STAFF_AND_ADMIN_EXPERIENCE.md](docs/STAFF_AND_ADMIN_EXPERIENCE.md) |
| **Auth, DB, pricing, availability, env (shared)** | [docs/SHARED_PLATFORM.md](docs/SHARED_PLATFORM.md) |
| **Product requirements (full PRD)** | [bowling-prd.md](../bowling-prd.md) (repo root) |
| **Implemented vs PRD (living status)** | [PRD_GAP_ANALYSIS.md](PRD_GAP_ANALYSIS.md) |
| **Local vs production config** | [docs/LOCAL_VS_LIVE.md](docs/LOCAL_VS_LIVE.md) |
| **Deploy to Vercel** | [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md) |
| **Setup steps** | [SETUP.md](SETUP.md) |
| **Full-page vs old modal routes** | [docs/FULL_PAGE_AND_MODAL_FLOWS.md](docs/FULL_PAGE_AND_MODAL_FLOWS.md) |
| **Staff UI / CSS audit (historical)** | [docs/STAFF_BOOKING_AND_CSS_AUDIT.md](docs/STAFF_BOOKING_AND_CSS_AUDIT.md) |
| **Performance & security checklist** | [docs/PERFORMANCE_AND_SECURITY_REVIEW_PLAN.md](docs/PERFORMANCE_AND_SECURITY_REVIEW_PLAN.md) |

**AI / tooling:** See [AGENTS.md](AGENTS.md) for which doc to load per task.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (Neon)
- **ORM:** Prisma ORM 7.6 (`prisma.config.ts`, PostgreSQL via `pg` + `@prisma/adapter-pg`)
- **Styling:** Tailwind CSS
- **Payment:** Stripe
- **Deployment:** Vercel

## Local development vs going live

- **Local (test & debug):** Use `.env.local` with a **local** PostgreSQL database. Run `npm run dev`; schema and seed use `.env.local` so you never touch production. See **[docs/LOCAL_VS_LIVE.md](docs/LOCAL_VS_LIVE.md)**.
- **Live (production):** Configure env in Vercel and use Neon (or another hosted Postgres). See **[docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md)**.

## Getting Started (local)

### Prerequisites

- Node.js 18+ and npm
- Local PostgreSQL (Docker recommended: `npm run db:local:up`) or [Neon](https://neon.tech) if you prefer a cloud DB for local testing

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment (local only):**
   - Copy `.env.example` to `.env.local`
   - Use the default local `DATABASE_URL` (or your Neon URL for local testing only)
   - Set `NEXTAUTH_SECRET` (e.g. `openssl rand -base64 32`)
   - Add Stripe keys in test mode if you need payments

3. **Set up the database (local):**
   ```bash
   npm run db:push
   npm run db:seed
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)** to test and debug

## Project structure

```
bowling-reservation-system/
├── app/
│   ├── api/                 # REST-style route handlers (auth, bookings, staff, admin, cron, v1, …)
│   ├── book/                # Customer booking flow (+ confirmation)
│   ├── bookings/            # Customer my bookings + detail + reschedule
│   ├── dashboard/           # Customer dashboard
│   ├── profile/             # Customer profile
│   ├── staff/               # Staff & manager tools (+ settings: lanes, packages, discount codes, …)
│   ├── admin/               # Admin configuration
│   ├── kiosk/               # Check-in kiosk
│   ├── gift-cards/          # Gift card purchase
│   ├── waitlist/            # Waitlist claim page
│   ├── login|register|…     # Auth pages
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing → redirects to /book
├── components/              # booking/, staff/, layout/, ui/, …
├── lib/                     # auth, db, availability, pricing, email, stripe, loyalty, …
├── prisma/                  # schema + seed
├── prisma.config.ts         # Prisma ORM 7 CLI (datasource URL, migrations, seed)
├── generated/prisma/        # Generated client (from `npm run db:generate`; gitignored)
├── docs/                    # Guides + flow docs (see Documentation map above)
└── types/                   # Shared TypeScript types
```

Feature completeness and phased delivery are tracked in **[PRD_GAP_ANALYSIS.md](PRD_GAP_ANALYSIS.md)** (not duplicated here).

## Deploy to Vercel (going live)

See **[docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md)** for environment variables, database setup, and cron configuration. Set production values in Vercel only (do not put production `DATABASE_URL` in `.env.local`).

## Scripts

- `npm run dev` - Start development server (uses `.env.local` for local test/debug)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema to database (uses `DATABASE_URL` from `.env.local` when run locally)
- `npm run db:seed` / `npx prisma db seed` - Seed database (script in `prisma.config.ts`)
- `npm run db:migrate` - Create and run migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:local:up` / `db:local:down` - Start/stop local Postgres (Docker)

## License

Private project
