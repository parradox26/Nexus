export type ConnectorSource = 'google' | 'facebook' | 'stripe_mock'

export interface ConnectorStatus {
  source: ConnectorSource
  name: string
  connected: boolean
  lastSync?: string
  tokenExpiresAt?: string
}

export interface UnifiedContact {
  id: string
  source: ConnectorSource
  sourceId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  company?: string
  tags?: string[]
  syncedAt?: string
}

export interface SyncResult {
  connectorSource: ConnectorSource
  attempted: number
  succeeded: number
  failed: number
  errors: Array<{ recordId: string; reason: string }>
  warnings: Array<{ recordId: string; reason: string }>
  timestamp: string
}

export interface SyncLog {
  id: string
  source: string
  status: 'success' | 'partial' | 'failed'
  attempted: number
  succeeded: number
  failed: number
  durationMs: number
  triggeredBy: string
  createdAt: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
