import { UnifiedContact, ConnectorSource, SyncResult } from '../schema'
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

  async sync(
    hlClient: { createOrUpdateContact(c: UnifiedContact): Promise<unknown> },
    dbLog: { write(log: SyncLogInput): Promise<void> },
    options: { dryRun?: boolean; triggeredBy?: string } = {}
  ): Promise<SyncResult> {
    const startMs = Date.now()
    const triggeredBy = options.triggeredBy ?? 'manual'
    const result: SyncResult = {
      connectorSource: this.source,
      attempted: 0,
      succeeded: 0,
      failed: 0,
      errors: [],
      warnings: [],
      timestamp: new Date(),
    }

    try {
      await this.refreshTokenIfNeeded()
      const contacts = await this.fetchContacts()
      result.attempted = contacts.length

      for (const contact of contacts) {
        try {
          if (!options.dryRun) {
            await hlClient.createOrUpdateContact(contact)
          }
          result.succeeded++
        } catch (err) {
          if (err instanceof DuplicateContactError) {
            result.succeeded++
            result.warnings.push({
              recordId: contact.sourceId,
              reason: `Duplicate skipped — ${err.message}`,
            })
          } else {
            result.failed++
            result.errors.push({
              recordId: contact.sourceId,
              reason: err instanceof Error ? err.message : String(err),
              raw: contact.raw,
            })
          }
        }
      }

      this.lastSync = new Date()
    } catch (err) {
      logger.error(`Sync failed for ${this.source}`, err)
      result.failed = result.attempted
      result.errors.push({
        recordId: 'connector',
        reason: err instanceof Error ? err.message : String(err),
      })
    }

    const durationMs = Date.now() - startMs
    const status =
      result.failed === 0 ? 'success' : result.succeeded > 0 ? 'partial' : 'failed'

    try {
      const allNotes = [
        ...result.errors,
        ...result.warnings,
      ]
      await dbLog.write({
        source: this.source,
        status,
        attempted: result.attempted,
        succeeded: result.succeeded,
        failed: result.failed,
        errors: allNotes.length > 0 ? allNotes : undefined,
        durationMs,
        triggeredBy,
      })
    } catch (logErr) {
      logger.error('Failed to write sync log', logErr)
    }

    return result
  }

  getStatus(): ConnectorStatus {
    return {
      connected: this.isConnected,
      lastSync: this.lastSync,
    }
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
