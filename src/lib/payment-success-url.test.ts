import { describe, expect, it } from 'vitest'

import { withPaymentIntentQuery } from './payment-success-url'

describe('withPaymentIntentQuery', () => {
  it('appends payment_intent to an absolute success URL', () => {
    expect(
      withPaymentIntentQuery(
        'https://lanes.example/book/success',
        'pi_abc123',
      ),
    ).toBe('https://lanes.example/book/success?payment_intent=pi_abc123')
  })

  it('replaces an existing payment_intent param', () => {
    expect(
      withPaymentIntentQuery(
        'https://lanes.example/book/success?payment_intent=pi_old',
        'pi_new',
      ),
    ).toBe('https://lanes.example/book/success?payment_intent=pi_new')
  })

  it('resolves a relative path against origin', () => {
    expect(
      withPaymentIntentQuery('/book/success', 'pi_abc123', 'https://lanes.example'),
    ).toBe('https://lanes.example/book/success?payment_intent=pi_abc123')
  })

  it('leaves the URL unchanged when the intent id is empty', () => {
    expect(
      withPaymentIntentQuery('https://lanes.example/book/success', '  '),
    ).toBe('https://lanes.example/book/success')
  })
})
