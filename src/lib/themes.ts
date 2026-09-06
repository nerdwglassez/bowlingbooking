/**
 * Theme preset registry for per-tenant branding (`Tenant.themeSlug`).
 * CSS overrides live in `src/styles/themes/<slug>.css` under `[data-theme-preset="<slug>"]`.
 *
 * Default = stock Untitled purple (same direction as the employee app).
 * Presets remap `--color-brand-*` and legacy `--color-action*` together so
 * both Untitled utilities and older patterns rebrand. Staff chrome keeps
 * stock purple via `[data-app="staff"]` regardless of preset.
 */

export interface ThemePreset {
  slug: string
  name: string
  /** Hex sample for the admin dropdown swatch. NOT used by app runtime CSS. */
  swatchHex: string
  /** Optional 1-line description for the admin UI. */
  description?: string
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    slug: 'default',
    name: 'Untitled default',
    swatchHex: '#7F56D9',
    description: 'Stock Untitled purple — shared with the employee experience.',
  },
  {
    slug: 'amber',
    name: 'Amber',
    swatchHex: '#F59E0B',
    description: 'Warm amber accent (optional tenant brand).',
  },
  {
    slug: 'midnight',
    name: 'Midnight',
    swatchHex: '#0891B2',
    description: 'Deep cyan accent (Tailwind cyan scale).',
  },
  {
    slug: 'sunset',
    name: 'Sunset',
    swatchHex: '#EA580C',
    description: 'Warm coral-orange accent (Tailwind orange scale).',
  },
]

export const DEFAULT_THEME_SLUG = 'default'

const SLUG_SET = new Set(THEME_PRESETS.map((p) => p.slug))

export function isValidThemeSlug(slug: string): boolean {
  return SLUG_SET.has(slug)
}

export function getThemePreset(slug: string): ThemePreset {
  const found = THEME_PRESETS.find((p) => p.slug === slug)
  if (found) return found
  return THEME_PRESETS.find((p) => p.slug === DEFAULT_THEME_SLUG)!
}
