import { PrismaClient } from '@prisma/client'
import { encryptString, decryptString } from '../utils/crypto'

const prisma = new PrismaClient()

export interface TokenData {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
}

const EXPIRY_BUFFER_MS = 5 * 60 * 1000

export const tokenStore = {
  async save(source: string, tokens: TokenData): Promise<void> {
    const encryptedAccess = encryptString(tokens.accessToken)
    const encryptedRefresh = tokens.refreshToken
      ? encryptString(tokens.refreshToken)
      : undefined

    // iv is embedded in the JSON ciphertext; store a placeholder for schema compat
    await prisma.connectorToken.upsert({
      where: { source },
      create: {
        source,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh ?? null,
        expiresAt: tokens.expiresAt ?? null,
        iv: 'embedded',
      },
      update: {
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh ?? null,
        expiresAt: tokens.expiresAt ?? null,
        iv: 'embedded',
      },
    })
  },

  async get(source: string): Promise<TokenData | null> {
    const record = await prisma.connectorToken.findUnique({ where: { source } })
    if (!record) return null
    return {
      accessToken: decryptString(record.accessToken),
      refreshToken: record.refreshToken ? decryptString(record.refreshToken) : undefined,
      expiresAt: record.expiresAt ?? undefined,
    }
  },

  async delete(source: string): Promise<void> {
    await prisma.connectorToken.deleteMany({ where: { source } })
  },

  async isExpired(source: string): Promise<boolean> {
    const record = await prisma.connectorToken.findUnique({ where: { source } })
    if (!record || !record.expiresAt) return false
    return record.expiresAt.getTime() - Date.now() < EXPIRY_BUFFER_MS
  },
}
