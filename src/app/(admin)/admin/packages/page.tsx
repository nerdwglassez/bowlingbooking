// /admin/packages — redirects to canonical settings route.

import { redirect } from 'next/navigation'

export default function AdminPackagesRedirectPage() {
  redirect('/staff/settings/packages')
}
