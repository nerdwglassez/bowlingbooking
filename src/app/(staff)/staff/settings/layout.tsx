// Settings section layout — content wrapper. Navigation for settings lives in
// the NavRail (desktop sidebar) and the hub drill-down list (mobile). Unsaved-
// changes guard + form context are provided by AppShell so the NavRail links
// participate in the guard.

export const dynamic = 'force-dynamic'

export default function StaffSettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="min-w-0 md:max-w-[640px]">{children}</div>
}
