'use server'

import { revalidatePath } from 'next/cache'

import { hashPassword } from '@/lib/auth'
import { isDevWithoutDb } from '@/lib/env'
import { prisma } from '@/lib/prisma'

export interface ClaimBookingInput {
  token: string
  password: string
  name?: string
}

export interface ClaimBookingResult {
  ok: boolean
  mocked?: boolean
  signInEmail?: string
}

export async function claimBookingAccountAction(
  input: ClaimBookingInput,
): Promise<ClaimBookingResult> {
  const token = input.token.trim()
  if (!token || input.password.length < 8) {
    throw new Error('Password must be at least 8 characters.')
  }

  if (isDevWithoutDb()) {
    return { ok: true, mocked: true }
  }

  const claim = await prisma.claimToken.findUnique({
    where: { token },
    include: { booking: true },
  })
  if (!claim || claim.claimedAt != null || claim.expiresAt <= new Date()) {
    throw new Error('This account link has expired or is invalid.')
  }

  const email = claim.email.trim().toLowerCase()

  await prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: { email },
      select: { id: true, role: true },
    })

    if (existingUser && existingUser.role !== 'CUSTOMER') {
      throw new Error('This account link cannot be used for a team account.')
    }

    const user = existingUser
      ? { id: existingUser.id }
      : await tx.user.create({
        data: {
          email,
          name: input.name?.trim() || null,
          passwordHash: await hashPassword(input.password),
          role: 'CUSTOMER',
          tenantId: claim.tenantId,
        },
        select: { id: true },
      })

    await tx.booking.update({
      where: { id: claim.bookingId },
      data: { userId: user.id },
    })
    await tx.claimToken.update({
      where: { id: claim.id },
      data: { claimedAt: new Date() },
    })
  })

  revalidatePath('/dashboard')
  return { ok: true, signInEmail: email }
}
