'use server'

import { revalidatePath } from 'next/cache'

import { hashPassword } from '@/lib/auth'
import { sendPasswordResetEmail } from '@/lib/email'
import { isDevWithoutDb } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { assertPublicRateLimit } from '@/lib/rate-limit-request'
import { appBaseUrl, generateRawToken, hashToken } from '@/lib/secure-tokens'

const TOKEN_TTL_MS = 60 * 60 * 1000

/** Always returns ok — do not leak whether the email exists. */
export async function requestPasswordResetAction(
  email: string,
): Promise<{ ok: true }> {
  const normalized = email.trim().toLowerCase()
  if (!normalized.includes('@')) {
    return { ok: true }
  }

  await assertPublicRateLimit('password_reset')

  if (isDevWithoutDb()) {
    console.log(`[password-reset] mock request for ${normalized}`)
    return { ok: true }
  }

  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, email: true, passwordHash: true },
  })
  if (!user?.passwordHash) {
    return { ok: true }
  }

  const rawToken = generateRawToken()
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.deleteMany({ where: { userId: user.id } })
    await tx.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    })
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'User',
        entityId: user.id,
      },
    })
  })

  const resetUrl = `${appBaseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`
  await sendPasswordResetEmail({
    to: user.email,
    resetUrl,
  })

  return { ok: true }
}

export async function resetPasswordAction(input: {
  token: string
  password: string
}): Promise<{ ok: true }> {
  if (input.password.length < 8) {
    throw new Error('Password must be at least 8 characters.')
  }

  if (isDevWithoutDb()) {
    return { ok: true }
  }

  const tokenHash = hashToken(input.token.trim())
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  })
  if (!row || row.usedAt != null || row.expiresAt <= new Date()) {
    throw new Error('This reset link is invalid or has expired.')
  }

  const hashed = await hashPassword(input.password)
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: row.userId },
      data: { passwordHash: hashed },
    })
    await tx.passwordResetToken.updateMany({
      where: { userId: row.userId, usedAt: null },
      data: { usedAt: new Date() },
    })
    await tx.auditLog.create({
      data: {
        userId: row.userId,
        action: 'PASSWORD_RESET_COMPLETED',
        entityType: 'User',
        entityId: row.userId,
      },
    })
  })

  revalidatePath('/signin')
  return { ok: true }
}
