export type BookingStatusTone = 'success' | 'warning' | 'info' | 'danger' | 'neutral'
export type BookingStatusContext = 'default' | 'staff' | 'staff-dashboard'

export type BookingStatusPresentation = {
  label: string
  tone: BookingStatusTone
}

function normalizeLabel(status: string) {
  return status.replace('_', ' ')
}

export function getBookingStatusPresentation(
  status: string,
  context: BookingStatusContext = 'default'
): BookingStatusPresentation {
  if (context === 'staff-dashboard') {
    if (status === 'CHECKED_IN') return { label: 'Checked In', tone: 'info' }
    if (status === 'PAID') return { label: 'Paid', tone: 'neutral' }
    if (status === 'COMPLETED') return { label: 'Completed', tone: 'neutral' }
    if (status === 'CONFIRMED' || status === 'PENDING') return { label: 'Upcoming', tone: 'warning' }
    if (status === 'CANCELLED') return { label: 'Cancelled', tone: 'danger' }
    return { label: normalizeLabel(status), tone: 'neutral' }
  }

  if (context === 'staff') {
    if (status === 'CHECKED_IN') return { label: 'Checked In', tone: 'success' }
    if (status === 'CONFIRMED' || status === 'PAID') return { label: 'Upcoming', tone: 'info' }
    if (status === 'CANCELLED') return { label: 'Cancelled', tone: 'danger' }
    return { label: normalizeLabel(status), tone: 'neutral' }
  }

  switch (status) {
    case 'CONFIRMED':
    case 'PAID':
      return { label: normalizeLabel(status), tone: 'success' }
    case 'PENDING':
      return { label: 'Pending', tone: 'warning' }
    case 'CHECKED_IN':
      return { label: 'Checked In', tone: 'info' }
    case 'CANCELLED':
      return { label: 'Cancelled', tone: 'danger' }
    default:
      return { label: normalizeLabel(status), tone: 'neutral' }
  }
}

export function getBookingStatusVariant(status: string): BookingStatusTone {
  return getBookingStatusPresentation(status).tone
}
