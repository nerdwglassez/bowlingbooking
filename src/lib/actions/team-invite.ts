'use server'

import { revalidatePath } from 'next/cache'

import { hashPassword, requireRole } from '@/lib/auth'
import { isDevWithoutDb } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { hashToken } from '@/lib/secure-tokens'
import {
  dispatchTeamInviteEmail,
  isStaffRole,
  issueTeamInviteToken,
} from '@/lib/team-invite-shared'

function assertCanResendTeamInvite(
  caller: Awaited<ReturnType<typeof requireRole>>,
  target: { tenantId: string | null; role: string },
): void {
  if (!caller.tenantId) {
    throw new Error('resendTeamInviteAction: missing tenant context.')
  }
  if (target.tenantId !== caller.tenantId) {
    throw new Error('resendTeamInviteAction: cannot resend outside your tenant.')
  }
  if (target.role === 'ADMIN' && caller.role !== 'ADMIN') {
    throw new Error('Only an ADMIN can modify an ADMIN user.')
  }
}

export async function acceptTeamInviteAction(input: {
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
  const row = await prisma.teamInviteToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  })

  if (!row || row.usedAt != null || row.expiresAt <= new Date()) {
    throw new Error('This invite link is invalid or has expired.')
  }

  if (!isStaffRole(row.user.role)) {
    throw new Error('This invite link is invalid or has expired.')
  }

  if (row.user.passwordHash) {
    throw new Error('This invite link is invalid or has expired.')
  }

  const hashed = await hashPassword(input.password)
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: row.userId },
      data: { passwordHash: hashed },
    })
    await tx.teamInviteToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    })
    await tx.auditLog.create({
      data: {
        userId: row.userId,
        action: 'TEAM_USER_INVITE_ACCEPTED',
        entityType: 'User',
        entityId: row.userId,
      },
    })
  })

  revalidatePath('/signin')
  revalidatePath('/staff/settings/team')
  return { ok: true }
}

export async function resendTeamInviteAction(input: {
  userId: string
  personalMessage?: string | null
}): Promise<{
  mocked: boolean
  emailDelivered: boolean
  inviteUrl?: string
  emailError?: string
}> {
  const caller = await requireRole('MANAGER', 'ADMIN')

  if (isDevWithoutDb()) {
    console.log(`[admin] mock team invite resend by ${caller.email}`, input.userId)
    return { mocked: true, emailDelivered: false }
  }

  const target = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      email: true,
      role: true,
      passwordHash: true,
      tenantId: true,
    },
  })

  if (!target || !isStaffRole(target.role)) {
    throw new Error('resendTeamInviteAction: user is not a team member.')
  }

  assertCanResendTeamInvite(caller, target)

  if (target.passwordHash) {
    throw new Error('resendTeamInviteAction: this team member has already accepted their invite.')
  }

  const rawToken = await prisma.$transaction(async (tx) => {
    const token = await issueTeamInviteToken(tx, {
      userId: target.id,
      invitedByUserId: caller.id,
      personalMessage: input.personalMessage,
    })
    await tx.auditLog.create({
      data: {
        userId: caller.id,
        action: 'TEAM_USER_INVITE_RESENT',
        entityType: 'User',
        entityId: target.id,
        details: { email: target.email },
      },
    })
    return token
  })

  const invite = await dispatchTeamInviteEmail({
    to: target.email,
    role: target.role,
    rawToken,
    inviterName: caller.name,
    personalMessage: input.personalMessage,
  })

  revalidatePath('/staff/settings/team')
  revalidatePath('/admin/team')
  return {
    mocked: false,
    emailDelivered: invite.emailDelivered,
    inviteUrl: invite.emailDelivered ? undefined : invite.inviteUrl,
    emailError: invite.emailDelivered ? undefined : invite.emailError,
  }
}
