// /admin — redirect to the unified settings hub.

import { redirect } from 'next/navigation'

export default function AdminIndexPage() {
  redirect('/staff/settings')
}
