export type BookingForEmail = {
  id: string
  date: Date
  startTime: string
  duration: number
  lane: number
  lanes?: number[]
  numBowlers: number
  totalPrice: number
  bookingPackages?: Array<{ package: { name: string; price: number } }>
}

export type BookingConfirmationEmailOptions = {
  /** Booking is held; payment will be invoiced separately (not marked paid online). */
  invoicePending?: boolean
}
