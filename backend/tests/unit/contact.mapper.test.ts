import { GoogleConnector } from '../../src/connectors/google.connector'
import { FacebookConnector } from '../../src/connectors/facebook.connector'

// Suppress tokenStore calls in mapToContact tests (pure functions, no DB needed)
jest.mock('../../src/auth/token.store', () => ({
  tokenStore: {
    save: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    isExpired: jest.fn(),
  },
}))

const google = new GoogleConnector()
const facebook = new FacebookConnector()

const googlePersonFixture = {
  resourceName: 'people/c12345678',
  names: [{ givenName: 'Ravi', familyName: 'Kumar' }],
  emailAddresses: [{ value: 'ravi.kumar@example.com' }],
  phoneNumbers: [{ value: '+91-9876543210' }],
  organizations: [{ name: 'Acme Corp' }],
}

const facebookLeadFixture = {
  id: 'fb_lead_test_001',
  created_time: '2024-02-01T08:00:00+0000',
  field_data: [
    { name: 'full_name', values: ['Ananya Mehta'] },
    { name: 'email', values: ['ananya.mehta@example.com'] },
    { name: 'phone_number', values: ['+91-9001234567'] },
    { name: 'campaign_id', values: ['camp_001'] },
    { name: 'ad_id', values: ['ad_001'] },
  ],
}

describe('GoogleConnector.mapToContact', () => {
  it('maps a full Google People API response correctly', () => {
    const contact = google.mapToContact(googlePersonFixture)
    expect(contact.firstName).toBe('Ravi')
    expect(contact.lastName).toBe('Kumar')
    expect(contact.email).toBe('ravi.kumar@example.com')
    expect(contact.phone).toBe('+91-9876543210')
    expect(contact.company).toBe('Acme Corp')
    expect(contact.source).toBe('google')
    expect(contact.sourceId).toBe('people/c12345678')
  })

  it('preserves raw field', () => {
    const contact = google.mapToContact(googlePersonFixture)
    expect(contact.raw).toEqual(googlePersonFixture)
  })

  it('handles missing phone gracefully', () => {
    const noPhone = { ...googlePersonFixture, phoneNumbers: undefined }
    const contact = google.mapToContact(noPhone)
    expect(contact.phone).toBeUndefined()
  })

  it('handles missing company gracefully', () => {
    const noOrg = { ...googlePersonFixture, organizations: undefined }
    const contact = google.mapToContact(noOrg)
    expect(contact.company).toBeUndefined()
  })

  it('handles empty names array without throwing', () => {
    const noName = { ...googlePersonFixture, names: [] }
    const contact = google.mapToContact(noName)
    expect(contact.firstName).toBe('')
    expect(contact.lastName).toBe('')
  })

  it('handles null emailAddresses without throwing', () => {
    const noEmail = { ...googlePersonFixture, emailAddresses: undefined }
    const contact = google.mapToContact(noEmail)
    expect(contact.email).toBe('')
  })

  it('always sets source to google', () => {
    const contact = google.mapToContact(googlePersonFixture)
    expect(contact.source).toBe('google')
  })
})

describe('FacebookConnector.mapToContact', () => {
  it('maps a full Facebook Lead Ads response correctly', () => {
    const contact = facebook.mapToContact(facebookLeadFixture)
    expect(contact.firstName).toBe('Ananya')
    expect(contact.lastName).toBe('Mehta')
    expect(contact.email).toBe('ananya.mehta@example.com')
    expect(contact.phone).toBe('+91-9001234567')
    expect(contact.source).toBe('facebook')
    expect(contact.sourceId).toBe('fb_lead_test_001')
  })

  it('maps campaign and ad IDs to lead fields', () => {
    const contact = facebook.mapToContact(facebookLeadFixture) as { campaignId?: string; adId?: string }
    expect(contact.campaignId).toBe('camp_001')
    expect(contact.adId).toBe('ad_001')
  })

  it('adds facebook-lead tag', () => {
    const contact = facebook.mapToContact(facebookLeadFixture)
    expect(contact.tags).toContain('facebook-lead')
  })

  it('preserves raw field', () => {
    const contact = facebook.mapToContact(facebookLeadFixture)
    expect(contact.raw).toEqual(facebookLeadFixture)
  })

  it('handles single-word full_name without throwing', () => {
    const singleName = {
      ...facebookLeadFixture,
      field_data: [
        { name: 'full_name', values: ['Ravi'] },
        { name: 'email', values: ['ravi@example.com'] },
      ],
    }
    const contact = facebook.mapToContact(singleName)
    expect(contact.firstName).toBe('Ravi')
    expect(contact.lastName).toBe('')
  })

  it('handles missing optional fields gracefully', () => {
    const minimal = {
      id: 'fb_min_001',
      created_time: '2024-01-01T00:00:00+0000',
      field_data: [
        { name: 'full_name', values: ['Test User'] },
        { name: 'email', values: ['test@example.com'] },
      ],
    }
    const contact = facebook.mapToContact(minimal)
    expect(contact.phone).toBeUndefined()
    expect((contact as { campaignId?: string }).campaignId).toBeUndefined()
  })

  it('always sets source to facebook', () => {
    const contact = facebook.mapToContact(facebookLeadFixture)
    expect(contact.source).toBe('facebook')
  })
})
