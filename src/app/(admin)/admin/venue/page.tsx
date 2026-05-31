// /admin/venue — legacy route; venue settings now live under /staff/settings/*.

import { redirect } from 'next/navigation'

export default function AdminVenuePage() {
  redirect('/staff/settings/venue')
}
