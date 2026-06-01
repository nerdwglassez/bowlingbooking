// /admin/promos — deprecated; unified packages live under settings.

import { redirect } from 'next/navigation'

export default function AdminPromosRedirectPage() {
  redirect('/staff/settings/packages')
}
