'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Mail, Shield } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'

type UserProfile = {
  firstName?: string | null
  lastName?: string | null
  email: string
  phone?: string | null
  role: 'CUSTOMER' | 'STAFF' | 'MANAGER' | 'ADMIN'
  createdAt?: string
}

export default function StaffAccountInformationPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/auth/me', { cache: 'no-store' })
        if (!response.ok) throw new Error('Failed to load profile')
        const data = (await response.json()) as { user?: UserProfile }
        if (mounted) {
          const nextProfile = data.user ?? null
          setProfile(nextProfile)
          setForm({
            firstName: nextProfile?.firstName ?? '',
            lastName: nextProfile?.lastName ?? '',
            email: nextProfile?.email ?? '',
            phone: nextProfile?.phone ?? '',
          })
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load profile')
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const initials = useMemo(() => {
    if (!profile) return 'NA'
    const byName = `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()
    return byName || profile.email.slice(0, 2).toUpperCase() || 'NA'
  }, [profile])

  const fullName = useMemo(() => {
    if (!profile) return 'Not provided'
    const name = [form.firstName, form.lastName].filter(Boolean).join(' ').trim()
    return name || 'Not provided'
  }, [form.firstName, form.lastName, profile])

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (success) setSuccess(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
        }),
      })

      const payload = (await response.json()) as { error?: string; user?: UserProfile }
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update account information')
      }

      if (payload.user) {
        setProfile(payload.user)
        setForm({
          firstName: payload.user.firstName ?? '',
          lastName: payload.user.lastName ?? '',
          email: payload.user.email ?? '',
          phone: payload.user.phone ?? '',
        })
      }
      setSuccess('Account information updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account information')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-slate-500">
        Loading account details...
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white p-8 shadow-sm text-sm text-rose-700">
        {error ?? 'Unable to load profile.'}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">Account Information</h2>
      <p className="mt-1 text-sm text-slate-500">View and manage your account details</p>

      {/* Profile overview */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-base font-semibold text-indigo-700">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold text-slate-900">{fullName}</p>
          <p className="text-sm text-slate-500">{profile.email}</p>
          <span className="mt-2 inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
            {profile.role.charAt(0) + profile.role.slice(1).toLowerCase()}
          </span>
        </div>
      </div>

      {/* Account details form */}
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="First Name"
            value={form.firstName}
            onChange={(event) => handleChange('firstName', event.target.value)}
            className="rounded-[14px] border-slate-300 bg-white px-3 py-2.5"
            required
          />
          <Input
            label="Last Name"
            value={form.lastName}
            onChange={(event) => handleChange('lastName', event.target.value)}
            className="rounded-[14px] border-slate-300 bg-white px-3 py-2.5"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email Address</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Mail className="h-4 w-4" />
            </span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => handleChange('email', event.target.value)}
              className="w-full rounded-[14px] border border-slate-300 bg-white py-2.5 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Account Created</label>
          <div className="rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
            {profile.createdAt
              ? format(new Date(profile.createdAt), 'MMMM d, yyyy')
              : 'Unavailable'}
          </div>
        </div>
        <div>
          <Input
            label="Phone"
            value={form.phone}
            onChange={(event) => handleChange('phone', event.target.value)}
            className="rounded-[14px] border-slate-300 bg-white px-3 py-2.5"
            placeholder="Optional"
          />
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <Toast
          message={success ?? ''}
          visible={!!success}
          onDismiss={() => setSuccess(null)}
          variant="success"
          autoDismissMs={3000}
        />

        <div className="pt-2">
          <Button type="submit" isLoading={saving} className="rounded-[14px] px-4 py-2.5">
            Save Changes
          </Button>
        </div>
      </form>

      {/* Two-Factor Authentication */}
      <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Two-Factor Authentication</h3>
            <p className="mt-1 text-sm text-slate-500">Add an extra layer of security to your account</p>
          </div>
        </div>
        <Button type="button" className="shrink-0 rounded-[14px] px-4 py-2.5">
          Enable
        </Button>
      </div>
    </div>
  )
}
