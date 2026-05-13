import type { Config } from 'tailwindcss'

/*
 * Tailwind v4 — minimal JS config.
 *
 * In Tailwind v4, configuration is CSS-first via `@theme` directives in
 * src/app/globals.css. This file exists only to constrain content scanning.
 *
 * Color-utility guardrail is enforced by:
 *   1. ESLint rule (eslint.config.mjs) — bans bg-/text-/border-/ring-{color}-N classes
 *      and the `dark:` prefix at lint time.
 *   2. Drift sentinel (see .cursor/AGENTS.md § 6) — greps for the same patterns
 *      and fails the build between agent runs.
 *
 * The Tailwind v3 `corePlugins: { backgroundColor: false }` API has been removed
 * in v4 — the guardrail above replaces it.
 */
const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
}

export default config
