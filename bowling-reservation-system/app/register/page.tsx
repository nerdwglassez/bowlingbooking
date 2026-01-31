import RegisterForm from '@/components/auth/RegisterForm'
import Link from 'next/link'

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            Bowling Alley
          </Link>
        </div>
        <div className="bg-white p-8 rounded-lg shadow-md">
          <RegisterForm />
        </div>
      </div>
    </main>
  )
}


