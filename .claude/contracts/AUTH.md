# Auth Contract

Source of truth for **every file that reads or enforces authentication or authorization**. Agents working on staff/admin pages, role-gated server actions, or sign-in/out flows MUST read this file before writing code.

The auth module (`src/lib/auth.ts`) is the **only** place that touches `next-auth`, `next-auth/providers/*`, `bcryptjs`, or NextAuth's JWT/session types. The drift sentinel enforces this with two checks (`direct next-auth import outside src/lib/auth.ts`, `direct bcryptjs import outside src/lib/auth.ts`).

---

## 1. What lives where

| Concern | Module | Notes |
|---|---|---|
| NextAuth init, providers, callbacks | `src/lib/auth.ts` | One place. Swapping providers, switching session strategy, or changing the hasher = one-file edit. |
| Password hashing | `hashPassword()` in `src/lib/auth.ts` | Wraps bcryptjs. Used by seed and (future) admin reset tooling. Not from request handlers. |
| Credentials verification | `verifyCredentials(email, password)` in `src/lib/auth.ts` | Used by the Credentials provider's `authorize` AND by the `/signin` server action when it bypasses NextAuth. |
| Current-user resolution | `getCurrentUser()` in `src/lib/auth.ts` | Reads the session, returns a plain object. Never re-queries the DB. |
| Auth requirement (any user) | `requireUser(currentPath?)` in `src/lib/auth.ts` | Redirects to `/signin?from=…`. Returns the user. |
| Role gating | `requireRole(...allowed)` in `src/lib/auth.ts` | Redirects on no session; `unauthorized()` on wrong role. Returns the user. |
| Sign-in surface | `src/app/signin/page.tsx` (Phase 6b) | The only place the user authenticates. Calls `signIn('credentials', …)`. |
| Sign-out surface | Sign-out server action (Phase 6b) | Calls `signOut()`. |

---

## 2. Hard rules

1. **Never `import` from `next-auth`, `next-auth/providers/*`, `next-auth/jwt`, or `bcryptjs`** outside `src/lib/auth.ts`. Drift sentinel fails the build.
2. **Pages NEVER call `prisma.user.*` directly.** Use `getCurrentUser()` / `requireUser()` / `requireRole()`.
3. **Role checks are server-side only.** Never gate UI on a client-known role and treat that as security. Client-side conditionals on role are an enhancement, not a guard.
4. **The Credentials provider's `authorize` is the ONLY entry point** for password verification from a sign-in form. The form posts to a server action that calls `signIn('credentials', ...)` — it never calls `verifyCredentials()` directly to set its own cookie.
5. **Don't trust `email` casing.** `verifyCredentials` lowercases the input. User records store the lowercase email.
6. **Don't catch `redirect()` / `unauthorized()`.** They throw a Next.js framework signal; catching turns the redirect into a 500. Let them propagate.
7. **No password reset, magic link, or OAuth in v1.** Adding any of these requires updating this contract first, then adding the provider in `src/lib/auth.ts` only.
8. **DATABASE_URL is required** for `/signin` and any route gated by `requireUser` / `requireRole`. The customer booking flow's dev-DB fallback (`src/lib/env.ts`) does NOT cover auth. Agents building staff/admin must run a real Postgres.

---

## 3. Session shape

JWT strategy, 24-hour expiry. Token + Session both carry:

```ts
{
  id: string         // user.id (cuid)
  role: Role         // 'CUSTOMER' | 'STAFF' | 'MANAGER' | 'ADMIN'
  tenantId: string | null
}
```

Demotion latency = token lifetime (≤ 24 h). If you need instant revocation (e.g. firing an ADMIN), swap `session.strategy: 'jwt'` → `'database'` and uncomment the Prisma adapter. Both are single-line edits in `src/lib/auth.ts`.

---

## 4. Role hierarchy

```
CUSTOMER  ← guest bookings; not actually authenticated in v1
STAFF     ← lane attendants; can see the staff cockpit
MANAGER   ← floor managers; STAFF + refund authority
ADMIN     ← tenant operators; everything + settings
```

Use `requireRole('STAFF', 'MANAGER', 'ADMIN')` to gate any staff-or-above route. Don't write "MANAGER or ADMIN" as `requireRole('MANAGER', 'ADMIN')` if you really mean "MANAGER+" — the hierarchy is enumerated, not inferred.

---

## 5. Required usage patterns

### Route group layout (gating)

```tsx
// app/(staff)/layout.tsx
import { requireRole } from '@/lib/auth'

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  await requireRole('STAFF', 'MANAGER', 'ADMIN')
  return <>{children}</>
}
```

The layout MUST be a Server Component (no `'use client'`). The `await` blocks the page render until auth resolves; the redirect/unauthorized signal is thrown before any child renders.

### Server action (mutation gating)

```ts
'use server'
import { requireRole } from '@/lib/auth'

export async function refundBooking(input: RefundInput) {
  const user = await requireRole('MANAGER', 'ADMIN')
  // proceed; user.id is the actor for audit logs
}
```

### Reading the current user (no requirement)

```tsx
// app/(customer)/account/page.tsx — show "Sign in" if not logged in,
// or the user's name if they are.
import { getCurrentUser } from '@/lib/auth'

export default async function AccountPage() {
  const user = await getCurrentUser()
  return user ? <Greeting name={user.name} /> : <SignInPrompt />
}
```

### Sign-in (form server action)

```ts
'use server'
import { signIn } from '@/lib/auth'

export async function signInAction(formData: FormData) {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const from = String(formData.get('from') ?? '/')
  await signIn('credentials', { email, password, redirectTo: from })
}
```

### Sign-out (server action)

```ts
'use server'
import { signOut } from '@/lib/auth'

export async function signOutAction() {
  await signOut({ redirectTo: '/' })
}
```

---

## 6. Verification

After changes touching `src/lib/auth.ts`, route group layouts, sign-in/out pages, or the User schema:

```bash
npm run verify   # tsc + eslint + drift + tests
```

Manual checks for staff/admin work:

```bash
# With a seeded DB:
curl -i http://localhost:3000/staff           # → 307 redirect to /signin?from=%2Fstaff
curl -i http://localhost:3000/admin           # → 307 redirect to /signin?from=%2Fadmin
curl -i -b 'authjs.session-token=…' http://localhost:3000/staff   # → 200 if STAFF+, 401 if CUSTOMER
```

The `/signin` page itself must render without a session (no infinite redirect).

---

## 7. Future expansions (don't do these in Phase 6)

- **Customer accounts.** Adds a customer-facing `/account` surface, "remember me" cookie, optional Google OAuth. New providers go in `src/lib/auth.ts`; the role enum already has `CUSTOMER`.
- **Magic-link / Email provider.** Adds `VerificationToken` model to Prisma. Doesn't require switching off JWT.
- **OAuth (Google, Apple).** Adds `Account` model. Optionally enables database sessions for instant revocation.
- **Instant role revocation.** Either move to `session.strategy: 'database'` (requires Prisma adapter + Account/Session tables) OR maintain a "revoked-at" timestamp on User and check it in the `jwt` callback.
- **Password reset.** Email-based flow with single-use tokens. Schedule for Phase 8 alongside admin user management.
