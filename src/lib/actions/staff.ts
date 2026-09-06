'use server'

// staff.ts — Facade re-exports for staff server actions.
// Implementations live in staff-impl.ts; domain modules group exports:
//   staff-cockpit, staff-schedule, staff-walkin, staff-booking-ops

export * from '@/lib/actions/staff-cockpit'
export * from '@/lib/actions/staff-schedule'
export * from '@/lib/actions/staff-walkin'
export * from '@/lib/actions/staff-booking-ops'
