'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession, deleteSession } from '@/lib/auth'

export async function logout() {
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

  redirect('/login')
}


