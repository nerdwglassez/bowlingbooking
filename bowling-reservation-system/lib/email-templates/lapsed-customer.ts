import { ALLEY_NAME, getAppUrl } from './constants'
import { getBookingUrl } from './utils'

type LapsedCustomerTemplateInput = {
  name: string
}

export function getLapsedCustomerSubject(): string {
  return `We miss you at ${ALLEY_NAME} – book a lane today`
}

export function buildLapsedCustomerHtml(input: LapsedCustomerTemplateInput): string {
  const displayName = input.name || 'Customer'
  const bookUrl = getBookingUrl(getAppUrl())

  return `
    <p>Hi ${displayName},</p>
    <p>It's been a while since we've seen you at ${ALLEY_NAME}. Come back and bowl with us!</p>
    <p><a href="${bookUrl}" style="color:#1e40af;font-weight:bold;">Book a lane</a></p>
    <p>— ${ALLEY_NAME}</p>
  `
}

export function buildLapsedCustomerText(input: LapsedCustomerTemplateInput): string {
  const displayName = input.name || 'Customer'
  const bookUrl = getBookingUrl(getAppUrl())
  return `Hi ${displayName}, we miss you! Book a lane: ${bookUrl} — ${ALLEY_NAME}`
}
