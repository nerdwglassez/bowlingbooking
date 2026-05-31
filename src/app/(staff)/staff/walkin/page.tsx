// /staff/walkin — deep link opens the cockpit walk-in sheet.

import { redirect } from 'next/navigation'

export default function StaffWalkInPage() {
  redirect('/staff?walkin=1')
}
