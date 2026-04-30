import { Router, Request, Response } from 'express'
import { getConnector, isValidSource } from '../connectors'
import { SyncEngine } from '../sync/sync.engine'
import { syncLogger } from '../sync/sync.logger'

const router = Router()
const syncEngine = new SyncEngine()

function strParam(val: string | string[] | undefined): string {
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '')
}

router.post('/:source', async (req: Request, res: Response): Promise<void> => {
  const source = strParam(req.params['source'])
  const { dryRun } = req.body as { dryRun?: boolean }

  if (!isValidSource(source)) {
    res.status(400).json({ success: false, error: `Unknown connector: ${source}` })
    return
  }

  const connector = getConnector(source)

  if (!connector.isConnected) {
    res.status(400).json({ success: false, error: `Connector ${source} is not connected` })
    return
  }

  try {
    const result = await syncEngine.run(connector, { dryRun: dryRun ?? false })
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Sync failed',
    })
  }
})

router.get('/logs', async (req: Request, res: Response): Promise<void> => {
  const source = req.query['source']
  const limit = req.query['limit'] ?? '20'
  try {
    const logs = await syncLogger.getLogs(
      typeof source === 'string' ? source : undefined,
      parseInt(limit as string, 10)
    )
    res.json({ success: true, data: { logs } })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch logs',
    })
  }
})

export { router as syncRouter }
