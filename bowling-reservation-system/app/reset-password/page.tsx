'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validations'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import PasswordRequirements from '@/components/ui/PasswordRequirements'
import { PASSWORD_MAX_LENGTH } from '@/lib/passwordRequirements'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams?.get('token') ?? ''
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  })
  const passwordValue = watch('password', '') ?? ''

  const onSubmit = async (data: ResetPasswordInput) => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: data.token,
          password: data.password,
          confirmPassword: data.confirmPassword,
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error || 'Something went wrong')
        setLoading(false)
        return
      }
      setSuccess(true)
    } catch {
      setError('Something went wrong')
    }
    setLoading(false)
  }

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          Invalid or missing reset link. Please use the link from your email or request a new one.
        </p>
        <Link href="/forgot-password" className="text-blue-600 hover:underline">
          Request a new reset link
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <p className="text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          Your password has been reset. You can sign in now.
        </p>
        <Link href="/login" className="inline-block text-blue-600 hover:underline">
          Sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register('token')} value={token} />
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      <Input
        label="New password"
        type="password"
        placeholder="••••••••"
        autoComplete="new-password"
        maxLength={PASSWORD_MAX_LENGTH}
        error={errors.password?.message}
        {...register('password')}
      />
      <PasswordRequirements password={passwordValue} className="mb-2" />
      <Input
        label="Confirm new password"
        type="password"
        placeholder="••••••••"
        autoComplete="new-password"
        maxLength={PASSWORD_MAX_LENGTH}
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      <Button type="submit" isLoading={loading} className="w-full">
        Reset password
      </Button>
      <p className="text-center text-sm text-gray-600">
        <Link href="/login" className="text-blue-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            Bowling Alley
          </Link>
        </div>
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center mb-6">Set new password</h1>
          <Suspense fallback={<p className="text-center text-gray-600">Loading...</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
