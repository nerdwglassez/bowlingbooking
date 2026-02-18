'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterInput } from '@/lib/validations'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import PasswordRequirements from '@/components/ui/PasswordRequirements'

interface SignUpFormInlineProps {
  onSuccess: () => void
  isLoading?: boolean
}

export default function SignUpFormInline({ onSuccess, isLoading }: SignUpFormInlineProps) {
  const [error, setError] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  })
  const passwordValue = watch('password', '') ?? ''

  const onSubmit = async (data: RegisterInput) => {
    setError(null)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error || 'Failed to create account')
        return
      }
      onSuccess()
    } catch {
      setError('An unexpected error occurred')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="First Name"
          placeholder="First name"
          error={errors.firstName?.message}
          {...register('firstName')}
        />
        <Input
          label="Last Name"
          placeholder="Last name"
          error={errors.lastName?.message}
          {...register('lastName')}
        />
      </div>
      <Input
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label="Password"
        type="password"
        placeholder="Create a strong password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <PasswordRequirements password={passwordValue} className="mt-1 mb-2" />
      <label className="flex items-start gap-2 cursor-pointer text-sm text-[#64748B]">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          className="rounded border-gray-300 text-[#6366F1] mt-0.5"
        />
        <span>
          I agree to the{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#6366F1] hover:underline">
            Terms of Service
          </a>
          {' '}and{' '}
          <a href="/terms#privacy" target="_blank" rel="noopener noreferrer" className="text-[#6366F1] hover:underline">
            Privacy Policy
          </a>
        </span>
      </label>
      <Button type="submit" isLoading={isLoading} disabled={!termsAccepted} className="w-full rounded-full min-h-[48px]">
        Create Account
      </Button>
    </form>
  )
}
