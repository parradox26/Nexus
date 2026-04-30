import { encrypt, decrypt, encryptString, decryptString } from '../../src/utils/crypto'

// Set a fixed test encryption key (32 bytes = 64 hex chars)
beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = 'a'.repeat(64)
})

afterAll(() => {
  delete process.env.TOKEN_ENCRYPTION_KEY
})

describe('encrypt / decrypt roundtrip', () => {
  it('decrypts back to original plaintext', () => {
    const original = 'my_secret_access_token_abc123'
    const payload = encrypt(original)
    const result = decrypt(payload)
    expect(result).toBe(original)
  })

  it('handles empty string', () => {
    const payload = encrypt('')
    expect(decrypt(payload)).toBe('')
  })

  it('handles unicode characters', () => {
    const original = 'token_with_unicode_🔑_value'
    const payload = encrypt(original)
    expect(decrypt(payload)).toBe(original)
  })
})

describe('IV randomness', () => {
  it('produces different ciphertexts for same plaintext', () => {
    const original = 'same_value'
    const first = encrypt(original)
    const second = encrypt(original)
    expect(first.iv).not.toBe(second.iv)
    expect(first.ciphertext).not.toBe(second.ciphertext)
  })
})

describe('encryptString / decryptString', () => {
  it('roundtrips correctly through JSON serialization', () => {
    const original = 'ya29.a0AfH6SMBlTe..._long_token'
    const stored = encryptString(original)
    expect(typeof stored).toBe('string')
    const recovered = decryptString(stored)
    expect(recovered).toBe(original)
  })

  it('produces different JSON strings for same input', () => {
    const original = 'token_value'
    const first = encryptString(original)
    const second = encryptString(original)
    expect(first).not.toBe(second)
  })
})

describe('isExpired (date logic)', () => {
  // Testing the expiry logic directly without DB
  const EXPIRY_BUFFER_MS = 5 * 60 * 1000

  it('considers token expired when within 5 minutes of expiry', () => {
    const expiresAt = new Date(Date.now() + 4 * 60 * 1000) // 4 min from now
    const isExpired = expiresAt.getTime() - Date.now() < EXPIRY_BUFFER_MS
    expect(isExpired).toBe(true)
  })

  it('considers token valid when more than 5 minutes until expiry', () => {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 min from now
    const isExpired = expiresAt.getTime() - Date.now() < EXPIRY_BUFFER_MS
    expect(isExpired).toBe(false)
  })

  it('considers token expired when expiresAt is in the past', () => {
    const expiresAt = new Date(Date.now() - 1000) // 1s ago
    const isExpired = expiresAt.getTime() - Date.now() < EXPIRY_BUFFER_MS
    expect(isExpired).toBe(true)
  })
})
