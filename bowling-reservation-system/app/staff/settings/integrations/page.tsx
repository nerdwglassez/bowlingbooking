'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, CircleAlert, ExternalLink } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

type StatusType = 'connected' | 'not_connected' | 'configured_in_env' | 'in_progress'
type CategoryId = 'all' | 'payments' | 'messaging' | 'marketing' | 'analytics' | 'operations'

type Integration = {
  id: string
  name: string
  description: string
  status: StatusType
  category: CategoryId
}

const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'payments', label: 'Payments' },
  { id: 'messaging', label: 'Messaging' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'operations', label: 'Operations' },
]

const INTEGRATIONS_BASE: Integration[] = [
  { id: 'stripe', name: 'Stripe', description: 'Process online booking payments and refunds.', status: 'not_connected', category: 'payments' },
  { id: 'mailchimp', name: 'Mailchimp', description: 'Sync marketing audiences and contact tags.', status: 'not_connected', category: 'marketing' },
  { id: 'twilio', name: 'Twilio SMS', description: 'Send reminders and operational notifications via SMS.', status: 'not_connected', category: 'messaging' },
  { id: 'pos-export', name: 'POS Export', description: 'Export reservation and revenue data for point-of-sale workflows.', status: 'not_connected', category: 'operations' },
  { id: 'slack', name: 'Slack', description: 'Send booking notifications and alerts to your team channels.', status: 'not_connected', category: 'messaging' },
  { id: 'google-analytics', name: 'Google Analytics', description: 'Track website traffic, user behavior, and booking conversions.', status: 'not_connected', category: 'analytics' },
]

function StatusBadge({ status }: { status: StatusType }) {
  if (status === 'connected') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
        <CheckCircle2 className="h-4 w-4" aria-hidden />
        Connected
      </span>
    )
  }
  if (status === 'not_connected') {
    return <span className="text-sm text-slate-600">Not connected</span>
  }
  if (status === 'configured_in_env') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700">
        <CircleAlert className="h-4 w-4" aria-hidden />
        Configured in environment
      </span>
    )
  }
  // in_progress
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600">
      <Clock className="h-4 w-4" aria-hidden />
      In progress
    </span>
  )
}

type ConfigField = { key: string; label: string; type?: 'text' | 'password' | 'url'; placeholder?: string }
const INTEGRATION_CONFIG: Record<string, { description: string; fields: ConfigField[] }> = {
  stripe: {
    description: 'Enter your Stripe API keys. Values from env are used if not set here.',
    fields: [
      { key: 'publishableKey', label: 'Publishable Key', placeholder: 'pk_live_...' },
      { key: 'secretKey', label: 'Secret Key', type: 'password', placeholder: 'sk_live_...' },
      { key: 'webhookSecret', label: 'Webhook Secret (optional)', type: 'password', placeholder: 'whsec_...' },
    ],
  },
  mailchimp: {
    description: 'Connect your Mailchimp account to sync audiences and contact tags.',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-us1' },
      { key: 'listId', label: 'Audience/List ID', placeholder: 'abc12345' },
      { key: 'serverPrefix', label: 'Server Prefix (e.g. us1)', placeholder: 'us1' },
    ],
  },
  twilio: {
    description: 'Twilio credentials are read from environment variables (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER). Verify or override below.',
    fields: [
      { key: 'accountSid', label: 'Account SID', placeholder: 'AC...' },
      { key: 'authToken', label: 'Auth Token', type: 'password', placeholder: '••••••••' },
    ],
  },
  'pos-export': {
    description: 'Configure how reservation and revenue data is exported for your point-of-sale system.',
    fields: [
      { key: 'exportPath', label: 'Export Path or URL', placeholder: 'https://... or /path' },
      { key: 'format', label: 'Format', placeholder: 'CSV, JSON' },
    ],
  },
  slack: {
    description: 'Send booking notifications to a Slack channel via an incoming webhook.',
    fields: [
      { key: 'webhookUrl', label: 'Slack Webhook URL', type: 'url', placeholder: 'https://hooks.slack.com/services/...' },
    ],
  },
  'google-analytics': {
    description: 'Track website traffic and booking conversions with Google Analytics 4.',
    fields: [
      { key: 'measurementId', label: 'Measurement ID (GA4)', placeholder: 'G-XXXXXXXXXX' },
    ],
  },
}

export default function StaffIntegrationsPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all')
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS_BASE)
  const [configureModal, setConfigureModal] = useState<string | null>(null)
  const [configValues, setConfigValues] = useState<Record<string, Record<string, string>>>({})
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminConfig, setAdminConfig] = useState<Record<string, Record<string, string>>>({})
  const [loading, setLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [statusRes, meRes] = await Promise.all([
          fetch('/api/staff/settings/integrations/status'),
          fetch('/api/auth/me'),
        ])
        if (cancelled) return
        const isAdminUser = meRes.ok && (await meRes.json()).user?.role === 'ADMIN'
        setIsAdmin(!!isAdminUser)

        if (statusRes.ok) {
          const { integrations: statusList } = await statusRes.json()
          setIntegrations((prev) =>
            prev.map((i) => {
              const s = statusList?.find((x: { id: string; status: string }) => x.id === i.id)
              return s ? { ...i, status: s.status as StatusType } : i
            })
          )
        }

        if (isAdminUser) {
          const adminRes = await fetch('/api/admin/integrations')
          if (adminRes.ok && !cancelled) {
            const { integrations: list } = await adminRes.json()
            const configMap: Record<string, Record<string, string>> = {}
            list?.forEach((item: { id: string; config: Record<string, string> }) => {
              if (item.config && typeof item.config === 'object') {
                configMap[item.id] = Object.fromEntries(
                  Object.entries(item.config).filter(([, v]) => v != null && v !== '') as [string, string][]
                ) as Record<string, string>
              }
            })
            setAdminConfig(configMap)
          }
        }
      } catch (_) {
        if (!cancelled) setIntegrations(INTEGRATIONS_BASE)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const openConfigure = (id: string) => {
    setConfigureModal(id)
    setSaveError(null)
    setConfigValues((prev) => ({
      ...prev,
      [id]: { ...(adminConfig[id] ?? {}), ...(prev[id] ?? {}) },
    }))
  }

  const setConfigValue = (integrationId: string, key: string, value: string) => {
    setConfigValues((prev) => ({
      ...prev,
      [integrationId]: { ...(prev[integrationId] ?? {}), [key]: value },
    }))
  }

  const handleSave = async () => {
    if (!configureModal || !isAdmin) return
    setSaveLoading(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/admin/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId: configureModal,
          config: configValues[configureModal] ?? {},
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSaveError(data.error === 'Unauthorized' ? 'Only administrators can save integration settings.' : (data.error || 'Failed to save'))
        return
      }
      setAdminConfig((prev) => ({ ...prev, [configureModal]: configValues[configureModal] ?? {} }))
      const statusRes = await fetch('/api/staff/settings/integrations/status')
      if (statusRes.ok) {
        const { integrations: statusList } = await statusRes.json()
        setIntegrations((prev) =>
          prev.map((i) => {
            const s = statusList?.find((x: { id: string; status: string }) => x.id === i.id)
            return s ? { ...i, status: s.status as StatusType } : i
          })
        )
      }
      setConfigureModal(null)
    } finally {
      setSaveLoading(false)
    }
  }

  const filtered =
    activeCategory === 'all'
      ? integrations
      : integrations.filter((i) => i.category === activeCategory)

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Integrations</h2>
        <p className="mt-1 text-sm text-slate-500">
          Connect your favorite tools and services to enhance your bowling alley management.
        </p>

        {/* Category tabs */}
        <div className="mt-6 flex flex-wrap gap-2">
          {CATEGORIES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveCategory(id)}
              className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold transition ${
                activeCategory === id
                  ? 'bg-slate-200 text-slate-800'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && (
          <p className="mt-4 text-sm text-slate-500">Loading integration status…</p>
        )}
        {/* Integration cards grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((integration) => (
            <article
              key={integration.id}
              className="relative flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <a
                href="#"
                className="absolute right-4 top-4 inline-flex text-slate-400 hover:text-slate-600"
                aria-label={`Open ${integration.name} documentation`}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <h3 className="pr-8 text-lg font-semibold text-slate-900">{integration.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{integration.description}</p>
              <div className="mt-3">
                <StatusBadge status={integration.status} />
              </div>
              <div className="mt-4">
                <Button
                  type="button"
                  onClick={() => openConfigure(integration.id)}
                  className="rounded-[14px] bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600"
                >
                  Configure
                </Button>
              </div>
            </article>
          ))}
        </div>

        {/* More integrations coming soon */}
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-5 text-center">
          <h3 className="text-lg font-semibold text-slate-900">More Integrations Coming Soon</h3>
          <p className="mt-1 text-sm text-slate-500">
            Additional providers and sync options will be available in future releases.
          </p>
        </div>
      </div>

      {/* Configuration modal - matches Edit User / settings modal pattern */}
      {configureModal && (() => {
        const integration = integrations.find((i: Integration) => i.id === configureModal)
        const config = INTEGRATION_CONFIG[configureModal]
        if (!integration || !config) return null
        const values = configValues[configureModal] ?? {}
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <button
              type="button"
              aria-label="Close configuration modal"
              className="absolute inset-0 cursor-default"
              onClick={() => setConfigureModal(null)}
            />
            <div
              className="relative z-10 w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-slate-900">Configure {integration.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{config.description}</p>

              <div className="mt-6 space-y-4">
                {config.fields.map((field) => (
                  <Input
                    key={field.key}
                    label={field.label}
                    type={field.type ?? 'text'}
                    value={values[field.key] ?? ''}
                    onChange={(e) => setConfigValue(configureModal, field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="rounded-[14px] border-slate-300 bg-white px-3 py-2.5"
                  />
                ))}
              </div>

              {saveError && (
                <p className="mt-4 text-sm text-rose-600">{saveError}</p>
              )}
              <div className="mt-6 flex w-full justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setConfigureModal(null)}
                  className="rounded-[14px] px-4 py-2.5"
                >
                  Cancel
                </Button>
                {isAdmin ? (
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={saveLoading}
                    className="rounded-[14px] px-4 py-2.5"
                  >
                    {saveLoading ? 'Saving…' : 'Save Changes'}
                  </Button>
                ) : (
                  <p className="text-sm text-slate-500 py-2.5">Only administrators can save.</p>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
