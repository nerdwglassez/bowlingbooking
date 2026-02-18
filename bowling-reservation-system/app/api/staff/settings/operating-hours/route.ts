import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const operatingHoursSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).nullable(),
  closeTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).nullable(),
  isClosed: z.boolean(),
})

const bulkSchema = z.object({
  hours: z.array(operatingHoursSchema).length(7),
})

function canManageSettings(role: string): boolean {
  return role === 'MANAGER' || role === 'ADMIN'
}

function isRedirectError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const maybeError = error as { message?: string; digest?: string }
  return Boolean(
    maybeError.message?.includes('redirect') ||
      maybeError.message?.includes('NEXT_REDIRECT') ||
      maybeError.digest?.includes('NEXT_REDIRECT')
  )
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth('STAFF')
    if (!canManageSettings(session.role)) {
      return NextResponse.json({ error: 'Read-only access' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = bulkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const results = await Promise.all(
      parsed.data.hours.map((h) =>
        prisma.operatingHours.upsert({
          where: { dayOfWeek: h.dayOfWeek },
          update: {
            openTime: h.isClosed ? null : h.openTime,
            closeTime: h.isClosed ? null : h.closeTime,
            isClosed: h.isClosed,
          },
          create: {
            dayOfWeek: h.dayOfWeek,
            openTime: h.isClosed ? null : h.openTime,
            closeTime: h.isClosed ? null : h.closeTime,
            isClosed: h.isClosed,
          },
        })
      )
    )

    return NextResponse.json({ hours: results })
  } catch (error: any) {
    if (isRedirectError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Update staff operating hours error:', error)
    return NextResponse.json({ error: 'Failed to update operating hours' }, { status: 500 })
  }
}
