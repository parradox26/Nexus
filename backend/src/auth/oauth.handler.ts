// OAuth utilities consumed by individual connectors.
// Each connector handles its own token exchange and storage directly.
// This module provides shared helpers for building OAuth URLs.

export function buildQueryString(params: Record<string, string>): string {
  return new URLSearchParams(params).toString()
}

export function parseOAuthCallback(query: Record<string, unknown>): {
  code: string
  state?: string
  error?: string
} {
  if (typeof query['error'] === 'string') {
    return { code: '', error: query['error'] }
  }
  if (typeof query['code'] !== 'string') {
    throw new Error('Missing OAuth code in callback')
  }
  return {
    code: query['code'],
    state: typeof query['state'] === 'string' ? query['state'] : undefined,
  }
}
