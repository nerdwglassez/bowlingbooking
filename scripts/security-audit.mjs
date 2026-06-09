#!/usr/bin/env node
// ============================================================
// security-audit.mjs — Dependency vulnerability gate
//
// Wraps `npm audit` with a fixed policy for CI and local verify.
// Exit 0 when no high/critical advisories; exit 1 otherwise.
// ============================================================

import { spawnSync } from 'node:child_process'
import { exit } from 'node:process'

const AUDIT_LEVEL = 'high'

const result = spawnSync(
  'npm',
  ['audit', '--audit-level', AUDIT_LEVEL],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
)

if (result.stdout) process.stdout.write(result.stdout)
if (result.stderr) process.stderr.write(result.stderr)

if (result.error) {
  console.error('security-audit: failed to run npm audit:', result.error.message)
  exit(2)
}

if (result.status === 0) {
  console.log(`PASS: npm audit — no ${AUDIT_LEVEL}+ vulnerabilities`)
  exit(0)
}

console.error(
  `FAIL: npm audit — ${AUDIT_LEVEL} or critical vulnerabilities found. Run \`npm audit\` for details.`,
)
exit(1)
