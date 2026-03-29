import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

/** Minimal user fields for `AppExperienceHeader` (server → client). */
export type HeaderUser = {
  email: string
  firstName: string | null
  lastName: string | null
  role: string
}

export async function getHeaderUser(): Promise<HeaderUser | null> {
  const session = await getSession()
  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  })

  return user
}
