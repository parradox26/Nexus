import { Router, Request, Response } from 'express'
import { getConnector, isValidSource } from '../connectors'

const router = Router()

function strParam(val: string | string[] | undefined): string {
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '')
}

router.get('/connectors/:source/callback', async (req: Request, res: Response): Promise<void> => {
  const source = strParam(req.params['source'])
  const code = req.query['code']

  if (!isValidSource(source)) {
    res.status(400).json({ success: false, error: `Unknown connector: ${source}` })
    return
  }

  if (typeof code !== 'string' || !code) {
    res.status(400).json({ success: false, error: 'Missing OAuth code' })
    return
  }

  try {
    const connector = getConnector(source)
    await connector.authenticate(code)
    res.json({ success: true, data: { source, connected: true } })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Authentication failed',
    })
  }
})

export { router as authRouter }
