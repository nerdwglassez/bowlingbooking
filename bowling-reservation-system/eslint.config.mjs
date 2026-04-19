import nextConfig from 'eslint-config-next'

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'public/**',
      '.vscode/**',
      'next-env.d.ts',
      'generated/**',
    ],
  },
  ...nextConfig,
]

export default config
