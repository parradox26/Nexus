import { ApiResponse, ConnectorSource, ConnectorStatus, SyncLog, SyncResult, UnifiedContact, UnifiedLead } from '../types'

const BASE_URL = (import.meta as { env: { VITE_API_BASE_URL?: string } }).env.VITE_API_BASE_URL ?? 'http://localhost:3000'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  const json = (await response.json()) as ApiResponse<T>

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? `Request failed: ${response.status}`)
  }

  return json.data as T
}

export const api = {
  connectors: {
    list: (): Promise<{ connectors: ConnectorStatus[] }> =>
      request('/api/connectors'),

    connect: (source: ConnectorSource): Promise<{ authUrl?: string; connected?: boolean }> =>
      request(`/api/connectors/${source}/connect`, { method: 'POST' }),

    disconnect: (source: ConnectorSource): Promise<{ connected: boolean }> =>
      request(`/api/connectors/${source}/disconnect`, { method: 'DELETE' }),
  },

  contacts: {
    list: (source: ConnectorSource, limit = 20, skip = 0): Promise<{ contacts: UnifiedContact[]; total: number }> =>
      request(`/api/contacts?source=${source}&limit=${limit}&skip=${skip}`),
  },

  leads: {
    list: (source: ConnectorSource, limit = 20, skip = 0): Promise<{ leads: UnifiedLead[]; total: number }> =>
      request(`/api/leads?source=${source}&limit=${limit}&skip=${skip}`),
  },

  sync: {
    run: (source: ConnectorSource, dryRun = false): Promise<SyncResult> =>
      request(`/api/sync/${source}`, {
        method: 'POST',
        body: JSON.stringify({ dryRun }),
      }),

    runLeads: (source: ConnectorSource, dryRun = false): Promise<SyncResult> =>
      request(`/api/sync/${source}/leads`, {
        method: 'POST',
        body: JSON.stringify({ dryRun }),
      }),

    logs: (source?: ConnectorSource, limit = 10): Promise<{ logs: SyncLog[] }> =>
      request(`/api/sync/logs?${source ? `source=${source}&` : ''}limit=${limit}`),
  },
}
