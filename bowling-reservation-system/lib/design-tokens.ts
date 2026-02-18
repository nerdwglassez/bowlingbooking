/**
 * Design tokens extracted from Figma MCP (frame 19-381 and related).
 * Use for layout, spacing, colors, and shadows to keep UI consistent.
 */

export const COLORS = {
  // Text
  textPrimary: '#0F172A',
  textSecondary: '#717182',
  textMuted: '#94A3B8',
  textSlate: '#64748B',
  textOnPrimary: '#FFFFFF',
  textDayUnselected: '#0A0A0A',

  // Backgrounds
  bgPage: '#F9FAFB',
  bgCard: '#FFFFFF',
  bgInput: '#F8FAFC',
  bgSelectedCell: '#E9EBEF',
  bgSelectedCellAlt: '#FFFFFF',

  // Borders
  borderDefault: '#E2E8F0',
  borderInput: '#CBD5E1',

  // Status
  lanesAvailable: '#10B981',
  lanesLimited: '#F59E0B',
  error: '#EF4444',
  errorBorder: '#FECACA',
} as const

export const GRADIENTS = {
  /** Primary CTA, progress dot, selected day button. 166deg or 135deg. */
  primary: 'linear-gradient(166deg, rgba(99, 102, 241, 1) 0%, rgba(59, 130, 246, 1) 100%)',
  primary135: 'linear-gradient(135deg, rgba(99, 102, 241, 1) 0%, rgba(59, 130, 246, 1) 100%)',
  /** Icon background (subtle). */
  iconBg: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
} as const

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  /** Step 1 container gap. */
  stepGap: 32,
  /** Date/time cards row gap. */
  dateTimeRowGap: 44,
  /** Card internal gap. */
  cardGap: 32,
  /** Card padding. */
  cardPadding: 33,
  /** Progress dots gap. */
  progressGap: 10,
} as const

export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 10,
  card: 16,
  pill: 9999,
} as const

export const SHADOWS = {
  card: '0px 1px 2px 0px rgba(0, 0, 0, 0.06), 0px 1px 3px 0px rgba(0, 0, 0, 0.1)',
  button: '0px 0px 20px 0px rgba(99, 102, 241, 0.3)',
} as const

export const TYPOGRAPHY = {
  heading1: { fontSize: 40, fontWeight: 700, lineHeight: 1.5 },
  heading2: { fontSize: 20, fontWeight: 600, lineHeight: 1.5 },
  body: { fontSize: 16, fontWeight: 400, lineHeight: 1.5 },
  bodySmall: { fontSize: 14, fontWeight: 400, lineHeight: 1.5 },
  label: { fontSize: 14, fontWeight: 600, lineHeight: 1.5 },
  caption: { fontSize: 12.8, fontWeight: 400, lineHeight: 1.5 },
} as const

/** Backend expects date as yyyy-MM-dd; time as HH:mm (24h). */
export const DATE_FORMAT = 'yyyy-MM-dd'
export const TIME_FORMAT = 'HH:mm'
