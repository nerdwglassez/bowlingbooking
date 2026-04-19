export const MAX_BOWLERS = 10
export const MAX_BOOKING_LANES = 5
export const BOWLERS_PER_LANE = 6

export function getLaneCountForBowlers(numBowlers: number): number {
  return Math.min(MAX_BOOKING_LANES, Math.ceil(numBowlers / BOWLERS_PER_LANE)) || 1
}

export function getNumLanesForBowlers(numBowlers: number): number {
  return getLaneCountForBowlers(numBowlers)
}

export function isDateTimeSelectionValid(selectedDate: string, selectedTime: string): boolean {
  return Boolean(selectedDate && selectedTime)
}

export function isBowlerDetailsComplete(
  numBowlers: number,
  shoeRentals: Array<number | null | undefined>
): boolean {
  return (
    shoeRentals.length === numBowlers &&
    shoeRentals.every((value) => value === null || (typeof value === 'number' && value > 0))
  )
}

export function getBowlerInfoCompletionState(
  numBowlers: number,
  shoeRentals: Array<number | null | undefined>
) {
  return {
    isBowlerInfoComplete: isBowlerDetailsComplete(numBowlers, shoeRentals),
  }
}

export function getShoeRentalCounts(shoeRentals: Array<number | null | undefined>) {
  const numShoeRentals = shoeRentals.filter((s): s is number => typeof s === 'number' && s > 0).length
  const numOwnShoes = shoeRentals.filter((s) => s === null).length
  return { numShoeRentals, numOwnShoes }
}

export function getShoeSizeValues(shoeRentals: Array<number | null | undefined>) {
  return shoeRentals.filter((s): s is number => typeof s === 'number' && s > 0)
}

export function canSubmitBooking({
  selectedDate,
  selectedTime,
  isBowlerInfoComplete,
  termsAccepted,
  loading,
}: {
  selectedDate: string
  selectedTime: string
  isBowlerInfoComplete: boolean
  termsAccepted: boolean
  loading: boolean
}): boolean {
  return (
    isDateTimeSelectionValid(selectedDate, selectedTime) &&
    isBowlerInfoComplete &&
    termsAccepted &&
    !loading
  )
}
