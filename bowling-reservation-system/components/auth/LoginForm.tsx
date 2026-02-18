'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/lib/validations'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { PASSWORD_MAX_LENGTH } from '@/lib/passwordRequirements'

function getPostLoginHref(role?: string) {
  if (role === 'STAFF' || role === 'MANAGER' || role === 'ADMIN') {
    return '/staff'
  }
  return '/dashboard'
}

export default function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [twoFactorStep, setTwoFactorStep] = useState<{ tempToken: string } | null>(null)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [twoFactorLoading, setTwoFactorLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to login')
        setIsLoading(false)
        return
      }

      if (result.requiresTwoFactor && result.tempToken) {
        setTwoFactorStep({ tempToken: result.tempToken })
        setIsLoading(false)
        return
      }

      router.push(getPostLoginHref(result.user?.role))
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  const onTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!twoFactorStep || !twoFactorCode.trim()) return
    setTwoFactorLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken: twoFactorStep.tempToken,
          code: twoFactorCode.trim(),
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error || 'Invalid code')
        setTwoFactorLoading(false)
        return
      }
      router.push(getPostLoginHref(result.user?.role))
      router.refresh()
    } catch {
      setError('An unexpected error occurred')
      setTwoFactorLoading(false)
    }
  }

  if (twoFactorStep) {
    return (
      <div className="space-y-4 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-2">Two-factor authentication</h2>
        <p className="text-sm text-gray-600 text-center mb-4">
          Enter the 6-digit code from your authenticator app.
        </p>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        <form onSubmit={onTwoFactorSubmit} className="space-y-4">
          <Input
            label="Verification code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            value={twoFactorCode}
            onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
          />
          <Button type="submit" isLoading={twoFactorLoading} className="w-full">
            Verify
          </Button>
        </form>
        <button
          type="button"
          onClick={() => {
            setTwoFactorStep(null)
            setTwoFactorCode('')
            setError(null)
          }}
          className="w-full text-sm text-gray-600 hover:underline"
        >
          Use different account
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full max-w-md">
      <h2 className="text-2xl font-bold text-center mb-6">Sign In</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        autoComplete="current-password"
        maxLength={PASSWORD_MAX_LENGTH}
        error={errors.password?.message}
        {...register('password')}
      />

      <p className="text-right text-sm">
        <Link href="/forgot-password" className="text-blue-600 hover:underline">
          Forgot password?
        </Link>
      </p>

      <Button type="submit" isLoading={isLoading} className="w-full">
        Sign In
      </Button>

      <p className="text-center text-sm text-gray-600">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-blue-600 hover:underline">
          Create one
        </Link>
      </p>
    </form>
  )
}

