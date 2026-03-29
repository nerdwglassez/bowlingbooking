'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession, deleteSession } from '@/lib/auth'
import { SESSION_COOKIE_NAME, clearSessionTokenCookie } from '@/lib/session-cookie'

export async function logout() {
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

  redirect('/book')
}


