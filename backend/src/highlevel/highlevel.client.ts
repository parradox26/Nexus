import axios, { AxiosInstance } from 'axios'
import { UnifiedContact } from '../schema'
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

export class HighLevelClient {
  private readonly client: AxiosInstance
  private readonly maxRetries = 3

  constructor() {
    const apiKey = process.env.HL_API_KEY
    if (!apiKey) throw new Error('HL_API_KEY is not set')

    this.client = axios.create({
      baseURL: 'https://services.leadconnectorhq.com',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Version: '2021-07-28',
      },
    })
  }

  private normalizePhone(phone: string | undefined): string | undefined {
    if (!phone) return undefined
    // Strip everything except digits and leading +, convert to E.164
    const digits = phone.replace(/[^\d+]/g, '')
    return digits.startsWith('+') ? digits : `+${digits}`
  }

  async createOrUpdateContact(contact: UnifiedContact): Promise<HLContact> {
    const locationId = process.env.HL_LOCATION_ID
    if (!locationId) throw new Error('HL_LOCATION_ID is not set')

    const body: Record<string, unknown> = {
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      locationId,
    }

    const phone = this.normalizePhone(contact.phone)
    if (phone) body.phone = phone
    if (contact.tags?.length) body.tags = contact.tags

    const response = await this.postWithRetry<{ contact: HLContact }>('/contacts/', body)
    return response.contact
  }

  async getContacts(limit = 20, skip = 0): Promise<HLContact[]> {
    const locationId = process.env.HL_LOCATION_ID ?? ''
    const response = await this.client.get<{ contacts: HLContact[] }>('/contacts/', {
      params: { limit, skip, locationId },
    })
    return response.data.contacts ?? []
  }

  private async postWithRetry<T>(
    path: string,
    body: unknown,
    attempt = 0
  ): Promise<T> {
    try {
      const response = await this.client.post<T>(path, body)
      return response.data
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        const hlBody = err.response?.data
        if (status === 401) {
          throw new AuthError('HighLevel API key is invalid or expired')
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
