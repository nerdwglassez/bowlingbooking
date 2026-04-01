export const ALLEY_NAME = 'StrikeZone Bowling'
export const ALLEY_ADDRESS = '1234 Main St, Brookhaven, GA 30319'
export const ALLEY_PHONE = '(555) 123-4567'

export function getAppUrl(): string {
  return process.env.NEXTAUTH_URL || 'http://localhost:3000'
}
