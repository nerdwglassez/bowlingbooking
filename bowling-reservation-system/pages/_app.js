/**
 * Minimal Pages Router _app so Next.js build can resolve it.
 * This app uses App Router (app/); pages/ exists only to satisfy the build.
 */
export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />
}
