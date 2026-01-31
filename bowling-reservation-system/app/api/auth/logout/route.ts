import { NextRequest, NextResponse } from 'next/server'
import { getSession, deleteSession } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (session) {
      const cookieStore = await cookies()
      const token = cookieStore.get('session_token')?.value
      
      if (token) {
        await deleteSession(token)
      }
    }

    // Clear cookie
    const cookieStore = await cookies()
    cookieStore.delete('session_token')

    return NextResponse.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    )
  }
}
