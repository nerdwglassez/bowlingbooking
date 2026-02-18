export function formatTime12Hour(time: string): string {
  const [hoursRaw, minutesRaw] = time.split(':')
  const hours = Number(hoursRaw)
  const minutes = Number(minutesRaw)

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return time
  }

  const normalizedHours = ((hours % 24) + 24) % 24
  const meridiem = normalizedHours >= 12 ? 'PM' : 'AM'
  const hour12 = normalizedHours % 12 || 12

  return `${hour12}:${String(minutes).padStart(2, '0')} ${meridiem}`
}
