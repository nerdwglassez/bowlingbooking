const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['pg', '@prisma/adapter-pg'],
  // Use this package as root when repo has multiple lockfiles (e.g. parent folder)
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    const base = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'X-DNS-Prefetch-Control', value: 'off' },
    ]
    const production = process.env.NODE_ENV === 'production'
    const security = production
      ? [
          ...base,
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ]
      : base
    return [
      {
        source: '/(.*)',
        headers: security,
      },
    ]
  },
}

module.exports = nextConfig



