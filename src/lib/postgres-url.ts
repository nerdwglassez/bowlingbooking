const LEGACY_SSL_MODES = /([?&])sslmode=(require|prefer|verify-ca)(?=&|$)/i

/**
 * pg v8 / pg-connection-string v2 treat `require`, `prefer`, and `verify-ca` as
 * aliases for `verify-full`. v3 will adopt standard libpq semantics instead.
 * Normalize so deployments keep strict certificate verification and avoid the
 * deprecation warning on startup.
 */
export function normalizePostgresSslMode(connectionString: string): string {
  return connectionString.replace(LEGACY_SSL_MODES, '$1sslmode=verify-full')
}
