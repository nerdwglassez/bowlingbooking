import { Suspense } from 'react'

import { auth } from '@/lib/auth'

import { BookingSuccessClient } from './success-client'

export default async function BookingSuccessPage() {
  const session = await auth()
  const signedIn = Boolean(session?.user?.id)

  return (
    <Suspense fallback={null}>
      <BookingSuccessClient signedIn={signedIn} />
    </Suspense>
  )
}
