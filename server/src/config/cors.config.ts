export const DEFAULT_CLIENT_URL = 'http://localhost:5173';

/**
 * Parses the comma-separated CLIENT_URL allow-list for CORS.
 * Fails closed in production: an empty value throws instead of falling back.
 */
export function parseAllowedOrigins(
  value: string | undefined,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): string[] {
  const origins = (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  if (origins.length === 0) {
    if (nodeEnv === 'production') {
      throw new Error(
        'CLIENT_URL must list at least one allowed origin in production',
      );
    }
    return [DEFAULT_CLIENT_URL];
  }
  return origins;
}
