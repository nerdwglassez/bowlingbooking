import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

/*
 * Royal Z Lanes design-system guardrails.
 *
 * Lint-time enforcement of the rules in .claude/DESIGN_SYSTEM.md and
 * .claude/CURSOR_RULES.md. The drift sentinel (.cursor/AGENTS.md § 6) is
 * the authoritative check; these ESLint rules catch the common cases
 * earlier, at typing time, with helpful messages.
 *
 * Caveats:
 * - Only matches string-literal classNames. Template literals and clsx()
 *   calls slip through here and are caught by the drift sentinel.
 * - Color-token banlist intentionally covers Tailwind's default palettes.
 */

// Tailwind color-utility regex: bg-amber-500, text-stone-600, border-red-300, etc.
const TAILWIND_COLOR_UTILITY =
  '\\b(bg|text|border|ring|outline|placeholder|caret|accent|fill|stroke)-(amber|stone|red|green|blue|purple|zinc|slate|gray|neutral|orange|yellow|lime|emerald|teal|cyan|sky|indigo|violet|fuchsia|pink|rose)-[0-9]+\\b'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    name: 'royalz/design-system-guardrails',
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: `JSXAttribute[name.name='className'] Literal[value=/${TAILWIND_COLOR_UTILITY}/]`,
          message:
            'Tailwind color utilities are banned. Use design tokens via component primitives (src/components/ui/). See .claude/DESIGN_SYSTEM.md.',
        },
        {
          selector: "JSXAttribute[name.name='className'] Literal[value=/@media\\s*\\(\\s*prefers-color-scheme/]",
          message:
            'prefers-color-scheme theming is banned. Use data-theme; Untitled dark: is remapped to [data-theme=dark] in globals.css.',
        },
        {
          selector: "Literal[value=/#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?\\b/][value!=/^#$/]",
          message:
            'Raw hex color values are banned outside src/styles/tokens.css. Use a CSS variable (var(--color-...) / var(--surface-...)).',
        },
      ],
    },
  },
  {
    // Email HTML can't reference CSS variables — most clients (Gmail,
    // Outlook, Apple Mail) strip them or render unsupported color values.
    // src/lib/email.ts renders inline styles directly into the email body
    // and is the ONE place raw hex is allowed in TS code.
    name: 'royalz/email-renderer-exception',
    files: ['src/lib/email.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    // Theme preset registry: swatchHex is admin-only metadata for the venue
    // picker (runtime CSS lives in src/styles/themes/*.css).
    name: 'royalz/theme-swatch-metadata-exception',
    files: ['src/lib/themes.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'docs/wireframes/**',
    '**/*.css',
    // Untitled UI CLI output — do not rewrite vendor components to satisfy app lint.
    'src/components/base/**',
    'src/components/application/**',
    'src/components/foundations/**',
    'src/components/shared-assets/**',
    'src/hooks/use-breakpoint.ts',
    'src/hooks/use-resize-observer.ts',
  ]),
])

export default eslintConfig
