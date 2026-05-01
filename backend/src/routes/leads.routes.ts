import { Router, Request, Response } from 'express'
import { getConnector, isValidSource } from '../connectors'

const router = Router()

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const source = req.query['source']
  const limit = req.query['limit'] ?? '20'
  const skip = req.query['skip'] ?? '0'

  if (typeof source !== 'string' || !isValidSource(source)) {
    res.status(400).json({ success: false, error: 'Valid source query param required' })
    return
  }

  try {
    const connector = getConnector(source)
    const leads = await connector.fetchLeads({
      limit: parseInt(limit as string, 10),
      skip: parseInt(skip as string, 10),
    })
    res.json({ success: true, data: { leads, total: leads.length } })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch leads',
    })
  }
})

export { router as leadsRouter }
