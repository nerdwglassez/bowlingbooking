import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getPricingSettings, savePricingSettings } from '@/lib/settings'
import { z } from 'zod'

const settingsSchema = z.object({
  laneRentalPerHour: z.number().min(0),
  shoeRental: z.number().min(0),
  taxRate: z.number().min(0).max(1), // 0.08 = 8%
})

export async function GET(request: NextRequest) {
  try {
    await requireAuth('ADMIN')

    const settings = await getPricingSettings()
    return NextResponse.json({ settings })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Get settings error:', error)
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAuth('ADMIN')

    const body = await request.json()
    const validatedData = settingsSchema.parse(body)

    await savePricingSettings(validatedData)

    return NextResponse.json({
      settings: validatedData,
      message: 'Settings updated successfully',
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Update settings error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}

