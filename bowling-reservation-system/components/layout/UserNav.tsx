import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logout } from '@/app/actions/auth'
import Button from '@/components/ui/Button'

export default async function UserNav() {
  const session = await getSession()
  
  if (!session) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      email: true,
      role: true,
    },
  })

  if (!user) {
    return null
  }

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Logged in as: <span className="font-medium text-gray-900">{user.email}</span>
            </span>
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded capitalize">
              {user.role.toLowerCase()}
            </span>
          </div>
          <form action={logout}>
            <Button type="submit" variant="secondary" className="text-sm">
              Logout
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}


