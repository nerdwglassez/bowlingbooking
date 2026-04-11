export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`
  return `${hours}h ${mins}m`
}

export function getBookingUrl(appUrl: string): string {
  return `${appUrl}/book`
}
