/**
 * Build the post-payment success URL with the PaymentIntent id.
 *
 * `/book/success` looks up the booking via `payment_intent`. Stripe's
 * full-page 3DS redirect appends that query param; in-page `confirmPayment`
 * success does not, so callers must add it before navigating.
 */
export function withPaymentIntentQuery(
  returnUrl: string,
  paymentIntentId: string,
  origin = 'http://localhost',
): string {
  const trimmedId = paymentIntentId.trim()
  if (!trimmedId) return returnUrl
  const url = new URL(returnUrl, origin)
  url.searchParams.set('payment_intent', trimmedId)
  return url.toString()
}
