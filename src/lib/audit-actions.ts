// audit-actions.ts — known `AuditLog.action` values.
//
// This is a plain module (not `'use server'`) so the constant can be exported
// for use in client components, page filter dropdowns, and tests. The
// `listAuditLogs` server action and its callers consume this list.
//
// Add new entries here when a new mutation server action starts writing
// audit rows; the admin filter UI surfaces every value automatically.

export const AUDIT_LOG_ACTIONS = [
  'TENANT_UPDATED',
  'OPERATING_HOURS_UPDATED',
  'PACKAGE_CREATED',
  'PACKAGE_UPDATED',
  'PACKAGE_ARCHIVED',
  'TEAM_USER_CREATED',
  'TEAM_USER_UPDATED',
  'TEAM_USER_PASSWORD_RESET',
  'TEAM_USER_DEACTIVATED',
  'TEAM_USER_INVITE_ACCEPTED',
  'TEAM_USER_INVITE_RESENT',
  'BOOKING_REFUND_REQUESTED',
  'BOOKING_WALK_IN_CREATED',
  'BOOKING_CUSTOMER_CANCELLED',
  'LANE_BLOCK_CREATED',
  'LANE_BLOCK_REMOVED',
  'BOOKING_MANUAL_REFUND',
  'BOOKING_PROMO_APPLIED',
  'PROMO_CREATED',
  'PROMO_UPDATED',
  'PROMO_DEACTIVATED',
] as const

export type AuditAction = (typeof AUDIT_LOG_ACTIONS)[number]
