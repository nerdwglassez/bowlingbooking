import { ALLEY_NAME } from './constants'

export function getPostVisitSubject(): string {
  return 'Thanks for bowling with us – book your next visit'
}

export function buildPostVisitHtml(name: string, bookUrl: string): string {
  const displayName = name || 'Customer'
  return `
    <p>Hi ${displayName},</p>
    <p>We hope you had a great time at ${ALLEY_NAME}! Ready to book again?</p>
    <p><a href="${bookUrl}" style="color:#1e40af;font-weight:bold;">Book a lane</a></p>
    <p>— ${ALLEY_NAME}</p>
  `
}

export function buildPostVisitText(name: string, bookUrl: string): string {
  const displayName = name || 'Customer'
  return `Hi ${displayName}, thanks for visiting! Book your next lane: ${bookUrl} — ${ALLEY_NAME}`
}
