/**
 * Staff (employee) experience typography.
 * Use these classes so headings and text stay consistent across all staff views.
 */

export const staffTypography = {
  /** Page title — main h1 on each page */
  pageTitle: 'text-4xl font-semibold tracking-tight',
  pageTitleWithMargin: 'text-4xl font-semibold tracking-tight mb-6',

  /** Section title — h2 for "Search", "Details", "Select Customer", etc. */
  sectionTitle: 'text-xl font-semibold text-slate-900 mb-4',
  sectionTitleNoMargin: 'text-xl font-semibold text-slate-900',

  /** Subsection / card title — h3 */
  subsectionTitle: 'text-lg font-semibold text-slate-900',

  /** Modal or panel title (e.g. check-in dialog) */
  modalTitle: 'text-2xl font-semibold tracking-tight text-slate-900',

  /** Table header cells */
  tableHeader: 'text-xs font-medium uppercase tracking-wide text-slate-500',

  /** Form labels */
  label: 'text-sm font-medium text-slate-700',

  /** Muted / helper text */
  bodyMuted: 'text-sm text-slate-500',

  /** Secondary body text */
  bodySecondary: 'text-sm text-slate-600',

  /** Stat or big number (dashboard cards, report metrics) */
  statValue: 'text-3xl font-bold text-slate-900',
} as const
