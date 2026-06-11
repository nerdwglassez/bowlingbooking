import type { Prisma } from '@/generated/prisma/client'

import { sendTeamInviteEmail } from '@/lib/email'
import {
  appBaseUrl,
  generateRawToken,
  hashToken,
} from '@/lib/secure-tokens'
import { getTenant } from '@/lib/tenant'

export const INVITE_TTL_MS = 48 * 60 * 60 * 1000

const STAFF_ROLES = ['STAFF', 'MANAGER', 'ADMIN'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

export function isStaffRole(role: string): role is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(role)
}

export async function issueTeamInviteToken(
  tx: Prisma.TransactionClient,
  input: {
    userId: string
    invitedByUserId: string
    personalMessage?: string | null
  },
): Promise<string> {
  await tx.teamInviteToken.deleteMany({
    where: { userId: input.userId, usedAt: null },
  })

  const rawToken = generateRawToken()
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS)

  await tx.teamInviteToken.create({
    data: {
      userId: input.userId,
      invitedByUserId: input.invitedByUserId,
      tokenHash,
      personalMessage: input.personalMessage?.trim() || null,
      expiresAt,
    },
  })

  return rawToken
}

export type TeamInviteDispatchResult = {
  inviteUrl: string
  emailDelivered: boolean
}

export async function dispatchTeamInviteEmail(input: {
  to: string
  role: StaffRole
  rawToken: string
  inviterName?: string | null
  personalMessage?: string | null
}): Promise<TeamInviteDispatchResult> {
  const tenant = await getTenant()
  const inviteUrl = `${appBaseUrl()}/accept-invite?token=${encodeURIComponent(input.rawToken)}`

  const result = await sendTeamInviteEmail({
    to: input.to,
    inviteUrl,
    venueName: tenant.name,
    role: input.role,
    inviterName: input.inviterName,
    personalMessage: input.personalMessage,
  })

  return { inviteUrl, emailDelivered: result.delivered }
}
