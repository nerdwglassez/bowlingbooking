/**
 * Adds the optional `lanes` column to the bookings table if missing.
 * Use when the local DB was created without running the add_booking_lanes migration
 * (e.g. after db:push or an older migrate). Run: npm run db:fix-lanes
 */
import { prisma } from '../lib/db'

async function main() {
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "lanes" TEXT;'
  )
  console.log('✅ bookings.lanes column is present (no-op if it already existed).')
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
