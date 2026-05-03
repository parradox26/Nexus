
import { BaseConnector, FetchOptions } from './base.connector'
import { UnifiedContact, UnifiedLead, ConnectorSource } from '../schema'
import { tokenStore } from '../auth/token.store'

interface FacebookFieldData {
  name: string
  values: string[]
}

interface FacebookLead {
  id: string
  created_time: string
  field_data: FacebookFieldData[]
}

const MOCK_LEADS: FacebookLead[] = [
  {
    id: 'fb_lead_001',
    created_time: '2024-01-15T10:30:00+0000',
    field_data: [
      { name: 'full_name', values: ['Rahul Sharma'] },
      { name: 'email', values: ['rahul.sharma@example.com'] },
      { name: 'phone_number', values: ['+91-9876543210'] },
      { name: 'campaign_id', values: ['camp_123'] },
      { name: 'ad_id', values: ['ad_456'] },
    ],
  },
  {
    id: 'fb_lead_002',
    created_time: '2024-01-16T09:15:00+0000',
    field_data: [
      { name: 'full_name', values: ['Priya Patel'] },
      { name: 'email', values: ['priya.patel@example.com'] },
      { name: 'phone_number', values: ['+91-9123456780'] },
      { name: 'campaign_id', values: ['camp_123'] },
      { name: 'ad_id', values: ['ad_789'] },
    ],
  },
  {
    id: 'fb_lead_003',
    created_time: '2024-01-17T14:45:00+0000',
    field_data: [
      { name: 'full_name', values: ['Amit Verma'] },
      { name: 'email', values: ['amit.verma@example.com'] },
      { name: 'phone_number', values: ['+91-9988776655'] },
      { name: 'campaign_id', values: ['camp_456'] },
      { name: 'ad_id', values: ['ad_101'] },
    ],
  },
  {
    id: 'fb_lead_004',
    created_time: '2024-01-18T11:00:00+0000',
    field_data: [
      { name: 'full_name', values: ['Sneha Gupta'] },
      { name: 'email', values: ['sneha.gupta@example.com'] },
      { name: 'phone_number', values: ['+91-9871234567'] },
      { name: 'campaign_id', values: ['camp_456'] },
      { name: 'ad_id', values: ['ad_202'] },
    ],
  },
  {
    id: 'fb_lead_005',
    created_time: '2024-01-19T16:20:00+0000',
    field_data: [
      { name: 'full_name', values: ['Vikram Sethi'] },
      { name: 'email', values: ['vikram.sethi@example.com'] },
      { name: 'phone_number', values: ['+91-9755432109'] },
      { name: 'campaign_id', values: ['camp_79'] },
      { name: 'ad_id', values: ['ad_33'] },
    ],
  },
]
/**
 * MOCK CONNECTOR — Facebook Lead Ads
 *
 * Real implementation requires:
 * - Facebook App Review (2-4 weeks)
 * - leads_retrieval permission
 * - Page subscription to leadgen webhook
 *
 * This mock simulates the same interface a real connector would expose.
 * The mapToContact() mapping logic is production-accurate.
 * OAuth flow is simulated but token storage is real.
 */
export class FacebookConnector extends BaseConnector {
  readonly name = 'Facebook Lead Ads'
  readonly source: ConnectorSource = 'facebook'
  isConnected = false

  async authenticate(_code: string): Promise<void> {
    // Mock OAuth: store a simulated token with real encryption
    await tokenStore.save(this.source, {
      accessToken: 'mock_fb_access_token_' + Date.now(),
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    })
    this.isConnected = true
  }

  async refreshTokenIfNeeded(): Promise<void> {
    // Facebook long-lived tokens rarely expire; no-op in mock
  }

  async fetchContacts(_options?: FetchOptions): Promise<UnifiedContact[]> {
    return MOCK_LEADS.map((lead) => this.mapToContact(lead))
  }

  async fetchLeads(_options?: FetchOptions): Promise<UnifiedLead[]> {
    return MOCK_LEADS.map((lead) => this.mapToLead(lead))
  }

  mapToContact(raw: unknown): UnifiedContact {
    const lead = this.mapToLead(raw)
    // Strip lead-only fields — return as plain UnifiedContact
    const { campaignId: _c, formId: _f, adId: _a, leadSource: _ls, ...contact } = lead
    return contact
  }

  mapToLead(raw: unknown): UnifiedLead {
    const lead = raw as FacebookLead

    const field = (name: string): string | undefined =>
      lead.field_data?.find((f) => f.name === name)?.values?.[0]

    const fullName = field('full_name') ?? ''
    const spaceIdx = fullName.indexOf(' ')
    const firstName = spaceIdx === -1 ? fullName : fullName.slice(0, spaceIdx)
    const lastName = spaceIdx === -1 ? '' : fullName.slice(spaceIdx + 1)

    return {
      id: crypto.randomUUID(),
      source: this.source,
      sourceId: lead.id ?? '',
      firstName,
      lastName,
      email: field('email') ?? '',
      phone: field('phone_number'),
      tags: ['facebook-lead'],
      leadSource: 'facebook-ads',
      campaignId: field('campaign_id'),
      adId: field('ad_id'),
      raw: lead as unknown as Record<string, unknown>,
    }
  }

  async disconnect(): Promise<void> {
    await tokenStore.delete(this.source)
    this.isConnected = false
  }
}
