import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPricingSettings, savePricingSettings } from '@/lib/settings'
import { z } from 'zod'

const settingsSchema = z.object({
  laneRentalPerHour: z.number().min(0),
  bowlerPricePerPerson: z.number().min(0),
  shoeRental: z.number().min(0),
  taxRate: z.number().min(0).max(1),
  totalLanes: z.number().int().min(1).max(100),
  reserveLanes: z.number().int().min(0).max(100),
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

export async function GET() {
  try {
    const session = await requireAuth('STAFF')
    const settings = await getPricingSettings()
    const operatingHours = await prisma.operatingHours.findMany({
      orderBy: { dayOfWeek: 'asc' },
    })
    const laneBlocks = await prisma.laneBlock.findMany({
      where: { date: { gte: new Date() } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      take: 200,
    })

    return NextResponse.json({
      canEdit: canManageSettings(session.role),
      settings,
      operatingHours,
      laneBlocks: laneBlocks.map((b) => ({
        ...b,
        lanes: JSON.parse(b.lanes) as number[],
      })),
    })
  } catch (error: any) {
    if (isRedirectError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get staff settings error:', error)
    return NextResponse.json({ error: 'Failed to load staff settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth('STAFF')
    if (!canManageSettings(session.role)) {
      return NextResponse.json({ error: 'Read-only access' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = settingsSchema.parse(body)

    if (validatedData.reserveLanes >= validatedData.totalLanes) {
      return NextResponse.json(
        { error: 'Reserve lanes must be less than total lanes' },
        { status: 400 }
      )
    }

    await savePricingSettings(validatedData)
    return NextResponse.json({
      settings: validatedData,
      message: 'Settings updated successfully',
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    if (isRedirectError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Update staff settings error:', error)
    return NextResponse.json({ error: 'Failed to update staff settings' }, { status: 500 })
  }
}
