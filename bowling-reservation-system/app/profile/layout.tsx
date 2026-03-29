import { redirect } from 'next/navigation'
import AppExperienceHeader from '@/components/layout/AppExperienceHeader'
import { getHeaderUser } from '@/lib/header-user'

function isEmployeeRole(role: string) {
  return role === 'STAFF' || role === 'MANAGER' || role === 'ADMIN'
}

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const initialUser = await getHeaderUser()
  if (initialUser && isEmployeeRole(initialUser.role)) {
    redirect('/staff/settings/account-information')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppExperienceHeader variant="booking" initialUser={initialUser} />
      {children}
    </div>
  )
}
