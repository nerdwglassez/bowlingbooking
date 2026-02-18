import { Html, Head, Main, NextScript } from 'next/document'

/**
 * Minimal Pages Router _document so Next.js build can resolve it.
 * This app uses App Router (app/); pages/ exists only to satisfy the build.
 */
export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
