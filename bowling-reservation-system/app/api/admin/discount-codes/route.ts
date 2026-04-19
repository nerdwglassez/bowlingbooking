import { GET as staffGet, POST as staffPost } from '@/app/api/staff/discount-codes/route'
import { NextRequest } from 'next/server'

export async function GET() {
  return staffGet()
}

export async function POST(request: NextRequest) {
  return staffPost(request)
}
