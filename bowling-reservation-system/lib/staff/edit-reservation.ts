import { format } from 'date-fns'

export type EditReservationUpdatePayload = {
  numBowlers?: number
  lanes?: string
  status?: string
}

export type EditReservationContactPayload = {
  firstName?: string
  lastName?: string
  email?: string
}

export function isReservationTimeChanged(
  bookingDate: string | Date,
  bookingStartTime: string,
  selectedDate: string,
  selectedTime: string
): boolean {
  return selectedDate !== format(new Date(bookingDate), 'yyyy-MM-dd') || selectedTime !== bookingStartTime
}

export function getTimeChanged(options: {
  selectedDate: string
  selectedTime: string
  originalDate: string | Date
  originalStartTime: string
}): boolean {
  return isReservationTimeChanged(
    options.originalDate,
    options.originalStartTime,
    options.selectedDate,
    options.selectedTime
  )
}

export function lanesCsvToPayload(lanesCsv: string): string | undefined {
  const lanesTrimmed = lanesCsv.trim().replace(/\s*,\s*/g, ',').replace(/\s+/g, ',')
  const lanesArray = lanesTrimmed
    ? lanesTrimmed
        .split(',')
        .map((n) => parseInt(n.trim(), 10))
        .filter((n) => !Number.isNaN(n))
    : []
  return lanesArray.length > 0 ? lanesArray.join(',') : undefined
}

export function buildEditReservationUpdatePayload(options: {
  numBowlers: number
  originalNumBowlers: number
  lanesCsv: string
  status: string
  originalStatus: string
}): EditReservationUpdatePayload {
  const payload: EditReservationUpdatePayload = {}
  if (options.numBowlers !== options.originalNumBowlers) payload.numBowlers = options.numBowlers

  const lanesPayload = lanesCsvToPayload(options.lanesCsv)
  if (lanesPayload !== undefined) payload.lanes = lanesPayload

  if (options.status !== options.originalStatus) payload.status = options.status
  return payload
}

export function buildEditReservationContactPayload(options: {
  customerFirstName: string
  customerLastName: string
  customerEmail: string
}): EditReservationContactPayload {
  const payload: EditReservationContactPayload = {
    firstName: options.customerFirstName.trim(),
    lastName: options.customerLastName.trim(),
  }
  if (options.customerEmail.trim()) payload.email = options.customerEmail.trim()
  return payload
}

export function isReservationContactChanged(options: {
  bookingFirstName?: string | null
  bookingLastName?: string | null
  bookingEmail?: string | null
  customerFirstName: string
  customerLastName: string
  customerEmail: string
}): boolean {
  return (
    options.customerFirstName !== (options.bookingFirstName ?? '') ||
    options.customerLastName !== (options.bookingLastName ?? '') ||
    options.customerEmail !== (options.bookingEmail ?? '')
  )
}
