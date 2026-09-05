/**
 * Idempotent database seed for local/staging.
 *
 * Run manually when a database is available:
 *   npx tsx prisma/seed.ts
 *
 * Or after `prisma migrate dev`:
 *   npx prisma db seed
 *
 * Demo bookings/contacts are included unless NODE_ENV=production or
 * SEED_DEMO_DATA=0. Set SEED_DEMO_DATA=1 to force them in any environment.
 */

import { hash } from 'bcryptjs'

import {
  BookingSource,
  BookingStatus,
  PartyType,
  Role,
} from '@/generated/prisma/client'
import { getLaneCount } from '@/lib/lane-logic'
import { createPrismaClient } from '@/lib/prisma'

const prisma = createPrismaClient()

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

  if (shouldSeedDemoData()) {
    await seedDemoBookings(tenant.id)
  } else {
    console.log('Skipping demo bookings (production seed or SEED_DEMO_DATA=0).')
  }
}

const VENUE_TZ = 'America/New_York'

function shouldSeedDemoData(): boolean {
  const flag = process.env.SEED_DEMO_DATA?.trim().toLowerCase()
  if (flag === '0' || flag === 'false' || flag === 'no') return false
  if (flag === '1' || flag === 'true' || flag === 'yes') return true
  return process.env.NODE_ENV !== 'production'
}

function calendarParts(timeZone: string, date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date)
  const num = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value)
  return { year: num('year'), month: num('month'), day: num('day') }
}

function addCalendarDays(
  parts: { year: number; month: number; day: number },
  delta: number,
) {
  const dt = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + delta))
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
  }
}

function zonedLocalDate(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
): Date {
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  const tzName = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  })
    .formatToParts(probe)
    .find((p) => p.type === 'timeZoneName')?.value
  const match = tzName?.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/)
  const sign = match?.[1] === '-' ? '-' : '+'
  const offsetHours = (match?.[2] ?? '4').padStart(2, '0')
  const offsetMinutes = (match?.[3] ?? '00').padStart(2, '0')
  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00${sign}${offsetHours}:${offsetMinutes}`
  return new Date(iso)
}

type DemoBookingSpec = {
  code: string
  daysFromToday: number
  hour: number
  minute?: number
  durationMin: number
  name: string
  email: string
  phone?: string | null
  bowlerCount: number
  packageName: string
  partyType: PartyType
  source: BookingSource
  status: BookingStatus
  totalAmount: number
  laneNumbers: number[]
  paymentStatus?: 'succeeded' | 'cash' | null
  isRefunded?: boolean
}

async function seedDemoBookings(tenantId: string) {
  const packages = await prisma.package.findMany({
    where: { tenantId },
    select: { id: true, name: true },
  })
  const packageIdByName = new Map(packages.map((p) => [p.name, p.id]))
  const lanes = await prisma.lane.findMany({
    where: { tenantId },
    select: { id: true, number: true },
  })
  const laneIdByNumber = new Map(lanes.map((l) => [l.number, l.id]))

  const specs: DemoBookingSpec[] = [
    {
      code: 'SD0001',
      daysFromToday: -150,
      hour: 18,
      durationMin: 90,
      name: 'Sarah Johnson',
      email: 'sarah@email.com',
      phone: '(803) 555-0147',
      bowlerCount: 4,
      packageName: 'Open Bowling',
      partyType: PartyType.OPEN,
      source: BookingSource.ONLINE,
      status: BookingStatus.COMPLETED,
      totalAmount: 5200,
      laneNumbers: [2],
      paymentStatus: 'succeeded',
    },
    {
      code: 'SD0002',
      daysFromToday: -90,
      hour: 19,
      durationMin: 120,
      name: 'Sarah Johnson',
      email: 'sarah@email.com',
      phone: '(803) 555-0147',
      bowlerCount: 6,
      packageName: 'Cosmic Bowling',
      partyType: PartyType.COSMIC,
      source: BookingSource.ONLINE,
      status: BookingStatus.COMPLETED,
      totalAmount: 10200,
      laneNumbers: [4],
      paymentStatus: 'succeeded',
    },
    {
      code: 'SD0003',
      daysFromToday: -45,
      hour: 17,
      durationMin: 90,
      name: 'Sarah Johnson',
      email: 'sarah@email.com',
      phone: '(803) 555-0147',
      bowlerCount: 4,
      packageName: 'Open Bowling',
      partyType: PartyType.OPEN,
      source: BookingSource.ONLINE,
      status: BookingStatus.COMPLETED,
      totalAmount: 4800,
      laneNumbers: [3],
      paymentStatus: 'succeeded',
    },
    {
      code: 'SD0004',
      daysFromToday: -21,
      hour: 18,
      durationMin: 120,
      name: 'Sarah Johnson',
      email: 'sarah@email.com',
      phone: '(803) 555-0147',
      bowlerCount: 6,
      packageName: 'Open Bowling',
      partyType: PartyType.OPEN,
      source: BookingSource.ONLINE,
      status: BookingStatus.COMPLETED,
      totalAmount: 7200,
      laneNumbers: [2, 4],
      paymentStatus: 'succeeded',
    },
    {
      code: 'SD0005',
      daysFromToday: 0,
      hour: 14,
      minute: 30,
      durationMin: 120,
      name: 'Sarah Johnson',
      email: 'sarah@email.com',
      phone: '(803) 555-0147',
      bowlerCount: 6,
      packageName: 'Cosmic Bowling',
      partyType: PartyType.COSMIC,
      source: BookingSource.ONLINE,
      status: BookingStatus.CONFIRMED,
      totalAmount: 7200,
      laneNumbers: [2, 4],
      paymentStatus: 'succeeded',
    },
    {
      code: 'SD0006',
      daysFromToday: -60,
      hour: 16,
      durationMin: 90,
      name: 'Marcus Williams',
      email: 'marcus@email.com',
      phone: '(803) 555-0182',
      bowlerCount: 8,
      packageName: 'Cosmic Bowling',
      partyType: PartyType.COSMIC,
      source: BookingSource.ONLINE,
      status: BookingStatus.COMPLETED,
      totalAmount: 14400,
      laneNumbers: [1, 2],
      paymentStatus: 'succeeded',
    },
    {
      code: 'SD0007',
      daysFromToday: -14,
      hour: 15,
      durationMin: 90,
      name: 'Marcus Williams',
      email: 'marcus@email.com',
      phone: '(803) 555-0182',
      bowlerCount: 6,
      packageName: 'Birthday Party Package',
      partyType: PartyType.BIRTHDAY,
      source: BookingSource.ONLINE,
      status: BookingStatus.COMPLETED,
      totalAmount: 25000,
      laneNumbers: [5],
      paymentStatus: 'succeeded',
    },
    {
      code: 'SD0008',
      daysFromToday: 0,
      hour: 15,
      durationMin: 120,
      name: 'Marcus Williams',
      email: 'marcus@email.com',
      phone: '(803) 555-0182',
      bowlerCount: 8,
      packageName: 'Birthday Party Package',
      partyType: PartyType.BIRTHDAY,
      source: BookingSource.ONLINE,
      status: BookingStatus.CONFIRMED,
      totalAmount: 25000,
      laneNumbers: [1, 9],
      paymentStatus: 'succeeded',
    },
    {
      code: 'SD0009',
      daysFromToday: -120,
      hour: 14,
      durationMin: 90,
      name: 'Jordan Rivera',
      email: 'jordan@acmecorp.com',
      phone: '(803) 555-0193',
      bowlerCount: 6,
      packageName: 'Open Bowling',
      partyType: PartyType.OPEN,
      source: BookingSource.ONLINE,
      status: BookingStatus.COMPLETED,
      totalAmount: 14400,
      laneNumbers: [5],
      paymentStatus: 'succeeded',
    },
    {
      code: 'SD0010',
      daysFromToday: -80,
      hour: 18,
      durationMin: 180,
      name: 'Jordan Rivera',
      email: 'jordan@acmecorp.com',
      phone: '(803) 555-0193',
      bowlerCount: 12,
      packageName: 'Corporate Event',
      partyType: PartyType.CORPORATE,
      source: BookingSource.PHONE,
      status: BookingStatus.CANCELLED,
      totalAmount: 50000,
      laneNumbers: [1, 2],
      paymentStatus: null,
      isRefunded: true,
    },
    {
      code: 'SD0011',
      daysFromToday: -40,
      hour: 19,
      durationMin: 90,
      name: 'Jordan Rivera',
      email: 'jordan@acmecorp.com',
      phone: '(803) 555-0193',
      bowlerCount: 8,
      packageName: 'Open Bowling',
      partyType: PartyType.OPEN,
      source: BookingSource.ONLINE,
      status: BookingStatus.COMPLETED,
      totalAmount: 19200,
      laneNumbers: [2, 3],
      paymentStatus: 'succeeded',
    },
    {
      code: 'SD0012',
      daysFromToday: -7,
      hour: 13,
      durationMin: 90,
      name: 'Jordan Rivera',
      email: 'jordan@acmecorp.com',
      phone: '(803) 555-0193',
      bowlerCount: 6,
      packageName: 'Cosmic Bowling',
      partyType: PartyType.COSMIC,
      source: BookingSource.WALK_IN,
      status: BookingStatus.COMPLETED,
      totalAmount: 16000,
      laneNumbers: [4],
      paymentStatus: 'cash',
    },
    {
      code: 'SD0013',
      daysFromToday: 12,
      hour: 17,
      durationMin: 180,
      name: 'Acme Corp',
      email: 'jordan@acmecorp.com',
      phone: '(803) 555-0193',
      bowlerCount: 24,
      packageName: 'Corporate Event',
      partyType: PartyType.CORPORATE,
      source: BookingSource.PHONE,
      status: BookingStatus.PENDING_PAYMENT,
      totalAmount: 86400,
      laneNumbers: [7, 8, 9, 10],
      paymentStatus: null,
    },
    {
      code: 'SD0014',
      daysFromToday: -10,
      hour: 12,
      durationMin: 90,
      name: 'Taylor Chen',
      email: 'taylor@email.com',
      phone: '(803) 555-0164',
      bowlerCount: 3,
      packageName: 'Open Bowling',
      partyType: PartyType.OPEN,
      source: BookingSource.ONLINE,
      status: BookingStatus.COMPLETED,
      totalAmount: 2700,
      laneNumbers: [5],
      paymentStatus: 'succeeded',
    },
    {
      code: 'SD0015',
      daysFromToday: 0,
      hour: 15,
      durationMin: 90,
      name: 'Taylor Chen',
      email: 'taylor@email.com',
      phone: '(803) 555-0164',
      bowlerCount: 3,
      packageName: 'Open Bowling',
      partyType: PartyType.OPEN,
      source: BookingSource.ONLINE,
      status: BookingStatus.CONFIRMED,
      totalAmount: 2700,
      laneNumbers: [5],
      paymentStatus: 'succeeded',
    },
    {
      code: 'SD0016',
      daysFromToday: -18,
      hour: 19,
      durationMin: 90,
      name: 'Alex Park',
      email: 'alex@email.com',
      phone: '(803) 555-0211',
      bowlerCount: 4,
      packageName: 'Cosmic Bowling',
      partyType: PartyType.COSMIC,
      source: BookingSource.ONLINE,
      status: BookingStatus.COMPLETED,
      totalAmount: 7200,
      laneNumbers: [8],
      paymentStatus: 'succeeded',
    },
    {
      code: 'SD0017',
      daysFromToday: 0,
      hour: 16,
      durationMin: 90,
      name: 'Jamie Park',
      email: 'park@email.com',
      phone: null,
      bowlerCount: 4,
      packageName: 'Open Bowling',
      partyType: PartyType.OPEN,
      source: BookingSource.PHONE,
      status: BookingStatus.CONFIRMED,
      totalAmount: 3600,
      laneNumbers: [7],
      paymentStatus: 'succeeded',
    },
    {
      code: 'SD0018',
      daysFromToday: -30,
      hour: 15,
      durationMin: 60,
      name: 'Riley Lee',
      email: 'riley@email.com',
      phone: '(803) 555-0088',
      bowlerCount: 2,
      packageName: 'Open Bowling',
      partyType: PartyType.OPEN,
      source: BookingSource.ONLINE,
      status: BookingStatus.COMPLETED,
      totalAmount: 2600,
      laneNumbers: [9],
      paymentStatus: 'succeeded',
    },
    {
      code: 'SD0019',
      daysFromToday: 0,
      hour: 12,
      durationMin: 90,
      name: 'Lee Family',
      email: 'lee@email.com',
      phone: null,
      bowlerCount: 4,
      packageName: 'Open Bowling',
      partyType: PartyType.OPEN,
      source: BookingSource.WALK_IN,
      status: BookingStatus.COMPLETED,
      totalAmount: 3600,
      laneNumbers: [8],
      paymentStatus: 'cash',
    },
    {
      code: 'SD0020',
      daysFromToday: 0,
      hour: 12,
      minute: 30,
      durationMin: 60,
      name: 'Sam Smith',
      email: 'smith@email.com',
      phone: null,
      bowlerCount: 2,
      packageName: 'Open Bowling',
      partyType: PartyType.OPEN,
      source: BookingSource.ONLINE,
      status: BookingStatus.COMPLETED,
      totalAmount: 1800,
      laneNumbers: [5],
      paymentStatus: 'succeeded',
    },
    {
      code: 'SD0021',
      daysFromToday: 0,
      hour: 13,
      durationMin: 90,
      name: 'Jordan Rivera',
      email: 'jordan@acmecorp.com',
      phone: '(803) 555-0193',
      bowlerCount: 4,
      packageName: 'Open Bowling',
      partyType: PartyType.OPEN,
      source: BookingSource.WALK_IN,
      status: BookingStatus.COMPLETED,
      totalAmount: 3600,
      laneNumbers: [1, 3],
      paymentStatus: 'cash',
    },
    {
      code: 'SD0022',
      daysFromToday: 0,
      hour: 14,
      minute: 15,
      durationMin: 90,
      name: 'Alex Brown',
      email: 'brown@email.com',
      phone: null,
      bowlerCount: 6,
      packageName: 'Birthday Party Package',
      partyType: PartyType.BIRTHDAY,
      source: BookingSource.ONLINE,
      status: BookingStatus.CONFIRMED,
      totalAmount: 25000,
      laneNumbers: [8],
      paymentStatus: 'succeeded',
    },
    {
      code: 'SD0023',
      daysFromToday: 0,
      hour: 18,
      durationMin: 90,
      name: 'Davis group',
      email: 'davis@email.com',
      phone: null,
      bowlerCount: 4,
      packageName: 'Open Bowling',
      partyType: PartyType.OPEN,
      source: BookingSource.ONLINE,
      status: BookingStatus.CONFIRMED,
      totalAmount: 3600,
      laneNumbers: [7],
      paymentStatus: 'succeeded',
    },
    {
      code: 'SD0024',
      daysFromToday: 0,
      hour: 19,
      durationMin: 90,
      name: 'Rivera party',
      email: 'rivera@email.com',
      phone: null,
      bowlerCount: 5,
      packageName: 'Open Bowling',
      partyType: PartyType.OPEN,
      source: BookingSource.ONLINE,
      status: BookingStatus.CONFIRMED,
      totalAmount: 4500,
      laneNumbers: [3],
      paymentStatus: 'succeeded',
    },
    {
      code: 'SD0025',
      daysFromToday: 0,
      hour: 20,
      durationMin: 90,
      name: 'Morgan Lee',
      email: 'morgan@email.com',
      phone: null,
      bowlerCount: 2,
      packageName: 'Open Bowling',
      partyType: PartyType.OPEN,
      source: BookingSource.PHONE,
      status: BookingStatus.CANCELLED,
      totalAmount: 1800,
      laneNumbers: [9],
      paymentStatus: 'succeeded',
      isRefunded: true,
    },
    {
      code: 'SD0026',
      daysFromToday: -3,
      hour: 19,
      durationMin: 90,
      name: 'No-show Guest',
      email: 'noshow@email.com',
      phone: null,
      bowlerCount: 4,
      packageName: 'Open Bowling',
      partyType: PartyType.OPEN,
      source: BookingSource.ONLINE,
      status: BookingStatus.NO_SHOW,
      totalAmount: 4800,
      laneNumbers: [6],
      paymentStatus: 'succeeded',
    },
    {
      code: 'SD0027',
      daysFromToday: 1,
      hour: 18,
      durationMin: 90,
      name: 'Alex Park',
      email: 'alex@email.com',
      phone: '(803) 555-0211',
      bowlerCount: 4,
      packageName: 'Cosmic Bowling',
      partyType: PartyType.COSMIC,
      source: BookingSource.ONLINE,
      status: BookingStatus.CONFIRMED,
      totalAmount: 7200,
      laneNumbers: [4],
      paymentStatus: 'succeeded',
    },
    {
      code: 'SD0028',
      daysFromToday: -2,
      hour: 17,
      durationMin: 90,
      name: 'Riley Lee',
      email: 'riley@email.com',
      phone: '(803) 555-0088',
      bowlerCount: 4,
      packageName: 'Open Bowling',
      partyType: PartyType.OPEN,
      source: BookingSource.ONLINE,
      status: BookingStatus.COMPLETED,
      totalAmount: 4800,
      laneNumbers: [2],
      paymentStatus: 'succeeded',
    },
  ]

  const today = calendarParts(VENUE_TZ, new Date())
  let created = 0
  let updated = 0

  for (const spec of specs) {
    const packageId = packageIdByName.get(spec.packageName)
    if (!packageId) {
      throw new Error(`Seed package missing: ${spec.packageName}`)
    }
    const day = addCalendarDays(today, spec.daysFromToday)
    const startTime = zonedLocalDate(
      VENUE_TZ,
      day.year,
      day.month,
      day.day,
      spec.hour,
      spec.minute ?? 0,
    )
    const endTime = new Date(startTime.getTime() + spec.durationMin * 60_000)
    const laneCount = getLaneCount(spec.bowlerCount)
    const laneIds = spec.laneNumbers.map((n) => {
      const id = laneIdByNumber.get(n)
      if (!id) throw new Error(`Seed lane missing: ${n}`)
      return id
    })

    const existing = await prisma.booking.findUnique({
      where: { confirmationCode: spec.code },
      select: { id: true },
    })

    const bookingData = {
      tenantId,
      partyType: spec.partyType,
      bowlerCount: spec.bowlerCount,
      laneCount,
      startTime,
      endTime,
      packageId,
      status: spec.status,
      source: spec.source,
      customerName: spec.name,
      customerEmail: spec.email,
      customerPhone: spec.phone ?? null,
      totalAmount: spec.totalAmount,
      isRefunded: spec.isRefunded ?? false,
      notes: 'Local demo seed',
    }

    const bookingId = existing
      ? (
          await prisma.booking.update({
            where: { id: existing.id },
            data: bookingData,
            select: { id: true },
          })
        ).id
      : (
          await prisma.booking.create({
            data: {
              ...bookingData,
              confirmationCode: spec.code,
            },
            select: { id: true },
          })
        ).id

    if (existing) updated += 1
    else created += 1

    await prisma.bookingLane.deleteMany({ where: { bookingId } })
    if (laneIds.length > 0) {
      await prisma.bookingLane.createMany({
        data: laneIds.map((laneId) => ({ bookingId, laneId })),
      })
    }

    await prisma.bookingBowler.deleteMany({ where: { bookingId } })
    await prisma.bookingBowler.createMany({
      data: Array.from({ length: spec.bowlerCount }, (_, index) => ({
        bookingId,
        index,
        shoeSize: index % 2 === 0 ? '8' : '10',
      })),
    })

    await prisma.payment.deleteMany({ where: { bookingId } })
    if (spec.paymentStatus) {
      await prisma.payment.create({
        data: {
          bookingId,
          amount: spec.totalAmount,
          status: spec.paymentStatus,
          paymentMethod: spec.paymentStatus === 'cash' ? 'cash' : 'card',
        },
      })
    }
  }

  const blockDay = today
  const blockStart = zonedLocalDate(
    VENUE_TZ,
    blockDay.year,
    blockDay.month,
    blockDay.day,
    14,
    0,
  )
  const blockEnd = new Date(blockStart.getTime() + 4 * 3_600_000)
  const existingBlock = await prisma.blockedSlot.findFirst({
    where: { tenantId, reason: 'Maintenance (demo seed)' },
  })
  if (existingBlock) {
    await prisma.blockedSlot.update({
      where: { id: existingBlock.id },
      data: { startTime: blockStart, endTime: blockEnd, lanes: [6] },
    })
  } else {
    await prisma.blockedSlot.create({
      data: {
        tenantId,
        startTime: blockStart,
        endTime: blockEnd,
        reason: 'Maintenance (demo seed)',
        lanes: [6],
      },
    })
  }

  console.log(
    `Seeded demo bookings: ${created} created, ${updated} updated (${specs.length} total).`,
  )
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
