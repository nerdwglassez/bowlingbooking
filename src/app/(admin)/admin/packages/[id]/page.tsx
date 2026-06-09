import { redirect } from 'next/navigation'

type PageProps = { params: Promise<{ id: string }> }

/** Legacy admin route — package editing lives in staff settings. */
export default async function LegacyEditPackagePage({ params }: PageProps) {
  const { id } = await params
  redirect(`/staff/settings/packages/${id}`)
}
