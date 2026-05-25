/**
 * User-safe Stripe payment error copy (M12-M2a). Keeps messaging out of the
 * client component so Vitest can cover it without Stripe.js.
 */

export function paymentErrorMessage(
  code: string | undefined,
  fallback: string | undefined,
): string {
  if (code === 'authentication_required') {
    return 'Your bank needs extra verification. Complete the prompt, then tap Pay again.'
  }
  if (code === 'payment_intent_authentication_failure') {
    return 'Bank verification failed. Try again or use a different card.'
  }
  return fallback ?? 'Payment failed. Try again or use another card.'
}

export function requiresActionMessage(): string {
  return 'Complete verification with your bank, then tap Pay again if needed.'
}
