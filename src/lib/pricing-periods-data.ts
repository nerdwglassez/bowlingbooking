// pricing-periods-data.ts — Load tenant pricing periods (server-only, no actions).

import type { PricingPeriod } from '@/generated/prisma/client'

import { isDevWithoutDb } from '@/lib/env'
import { prisma } from '@/lib/prisma'

export async function loadPricingPeriodsForTenant(
  tenantId: string,
): Promise<PricingPeriod[]> {
  if (isDevWithoutDb()) return []
  return prisma.pricingPeriod.findMany({
    where: { tenantId },
    orderBy: [{ priority: 'desc' }, { name: 'asc' }],
  })
}
