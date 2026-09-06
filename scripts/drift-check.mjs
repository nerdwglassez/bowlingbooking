#!/usr/bin/env node
// ============================================================
// drift-check.mjs — Architectural drift sentinel
//
// Runs a set of regex checks across the design-system layers
// to enforce the rules captured in:
//   - .claude/CURSOR_RULES.md
//   - .claude/contracts/PRIMITIVES.md
//   - .claude/contracts/PATTERNS.md
//
// Usage:
//   node scripts/drift-check.mjs                # scan default layers
//   node scripts/drift-check.mjs --files <glob> # scan specific files
//
// Exit codes:
//   0  → all checks PASS
//   1  → one or more checks FAIL
//   2  → script error (e.g. invalid args, missing files)
// ============================================================

import { readdir, readFile } from 'node:fs/promises'
import { argv, exit } from 'node:process'

const DEFAULT_GLOBS = ['src/**/*.{ts,tsx}']

/** Untitled CLI trees — vendor SVG fills and demo hex. Do not rewrite. */
function isUntitledVendor(file) {
  return (
    file.includes('src/components/base/') ||
    file.includes('src/components/application/') ||
    file.includes('src/components/foundations/') ||
    file.includes('src/components/shared-assets/') ||
    file.endsWith('src/hooks/use-breakpoint.ts') ||
    file.endsWith('src/hooks/use-resize-observer.ts')
  )
}

const CHECKS = [
  {
    name: 'invisible Unicode (zero-width / RTL / etc.)',
    regex: /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g,
    appliesTo: () => true,
    skipCommentStripping: true,
    hint: 'Invisible Unicode characters in source are forbidden. Re-type the affected line.',
  },
  {
    name: 'raw hex colors',
    regex: /#[0-9a-fA-F]{3,8}\b/g,
    // Exceptions where the platform requires literal hex:
    // - src/lib/email.ts — email HTML clients strip CSS variables
    // - src/lib/themes.ts — admin theme picker swatchHex metadata
    // - src/lib/pwa-manifest.ts — Web App Manifest + iOS theme_color must be hex
    appliesTo: (file) =>
      !file.endsWith('src/lib/email.ts') &&
      !file.endsWith('src/lib/themes.ts') &&
      !file.endsWith('src/lib/pwa-manifest.ts') &&
      !isUntitledVendor(file),
    hint: 'Use semantic CSS variables (var(--color-*), var(--surface-*), var(--status-*)) instead. Untitled CLI files under base/application/foundations may contain vendor SVG fills.',
  },
  {
    name: 'tailwind color utilities',
    regex: /\b(bg|text|border|ring|fill|stroke)-(amber|stone|slate|zinc|red|green|blue|yellow|orange|emerald|sky|indigo|violet|fuchsia|pink|rose|gray|neutral)-[0-9]+\b/g,
    appliesTo: (file) => !isUntitledVendor(file),
    hint: 'Use Untitled semantic utilities (bg-brand-solid, text-secondary) or var(--token). Untitled CLI files under base/application/foundations are exempt.',
  },
  {
    name: 'dark: prefix unbound',
    // Allowed when @custom-variant dark is wired to [data-theme="dark"] in globals.css.
    // Still ban media-query style usage documentation claiming prefers-color-scheme.
    regex: /@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)/g,
    appliesTo: () => true,
    hint: 'Do not use prefers-color-scheme for theming. Use data-theme + Untitled dark: variant.',
  },
  {
    name: 'direct --palette-* token use',
    regex: /var\(--palette-/g,
    appliesTo: () => true,
    hint: 'Palette tokens are private to tokens.css. Use semantic tokens (color/surface/status/etc.).',
  },
  {
    name: "'use client' in a primitive",
    regex: /^['"]use client['"]/gm,
    // Untitled / React Aria ui/ may use client. Keep this check disabled for ui/.
    appliesTo: () => false,
    hint: 'Untitled ui/ may use client for React Aria.',
  },
  {
    name: 'inline lane-count math',
    regex: /Math\.ceil\(.*\/\s*6(?!\d)/g,
    appliesTo: (file) => !file.includes('/lib/lane-logic'),
    hint: 'Call getLaneCount() / getLaneAssignmentSummary() from @/lib/lane-logic instead.',
  },
  {
    name: 'inline price formatting',
    regex: /\/\s*100\)\.toFixed\(/g,
    appliesTo: (file) => !file.includes('/lib/pricing'),
    hint: 'Call formatPrice(amountCents) from @/lib/pricing instead.',
  },
  {
    name: 'useState in a pattern (must be controlled)',
    regex: /\buseState\b/g,
    appliesTo: (file) => file.includes('/components/patterns/'),
    hint: 'Patterns are controlled. Lift state to the page; expose value + onChange props.',
  },
  {
    name: 'sticky/fixed positioning in a pattern',
    regex: /position:\s*(?:sticky|fixed)|className=["'][^"']*\b(?:sticky|fixed)\b/g,
    appliesTo: (file) => file.includes('/components/patterns/'),
    hint: 'Pages own viewport positioning. Patterns render the card; the page wraps it.',
  },
  {
    name: 'direct next-auth import outside src/lib/auth.ts',
    regex: /from\s+['"]next-auth(?:\/[^'"]*)?['"]/g,
    appliesTo: (file) => !file.endsWith('src/lib/auth.ts'),
    hint: 'Import auth helpers from @/lib/auth only. Never import next-auth directly.',
  },
  {
    name: 'direct bcryptjs import outside src/lib/auth.ts',
    regex: /from\s+['"]bcryptjs['"]/g,
    appliesTo: (file) =>
      !file.endsWith('src/lib/auth.ts') && !file.endsWith('prisma/seed.ts'),
    hint: 'Password hashing belongs to @/lib/auth (hashPassword/verifyCredentials).',
  },
  {
    name: 'direct stripe SDK import outside src/lib/stripe.ts',
    regex: /from\s+['"]stripe['"]/g,
    appliesTo: (file) => !file.endsWith('src/lib/stripe.ts'),
    hint: 'Use @/lib/stripe wrappers (createPaymentIntent, createRefund, constructWebhookEvent).',
  },
  {
    name: 'direct resend import outside src/lib/email.ts',
    regex: /from\s+['"]resend['"]/g,
    appliesTo: (file) => !file.endsWith('src/lib/email.ts'),
    hint: 'Outbound email goes through @/lib/email (sendBookingConfirmation).',
  },
  {
    name: 'direct @stripe/stripe-js import outside src/lib/stripe-client.ts',
    regex: /from\s+['"]@stripe\/stripe-js['"]/g,
    appliesTo: (file) => !file.endsWith('src/lib/stripe-client.ts'),
    hint: 'Use getStripeClient() from @/lib/stripe-client. Stripe.js loading is centralized.',
  },
  {
    // The four SDK-config files are the only places that may `import * as
    // Sentry`. Everything else funnels through src/lib/observability.ts so we
    // can swap providers, tag context centrally, and drift-rule-enforce the
    // boundary. Drift check + chokepoint pattern matches stripe.ts / email.ts.
    name: 'direct @sentry/nextjs import outside src/lib/observability.ts',
    regex: /from\s+['"]@sentry\/nextjs['"]/g,
    appliesTo: (file) =>
      !file.endsWith('src/lib/observability.ts') &&
      !file.endsWith('sentry.server.config.ts') &&
      !file.endsWith('sentry.edge.config.ts') &&
      !file.endsWith('instrumentation-client.ts') &&
      !file.endsWith('instrumentation.ts'),
    hint: 'Use captureException / captureMessage / withObservability from @/lib/observability.',
  },
  // ── Security greps (see .claude/contracts/SECURITY.md) ──
  {
    name: 'dangerouslySetInnerHTML',
    regex: /dangerouslySetInnerHTML/g,
    appliesTo: () => true,
    hint: 'Avoid raw HTML injection. Use text nodes or escape via @/lib/email escapeHtml pattern.',
  },
  {
    name: 'eval()',
    regex: /\beval\s*\(/g,
    appliesTo: () => true,
    hint: 'Dynamic code execution is forbidden.',
  },
  {
    name: 'new Function()',
    regex: /new\s+Function\s*\(/g,
    appliesTo: () => true,
    hint: 'Dynamic code execution is forbidden.',
  },
  {
    name: 'direct prisma import in app page/layout',
    regex:
      /from\s+['"](?:@\/lib\/prisma|@prisma\/client|@\/generated\/prisma\/client)['"]/g,
    appliesTo: (file) =>
      file.includes('/app/') &&
      (file.endsWith('/page.tsx') || file.endsWith('/layout.tsx')),
    hint: 'Pages/layouts must use server actions or lib helpers — never import Prisma directly.',
  },
]

/** Temporary customer-booking shims. New files under ui/ must be re-exports, not new primitives. */
const UI_SHIM_ALLOWLIST = new Set([
  'src/components/ui/badge.tsx',
  'src/components/ui/button.tsx',
  'src/components/ui/card.tsx',
  'src/components/ui/checkbox.tsx',
  'src/components/ui/input.tsx',
  'src/components/ui/password-input.tsx',
  'src/components/ui/select.tsx',
  'src/components/ui/skeleton.tsx',
  'src/components/ui/toggle.tsx',
])

/** Convert a simple glob pattern to a RegExp. */
function globToRegExp(pattern) {
  let i = 0
  let out = '^'
  while (i < pattern.length) {
    const c = pattern[i]
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        i += 2
        if (pattern[i] === '/') i++
        out += '(?:.*/)?'
        continue
      }
      out += '[^/]*'
      i++
      continue
    }
    if (c === '?') {
      out += '[^/]'
      i++
      continue
    }
    if (c === '{') {
      const end = pattern.indexOf('}', i)
      const inner = pattern.slice(i + 1, end)
      out += `(?:${inner.split(',').map(escapeRegex).join('|')})`
      i = end + 1
      continue
    }
    out += escapeRegex(c)
    i++
  }
  return new RegExp(`${out}$`)
}

function escapeRegex(s) {
  return s.replace(/[.+^${}()|[\]\\]/g, '\\$&')
}

async function expandGlobs(patterns) {
  const files = new Set()
  for (const pattern of patterns) {
    if (!/[*?{]/.test(pattern)) {
      files.add(pattern.replaceAll('\\', '/'))
      continue
    }
    const firstMeta = pattern.search(/[*?{]/)
    const slashBefore = pattern.lastIndexOf('/', firstMeta)
    const root = slashBefore <= 0 ? '.' : pattern.slice(0, slashBefore)
    const relPattern =
      slashBefore <= 0 ? pattern : pattern.slice(slashBefore + 1)
    const regex = globToRegExp(relPattern)
    let entries
    try {
      entries = await readdir(root, { recursive: true })
    } catch {
      continue
    }
    for (const rel of entries) {
      const normalized = rel.replaceAll('\\', '/')
      if (regex.test(normalized)) {
        files.add(root === '.' ? normalized : `${root}/${normalized}`)
      }
    }
  }
  return [...files].sort()
}

/**
 * Strip JS/TS comments by replacing comment ranges with spaces. Preserves
 * line numbers and column positions so violation reports point at the right
 * place in the original file. Imperfect — won't perfectly handle `//` or `/*`
 * inside string literals — but good enough for code-style drift checks:
 *   - All banned identifiers (useState, Math.ceil, etc.) are normal code
 *     tokens; if one appears in a string, we'd false-negative, which is
 *     acceptable. The original goal is false-POSITIVE elimination on
 *     contract comments like "// no useState is used".
 *   - Drift agents writing banned identifiers inside string literals would
 *     be a contortion; we accept that edge case.
 *
 * Returns a string of identical length to `src`.
 */
function stripComments(src) {
  let out = ''
  let i = 0
  const n = src.length
  while (i < n) {
    const c = src[i]
    const next = src[i + 1]

    if (c === '/' && next === '/') {
      while (i < n && src[i] !== '\n') {
        out += src[i] === '\n' ? '\n' : ' '
        i++
      }
      continue
    }

    if (c === '/' && next === '*') {
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
        out += src[i] === '\n' ? '\n' : ' '
        i++
      }
      if (i < n) {
        out += '  '
        i += 2
      }
      continue
    }

    if (c === '"' || c === "'" || c === '`') {
      const quote = c
      out += c
      i++
      while (i < n) {
        const ch = src[i]
        if (ch === '\\' && i + 1 < n) {
          out += src[i] + src[i + 1]
          i += 2
          continue
        }
        out += ch
        i++
        if (ch === quote) break
      }
      continue
    }

    out += c
    i++
  }
  return out
}

async function main() {
  const args = argv.slice(2)
  let patterns = DEFAULT_GLOBS

  const filesIdx = args.indexOf('--files')
  if (filesIdx !== -1) {
    patterns = args.slice(filesIdx + 1)
    if (patterns.length === 0) {
      console.error('--files requires at least one glob')
      exit(2)
    }
  }

  const files = await expandGlobs(patterns)
  if (files.length === 0) {
    console.error(`No files matched: ${patterns.join(', ')}`)
    exit(2)
  }

  let failures = 0
  const failedChecks = new Map()

  for (const file of files) {
    const original = await readFile(file, 'utf8')
    const stripped = stripComments(original)

    for (const check of CHECKS) {
      if (!check.appliesTo(file)) continue
      const target = check.skipCommentStripping ? original : stripped
      check.regex.lastIndex = 0
      const matches = [...target.matchAll(check.regex)]
      if (matches.length === 0) continue

      failures++
      if (!failedChecks.has(check.name)) {
        failedChecks.set(check.name, { hint: check.hint, hits: [] })
      }
      for (const m of matches) {
        const lineNumber = target.slice(0, m.index).split('\n').length
        const match =
          check.skipCommentStripping &&
          /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/.test(m[0])
            ? `U+${m[0].codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`
            : m[0]
        failedChecks.get(check.name).hits.push({
          file,
          line: lineNumber,
          match,
        })
      }
    }
  }

  console.log(`scanned ${files.length} file(s) across ${patterns.length} pattern(s)`)

  // Route-group auth guards. Each (staff)/(admin) layout MUST call
  // requireRole() so a forgotten check on a new page can't accidentally
  // expose the entire route group. We don't enforce on individual
  // page.tsx files; the layout is the chokepoint by design.
  const layoutGuards = [
    {
      file: 'src/app/(staff)/layout.tsx',
      pattern: /requireRole\s*\(/,
    },
    {
      file: 'src/app/(admin)/layout.tsx',
      pattern: /requireRole\s*\(/,
    },
  ]
  for (const guard of layoutGuards) {
    try {
      const src = await readFile(guard.file, 'utf8')
      if (!guard.pattern.test(src)) {
        failures++
        if (!failedChecks.has('missing requireRole() in route-group layout')) {
          failedChecks.set('missing requireRole() in route-group layout', {
            hint: 'Every (staff) / (admin) layout.tsx MUST call requireRole(...). Pages inherit gating from the layout — no exceptions.',
            hits: [],
          })
        }
        failedChecks
          .get('missing requireRole() in route-group layout')
          .hits.push({ file: guard.file, line: 1, match: '(no match)' })
      }
    } catch {
      // layout file missing entirely is also a failure
      failures++
      if (!failedChecks.has('missing requireRole() in route-group layout')) {
        failedChecks.set('missing requireRole() in route-group layout', {
          hint: 'Every (staff) / (admin) layout.tsx MUST call requireRole(...). Pages inherit gating from the layout — no exceptions.',
          hits: [],
        })
      }
      failedChecks
        .get('missing requireRole() in route-group layout')
        .hits.push({
          file: guard.file,
          line: 1,
          match: '(layout file missing)',
        })
    }
  }

  // Non-async exports in 'use server' files. Next.js rejects these at module-
  // eval time with "A 'use server' file can only export async functions, found
  // object." — TypeScript doesn't catch it. We do.
  //
  // Allowed in a 'use server' file:
  //   export async function …
  //   export default async function …
  //   export interface / type / enum   (type-only, erased at runtime)
  //
  // Rejected:
  //   export const | let | var | function | class | default {…}
  //
  // If you need a constant or non-async helper, move it to a sibling non-
  // 'use server' module and import it (see src/lib/audit-actions.ts for the
  // canonical pattern).
const USE_SERVER_DIRECTIVE = /^\s*(['"])use server\1/
const BAD_VALUE_EXPORT = /^export\s+(?!async\s+)(?:const|let|var|function|class)\b/gm
const USE_CLIENT_DIRECTIVE = /^\s*(['"])use client\1/m
const SECRET_ENV_ACCESS =
  /process\.env(?:\.(?:AUTH_SECRET|NEXTAUTH_SECRET|DATABASE_URL|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|RESEND_API_KEY)\b|\[\s*['"](?:AUTH_SECRET|NEXTAUTH_SECRET|DATABASE_URL|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|RESEND_API_KEY)['"]\s*\])/g
  for (const file of files) {
    const original = await readFile(file, 'utf8')
    if (!USE_SERVER_DIRECTIVE.test(original)) continue
    const stripped = stripComments(original)
    BAD_VALUE_EXPORT.lastIndex = 0
    const matches = [...stripped.matchAll(BAD_VALUE_EXPORT)]
    if (matches.length === 0) continue
    for (const m of matches) {
      failures++
      const lineNumber = stripped.slice(0, m.index).split('\n').length
      const key = "non-async export in 'use server' file"
      if (!failedChecks.has(key)) {
        failedChecks.set(key, {
          hint: "Next.js requires 'use server' files to only export async functions. Move constants/types/classes to a sibling non-'use server' module.",
          hits: [],
        })
      }
      failedChecks.get(key).hits.push({
        file,
        line: lineNumber,
        match: m[0].trim(),
      })
    }
  }

  // Secret server env vars must not appear in client bundles.
  for (const file of files) {
    const original = await readFile(file, 'utf8')
    if (!USE_CLIENT_DIRECTIVE.test(original)) continue
    const stripped = stripComments(original)
    SECRET_ENV_ACCESS.lastIndex = 0
    const matches = [...stripped.matchAll(SECRET_ENV_ACCESS)]
    if (matches.length === 0) continue
    for (const m of matches) {
      failures++
      const lineNumber = stripped.slice(0, m.index).split('\n').length
      const key = 'secret process.env in client component'
      if (!failedChecks.has(key)) {
        failedChecks.set(key, {
          hint: 'Only NEXT_PUBLIC_* and NODE_ENV may be read in use client files. Use server actions or pass props from a Server Component.',
          hits: [],
        })
      }
      failedChecks.get(key).hits.push({
        file,
        line: lineNumber,
        match: m[0].trim(),
      })
    }
  }

  for (const file of files) {
    const normalized = file.replaceAll('\\', '/')
    if (!normalized.includes('src/components/ui/')) continue
    if (UI_SHIM_ALLOWLIST.has(normalized)) continue
    failures++
    const key = 'new file under src/components/ui/'
    if (!failedChecks.has(key)) {
      failedChecks.set(key, {
        hint: 'Layer 2 lives in base/application/foundations. ui/ is a temporary shim allowlist — add Untitled via CLI, not a new ui/ primitive.',
        hits: [],
      })
    }
    failedChecks.get(key).hits.push({
      file,
      line: 1,
      match: '(not in UI_SHIM_ALLOWLIST)',
    })
  }

  if (failures === 0) {
    console.log('PASS: drift sentinel — all checks clean')
    for (const check of CHECKS) {
      console.log(`  - ${check.name}: 0 violations`)
    }
    console.log('  - route-group layout guards: ok')
    console.log("  - non-async exports in 'use server' files: ok")
    console.log('  - client secret env access: ok')
    console.log('  - ui/ shim allowlist: ok')
    exit(0)
  }

  console.log(`FAIL: drift sentinel — ${failures} violation(s)\n`)
  for (const [name, info] of failedChecks) {
    console.log(`× ${name}`)
    console.log(`  fix: ${info.hint}`)
    for (const hit of info.hits) {
      console.log(`  - ${hit.file}:${hit.line}  →  ${hit.match}`)
    }
    console.log('')
  }
  exit(1)
}

main().catch((err) => {
  console.error('drift-check script error:', err)
  exit(2)
})
