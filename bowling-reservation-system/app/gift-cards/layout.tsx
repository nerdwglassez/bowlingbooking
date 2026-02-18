import UserNav from '@/components/layout/UserNav'

export default function GiftCardsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <UserNav />
      {children}
    </>
  )
}
