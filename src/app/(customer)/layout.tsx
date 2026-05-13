/*
 * Customer route group layout.
 *
 * Theme: light by default, toggleable by the user.
 * Root layout's THEME_SCRIPT already handles initial paint from localStorage
 * (or system preference). No additional theme logic needed here.
 *
 * This layout intentionally renders no chrome — pages inside (customer)/
 * provide their own headers, footers, and booking shell patterns.
 */
export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
