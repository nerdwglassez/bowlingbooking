import type { CurrentUser } from '@/lib/auth'

/**
 * Resolve the caller's home tenant. Staff/manager users must always have one.
 */
export function requireUserTenantId(user: CurrentUser): string {
  if (!user.tenantId) {
    throw new Error('Staff user has no tenant context.')
  }
  return user.tenantId
}

/**
 * Bind a staff/manager action to the caller's tenant. Rejects cross-tenant ids.
 */
export function assertStaffTenantAccess(
  user: CurrentUser,
  tenantId: string,
): string {
  const home = requireUserTenantId(user)
  if (home !== tenantId) {
    throw new Error('Resource not found.')
  }
  return home
}

/**
 * Admin tenant gate.
 *
 * - Tenant-bound ADMIN/MANAGER: may only touch their own tenant.
 * - Platform ADMIN (`role === 'ADMIN' && tenantId == null`): may touch any tenant.
 * - Non-admin with null tenantId: denied.
 */
export function assertAdminTenantAccess(
  user: CurrentUser,
  tenantId: string | null | undefined,
  action: string,
): void {
  if (!tenantId) {
    throw new Error(`${action}: tenant not found.`)
  }
  if (!user.tenantId) {
    if (user.role !== 'ADMIN') {
      throw new Error(`${action}: cannot access resources outside your tenant.`)
    }
    return
  }
  if (tenantId !== user.tenantId) {
    throw new Error(`${action}: cannot access resources outside your tenant.`)
  }
}

/** True when the user is a platform (cross-tenant) ADMIN. */
export function isPlatformAdmin(user: CurrentUser): boolean {
  return user.role === 'ADMIN' && user.tenantId == null
}
