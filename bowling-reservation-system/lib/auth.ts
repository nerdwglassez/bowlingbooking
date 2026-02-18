import bcrypt from 'bcryptjs'
import { prisma } from './db'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + SESSION_DURATION)

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  })

  return token
}

export async function getSession(): Promise<{ userId: string; role: string } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session_token')?.value

  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session || session.expiresAt < new Date()) {
    return null
  }

  return {
    userId: session.userId,
    role: session.user.role,
  }
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { token },
  })
}

export async function requireAuth(requiredRole?: 'STAFF' | 'ADMIN'): Promise<{ userId: string; role: string }> {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  // Staff routes: STAFF, MANAGER, ADMIN
  if (requiredRole === 'STAFF') {
    const staffRoles = ['STAFF', 'MANAGER', 'ADMIN']
    if (!staffRoles.includes(session.role)) {
      redirect('/dashboard')
    }
  }

  if (requiredRole === 'ADMIN' && session.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  return session
}

/**
 * Get session if it exists, but don't redirect if it doesn't
 * Returns null if no session exists
 */
export async function getOptionalSession(): Promise<{ userId: string; role: string } | null> {
  return await getSession()
}


