import { describe, expect, it } from 'vitest'

import {
  DEFAULT_THEME_SLUG,
  getThemePreset,
  isValidThemeSlug,
  THEME_PRESETS,
} from './themes'

describe('themes', () => {
  it('THEME_PRESETS includes default, midnight, and sunset', () => {
    const slugs = THEME_PRESETS.map((p) => p.slug)
    expect(new Set(slugs)).toEqual(new Set(['default', 'midnight', 'sunset']))
  })

  it('isValidThemeSlug accepts known slugs and rejects unknown', () => {
    expect(isValidThemeSlug('default')).toBe(true)
    expect(isValidThemeSlug('midnight')).toBe(true)
    expect(isValidThemeSlug('sunset')).toBe(true)
    expect(isValidThemeSlug('unknown')).toBe(false)
    expect(isValidThemeSlug('')).toBe(false)
  })

  it('getThemePreset returns the matching preset for known slugs', () => {
    expect(getThemePreset('midnight').slug).toBe('midnight')
    expect(getThemePreset('sunset').name).toBe('Sunset')
  })

  it('getThemePreset falls back to default for unknown slugs', () => {
    const p = getThemePreset('future-preset')
    expect(p.slug).toBe(DEFAULT_THEME_SLUG)
    expect(p.name).toBe('Royal default')
  })
})
