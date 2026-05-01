import { UnifiedContact, UnifiedLead, ConnectorSource, SyncResult, SyncError } from '../schema'
import { logger } from '../utils/logger'
import { DuplicateContactError } from '../highlevel/highlevel.client'

export interface FetchOptions {
  limit?: number
  skip?: number
  pageToken?: string
}

export interface ConnectorStatus {
  connected: boolean
  lastSync?: Date
  tokenExpiresAt?: Date
}

type HLClient = {
  createOrUpdateContact(c: UnifiedContact): Promise<unknown>
  createOrUpdateLead(l: UnifiedLead): Promise<unknown>
}

export abstract class BaseConnector {
  abstract readonly name: string
  abstract readonly source: ConnectorSource
  abstract isConnected: boolean

  protected lastSync?: Date

  abstract authenticate(code: string): Promise<void>
  abstract refreshTokenIfNeeded(): Promise<void>
  abstract fetchContacts(options?: FetchOptions): Promise<UnifiedContact[]>
  abstract mapToContact(raw: unknown): UnifiedContact
  abstract disconnect(): Promise<void>

  async fetchLeads(_options?: FetchOptions): Promise<UnifiedLead[]> {
    return []
  }

  private async _runLoop<T extends UnifiedContact>(
    items: T[],
    push: (item: T) => Promise<unknown>,
    dryRun: boolean
  ): Promise<{ succeeded: number; failed: number; errors: SyncError[]; warnings: SyncError[] }> {
    let succeeded = 0, failed = 0
    const errors: SyncError[] = []
    const warnings: SyncError[] = []

    for (const item of items) {
      try {
        if (!dryRun) await push(item)
        succeeded++
      } catch (err) {
        if (err instanceof DuplicateContactError) {
          succeeded++
          warnings.push({ recordId: item.sourceId, reason: `Duplicate skipped — ${err.message}` })
        } else {
          failed++
          errors.push({
            recordId: item.sourceId,
            reason: err instanceof Error ? err.message : String(err),
            raw: item.raw,
          })
        }
      }
    }

    return { succeeded, failed, errors, warnings }
  }

  private async _sync(
    fetch: () => Promise<UnifiedContact[] | UnifiedLead[]>,
    push: (item: UnifiedContact) => Promise<unknown>,
    logSource: string,
    dbLog: { write(log: SyncLogInput): Promise<void> },
    options: { dryRun?: boolean; triggeredBy?: string }
  ): Promise<SyncResult> {
    const startMs = Date.now()
    const result: SyncResult = {
      connectorSource: this.source,
      attempted: 0, succeeded: 0, failed: 0,
      errors: [], warnings: [],
      timestamp: new Date(),
    }

    try {
      await this.refreshTokenIfNeeded()
      const items = await fetch()
      result.attempted = items.length
      const loop = await this._runLoop(items as UnifiedContact[], push, options.dryRun ?? false)
      result.succeeded = loop.succeeded
      result.failed = loop.failed
      result.errors = loop.errors
      result.warnings = loop.warnings
      this.lastSync = new Date()
    } catch (err) {
      logger.error(`Sync failed for ${logSource}`, err)
      result.failed = result.attempted
      result.errors.push({ recordId: 'connector', reason: err instanceof Error ? err.message : String(err) })
    }

    const durationMs = Date.now() - startMs
    const status = result.failed === 0 ? 'success' : result.succeeded > 0 ? 'partial' : 'failed'
    const allNotes = [...result.errors, ...result.warnings]

    try {
      await dbLog.write({
        source: logSource,
        status,
        attempted: result.attempted,
        succeeded: result.succeeded,
        failed: result.failed,
        errors: allNotes.length > 0 ? allNotes : undefined,
        durationMs,
        triggeredBy: options.triggeredBy ?? 'manual',
      })
    } catch (logErr) {
      logger.error('Failed to write sync log', logErr)
    }

    return result
  }

  async sync(hlClient: HLClient, dbLog: { write(log: SyncLogInput): Promise<void> }, options: { dryRun?: boolean; triggeredBy?: string } = {}): Promise<SyncResult> {
    return this._sync(
      () => this.fetchContacts(),
      (c) => hlClient.createOrUpdateContact(c),
      this.source,
      dbLog,
      options
    )
  }

  async syncLeads(hlClient: HLClient, dbLog: { write(log: SyncLogInput): Promise<void> }, options: { dryRun?: boolean; triggeredBy?: string } = {}): Promise<SyncResult> {
    return this._sync(
      () => this.fetchLeads(),
      (l) => hlClient.createOrUpdateLead(l as UnifiedLead),
      `${this.source}:leads`,
      dbLog,
      options
    )
  }

  getStatus(): ConnectorStatus {
    return { connected: this.isConnected, lastSync: this.lastSync }
  }
}

export interface SyncLogInput {
  source: string
  status: string
  attempted: number
  succeeded: number
  failed: number
  errors?: unknown
  durationMs: number
  triggeredBy: string
}
