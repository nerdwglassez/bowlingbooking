/**
 * Idempotent database seed for local/staging.
 *
 * Run manually when a database is available:
 *   npx tsx prisma/seed.ts
 *
 * Or after `prisma migrate dev`:
 *   npx prisma db seed
 */

import { PartyType, PrismaClient, Role } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

const TENANT_SLUG = 'royalz'
const SEED_ADMIN_BCRYPT_COST = 12

const DEFAULT_SEED_ADMIN_EMAIL = 'admin@royalz.local'
const DEFAULT_SEED_ADMIN_PASSWORD = 'change-me-please'

async function upsertSeedAdmin(tenantId: string) {
  const email = (
    process.env.SEED_ADMIN_EMAIL ?? DEFAULT_SEED_ADMIN_EMAIL
  )
    .trim()
    .toLowerCase()
  const password =
    process.env.SEED_ADMIN_PASSWORD ?? DEFAULT_SEED_ADMIN_PASSWORD

  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.warn(
      `SEED_ADMIN_PASSWORD not set — seeding admin user with placeholder ` +
        `"${DEFAULT_SEED_ADMIN_PASSWORD}". DO NOT use this in any shared environment.`,
    )
  }

  const passwordHash = await hash(password, SEED_ADMIN_BCRYPT_COST)

  await prisma.user.upsert({
    where: { email },
    update: {
      tenantId,
      role: Role.ADMIN,
      passwordHash,
    },
    create: {
      email,
      name: 'Seed Admin',
      role: Role.ADMIN,
      tenantId,
      passwordHash,
    },
  })

  console.log(`Seeded admin user: ${email} (role=ADMIN, tenant=${TENANT_SLUG})`)
}

async function upsertOperatingHours(
  tenantId: string,
  dayOfWeek: number,
  openTime: string,
  closeTime: string,
  closed = false,
) {
  const existing = await prisma.operatingHours.findFirst({
    where: { tenantId, dayOfWeek },
  })
  if (existing) {
    return prisma.operatingHours.update({
      where: { id: existing.id },
      data: { openTime, closeTime, closed },
    })
  }
  return prisma.operatingHours.create({
    data: { tenantId, dayOfWeek, openTime, closeTime, closed },
  })
}

async function upsertLane(tenantId: string, number: number) {
  const existing = await prisma.lane.findFirst({
    where: { tenantId, number },
  })
  if (existing) {
    return prisma.lane.update({
      where: { id: existing.id },
      data: { active: true },
    })
  }
  return prisma.lane.create({
    data: { tenantId, number, active: true },
  })
}

async function upsertPackageByName(
  tenantId: string,
  name: string,
  data: {
    description: string | null
    basePrice: number
    gameIncluded: boolean
    shoesIncluded: boolean
    gameCostPer: number | null
    shoeCostPer: number | null
    partyTypes: PartyType[]
    active: boolean
    sortOrder: number
  },
) {
  const existing = await prisma.package.findFirst({
    where: { tenantId, name },
  })
  if (existing) {
    return prisma.package.update({
      where: { id: existing.id },
      data: {
        ...data,
        partyTypes: { set: data.partyTypes },
      },
    })
  }
  return prisma.package.create({
    data: {
      tenantId,
      name,
      ...data,
    },
  })
}

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: TENANT_SLUG },
    update: {
      name: 'Royal Z Lanes',
      address: 'TBD',
      phone: 'TBD',
      timezone: 'America/New_York',
      themeSlug: 'default',
      holdTimeoutMins: 10,
      maxOnlineBowlers: 18,
      config: {},
    },
    create: {
      name: 'Royal Z Lanes',
      slug: TENANT_SLUG,
      address: 'TBD',
      phone: 'TBD',
      timezone: 'America/New_York',
      themeSlug: 'default',
      holdTimeoutMins: 10,
      maxOnlineBowlers: 18,
      config: {},
    },
  })

  for (let n = 1; n <= 10; n += 1) {
    await upsertLane(tenant.id, n)
  }

  await upsertOperatingHours(tenant.id, 1, '12:00', '22:00')
  await upsertOperatingHours(tenant.id, 2, '12:00', '22:00')
  await upsertOperatingHours(tenant.id, 3, '12:00', '22:00')
  await upsertOperatingHours(tenant.id, 4, '12:00', '22:00')
  await upsertOperatingHours(tenant.id, 5, '12:00', '23:59')
  await upsertOperatingHours(tenant.id, 6, '10:00', '23:59')
  await upsertOperatingHours(tenant.id, 0, '10:00', '22:00')

  await upsertPackageByName(tenant.id, 'Open Bowling', {
    description: null,
    basePrice: 0,
    gameIncluded: false,
    shoesIncluded: false,
    gameCostPer: 800,
    shoeCostPer: 500,
    partyTypes: [PartyType.OPEN],
    active: true,
    sortOrder: 0,
  })

  await upsertPackageByName(tenant.id, 'Birthday Party Package', {
    description: null,
    basePrice: 25000,
    gameIncluded: true,
    shoesIncluded: true,
    gameCostPer: null,
    shoeCostPer: null,
    partyTypes: [PartyType.BIRTHDAY],
    active: true,
    sortOrder: 1,
  })

  await upsertPackageByName(tenant.id, 'Corporate Event', {
    description: null,
    basePrice: 50000,
    gameIncluded: true,
    shoesIncluded: true,
    gameCostPer: null,
    shoeCostPer: null,
    partyTypes: [PartyType.CORPORATE],
    active: true,
    sortOrder: 2,
  })

  await upsertPackageByName(tenant.id, 'Cosmic Bowling', {
    description: null,
    basePrice: 0,
    gameIncluded: false,
    shoesIncluded: false,
    gameCostPer: 1200,
    shoeCostPer: 500,
    partyTypes: [PartyType.COSMIC],
    active: true,
    sortOrder: 3,
  })

  await upsertSeedAdmin(tenant.id)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
