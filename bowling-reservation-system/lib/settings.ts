import { prisma } from './db'

export interface PricingSettings {
  laneRentalPerHour: number // in dollars
  shoeRental: number // in dollars
  taxRate: number // as decimal (0.08 = 8%)
}

const DEFAULT_SETTINGS: PricingSettings = {
  laneRentalPerHour: 30.0,
  shoeRental: 5.0,
  taxRate: 0.08,
}

/**
 * Get pricing settings from database
 */
export async function getPricingSettings(): Promise<PricingSettings> {
  try {
    const settings = await prisma.settings.findMany({
      where: {
        key: {
          in: ['laneRentalPerHour', 'shoeRental', 'taxRate'],
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
      shoeRental: parseFloat(settingsMap.get('shoeRental') || String(DEFAULT_SETTINGS.shoeRental)),
      taxRate: parseFloat(settingsMap.get('taxRate') || String(DEFAULT_SETTINGS.taxRate)),
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
}

/**
 * Initialize default settings in database
 */
async function initializeDefaultSettings(): Promise<void> {
  await savePricingSettings(DEFAULT_SETTINGS)
}


