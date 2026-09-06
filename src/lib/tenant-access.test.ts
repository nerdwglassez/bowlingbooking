import { describe, expect, it } from 'vitest'

import {
  assertAdminTenantAccess,
  assertStaffTenantAccess,
  isPlatformAdmin,
  requireUserTenantId,
} from '@/lib/tenant-access'
import type { CurrentUser } from '@/lib/auth'

function user(partial: Partial<CurrentUser> & Pick<CurrentUser, 'role'>): CurrentUser {
  return {
    id: 'u1',
    email: 'u@test.com',
    name: 'U',
    tenantId: 't1',
    ...partial,
  }
}

describe('tenant-access', () => {
  it('requireUserTenantId throws when tenant missing', () => {
    expect(() => requireUserTenantId(user({ role: 'STAFF', tenantId: null }))).toThrow(
      /no tenant context/i,
    )
  })

  it('assertStaffTenantAccess rejects cross-tenant ids', () => {
    expect(() =>
      assertStaffTenantAccess(user({ role: 'MANAGER', tenantId: 't1' }), 't2'),
    ).toThrow(/not found/i)
  })

  it('assertAdminTenantAccess allows platform ADMIN any tenant', () => {
    expect(() =>
      assertAdminTenantAccess(
        user({ role: 'ADMIN', tenantId: null }),
        't9',
        'test',
      ),
    ).not.toThrow()
  })

  it('assertAdminTenantAccess denies non-admin with null tenant', () => {
    expect(() =>
      assertAdminTenantAccess(
        user({ role: 'MANAGER', tenantId: null }),
        't1',
        'test',
      ),
    ).toThrow(/outside your tenant/i)
  })

  it('isPlatformAdmin is true only for ADMIN with null tenantId', () => {
    expect(isPlatformAdmin(user({ role: 'ADMIN', tenantId: null }))).toBe(true)
    expect(isPlatformAdmin(user({ role: 'ADMIN', tenantId: 't1' }))).toBe(false)
    expect(isPlatformAdmin(user({ role: 'MANAGER', tenantId: null }))).toBe(false)
  })
})
