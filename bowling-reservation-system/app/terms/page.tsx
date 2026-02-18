import Link from 'next/link'

export const metadata = {
  title: 'Terms and Conditions',
  description: 'Terms and conditions for lane bookings',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6 md:p-8">
        <h1 className="text-2xl font-bold mb-6">Terms and Conditions</h1>
        <p className="text-sm text-gray-500 mb-6">Last updated: January 2026</p>
        <div className="prose prose-sm text-gray-700 space-y-4">
          <p>
            By completing a lane booking you agree to our cancellation policy, lane usage rules,
            and payment terms. Bookings are subject to availability and our operating hours.
          </p>
          <p>
            Cancellations must be made in accordance with our policy (see booking confirmation).
            No-shows may be subject to fees. Contact us for questions or to modify your booking.
          </p>
          <p>
            We reserve the right to refuse service and to update these terms. Continued use of
            the booking system constitutes acceptance of the current terms.
          </p>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-200">
          <Link href="/book" className="text-blue-600 hover:underline text-sm">
            ← Back to booking
          </Link>
        </div>
      </div>
    </main>
  )
}
