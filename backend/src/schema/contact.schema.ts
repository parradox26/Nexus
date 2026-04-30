export type ConnectorSource = 'google' | 'facebook' | 'stripe_mock'

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
  customFields?: Record<string, unknown>
  syncedAt?: Date
  raw: Record<string, unknown>
}

export interface UnifiedLead extends UnifiedContact {
  leadSource?: string
  campaignId?: string
  formId?: string
  adId?: string
}

export interface SyncResult {
  connectorSource: ConnectorSource
  attempted: number
  succeeded: number
  failed: number
  errors: SyncError[]
  warnings: SyncError[]
  timestamp: Date
}

export interface SyncError {
  recordId: string
  reason: string
  raw?: unknown
}
