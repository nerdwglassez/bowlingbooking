import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Bowling Alley Reservation System</h1>
        <p className="text-lg text-gray-600 mb-8">Book your lane online, anytime</p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/book"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Book a Lane
          </Link>
          <Link
            href="/login"
            className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  )
}


