'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { loginSchema, type LoginInput } from '@/lib/validations'
import { registerSchema, type RegisterInput } from '@/lib/validations'

const signUpSchema = registerSchema.extend({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(10, 'Phone number is required'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  agreeToTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the Terms & Privacy Policy' }),
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type SignUpInput = z.infer<typeof signUpSchema>

interface AuthModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [signUpError, setSignUpError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)
  const [signUpLoading, setSignUpLoading] = useState(false)

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const signUpForm = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    // Form starts unchecked; schema requires true on submit
    defaultValues: { agreeToTerms: false } as unknown as Partial<SignUpInput>,
  })

  const onLoginSubmit = async (data: LoginInput) => {
    setLoginError(null)
    setLoginLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) {
        setLoginError(result.error || 'Invalid credentials')
        setLoginLoading(false)
        return
      }
      onSuccess()
    } catch {
      setLoginError('An unexpected error occurred')
    } finally {
      setLoginLoading(false)
    }
  }

  const onSignUpSubmit = async (data: SignUpInput) => {
    setSignUpError(null)
    setSignUpLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password }),
      })
      const result = await res.json()
      if (!res.ok) {
        setSignUpError(result.error || 'Failed to create account')
        setSignUpLoading(false)
        return
      }
      onSuccess()
    } catch {
      setSignUpError('An unexpected error occurred')
    } finally {
      setSignUpLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-md rounded-xl bg-white shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="h-5 w-5" stroke="currentColor" />
        </button>

        <div className="border-b border-gray-200 px-6 pt-6">
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setTab('signin')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                tab === 'signin' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setTab('signup')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                tab === 'signup' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sign Up
            </button>
          </div>
        </div>

        <div className="p-6">
          {tab === 'signin' && (
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
              {loginError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {loginError}
                </div>
              )}
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                error={loginForm.formState.errors.email?.message}
                {...loginForm.register('email')}
              />
              <div>
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  error={loginForm.formState.errors.password?.message}
                  {...loginForm.register('password')}
                />
                <a
                  href="/login?forgot=1"
                  className="mt-1 block text-sm text-blue-600 hover:underline"
                  onClick={e => {
                    e.preventDefault()
                    onClose()
                    window.location.href = '/login?forgot=1'
                  }}
                >
                  Forgot password?
                </a>
              </div>
              <Button type="submit" isLoading={loginLoading} className="w-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600">
                Sign In
              </Button>
            </form>
          )}

          {tab === 'signup' && (
            <form onSubmit={signUpForm.handleSubmit(onSignUpSubmit)} className="space-y-4">
              {signUpError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {signUpError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First name"
                  error={signUpForm.formState.errors.firstName?.message}
                  {...signUpForm.register('firstName')}
                />
                <Input
                  label="Last name"
                  error={signUpForm.formState.errors.lastName?.message}
                  {...signUpForm.register('lastName')}
                />
              </div>
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                error={signUpForm.formState.errors.email?.message}
                {...signUpForm.register('email')}
              />
              <Input
                label="Phone number"
                type="tel"
                placeholder="(555) 123-4567"
                error={signUpForm.formState.errors.phone?.message}
                {...signUpForm.register('phone')}
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                error={signUpForm.formState.errors.password?.message}
                {...signUpForm.register('password')}
              />
              <div className="text-xs text-gray-500">
                Min 8 characters, one uppercase, one lowercase, one number
              </div>
              <Input
                label="Confirm password"
                type="password"
                placeholder="••••••••"
                error={signUpForm.formState.errors.confirmPassword?.message}
                {...signUpForm.register('confirmPassword')}
              />
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-gray-300"
                  {...signUpForm.register('agreeToTerms')}
                />
                <span className="text-sm text-gray-600">
                  I agree to the Terms & Privacy Policy
                </span>
              </label>
              {signUpForm.formState.errors.agreeToTerms && (
                <p className="text-sm text-red-600">{signUpForm.formState.errors.agreeToTerms.message}</p>
              )}
              <Button type="submit" isLoading={signUpLoading} className="w-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600">
                Sign Up
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
