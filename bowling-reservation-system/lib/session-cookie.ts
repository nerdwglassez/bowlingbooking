/** Single name for the auth cookie — safe to import from edge (e.g. `proxy.ts`). */
export const SESSION_COOKIE_NAME = 'session_token'

const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60

type CookieStoreLike = {
  set(
    name: string,
    value: string,
    options: {
      httpOnly: boolean
      secure: boolean
      sameSite: 'lax' | 'strict' | 'none'
      maxAge: number
      path: string
    }
  ): void
  delete(name: string): void
}

/**
 * HttpOnly, Secure in production, SameSite=Lax (mitigates CSRF on cross-site POSTs).
 */
export function setSessionTokenCookie(store: CookieStoreLike, token: string): void {
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SEC,
    path: '/',
  })
}

export function clearSessionTokenCookie(store: CookieStoreLike): void {
  store.delete(SESSION_COOKIE_NAME)
}
