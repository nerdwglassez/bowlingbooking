import type { Config } from 'tailwindcss'

/** Shared design tokens for booking and staff UI (see lib/design-tokens.ts). */
const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        // Booking / staff shared tokens
        primary: { DEFAULT: '#6366F1', light: '#818CF8' },
        booking: {
          page: '#F9FAFB',
          card: '#FFFFFF',
          border: '#E2E8F0',
          text: '#0F172A',
          textMuted: '#717182',
          textSlate: '#64748B',
        },
      },
      boxShadow: {
        card: '0px 1px 2px 0px rgba(0, 0, 0, 0.06), 0px 1px 3px 0px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}
export default config



