import AppExperienceHeader from '@/components/layout/AppExperienceHeader'
import { getHeaderUser } from '@/lib/header-user'

export default async function BookingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const initialUser = await getHeaderUser()

  return (
    <div className="min-h-screen bg-gray-50">
      <AppExperienceHeader variant="booking" initialUser={initialUser} />
      {children}
    </div>
  )
}
