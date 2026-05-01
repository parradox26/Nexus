import { FacebookConnector } from '../../src/connectors/facebook.connector'
import { SyncEngine } from '../../src/sync/sync.engine'
import { HighLevelClient } from '../../src/highlevel/highlevel.client'

// Set encryption key before any imports touch it
beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = 'b'.repeat(64)
  process.env.HL_CLIENT_ID = 'test_hl_client'
  process.env.HL_CLIENT_SECRET = 'test_hl_secret'
  process.env.HL_REDIRECT_URI = 'http://localhost:3000/api/connectors/highlevel/callback'
})

jest.mock('../../src/auth/token.store', () => ({
  tokenStore: {
    save: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue({
      accessToken: 'mock_fb_access_token',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    }),
    delete: jest.fn().mockResolvedValue(undefined),
    isExpired: jest.fn().mockResolvedValue(false),
  },
}))

jest.mock('../../src/sync/sync.logger', () => ({
  syncLogger: {
    write: jest.fn().mockResolvedValue(undefined),
    getLogs: jest.fn().mockResolvedValue([]),
  },
}))

jest.mock('../../src/highlevel/highlevel.client')

const MockedHLClient = HighLevelClient as jest.MockedClass<typeof HighLevelClient>

describe('Full sync flow — Facebook mock connector', () => {
  let connector: FacebookConnector
  let syncEngine: SyncEngine
  let mockCreateOrUpdate: jest.Mock

  beforeEach(() => {
    mockCreateOrUpdate = jest.fn().mockResolvedValue({ id: 'hl_123' })
    MockedHLClient.prototype.createOrUpdateContact = mockCreateOrUpdate
    connector = new FacebookConnector()
    syncEngine = new SyncEngine(new HighLevelClient('test_location'))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('connects and marks connector as connected', async () => {
    await connector.authenticate('mock')
    expect(connector.isConnected).toBe(true)
  })

  it('fetches 5 contacts from mock', async () => {
    await connector.authenticate('mock')
    const contacts = await connector.fetchContacts()
    expect(contacts).toHaveLength(5)
  })

  it('maps contacts to the correct unified shape', async () => {
    await connector.authenticate('mock')
    const contacts = await connector.fetchContacts()
    const first = contacts[0]
    expect(first.source).toBe('facebook')
    expect(first.firstName).toBeTruthy()
    expect(first.email).toContain('@')
    expect(first.tags).toContain('facebook-lead')
    expect(first.raw).toBeDefined()
  })

  it('runs a full sync and returns correct SyncResult counts', async () => {
    await connector.authenticate('mock')
    const result = await syncEngine.run(connector, { triggeredBy: 'manual' })

    expect(result.attempted).toBe(5)
    expect(result.succeeded).toBe(5)
    expect(result.failed).toBe(0)
    expect(result.errors).toHaveLength(0)
    expect(result.connectorSource).toBe('facebook')
  })

  it('calls HighLevel client with correctly shaped contact', async () => {
    await connector.authenticate('mock')
    await syncEngine.run(connector, { triggeredBy: 'manual' })

    expect(mockCreateOrUpdate).toHaveBeenCalledTimes(5)
    const firstCall = mockCreateOrUpdate.mock.calls[0][0]
    expect(firstCall).toMatchObject({
      source: 'facebook',
      email: expect.stringContaining('@'),
      firstName: expect.any(String),
      lastName: expect.any(String),
      tags: expect.arrayContaining(['facebook-lead']),
    })
  })

  it('records partial success when some HL calls fail', async () => {
    mockCreateOrUpdate
      .mockResolvedValueOnce({ id: 'hl_1' })
      .mockRejectedValueOnce(new Error('HL API error'))
      .mockResolvedValueOnce({ id: 'hl_3' })
      .mockResolvedValueOnce({ id: 'hl_4' })
      .mockResolvedValueOnce({ id: 'hl_5' })

    await connector.authenticate('mock')
    const result = await syncEngine.run(connector, { triggeredBy: 'manual' })

    expect(result.attempted).toBe(5)
    expect(result.succeeded).toBe(4)
    expect(result.failed).toBe(1)
    expect(result.errors).toHaveLength(1)
  })

  it('dry run does not call HighLevel client', async () => {
    await connector.authenticate('mock')
    const result = await syncEngine.run(connector, { dryRun: true, triggeredBy: 'manual' })

    expect(mockCreateOrUpdate).not.toHaveBeenCalled()
    expect(result.attempted).toBe(5)
    expect(result.succeeded).toBe(5)
  })

  it('writes sync log after run', async () => {
    const { syncLogger } = jest.requireMock('../../src/sync/sync.logger') as {
      syncLogger: { write: jest.Mock }
    }

    await connector.authenticate('mock')
    await syncEngine.run(connector, { triggeredBy: 'manual' })

    expect(syncLogger.write).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'facebook',
        status: 'success',
        attempted: 5,
        succeeded: 5,
        failed: 0,
        triggeredBy: 'manual',
      })
    )
  })
})
