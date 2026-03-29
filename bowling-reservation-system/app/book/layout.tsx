import { Suspense } from 'react'
import AppExperienceHeader from '@/components/layout/AppExperienceHeader'
import { getHeaderUser } from '@/lib/header-user'

function BookLoadingFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8">
      <p className="text-gray-600">Loading...</p>
    </div>
  )
}

export default async function BookLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const initialUser = await getHeaderUser()

  return (
    <>
      <AppExperienceHeader variant="booking" initialUser={initialUser} />
      <Suspense fallback={<BookLoadingFallback />}>{children}</Suspense>
    </>
  )
}
