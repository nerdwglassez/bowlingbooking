export type BookingPackageCardItem = {
  id: string
  name: string
  description: string | null
  price: number
  imageUrl?: string | null
  durationMinutes?: number | null
  baseGuestCount?: number | null
}
