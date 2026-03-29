import { NextRequest, NextResponse } from 'next/server'
import { getSession, deleteSession } from '@/lib/auth'
import { cookies } from 'next/headers'
import { SESSION_COOKIE_NAME, clearSessionTokenCookie } from '@/lib/session-cookie'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (session) {
      const cookieStore = await cookies()
      const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
      
      if (token) {
        await deleteSession(token)
      }
    }

    // Clear cookie
    const cookieStore = await cookies()
    clearSessionTokenCookie(cookieStore)

    return NextResponse.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    )
  }
}
