import axios, { AxiosInstance } from 'axios'
import { UnifiedContact, UnifiedLead } from '../schema'
import { tokenStore, TokenData } from '../auth/token.store'
import { logger } from '../utils/logger'

export interface HLContact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  tags?: string[]
  [key: string]: unknown
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export class DuplicateContactError extends Error {
  constructor(email: string) {
    super(`Contact already exists in HighLevel: ${email}`)
    this.name = 'DuplicateContactError'
  }
}

interface HighLevelOAuthTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  locationId?: string
  companyId?: string
  userType?: string
}

interface HighLevelConnectedLocation {
  locationId: string
  tokenExpiresAt?: Date
}

export class HighLevelClient {
  private readonly client: AxiosInstance
  private readonly maxRetries = 3
  private readonly locationId: string

  constructor(locationId: string) {
    if (!locationId) throw new Error('locationId is required for HighLevel client')
    this.locationId = locationId

    this.client = axios.create({
      baseURL: 'https://services.leadconnectorhq.com',
      headers: {
        'Content-Type': 'application/json',
        Version: '2021-07-28',
      },
    })
  }

  static getAuthUrl(state?: string): string {
    const clientId = process.env.HL_CLIENT_ID
    const redirectUri = process.env.HL_REDIRECT_URI
    if (!clientId || !redirectUri) {
      throw new Error('HL_CLIENT_ID and HL_REDIRECT_URI must be configured')
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'contacts.readonly contacts.write locations.readonly',
    })
    if (state) params.set('state', state)
    return `https://marketplace.gohighlevel.com/oauth/chooselocation?${params.toString()}`
  }

  static async exchangeCode(code: string): Promise<{ locationId: string }> {
    const clientId = process.env.HL_CLIENT_ID
    const clientSecret = process.env.HL_CLIENT_SECRET
    const redirectUri = process.env.HL_REDIRECT_URI
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('HL_CLIENT_ID, HL_CLIENT_SECRET, and HL_REDIRECT_URI must be configured')
    }

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      user_type: 'Location',
    })

    const response = await axios.post<HighLevelOAuthTokenResponse>(
      'https://services.leadconnectorhq.com/oauth/token',
      body.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    )

    const locationId = response.data.locationId
    if (!locationId) {
      throw new Error('HighLevel OAuth response did not include locationId')
    }

    await tokenStore.save(
      'highlevel',
      {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
      },
      locationId
    )

    return { locationId }
  }

  static async listConnectedLocations(): Promise<HighLevelConnectedLocation[]> {
    const tokens = await tokenStore.listBySource('highlevel')
    return tokens.map((token) => ({
      locationId: token.accountId,
      tokenExpiresAt: token.expiresAt,
    }))
  }

  static async disconnectLocation(locationId: string): Promise<void> {
    await tokenStore.delete('highlevel', locationId)
  }

  private async getTokenOrThrow(): Promise<TokenData> {
    const token = await tokenStore.get('highlevel', this.locationId)
    if (!token) {
      throw new AuthError(
        `No HighLevel OAuth token found for location ${this.locationId}. Connect HighLevel first.`
      )
    }
    return token
  }

  private async refreshToken(): Promise<TokenData> {
    const tokens = await this.getTokenOrThrow()
    if (!tokens.refreshToken) {
      throw new AuthError(
        `HighLevel refresh token is missing for location ${this.locationId}. Reconnect required.`
      )
    }

    const clientId = process.env.HL_CLIENT_ID
    const clientSecret = process.env.HL_CLIENT_SECRET
    const redirectUri = process.env.HL_REDIRECT_URI
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('HL_CLIENT_ID, HL_CLIENT_SECRET, and HL_REDIRECT_URI must be configured')
    }

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
      redirect_uri: redirectUri,
      user_type: 'Location',
    })

    const response = await axios.post<HighLevelOAuthTokenResponse>(
      'https://services.leadconnectorhq.com/oauth/token',
      body.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    )

    await tokenStore.save(
      'highlevel',
      {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token ?? tokens.refreshToken,
        expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
      },
      this.locationId
    )

    const refreshed = await tokenStore.get('highlevel', this.locationId)
    if (!refreshed) throw new AuthError('Failed to persist refreshed HighLevel token')
    return refreshed
  }

  private async getAccessToken(forceRefresh = false): Promise<string> {
    if (forceRefresh || (await tokenStore.isExpired('highlevel', this.locationId))) {
      const refreshed = await this.refreshToken()
      return refreshed.accessToken
    }
    const token = await this.getTokenOrThrow()
    return token.accessToken
  }

  private normalizePhone(phone: string | undefined): string | undefined {
    if (!phone) return undefined
    // Strip everything except digits and leading +, convert to E.164
    const digits = phone.replace(/[^\d+]/g, '')
    return digits.startsWith('+') ? digits : `+${digits}`
  }

  async createOrUpdateContact(contact: UnifiedContact): Promise<HLContact> {
    const body: Record<string, unknown> = {
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      locationId: this.locationId,
    }

    const phone = this.normalizePhone(contact.phone)
    if (phone) body.phone = phone
    if (contact.tags?.length) body.tags = contact.tags

    const response = await this.postWithRetry<{ contact: HLContact }>('/contacts/', body)
    return response.contact
  }

  async createOrUpdateLead(lead: UnifiedLead): Promise<HLContact> {
    // Build enriched tags from lead metadata before pushing to HL
    const leadTags: string[] = [
      ...(lead.tags ?? []),
      lead.leadSource ? `source:${lead.leadSource}` : null,
      lead.campaignId ? `campaign:${lead.campaignId}` : null,
      lead.adId ? `ad:${lead.adId}` : null,
      lead.formId ? `form:${lead.formId}` : null,
    ].filter((t): t is string => t !== null)

    return this.createOrUpdateContact({ ...lead, tags: leadTags })
  }

  async getContacts(limit = 20, skip = 0): Promise<HLContact[]> {
    const makeRequest = async (forceRefresh = false): Promise<HLContact[]> => {
      const accessToken = await this.getAccessToken(forceRefresh)
      const response = await this.client.get<{ contacts: HLContact[] }>('/contacts/', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { limit, skip, locationId: this.locationId },
      })
      return response.data.contacts ?? []
    }

    try {
      return await makeRequest(false)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        return makeRequest(true)
      }
      throw err
    }
  }

  private async postWithRetry<T>(
    path: string,
    body: unknown,
    attempt = 0,
    forceRefresh = false
  ): Promise<T> {
    try {
      const accessToken = await this.getAccessToken(forceRefresh)
      const response = await this.client.post<T>(path, body, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      return response.data
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        const hlBody = err.response?.data
        if (status === 401) {
          if (!forceRefresh) {
            return this.postWithRetry<T>(path, body, attempt, true)
          }
          throw new AuthError('HighLevel OAuth token is invalid or expired')
        }
        if (status === 400) {
          const msg = (hlBody as { message?: string })?.message ?? ''
          if (msg.includes('duplicated contacts') || msg.includes('already exists')) {
            const contactId = (hlBody as { meta?: { contactId?: string } })?.meta?.contactId
            throw new DuplicateContactError(contactId ?? 'unknown')
          }
          logger.error('HighLevel 400 — request body rejected', JSON.stringify(hlBody))
          throw new Error(`HighLevel rejected contact: ${msg || JSON.stringify(hlBody)}`)
        }
        if (status === 429 && attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000
          logger.warn(`HighLevel rate limited, retry ${attempt + 1} in ${delay}ms`)
          await new Promise((r) => setTimeout(r, delay))
          return this.postWithRetry<T>(path, body, attempt + 1)
        }
        if (status && status >= 500) {
          logger.error('HighLevel 5xx error', hlBody)
          throw err
        }
      }
      throw err
    }
  }
}
