'use server'

import { isDevWithoutDb } from '@/lib/env'
import { prisma } from '@/lib/prisma'

/** True when the tenant has at least one active legacy PromoCode row. */
export async function tenantHasActiveLegacyPromoCodes(
  tenantId: string,
): Promise<boolean> {
  if (isDevWithoutDb()) return false
  const count = await prisma.promoCode.count({
    where: { tenantId, active: true },
  })
  return count > 0
}
