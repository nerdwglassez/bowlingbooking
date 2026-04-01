import { ALLEY_NAME } from './constants'

export function getPasswordResetSubject(): string {
  return 'Reset your password'
}

export function buildPasswordResetHtml(resetLink: string): string {
  return `
    <p>You requested a password reset.</p>
    <p><a href="${resetLink}" style="color:#1e40af;">Reset password</a></p>
    <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
    <p>— ${ALLEY_NAME}</p>
  `
}

export function buildPasswordResetText(resetLink: string): string {
  return `You requested a password reset. Open this link: ${resetLink} (expires in 1 hour). — ${ALLEY_NAME}`
}
