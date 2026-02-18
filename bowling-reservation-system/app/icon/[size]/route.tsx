import { ImageResponse } from 'next/og'

export const runtime = 'edge'

const SIZES = [192, 512] as const

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size?: string }> }
) {
  const { size: sizeParam } = await params
  const size = sizeParam ?? ''
  const pixel = parseInt(size, 10)
  if (!Number.isFinite(pixel) || !SIZES.includes(pixel as 192 | 512)) {
    return new Response('Not found', { status: 404 })
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
          borderRadius: pixel >= 512 ? 64 : 24,
        }}
      >
        <span
          style={{
            fontSize: pixel * 0.4,
            color: 'white',
            fontWeight: 700,
          }}
        >
          🎳
        </span>
      </div>
    ),
    {
      width: pixel,
      height: pixel,
    }
  )
}
