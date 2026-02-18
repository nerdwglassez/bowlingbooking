'use client'

import { useEffect, useState } from 'react'
import { Save, X } from 'lucide-react'
import Toast from '@/components/ui/Toast'
import PriceInput from '@/components/ui/PriceInput'

type SettingsPayload = {
  canEdit: boolean
  settings: {
    laneRentalPerHour: number
    bowlerPricePerPerson: number
    shoeRental: number
    taxRate: number
    totalLanes: number
    reserveLanes: number
  }
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

type CustomPricingRule = {
  id: string
  ruleName: string
  days: number[]
  startTime: string
  endTime: string
  pricePerBowler: number
  shoeRentalPrice: number
}

export default function StaffPricingSettingsPage() {
  const [payload, setPayload] = useState<SettingsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [addRuleModalOpen, setAddRuleModalOpen] = useState(false)
  const [customRules, setCustomRules] = useState<CustomPricingRule[]>([])
  const [ruleForm, setRuleForm] = useState({
    ruleName: '',
    days: [] as number[],
    startTime: '17:00',
    endTime: '21:00',
    pricePerBowler: 15,
    shoeRentalPrice: 5,
  })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const response = await fetch('/api/staff/settings', { cache: 'no-store' })
        if (!response.ok) throw new Error('Failed to load pricing settings')
        const data = (await response.json()) as SettingsPayload
        if (mounted) setPayload(data)
      } catch (error) {
        if (mounted) setMessage(error instanceof Error ? error.message : 'Failed to load pricing settings')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const update = (key: keyof SettingsPayload['settings'], value: number) => {
    setPayload((prev) => (prev ? { ...prev, settings: { ...prev.settings, [key]: value } } : prev))
  }

  const save = async () => {
    if (!payload) return
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch('/api/staff/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.settings),
      })
      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error ?? 'Failed to save pricing settings')
      }
      setSuccessToast('Pricing settings updated.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save pricing settings')
    } finally {
      setSaving(false)
    }
  }

  const openAddRuleModal = () => {
    setRuleForm({
      ruleName: '',
      days: [],
      startTime: '17:00',
      endTime: '21:00',
      pricePerBowler: payload?.settings.bowlerPricePerPerson ?? 15,
      shoeRentalPrice: payload?.settings.shoeRental ?? 5,
    })
    setAddRuleModalOpen(true)
  }

  const toggleRuleDay = (dayIndex: number) => {
    setRuleForm((prev) => ({
      ...prev,
      days: prev.days.includes(dayIndex)
        ? prev.days.filter((d) => d !== dayIndex)
        : [...prev.days, dayIndex].sort((a, b) => a - b),
    }))
  }

  const addRule = () => {
    if (!ruleForm.ruleName.trim() || ruleForm.days.length === 0) return
    setCustomRules((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        ruleName: ruleForm.ruleName.trim(),
        days: [...ruleForm.days],
        startTime: ruleForm.startTime,
        endTime: ruleForm.endTime,
        pricePerBowler: ruleForm.pricePerBowler,
        shoeRentalPrice: ruleForm.shoeRentalPrice,
      },
    ])
    setAddRuleModalOpen(false)
  }

  const removeRule = (id: string) => {
    setCustomRules((prev) => prev.filter((r) => r.id !== id))
  }

  if (loading || !payload) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">Loading pricing settings...</p>
      </div>
    )
  }

  const { bowlerPricePerPerson, shoeRental } = payload.settings
  const example1 = 4 * bowlerPricePerPerson + 4 * shoeRental
  const example2 = 8 * bowlerPricePerPerson + 6 * shoeRental

  return (
    <>
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">Pricing Configuration</h2>
      <p className="mt-1 text-sm text-slate-500">
        Set default pricing and create custom rules for specific days and times.
      </p>

      {/* Default Pricing */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-slate-900">Default Pricing</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Price per Bowler
            <PriceInput
              value={payload.settings.bowlerPricePerPerson}
              onChange={(v) => update('bowlerPricePerPerson', v)}
              disabled={!payload.canEdit}
              className="mt-1"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Shoe Rental Price
            <PriceInput
              value={payload.settings.shoeRental}
              onChange={(v) => update('shoeRental', v)}
              disabled={!payload.canEdit}
              className="mt-1"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Lane Rental / Hour
            <PriceInput
              value={payload.settings.laneRentalPerHour}
              onChange={(v) => update('laneRentalPerHour', v)}
              disabled={!payload.canEdit}
              className="mt-1"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Tax Rate
            <PriceInput
              value={payload.settings.taxRate}
              onChange={(v) => update('taxRate', v)}
              disabled={!payload.canEdit}
              showDollar={false}
              className="mt-1"
            />
          </label>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          These are the standard rates applied when no custom pricing rule matches.
        </p>
      </div>

      {/* Custom Pricing Rules */}
      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-900">Custom Pricing Rules</h3>
          <button
            type="button"
            disabled={!payload.canEdit}
            onClick={openAddRuleModal}
            className="inline-flex items-center gap-1.5 rounded-[14px] bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            + Add Rule
          </button>
        </div>
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-6">
          {customRules.length === 0 ? (
            <p className="text-center text-sm text-slate-600">
              No custom pricing rules yet. Add a rule to set different prices for specific days and times.
            </p>
          ) : (
            <ul className="space-y-2">
              {customRules.map((rule) => (
                <li
                  key={rule.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3"
                >
                  <span className="font-medium text-slate-900">{rule.ruleName}</span>
                  <span className="text-sm text-slate-600">
                    {rule.days.map((d) => DAY_LABELS[d]).join(', ')} · {rule.startTime}–{rule.endTime} · ${rule.pricePerBowler}/bowler · ${rule.shoeRentalPrice} shoes
                  </span>
                  {payload.canEdit && (
                    <button
                      type="button"
                      onClick={() => removeRule(rule.id)}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Example Pricing (Default Rates) */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-slate-900">Example Pricing (Default Rates)</h3>
        <div className="mt-3 space-y-1 rounded-xl border border-dashed border-slate-300 bg-white p-4">
          <p className="flex justify-between text-sm text-slate-700">
            <span>4 bowlers + 4 shoe rentals</span>
            <span className="font-medium">${example1.toFixed(2)}</span>
          </p>
          <p className="flex justify-between text-sm text-slate-700">
            <span>8 bowlers + 6 shoe rentals</span>
            <span className="font-medium">${example2.toFixed(2)}</span>
          </p>
        </div>
      </div>

      {message ? <p className="mt-4 text-sm text-rose-600">{message}</p> : null}
      <Toast
        message={successToast ?? ''}
        visible={!!successToast}
        onDismiss={() => setSuccessToast(null)}
        variant="success"
        autoDismissMs={3000}
      />

      <div className="mt-8">
        <button
          type="button"
          onClick={() => void save()}
          disabled={!payload.canEdit || saving}
          className="inline-flex items-center gap-2 rounded-[14px] bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save className="h-4 w-4" aria-hidden />
          {saving ? 'Saving...' : payload.canEdit ? 'Save Changes' : 'Read-only access'}
        </button>
      </div>
    </div>

      {/* Add Pricing Rule modal */}
      {addRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <button
            type="button"
            aria-label="Close modal"
            className="absolute inset-0 cursor-default"
            onClick={() => setAddRuleModalOpen(false)}
          />
          <div
            className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Add Pricing Rule</h3>
              <button
                type="button"
                onClick={() => setAddRuleModalOpen(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Rule Name
                <input
                  type="text"
                  value={ruleForm.ruleName}
                  onChange={(e) => setRuleForm((prev) => ({ ...prev, ruleName: e.target.value }))}
                  placeholder="e.g., Weekend Premium, Happy Hour"
                  className="mt-1 w-full rounded-[14px] border border-slate-300 bg-white px-3 py-2.5 text-sm"
                />
              </label>

              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Days</p>
                <div className="flex flex-wrap gap-2">
                  {DAY_LABELS.map((label, idx) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleRuleDay(idx)}
                      className={`rounded-[10px] px-3 py-1.5 text-sm font-medium transition ${
                        ruleForm.days.includes(idx)
                          ? 'border border-slate-300 bg-slate-200 text-slate-800'
                          : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium text-slate-700">
                  Start Time
                  <input
                    type="time"
                    value={ruleForm.startTime}
                    onChange={(e) => setRuleForm((prev) => ({ ...prev, startTime: e.target.value }))}
                    className="mt-1 w-full rounded-[14px] border border-slate-300 bg-white px-3 py-2.5 text-sm"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  End Time
                  <input
                    type="time"
                    value={ruleForm.endTime}
                    onChange={(e) => setRuleForm((prev) => ({ ...prev, endTime: e.target.value }))}
                    className="mt-1 w-full rounded-[14px] border border-slate-300 bg-white px-3 py-2.5 text-sm"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium text-slate-700">
                  Price per Bowler
                  <PriceInput
                    value={ruleForm.pricePerBowler}
                    onChange={(v) => setRuleForm((prev) => ({ ...prev, pricePerBowler: v }))}
                    className="mt-1"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Shoe Rental Price
                  <PriceInput
                    value={ruleForm.shoeRentalPrice}
                    onChange={(v) => setRuleForm((prev) => ({ ...prev, shoeRentalPrice: v }))}
                    className="mt-1"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddRuleModalOpen(false)}
                className="rounded-[14px] border border-slate-300 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addRule}
                disabled={!ruleForm.ruleName.trim() || ruleForm.days.length === 0}
                className="rounded-[14px] bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

