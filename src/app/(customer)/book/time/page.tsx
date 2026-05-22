import { redirect } from 'next/navigation'

/** Scheduling (date + time) lives on `/book` per wireframes; keep URL for bookmarks. */
export default function BookTimeRedirectPage() {
  redirect('/book')
}
