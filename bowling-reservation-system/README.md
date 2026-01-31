# Bowling Alley Reservation System

A comprehensive online reservation system for bowling alley lane bookings.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (Neon)
- **ORM:** Prisma
- **Styling:** Tailwind CSS
- **Payment:** Stripe
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Neon PostgreSQL database (sign up at https://neon.tech)

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Copy `.env.example` to `.env.local`
   - Add your Neon database connection string
   - Add your Stripe API keys (test mode for development)

3. **Set up the database:**
   ```bash
   # Generate Prisma Client
   npm run db:generate

   # Push schema to database
   npm run db:push
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## Project Structure

```
bowling-reservation-system/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── (pages)/           # Page routes
│   └── layout.tsx         # Root layout
├── lib/                   # Shared utilities
│   ├── db.ts             # Prisma client
│   └── auth.ts           # Authentication utilities
├── components/            # React components
├── prisma/                # Prisma schema
└── types/                 # TypeScript types
```

## Development Phases

- **Phase 0:** Project setup ✅
- **Phase 1:** Authentication (in progress)
- **Phase 2:** Operating hours & availability
- **Phase 3:** Booking creation
- **Phase 4:** Payment integration
- **Phase 5:** Customer dashboard
- **Phase 6:** Staff tools
- **Phase 7:** Admin package management
- **Phase 8:** Polish & deployment

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Create and run migrations
- `npm run db:studio` - Open Prisma Studio

## License

Private project



