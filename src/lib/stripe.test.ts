import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const paymentIntentsCreate = vi.fn()
const refundsCreate = vi.fn()
const constructEvent = vi.fn()

vi.mock('stripe', () => {
  class FakeStripe {
    paymentIntents = { create: paymentIntentsCreate }
    refunds = { create: refundsCreate }
    webhooks = { constructEvent }
  }
  return { default: FakeStripe }
})

async function freshImport() {
  vi.resetModules()
  return import('./stripe')
}

describe('stripe.ts', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test')
    paymentIntentsCreate.mockReset()
    refundsCreate.mockReset()
    constructEvent.mockReset()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  describe('isStripeMocked', () => {
    it('returns true when STRIPE_SECRET_KEY is missing in dev', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', '')
      const { isStripeMocked } = await freshImport()
      expect(isStripeMocked()).toBe(true)
    })

    it('returns false when STRIPE_SECRET_KEY is set', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_abc')
      const { isStripeMocked } = await freshImport()
      expect(isStripeMocked()).toBe(false)
    })
  })

  describe('createPaymentIntent', () => {
    it('returns deterministic mock when client is not configured', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', '')
      const { createPaymentIntent } = await freshImport()
      const result = await createPaymentIntent({
        amountCents: 4500,
        metadata: { holdId: 'h_1' },
      })
      expect(result.mocked).toBe(true)
      expect(result.amount).toBe(4500)
      expect(result.id.startsWith('pi_mock_')).toBe(true)
      expect(result.clientSecret.endsWith('_secret_mock')).toBe(true)
      expect(paymentIntentsCreate).not.toHaveBeenCalled()
    })

    it('forwards metadata + receipt_email + amount to Stripe SDK', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_xyz')
      paymentIntentsCreate.mockResolvedValue({
        id: 'pi_123',
        client_secret: 'pi_123_secret_abc',
        amount: 4500,
        status: 'requires_payment_method',
      })
      const { createPaymentIntent } = await freshImport()
      const result = await createPaymentIntent({
        amountCents: 4500,
        metadata: { holdId: 'h_1' },
        customerEmail: 'a@b.co',
        description: 'desc',
      })
      expect(result.mocked).toBe(false)
      expect(result.id).toBe('pi_123')
      expect(paymentIntentsCreate).toHaveBeenCalledOnce()
      const args = paymentIntentsCreate.mock.calls[0][0]
      expect(args).toMatchObject({
        amount: 4500,
        currency: 'usd',
        receipt_email: 'a@b.co',
        description: 'desc',
        metadata: { holdId: 'h_1' },
      })
    })
  })


    it('omits transfer_data when Connect destination flag is off', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_xyz')
      vi.stubEnv('STRIPE_CONNECT_DESTINATION_CHARGES', 'false')
      paymentIntentsCreate.mockResolvedValue({
        id: 'pi_plat',
        client_secret: 'pi_plat_secret',
        amount: 4500,
        status: 'requires_payment_method',
      })
      const { createPaymentIntent } = await freshImport()
      await createPaymentIntent({
        amountCents: 4500,
        metadata: { holdId: 'h_1' },
        connectedAccountId: 'acct_123',
      })
      const args = paymentIntentsCreate.mock.calls[0][0]
      expect(args.transfer_data).toBeUndefined()
      expect(args.application_fee_amount).toBeUndefined()
    })

    it('attaches destination + fee when Connect flag is on', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_xyz')
      vi.stubEnv('STRIPE_CONNECT_DESTINATION_CHARGES', 'true')
      paymentIntentsCreate.mockResolvedValue({
        id: 'pi_dest',
        client_secret: 'pi_dest_secret',
        amount: 4500,
        status: 'requires_payment_method',
      })
      const { createPaymentIntent, isStripeConnectDestinationChargesEnabled } =
        await freshImport()
      expect(isStripeConnectDestinationChargesEnabled()).toBe(true)
      await createPaymentIntent({
        amountCents: 4500,
        metadata: { holdId: 'h_1' },
        connectedAccountId: 'acct_123',
        applicationFeeAmountCents: 250,
      })
      const args = paymentIntentsCreate.mock.calls[0][0]
      expect(args.transfer_data).toEqual({ destination: 'acct_123' })
      expect(args.application_fee_amount).toBe(250)
    })

  describe('createRefund', () => {
    it('returns mock refund when client is not configured', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', '')
      const { createRefund } = await freshImport()
      const r = await createRefund({
        paymentIntentId: 'pi_1',
        amountCents: 1000,
      })
      expect(r.mocked).toBe(true)
      expect(r.amount).toBe(1000)
      expect(r.status).toBe('pending')
    })

    it('forwards amount, reason, metadata to Stripe SDK', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_xyz')
      refundsCreate.mockResolvedValue({
        id: 're_1',
        status: 'pending',
        amount: 500,
      })
      const { createRefund } = await freshImport()
      await createRefund({
        paymentIntentId: 'pi_1',
        amountCents: 500,
        reason: 'requested_by_customer',
        metadata: { bookingId: 'bk_1' },
      })
      expect(refundsCreate).toHaveBeenCalledWith({
        payment_intent: 'pi_1',
        amount: 500,
        reason: 'requested_by_customer',
        metadata: { bookingId: 'bk_1' },
      })
    })
  })

  describe('constructWebhookEvent', () => {
    it('returns parsed JSON in dev when no secret + no signature', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', '')
      const { constructWebhookEvent } = await freshImport()
      const body = JSON.stringify({ id: 'evt_1', type: 'test' })
      const out = constructWebhookEvent(body, null, undefined)
      expect(out).toBeNull()
    })

    it('parses unsigned body in dev when signature header is present', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', '')
      const { constructWebhookEvent } = await freshImport()
      const body = JSON.stringify({ id: 'evt_2', type: 'foo' })
      const out = constructWebhookEvent(body, 'fake-sig', undefined)
      expect(out).toEqual({ id: 'evt_2', type: 'foo' })
    })

    it('throws in production without a configured secret', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('STRIPE_SECRET_KEY', '')
      const { constructWebhookEvent } = await freshImport()
      expect(() =>
        constructWebhookEvent('{}', 'sig', undefined),
      ).toThrow(/production/)
    })

    it('delegates to stripe.webhooks.constructEvent when configured', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_xyz')
      constructEvent.mockReturnValue({ id: 'evt_3', type: 'real' })
      const { constructWebhookEvent } = await freshImport()
      const out = constructWebhookEvent('body', 'sig', 'whsec_x')
      expect(constructEvent).toHaveBeenCalledWith('body', 'sig', 'whsec_x')
      expect(out).toEqual({ id: 'evt_3', type: 'real' })
    })

    it('throws when configured but signature header is missing', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_xyz')
      const { constructWebhookEvent } = await freshImport()
      expect(() =>
        constructWebhookEvent('body', null, 'whsec_x'),
      ).toThrow(/Stripe-Signature/)
    })
  })
})
