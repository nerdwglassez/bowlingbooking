import { redirect } from 'next/navigation'

/**
 * Primary landing loads directly into Step 1 of the booking flow (PRD 1.2).
 */
export default function Home() {
  redirect('/book')
}
