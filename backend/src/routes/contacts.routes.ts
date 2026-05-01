import { Router, Request, Response } from 'express'
import { getConnector, isValidSource } from '../connectors'
import { HighLevelClient } from '../highlevel/highlevel.client'
import { UnifiedContact } from '../schema'

const router = Router()

async function resolveLocationId(explicitLocationId?: string): Promise<string> {
  if (explicitLocationId) return explicitLocationId
  const locations = await HighLevelClient.listConnectedLocations()
  if (locations.length === 1) return locations[0].locationId
  if (locations.length === 0) {
    throw new Error('No HighLevel destination connected. Connect HighLevel first.')
  }
  throw new Error(
    'Multiple HighLevel destinations connected. Provide locationId in request body.'
  )
}

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
    const contacts = await connector.fetchContacts({
      limit: parseInt(limit as string, 10),
      skip: parseInt(skip as string, 10),
    })
    res.json({ success: true, data: { contacts, total: contacts.length } })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch contacts',
    })
  }
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const body = req.body as Omit<UnifiedContact, 'id' | 'syncedAt'> & { locationId?: string }
  const { locationId: explicitLocationId, ...contact } = body

  if (!contact.email || !contact.firstName || !contact.source) {
    res.status(400).json({ success: false, error: 'firstName, email, and source are required' })
    return
  }

  try {
    const locationId = await resolveLocationId(explicitLocationId)
    const hlClient = new HighLevelClient(locationId)
    const result = await hlClient.createOrUpdateContact({
      ...contact,
      id: crypto.randomUUID(),
      syncedAt: new Date(),
      raw: {},
    })
    res.status(201).json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create contact',
    })
  }
})

export { router as contactsRouter }
