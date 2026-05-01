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
  async save(source: string, tokens: TokenData, accountId = ''): Promise<void> {
    const encryptedAccess = encryptString(tokens.accessToken)
    const encryptedRefresh = tokens.refreshToken
      ? encryptString(tokens.refreshToken)
      : undefined

    // iv is embedded in the JSON ciphertext; store a placeholder for schema compat
    await prisma.connectorToken.upsert({
      where: { source_accountId: { source, accountId } },
      create: {
        source,
        accountId,
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

  async get(source: string, accountId = ''): Promise<TokenData | null> {
    const record = await prisma.connectorToken.findUnique({
      where: { source_accountId: { source, accountId } },
    })
    if (!record) return null
    return {
      accessToken: decryptString(record.accessToken),
      refreshToken: record.refreshToken ? decryptString(record.refreshToken) : undefined,
      expiresAt: record.expiresAt ?? undefined,
    }
  },

  async delete(source: string, accountId?: string): Promise<void> {
    if (accountId !== undefined) {
      await prisma.connectorToken.deleteMany({ where: { source, accountId } })
    } else {
      await prisma.connectorToken.deleteMany({ where: { source } })
    }
  },

  async isExpired(source: string, accountId = ''): Promise<boolean> {
    const record = await prisma.connectorToken.findUnique({
      where: { source_accountId: { source, accountId } },
    })
    if (!record || !record.expiresAt) return false
    return record.expiresAt.getTime() - Date.now() < EXPIRY_BUFFER_MS
  },

  async listBySource(source: string): Promise<Array<{ accountId: string } & TokenData>> {
    const records = await prisma.connectorToken.findMany({ where: { source } })
    return records.map((r) => ({
      accountId: r.accountId,
      accessToken: decryptString(r.accessToken),
      refreshToken: r.refreshToken ? decryptString(r.refreshToken) : undefined,
      expiresAt: r.expiresAt ?? undefined,
    }))
  },
}
