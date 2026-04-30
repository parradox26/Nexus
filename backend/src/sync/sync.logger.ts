import { PrismaClient } from '@prisma/client'
import { SyncLogInput } from '../connectors/base.connector'

const prisma = new PrismaClient()

export const syncLogger = {
  async write(log: SyncLogInput): Promise<void> {
    await prisma.syncLog.create({
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
