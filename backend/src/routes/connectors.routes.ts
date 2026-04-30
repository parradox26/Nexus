import { Router, Request, Response } from 'express'
import { getAllConnectors, getConnector, isValidSource } from '../connectors'
import { GoogleConnector } from '../connectors/google.connector'

const router = Router()

function strParam(val: string | string[] | undefined): string {
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '')
}

router.get('/', (_req: Request, res: Response): void => {
  const connectors = getAllConnectors().map((c) => ({
    source: c.source,
    name: c.name,
    ...c.getStatus(),
  }))
  res.json({ success: true, data: { connectors } })
})

router.post('/:source/connect', async (req: Request, res: Response): Promise<void> => {
  const source = strParam(req.params['source'])

  if (!isValidSource(source)) {
    res.status(400).json({ success: false, error: `Unknown connector: ${source}` })
    return
  }

  const connector = getConnector(source)

  if (source === 'google') {
    const google = connector as GoogleConnector
    const authUrl = google.getAuthUrl()
    res.json({ success: true, data: { authUrl } })
    return
  }

  try {
    await connector.authenticate('mock')
    res.json({ success: true, data: { source, connected: true } })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Connection failed',
    })
  }
})

router.delete('/:source/disconnect', async (req: Request, res: Response): Promise<void> => {
  const source = strParam(req.params['source'])

  if (!isValidSource(source)) {
    res.status(400).json({ success: false, error: `Unknown connector: ${source}` })
    return
  }

  try {
    await getConnector(source).disconnect()
    res.json({ success: true, data: { source, connected: false } })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Disconnect failed',
    })
  }
})

export { router as connectorsRouter }
