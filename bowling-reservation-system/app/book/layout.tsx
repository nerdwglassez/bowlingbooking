import { Suspense } from 'react'
import BookingHeader from '@/components/booking/BookingHeader'

function BookLoadingFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center p-8">
      <p className="text-gray-600">Loading...</p>
    </div>
  )
}

export default function BookLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <BookingHeader />
      <Suspense fallback={<BookLoadingFallback />}>
        {children}
      </Suspense>
    </>
  )
}
