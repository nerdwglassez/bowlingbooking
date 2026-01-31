import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth('ADMIN')

    const block = await prisma.laneBlock.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Lane block deleted', block })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Lane block not found' },
        { status: 404 }
      )
    }
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Delete lane block error:', error)
    return NextResponse.json(
      { error: 'Failed to delete lane block' },
      { status: 500 }
    )
  }
}


