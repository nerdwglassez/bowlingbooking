import { redirect } from 'next/navigation'

/** Package catalog UX lives under Staff → Settings → Packages; admin create/edit remain under `/admin/packages/*`. */
export default function AdminPackagesIndexPage() {
  redirect('/staff/settings/packages')
}
