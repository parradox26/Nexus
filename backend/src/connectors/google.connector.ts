import axios from 'axios'
import { BaseConnector, FetchOptions } from './base.connector'
import { UnifiedContact, ConnectorSource } from '../schema'
import { tokenStore } from '../auth/token.store'
import { logger } from '../utils/logger'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_PEOPLE_URL = 'https://people.googleapis.com/v1/people/me/connections'
const PERSON_FIELDS = 'names,emailAddresses,phoneNumbers,organizations'

interface GooglePerson {
  resourceName: string
  names?: Array<{ givenName?: string; familyName?: string }>
  emailAddresses?: Array<{ value?: string }>
  phoneNumbers?: Array<{ value?: string }>
  organizations?: Array<{ name?: string }>
}

interface GoogleConnectionsResponse {
  connections?: GooglePerson[]
  nextPageToken?: string
}

interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
}

export class GoogleConnector extends BaseConnector {
  readonly name = 'Google Contacts'
  readonly source: ConnectorSource = 'google'
  isConnected = false

  private readonly clientId: string
  private readonly clientSecret: string
  private readonly redirectUri: string

  constructor() {
    super()
    this.clientId = process.env.GOOGLE_CLIENT_ID ?? ''
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? ''
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI ?? ''
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/contacts.readonly',
      access_type: 'offline',
      prompt: 'consent',
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  async authenticate(code: string): Promise<void> {
    const response = await axios.post<GoogleTokenResponse>(GOOGLE_TOKEN_URL, {
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code',
    })

    await tokenStore.save(this.source, {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
    })

    this.isConnected = true
  }

  async refreshTokenIfNeeded(): Promise<void> {
    const expired = await tokenStore.isExpired(this.source)
    if (!expired) return

    const tokens = await tokenStore.get(this.source)
    if (!tokens?.refreshToken) {
      this.isConnected = false
      throw new Error('No refresh token available — user must re-authenticate')
    }

    const response = await axios.post<GoogleTokenResponse>(GOOGLE_TOKEN_URL, {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: tokens.refreshToken,
      grant_type: 'refresh_token',
    })

    await tokenStore.save(this.source, {
      accessToken: response.data.access_token,
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
    })
  }

  async fetchContacts(options: FetchOptions = {}): Promise<UnifiedContact[]> {
    const tokens = await tokenStore.get(this.source)
    if (!tokens) throw new Error('Google connector not authenticated')

    const contacts: UnifiedContact[] = []
    let pageToken: string | undefined = options.pageToken

    do {
      const params: Record<string, string> = { personFields: PERSON_FIELDS }
      if (pageToken) params.pageToken = pageToken
      if (options.limit) params.pageSize = String(options.limit)

      let data: GoogleConnectionsResponse

      try {
        const response = await axios.get<GoogleConnectionsResponse>(GOOGLE_PEOPLE_URL, {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
          params,
        })
        data = response.data
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const status = err.response?.status
          if (status === 401) {
            await this.refreshTokenIfNeeded()
            const fresh = await tokenStore.get(this.source)
            if (!fresh) throw new Error('Failed to refresh Google token')
            const retry = await axios.get<GoogleConnectionsResponse>(GOOGLE_PEOPLE_URL, {
              headers: { Authorization: `Bearer ${fresh.accessToken}` },
              params,
            })
            data = retry.data
          } else if (status === 403) {
            throw new Error(
              'Google Contacts access denied — ensure contacts.readonly scope is granted'
            )
          } else if (status === 429) {
            const retryAfter = parseInt(err.response?.headers?.['retry-after'] ?? '5', 10)
            logger.warn(`Google rate limited, retrying after ${retryAfter}s`)
            await new Promise((r) => setTimeout(r, retryAfter * 1000))
            continue
          } else {
            logger.error('Google People API error', err.response?.data)
            break
          }
        } else {
          logger.error('Network error fetching Google contacts', err)
          break
        }
      }

      for (const person of data.connections ?? []) {
        try {
          contacts.push(this.mapToContact(person))
        } catch (mapErr) {
          logger.warn('Failed to map Google contact', { person, mapErr })
        }
      }

      pageToken = data.nextPageToken
    } while (pageToken)

    return contacts
  }

  mapToContact(raw: unknown): UnifiedContact {
    const person = raw as GooglePerson
    const firstName = person.names?.[0]?.givenName ?? ''
    const lastName = person.names?.[0]?.familyName ?? ''
    const email = person.emailAddresses?.[0]?.value ?? ''
    const phone = person.phoneNumbers?.[0]?.value
    const company = person.organizations?.[0]?.name

    return {
      id: crypto.randomUUID(),
      source: this.source,
      sourceId: person.resourceName ?? '',
      firstName,
      lastName,
      email,
      phone,
      company,
      raw: person as unknown as Record<string, unknown>,
    }
  }

  async disconnect(): Promise<void> {
    await tokenStore.delete(this.source)
    this.isConnected = false
  }
}
