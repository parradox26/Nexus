import { BaseConnector } from '../connectors/base.connector'
import { HighLevelClient } from '../highlevel/highlevel.client'
import { SyncResult, ConnectorSource } from '../schema'
import { syncLogger } from './sync.logger'
import { logger } from '../utils/logger'

export interface SyncOptions {
  dryRun?: boolean
  triggeredBy?: 'manual' | 'webhook' | 'scheduled'
  locationId?: string
}

export class SyncEngine {
  private readonly fixedHlClient?: HighLevelClient

  constructor(hlClient?: HighLevelClient) {
    this.fixedHlClient = hlClient
  }

  private async resolveLocationId(explicitLocationId?: string): Promise<string> {
    if (explicitLocationId) return explicitLocationId

    const locations = await HighLevelClient.listConnectedLocations()
    if (locations.length === 1) {
      return locations[0].locationId
    }

    if (locations.length === 0) {
      throw new Error('No HighLevel destination connected. Connect HighLevel first.')
    }

    throw new Error(
      'Multiple HighLevel destinations connected. Provide locationId to choose a destination.'
    )
  }

  private async getClient(locationId?: string): Promise<HighLevelClient> {
    if (this.fixedHlClient) return this.fixedHlClient
    const resolved = await this.resolveLocationId(locationId)
    return new HighLevelClient(resolved)
  }

  async run(connector: BaseConnector, options: SyncOptions = {}): Promise<SyncResult> {
    const triggeredBy = options.triggeredBy ?? 'manual'
    const hlClient = await this.getClient(options.locationId)
    logger.info(`Starting contact sync for ${connector.source}`, { dryRun: options.dryRun, triggeredBy })
    return connector.sync(hlClient, syncLogger, { dryRun: options.dryRun, triggeredBy })
  }

  async runLeads(connector: BaseConnector, options: SyncOptions = {}): Promise<SyncResult> {
    const triggeredBy = options.triggeredBy ?? 'manual'
    const hlClient = await this.getClient(options.locationId)
    logger.info(`Starting lead sync for ${connector.source}`, { dryRun: options.dryRun, triggeredBy })
    return connector.syncLeads(hlClient, syncLogger, { dryRun: options.dryRun, triggeredBy })
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
