import { PrismaClient } from '@prisma/client'
import { SyncLogInput } from '../connectors/base.connector'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

export const syncLogger = {
  async write(log: SyncLogInput): Promise<void> {
    logger.debug('Persisting sync log entry', {
      source: log.source,
      status: log.status,
      attempted: log.attempted,
      succeeded: log.succeeded,
      failed: log.failed,
      durationMs: log.durationMs,
      triggeredBy: log.triggeredBy,
    })

    const created = await prisma.syncLog.create({
      data: {
        source: log.source,
        status: log.status,
        attempted: log.attempted,
        succeeded: log.succeeded,
        failed: log.failed,
        errors: log.errors !== undefined ? JSON.parse(JSON.stringify(log.errors)) : undefined,
        durationMs: log.durationMs,
        triggeredBy: log.triggeredBy,
      },
    })

    logger.info('Sync log persisted', {
      syncLogId: created.id,
      source: created.source,
      status: created.status,
      attempted: created.attempted,
      succeeded: created.succeeded,
      failed: created.failed,
      durationMs: created.durationMs,
      createdAt: created.createdAt,
    })
  },

  async getLogs(source?: string, limit = 20): Promise<unknown[]> {
    const where = source ? { source } : {}
    return prisma.syncLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  },
}
