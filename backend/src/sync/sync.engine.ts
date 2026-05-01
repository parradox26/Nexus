import { BaseConnector } from '../connectors/base.connector'
import { HighLevelClient } from '../highlevel/highlevel.client'
import { SyncResult, ConnectorSource } from '../schema'
import { syncLogger } from './sync.logger'
import { logger } from '../utils/logger'

export interface SyncOptions {
  dryRun?: boolean
  triggeredBy?: 'manual' | 'webhook' | 'scheduled'
}

export class SyncEngine {
  private readonly hlClient: HighLevelClient

  constructor(hlClient?: HighLevelClient) {
    this.hlClient = hlClient ?? new HighLevelClient()
  }

  async run(connector: BaseConnector, options: SyncOptions = {}): Promise<SyncResult> {
    const triggeredBy = options.triggeredBy ?? 'manual'
    logger.info(`Starting contact sync for ${connector.source}`, { dryRun: options.dryRun, triggeredBy })
    return connector.sync(this.hlClient, syncLogger, { dryRun: options.dryRun, triggeredBy })
  }

  async runLeads(connector: BaseConnector, options: SyncOptions = {}): Promise<SyncResult> {
    const triggeredBy = options.triggeredBy ?? 'manual'
    logger.info(`Starting lead sync for ${connector.source}`, { dryRun: options.dryRun, triggeredBy })
    return connector.syncLeads(this.hlClient, syncLogger, { dryRun: options.dryRun, triggeredBy })
  }

  async runAll(
    connectors: BaseConnector[],
    options: SyncOptions = {}
  ): Promise<Map<ConnectorSource, SyncResult>> {
    const results = new Map<ConnectorSource, SyncResult>()

    await Promise.allSettled(
      connectors.map(async (connector) => {
        if (!connector.isConnected) {
          logger.info(`Skipping ${connector.source} — not connected`)
          return
        }
        const result = await this.run(connector, options)
        results.set(connector.source, result)
      })
    )

    return results
  }
}
