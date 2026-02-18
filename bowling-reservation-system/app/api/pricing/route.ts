import { NextResponse } from 'next/server'
import { getPricingSettings } from '@/lib/settings'

/**
 * Public API for the booking UI to read current pricing from staff settings.
 * Returns the same values used by the booking API so displayed prices match the final charge.
 */
export async function GET() {
  try {
    const settings = await getPricingSettings()
    return NextResponse.json({
      laneRentalPerHour: settings.laneRentalPerHour,
      bowlerPricePerPerson: settings.bowlerPricePerPerson,
      shoeRental: settings.shoeRental,
      taxRate: settings.taxRate,
    })
  } catch (error) {
    console.error('Pricing API error:', error)
    return NextResponse.json(
      { error: 'Failed to load pricing' },
      { status: 500 }
    )
  }
}
