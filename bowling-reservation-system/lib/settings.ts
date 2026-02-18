import { prisma } from './db'

export interface PricingSettings {
  laneRentalPerHour: number // in dollars
  bowlerPricePerPerson: number // in dollars
  shoeRental: number // in dollars
  taxRate: number // as decimal (0.08 = 8%)
  totalLanes: number
  reserveLanes: number
}

const DEFAULT_SETTINGS: PricingSettings = {
  laneRentalPerHour: 30.0,
  bowlerPricePerPerson: 0.0,
  shoeRental: 5.0,
  taxRate: 0.08,
  totalLanes: 20,
  reserveLanes: 0,
}

/**
 * Get pricing settings from database
 */
export async function getPricingSettings(): Promise<PricingSettings> {
  try {
    const settings = await prisma.settings.findMany({
      where: {
        key: {
          in: ['laneRentalPerHour', 'bowlerPricePerPerson', 'shoeRental', 'taxRate', 'totalLanes', 'reserveLanes'],
        },
      },
    })

    if (settings.length === 0) {
      // Initialize with defaults if no settings exist
      await initializeDefaultSettings()
      return DEFAULT_SETTINGS
    }

    const settingsMap = new Map(settings.map(s => [s.key, s.value]))
    
    return {
      laneRentalPerHour: parseFloat(settingsMap.get('laneRentalPerHour') || String(DEFAULT_SETTINGS.laneRentalPerHour)),
      bowlerPricePerPerson: parseFloat(settingsMap.get('bowlerPricePerPerson') || String(DEFAULT_SETTINGS.bowlerPricePerPerson)),
      shoeRental: parseFloat(settingsMap.get('shoeRental') || String(DEFAULT_SETTINGS.shoeRental)),
      taxRate: parseFloat(settingsMap.get('taxRate') || String(DEFAULT_SETTINGS.taxRate)),
      totalLanes: parseInt(settingsMap.get('totalLanes') || String(DEFAULT_SETTINGS.totalLanes), 10),
      reserveLanes: parseInt(settingsMap.get('reserveLanes') || String(DEFAULT_SETTINGS.reserveLanes), 10),
    }
  } catch (error) {
    console.error('Error loading pricing settings:', error)
    return DEFAULT_SETTINGS
  }
}

/**
 * Save pricing settings to database
 */
export async function savePricingSettings(settings: PricingSettings): Promise<void> {
  await prisma.settings.upsert({
    where: { key: 'laneRentalPerHour' },
    update: { value: String(settings.laneRentalPerHour) },
    create: {
      key: 'laneRentalPerHour',
      value: String(settings.laneRentalPerHour),
      description: 'Lane rental price per hour in dollars',
    },
  })

  await prisma.settings.upsert({
    where: { key: 'bowlerPricePerPerson' },
    update: { value: String(settings.bowlerPricePerPerson) },
    create: {
      key: 'bowlerPricePerPerson',
      value: String(settings.bowlerPricePerPerson),
      description: 'Per-bowler base price in dollars (separate from lane and shoes)',
    },
  })

  await prisma.settings.upsert({
    where: { key: 'shoeRental' },
    update: { value: String(settings.shoeRental) },
    create: {
      key: 'shoeRental',
      value: String(settings.shoeRental),
      description: 'Shoe rental price per pair in dollars',
    },
  })

  await prisma.settings.upsert({
    where: { key: 'taxRate' },
    update: { value: String(settings.taxRate) },
    create: {
      key: 'taxRate',
      value: String(settings.taxRate),
      description: 'Tax rate as decimal (0.08 = 8%)',
    },
  })

  await prisma.settings.upsert({
    where: { key: 'totalLanes' },
    update: { value: String(settings.totalLanes) },
    create: {
      key: 'totalLanes',
      value: String(settings.totalLanes),
      description: 'Total lanes available at the center',
    },
  })

  await prisma.settings.upsert({
    where: { key: 'reserveLanes' },
    update: { value: String(settings.reserveLanes) },
    create: {
      key: 'reserveLanes',
      value: String(settings.reserveLanes),
      description: 'Number of lanes held in reserve and not offered to online booking',
    },
  })
}

/**
 * Initialize default settings in database
 */
async function initializeDefaultSettings(): Promise<void> {
  await savePricingSettings(DEFAULT_SETTINGS)
}


