export type BookingBackTarget = {
  href: string
  label: string
}

/** Back targets for steps 2–4 (hold is preserved on navigation). */
export const BOOKING_BACK_BY_STEP: Record<2 | 3 | 4, BookingBackTarget> = {
  2: { href: '/book', label: 'Date & time' },
  3: { href: '/book/package', label: 'Packages' },
  4: { href: '/book/details', label: 'Your details' },
}
