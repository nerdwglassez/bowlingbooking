import UserNav from '@/components/layout/UserNav'

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <UserNav />
      {children}
    </div>
  )
}
