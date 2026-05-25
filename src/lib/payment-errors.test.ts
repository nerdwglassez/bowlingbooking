import { describe, expect, it } from 'vitest'

import { paymentErrorMessage, requiresActionMessage } from '@/lib/payment-errors'

describe('paymentErrorMessage', () => {
  it('maps authentication_required', () => {
    expect(paymentErrorMessage('authentication_required', 'Stripe says no')).toMatch(
      /extra verification/i,
    )
  })

  it('maps payment_intent_authentication_failure', () => {
    expect(
      paymentErrorMessage('payment_intent_authentication_failure', undefined),
    ).toMatch(/verification failed/i)
  })

  it('falls back to Stripe message', () => {
    expect(paymentErrorMessage('card_declined', 'Your card was declined.')).toBe(
      'Your card was declined.',
    )
  })
})

describe('requiresActionMessage', () => {
  it('prompts retry after bank step', () => {
    expect(requiresActionMessage()).toMatch(/tap Pay again/i)
  })
})
