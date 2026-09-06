// staff.ts — Public facade for staff server actions.
// Implementations live in staff-impl.ts (`'use server'`). Domain modules only
// group re-exports — they must NOT be `'use server'` files, because Next.js
// forbids `export *` / non-async re-exports in server-action modules.

export * from '@/lib/actions/staff-cockpit'
export * from '@/lib/actions/staff-schedule'
export * from '@/lib/actions/staff-walkin'
export * from '@/lib/actions/staff-booking-ops'
