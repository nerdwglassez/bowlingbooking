'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  profileUpdateSchema,
  changePasswordSchema,
  type ProfileUpdateInput,
  type ChangePasswordInput,
} from '@/lib/validations'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import PasswordRequirements from '@/components/ui/PasswordRequirements'
import { PASSWORD_MAX_LENGTH } from '@/lib/passwordRequirements'

type User = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  role: string
  tier?: string | null
  tierDiscount?: number | null
  newsletterOptIn?: boolean
  emailReminders?: boolean
  smsReminders?: boolean
  smsPromotions?: boolean
  totpEnabled?: boolean
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [twoFactorSetup, setTwoFactorSetup] = useState<{ qrCodeDataUrl: string; secret: string } | null>(null)
  const [twoFactorConfirmCode, setTwoFactorConfirmCode] = useState('')
  const [twoFactorConfirmLoading, setTwoFactorConfirmLoading] = useState(false)
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null)
  const [twoFactorDisableCode, setTwoFactorDisableCode] = useState('')
  const [twoFactorDisableLoading, setTwoFactorDisableLoading] = useState(false)

  const profileForm = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
  })
  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  })

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user)
          profileForm.reset({
            firstName: data.user.firstName ?? '',
            lastName: data.user.lastName ?? '',
            phone: data.user.phone ?? '',
            email: data.user.email,
          })
        } else {
          router.push('/login')
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router])

  const onProfileSubmit = async (data: ProfileUpdateInput) => {
    setProfileError(null)
    setProfileSuccess(false)
    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        phone: data.phone || null,
        email: data.email,
      }),
    })
    const result = await res.json()
    if (!res.ok) {
      setProfileError(result.error || 'Failed to update profile')
      return
    }
    setUser(result.user)
    setProfileSuccess(true)
  }

  const onPasswordSubmit = async (data: ChangePasswordInput) => {
    setPasswordError(null)
    setPasswordSuccess(false)
    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      }),
    })
    const result = await res.json()
    if (!res.ok) {
      setPasswordError(result.error || 'Failed to change password')
      return
    }
    setPasswordSuccess(true)
    passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' })
  }

  const startTwoFactorSetup = async () => {
    setTwoFactorError(null)
    setTwoFactorSetup(null)
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Setup failed')
      setTwoFactorSetup({ qrCodeDataUrl: data.qrCodeDataUrl, secret: data.secret })
    } catch (e) {
      setTwoFactorError(e instanceof Error ? e.message : 'Failed to start setup')
    }
  }

  const confirmTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!twoFactorConfirmCode.trim()) return
    setTwoFactorConfirmLoading(true)
    setTwoFactorError(null)
    try {
      const res = await fetch('/api/auth/2fa/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: twoFactorConfirmCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Confirmation failed')
      setUser((u) => (u ? { ...u, totpEnabled: true } : null))
      setTwoFactorSetup(null)
      setTwoFactorConfirmCode('')
    } catch (e) {
      setTwoFactorError(e instanceof Error ? e.message : 'Failed to confirm')
    } finally {
      setTwoFactorConfirmLoading(false)
    }
  }

  const disableTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!twoFactorDisableCode.trim()) return
    setTwoFactorDisableLoading(true)
    setTwoFactorError(null)
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: twoFactorDisableCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to disable')
      setUser((u) => (u ? { ...u, totpEnabled: false } : null))
      setTwoFactorDisableCode('')
    } catch (e) {
      setTwoFactorError(e instanceof Error ? e.message : 'Failed to disable')
    } finally {
      setTwoFactorDisableLoading(false)
    }
  }

  if (loading || !user) {
    return (
      <main className="max-w-2xl mx-auto p-8">
        <p className="text-gray-600">Loading...</p>
      </main>
    )
  }

  return (
    <main className="max-w-2xl mx-auto p-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">Profile</h1>
          {['STAFF', 'MANAGER', 'ADMIN'].includes(user.role) && (
            <Link href="/staff" className="text-sm font-medium text-blue-600 hover:underline">
              Back to staff dashboard
            </Link>
          )}
        </div>

        {user.tier && (
          <section className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-2">Member tier</h2>
            <p className="text-gray-600">
              {user.tier === 'VIP' && user.tierDiscount != null
                ? `VIP (${user.tierDiscount}% discount on bookings)`
                : user.tier === 'VIP'
                  ? 'VIP'
                  : 'Regular'}
            </p>
          </section>
        )}

        <section className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Account details</h2>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
            {profileError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {profileError}
              </div>
            )}
            {profileSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                Profile updated.
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First name"
                error={profileForm.formState.errors.firstName?.message}
                {...profileForm.register('firstName')}
              />
              <Input
                label="Last name"
                error={profileForm.formState.errors.lastName?.message}
                {...profileForm.register('lastName')}
              />
            </div>
            <Input
              label="Email"
              type="email"
              error={profileForm.formState.errors.email?.message}
              {...profileForm.register('email')}
            />
            <Input
              label="Phone"
              type="tel"
              placeholder="(555) 123-4567"
              error={profileForm.formState.errors.phone?.message}
              {...profileForm.register('phone')}
            />
            <Button type="submit">Save changes</Button>
          </form>
        </section>

        <section className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Communication preferences</h2>
          <p className="text-sm text-gray-600 mb-4">
            Choose how you want to hear from us. Booking confirmations are always sent by email.
          </p>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={user.newsletterOptIn ?? false}
                onChange={(e) => {
                  const checked = e.target.checked
                  setUser((u) => (u ? { ...u, newsletterOptIn: checked } : null))
                  fetch('/api/auth/me', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newsletterOptIn: checked }),
                  }).catch(() => {})
                }}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Email: promotions and news</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={user.emailReminders ?? true}
                onChange={(e) => {
                  const checked = e.target.checked
                  setUser((u) => (u ? { ...u, emailReminders: checked } : null))
                  fetch('/api/auth/me', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ emailReminders: checked }),
                  }).catch(() => {})
                }}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Email: booking reminders</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={user.smsReminders ?? true}
                onChange={(e) => {
                  const checked = e.target.checked
                  setUser((u) => (u ? { ...u, smsReminders: checked } : null))
                  fetch('/api/auth/me', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ smsReminders: checked }),
                  }).catch(() => {})
                }}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">SMS: booking reminders</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={user.smsPromotions ?? false}
                onChange={(e) => {
                  const checked = e.target.checked
                  setUser((u) => (u ? { ...u, smsPromotions: checked } : null))
                  fetch('/api/auth/me', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ smsPromotions: checked }),
                  }).catch(() => {})
                }}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">SMS: promotions</span>
            </label>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Security</h2>
          {twoFactorError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {twoFactorError}
            </div>
          )}
          {user.totpEnabled ? (
            <div>
              <p className="text-gray-600 mb-4">Two-factor authentication is enabled. You will be asked for a code when signing in.</p>
              <form onSubmit={disableTwoFactor} className="flex flex-wrap items-end gap-4">
                <Input
                  label="Enter current code to disable 2FA"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={6}
                  value={twoFactorDisableCode}
                  onChange={(e) => setTwoFactorDisableCode(e.target.value.replace(/\D/g, ''))}
                />
                <Button type="submit" variant="secondary" isLoading={twoFactorDisableLoading}>
                  Disable 2FA
                </Button>
              </form>
            </div>
          ) : twoFactorSetup ? (
            <div>
              <p className="text-gray-600 mb-2">Scan this QR code with your authenticator app (e.g. Google Authenticator, Authy), then enter the code below.</p>
              <div className="flex flex-col items-start gap-4 mb-4">
                <img src={twoFactorSetup.qrCodeDataUrl} alt="QR code for 2FA" className="w-48 h-48" />
                <p className="text-sm text-gray-500">Or enter this secret manually: <code className="bg-gray-100 px-1 break-all">{twoFactorSetup.secret}</code></p>
              </div>
              <form onSubmit={confirmTwoFactor} className="flex flex-wrap items-end gap-4">
                <Input
                  label="Verification code"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={6}
                  value={twoFactorConfirmCode}
                  onChange={(e) => setTwoFactorConfirmCode(e.target.value.replace(/\D/g, ''))}
                />
                <Button type="submit" isLoading={twoFactorConfirmLoading}>Confirm and enable 2FA</Button>
                <Button type="button" variant="secondary" onClick={() => { setTwoFactorSetup(null); setTwoFactorError(null); setTwoFactorConfirmCode(''); }}>
                  Cancel
                </Button>
              </form>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">Add an extra layer of security by requiring a code from your phone when you sign in.</p>
              <Button onClick={startTwoFactorSetup}>Enable two-factor authentication</Button>
            </div>
          )}
        </section>

        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Change password</h2>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            {passwordError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                Password updated.
              </div>
            )}
            <Input
              label="Current password"
              type="password"
              autoComplete="current-password"
              maxLength={PASSWORD_MAX_LENGTH}
              error={passwordForm.formState.errors.currentPassword?.message}
              {...passwordForm.register('currentPassword')}
            />
            <Input
              label="New password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              maxLength={PASSWORD_MAX_LENGTH}
              error={passwordForm.formState.errors.newPassword?.message}
              {...passwordForm.register('newPassword')}
            />
            <PasswordRequirements password={passwordForm.watch('newPassword', '') ?? ''} className="mb-2" />
            <Input
              label="Confirm new password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              maxLength={PASSWORD_MAX_LENGTH}
              error={passwordForm.formState.errors.confirmPassword?.message}
              {...passwordForm.register('confirmPassword')}
            />
            <Button type="submit">Change password</Button>
          </form>
        </section>
    </main>
  )
}
