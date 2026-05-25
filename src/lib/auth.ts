/**
 * Auth.js v5 (NextAuth) — single entry point for the app.
 *
 * Consumers import EVERYTHING auth-related from this module:
 *   - `auth`, `signIn`, `signOut`, `handlers` — Auth.js APIs
 *   - `requireRole`, `requireUser`, `getCurrentUser` — server-side guards
 *   - `verifyCredentials` — for the sign-in server action
 *
 * Other modules MUST NOT import `next-auth`, `next-auth/providers/credentials`,
 * or `bcryptjs` directly. The drift sentinel enforces this. Swapping providers,
 * switching to database sessions, or replacing the hasher then touches one file.
 *
 * Session strategy: JWT (24h). The token embeds the user's id, role, and
 * tenantId. Demotions take effect on the next sign-in or after the token
 * expires (≤24h). For instant revocation we'd switch `session.strategy` to
 * `'database'` and add the Prisma adapter — both are one-line changes here.
 *
 * Dev-without-DB: auth REQUIRES a real DATABASE_URL. The customer booking flow
 * has a mock fallback (see src/lib/env.ts), but staff/admin authentication
 * does not. `requireRole` and `requireUser` propagate the underlying error.
 *
 * See .claude/contracts/AUTH.md for usage patterns.
 */

import NextAuth, { AuthError, type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
// Side-effect import: loads the `next-auth/jwt` module so the `declare module`
// augmentation below has a real target. Without this TypeScript reports
// "Invalid module name in augmentation".
import 'next-auth/jwt'
import { headers } from 'next/headers'
import { redirect, unauthorized } from 'next/navigation'
import { compare, hash } from 'bcryptjs'

import { resolveAuthUrlForChecks, warnOnce } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/types'

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24
const BCRYPT_COST = 12

// Dev-only fallback secret. NEVER used in production (the `secret` resolver
// below refuses to fall back when NODE_ENV === 'production'). Hard-coded so
// the dev-server JWT survives module reloads; rotate via AUTH_SECRET in any
// shared environment.
const DEV_FALLBACK_SECRET =
  'royalz-dev-only-secret-DO-NOT-USE-IN-PRODUCTION'

function resolveAuthSecret(): string | undefined {
  const explicit =
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim()
  if (explicit) return explicit
  if (process.env.NODE_ENV === 'production') return undefined
  warnOnce(
    'auth-secret',
    'AUTH_SECRET is not set — using a dev-only fallback. Set AUTH_SECRET ' +
      '(e.g. `npx auth secret`) before deploying.',
  )
  return DEV_FALLBACK_SECRET
}

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string
      role: Role
      tenantId: string | null
    }
  }

  interface User {
    role: Role
    tenantId: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: Role
    tenantId: string | null
  }
}

/**
 * Look up a user by email and verify the supplied password. Returns the
 * authenticated user shape (without the hash) or null on any failure.
 *
 * Used by both the NextAuth Credentials provider and the `/signin` server
 * action. Pages never call this directly; they go through `signIn()`.
 */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<{
  id: string
  email: string
  name: string | null
  role: Role
  tenantId: string | null
} | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized || !password) return null

  const user = await prisma.user.findUnique({ where: { email: normalized } })
  if (!user || !user.passwordHash) return null

  const ok = await compare(password, user.passwordHash)
  if (!ok) return null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
  }
}

/**
 * Hash a plaintext password. Used by the seed script and (eventually) the
 * admin "reset password" tooling. Never called from request handlers.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return hash(plaintext, BCRYPT_COST)
}

export { AuthError }

// On Vercel, infer AUTH_URL from VERCEL_URL when not set so session cookies
// target the deployment host (not localhost from a copied .env.example).
if (
  !process.env.AUTH_URL?.trim() &&
  !process.env.NEXTAUTH_URL?.trim()
) {
  const inferred = resolveAuthUrlForChecks()
  if (inferred) {
    process.env.AUTH_URL = inferred
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: resolveAuthSecret(),
  // Required on Vercel so session cookies use the deployment hostname.
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  pages: {
    signIn: '/signin',
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (creds) => {
        const email = typeof creds?.email === 'string' ? creds.email : ''
        const password =
          typeof creds?.password === 'string' ? creds.password : ''
        return verifyCredentials(email, password)
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? token.id
        token.role = user.role
        token.tenantId = user.tenantId ?? null
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.tenantId = token.tenantId
      }
      return session
    },
  },
})

/**
 * Resolved current-user shape for server-side consumers. Always derived from
 * the session JWT — never re-fetches from the DB on every call.
 */
export interface CurrentUser {
  id: string
  email: string | null
  name: string | null
  role: Role
  tenantId: string | null
}

/**
 * Return the current authenticated user, or `null` if not signed in. Safe to
 * call from server components, server actions, and route handlers.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const session = await auth()
    if (!session?.user?.id) return null
    if (!session.user.role) return null
    return {
      id: session.user.id,
      email: session.user.email ?? null,
      name: session.user.name ?? null,
      role: session.user.role,
      tenantId: session.user.tenantId,
    }
  } catch (err) {
    console.error('[auth] session read failed', err)
    return null
  }
}

/**
 * Require ANY authenticated user. Redirects to `/signin?from=<currentPath>`
 * when there's no session. Returns the resolved user.
 *
 * The current path is read automatically from the `x-pathname` header
 * (set by `src/proxy.ts`) so callers don't need to thread it through.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) {
    redirect(await buildSignInUrl())
  }
  return user
}

/**
 * Require an authenticated user with one of the allowed roles. Behavior:
 *   - No session     → redirect to `/signin?from=<currentPath>`
 *   - Wrong role     → `unauthorized()` (renders the nearest `unauthorized.tsx`
 *                      or returns HTTP 401)
 *
 * Call from route-group layouts (`(staff)/layout.tsx`, `(admin)/layout.tsx`)
 * and from server actions that mutate restricted resources (refunds, etc.).
 */
export async function requireRole(
  ...allowed: Role[]
): Promise<CurrentUser> {
  if (allowed.length === 0) {
    throw new Error('requireRole called without any allowed roles')
  }
  const user = await getCurrentUser()
  if (!user) {
    redirect(await buildSignInUrl())
  }
  if (!allowed.includes(user.role)) {
    unauthorized()
  }
  return user
}

async function buildSignInUrl(): Promise<string> {
  let from = '/'
  try {
    const h = await headers()
    from = h.get('x-pathname') ?? '/'
  } catch {
    // headers() can throw in non-request contexts (e.g. unit tests without
    // a Next.js request scope). Fall back to '/' rather than blow up.
  }
  if (!from || from === '/' || from === '/signin') return '/signin'
  const params = new URLSearchParams({ from })
  return `/signin?${params.toString()}`
}
