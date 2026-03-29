import Link from 'next/link'

export default function WaitListClaimPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-md p-8 max-w-md w-full">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Wait list unavailable</h1>
        <p className="text-gray-600 mb-6">
          Wait list claims are no longer supported. You can still book any currently available slot.
        </p>
        <Link href="/book" className="block w-full text-center rounded-lg bg-blue-600 text-white font-medium py-3 px-4 hover:bg-blue-700 transition">
          Go to booking
        </Link>
      </div>
    </div>
  )
}
