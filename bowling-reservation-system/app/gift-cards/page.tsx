'use client'

import { useState } from 'react'
import Link from 'next/link'
import StripePaymentForm from '@/components/booking/StripePaymentForm'
import Button from '@/components/ui/Button'

export default function GiftCardsPage() {
  const [amount, setAmount] = useState('25')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [giftCardId, setGiftCardId] = useState<string | null>(null)
  const [completed, setCompleted] = useState<{ code: string; initialAmount: number } | null>(null)

  const handleStartPurchase = async () => {
    const num = parseFloat(amount)
    if (Number.isNaN(num) || num < 5 || num > 500) {
      setError('Amount must be between $5 and $500')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/gift-cards/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: num,
          recipientEmail: recipientEmail.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start purchase')
      setClientSecret(data.clientSecret)
      setGiftCardId(data.giftCardId)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    if (!paymentIntentId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/gift-cards/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to activate gift card')
      setCompleted({ code: data.code, initialAmount: data.initialAmount })
      setClientSecret(null)
      setGiftCardId(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentCancel = () => {
    setClientSecret(null)
    setGiftCardId(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-lg mx-auto p-8">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
            ← Back to dashboard
          </Link>
        </div>
        <h1 className="text-2xl font-bold mb-2">Buy a gift card</h1>
        <p className="text-gray-600 text-sm mb-6">
          Give the gift of bowling. Choose an amount between $5 and $500.
        </p>

        {completed ? (
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-green-200">
            <h2 className="text-lg font-semibold text-green-800 mb-2">Gift card activated</h2>
            <p className="text-gray-700 mb-2">
              Your gift card code is:
            </p>
            <p className="text-2xl font-mono font-bold text-gray-900 mb-4 bg-gray-100 p-4 rounded">
              {completed.code}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Value: ${completed.initialAmount.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Share this code with the recipient. They can use it at checkout when booking a lane.
            </p>
            <Button onClick={() => { setCompleted(null); setAmount('25'); setRecipientEmail('') }}>
              Buy another
            </Button>
          </div>
        ) : !clientSecret ? (
          <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
              <input
                type="number"
                min={5}
                max={500}
                step={5}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipient email (optional)
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <Button onClick={handleStartPurchase} disabled={loading} className="w-full">
              {loading ? 'Preparing…' : `Pay $${parseFloat(amount) || 0}`}
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="font-semibold mb-3">Complete payment</h3>
            <StripePaymentForm
              clientSecret={clientSecret}
              bookingId={giftCardId!}
              onSuccess={handlePaymentSuccess}
              onCancel={handlePaymentCancel}
            />
          </div>
        )}
      </main>
    </div>
  )
}
