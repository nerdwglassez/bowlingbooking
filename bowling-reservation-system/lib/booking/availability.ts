export interface AvailabilityTimeSlot {
  time: string
  available: boolean
  availableLanes: number
}

export type AvailabilityBand = 'high' | 'medium' | 'low' | 'full'

export function isSlotAvailableForLanes(slot: AvailabilityTimeSlot, minLanes = 1): boolean {
  return slot.available && slot.availableLanes >= minLanes
}

export const isSlotAvailableForRequiredLanes = isSlotAvailableForLanes

export function getAvailabilityBand(slot: AvailabilityTimeSlot, minLanes = 1): AvailabilityBand {
  if (!isSlotAvailableForLanes(slot, minLanes)) return 'full'
  if (slot.availableLanes >= 8) return 'high'
  if (slot.availableLanes >= 3) return 'medium'
  return 'low'
}

export function getSlotAvailabilityLabel(slot: AvailabilityTimeSlot, minLanes = 1): string {
  if (!isSlotAvailableForLanes(slot, minLanes)) return minLanes > 1 ? `Need ${minLanes}` : 'Full'
  if (slot.availableLanes >= 3) return `${slot.availableLanes} lanes`
  return `${slot.availableLanes} lane${slot.availableLanes > 1 ? 's' : ''}`
}

export const getAvailabilityLabel = getSlotAvailabilityLabel

export function getAvailabilityBandClassName(slot: AvailabilityTimeSlot, minLanes = 1): string {
  const band = getAvailabilityBand(slot, minLanes)
  if (band === 'full') return 'bg-gray-200 text-gray-400 cursor-not-allowed'
  if (band === 'high') return 'bg-green-100 text-green-800 hover:bg-green-200'
  if (band === 'medium') return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
  return 'bg-red-100 text-red-800 hover:bg-red-200'
}

export function getStepOneSlotLabel(slot: AvailabilityTimeSlot, minLanes = 1): string {
  if (!isSlotAvailableForLanes(slot, minLanes)) return 'Full'
  return `${slot.availableLanes} lanes left`
}

export function getSlotAvailabilityTextColor(slot: AvailabilityTimeSlot, minLanes = 1): string {
  const band = getAvailabilityBand(slot, minLanes)
  if (band === 'full') return '#717182'
  if (band === 'high') return '#16A34A'
  if (band === 'medium') return '#D97706'
  return '#DC2626'
}
