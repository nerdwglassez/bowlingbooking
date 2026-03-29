import AppExperienceHeader from '@/components/layout/AppExperienceHeader'
import { getHeaderUser } from '@/lib/header-user'

export default async function GiftCardsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const initialUser = await getHeaderUser()

  return (
    <>
      <AppExperienceHeader variant="booking" initialUser={initialUser} />
      {children}
    </>
  )
}
