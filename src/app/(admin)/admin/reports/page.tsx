// /admin/reports — redirect to unified reports tab.

import { redirect } from 'next/navigation'

type PageProps = {
  searchParams: Promise<{ range?: string }>
}

export default async function AdminReportsRedirectPage({
  searchParams,
}: PageProps) {
  const { range } = await searchParams
  if (range) {
    redirect(`/staff/reports?range=${encodeURIComponent(range)}`)
  }
  redirect('/staff/reports')
}
