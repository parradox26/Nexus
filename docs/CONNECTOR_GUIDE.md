# Adding a New Connector to Nexus

This guide walks through every file you need to touch to add a new data source. The example used throughout is **HubSpot**, but the steps are identical for any OAuth2 API.

There are **7 touch points** across backend and frontend. The sync engine, routes, and HighLevelClient require zero changes.

---

## Overview

```
backend/src/schema/contact.schema.ts   ← extend ConnectorSource type
backend/src/connectors/hubspot.ts      ← new connector class
backend/src/connectors/registry.ts     ← register it
backend/.env.example                   ← document env vars

frontend/src/types/index.ts            ← mirror ConnectorSource type
frontend/src/components/primitives.tsx ← icon + CONNECTOR_META entry
frontend/src/components/ConnectorCard.tsx ← card description string
```

---

## Step 1 — Extend `ConnectorSource` (2 files)

**`backend/src/schema/contact.schema.ts`**
```typescript
// Before:
export type ConnectorSource = 'google' | 'facebook' | 'stripe_mock'
// After:
export type ConnectorSource = 'google' | 'facebook' | 'stripe_mock' | 'hubspot'
```

**`frontend/src/types/index.ts`** — mirror the same change:
```typescript
export type ConnectorSource = 'google' | 'facebook' | 'stripe_mock' | 'hubspot'
```

Keep these two in sync manually. TypeScript will surface any missed callsite as a type error.

---

## Step 2 — Write the connector class

Create `backend/src/connectors/hubspot.connector.ts`:

```typescript
import { BaseConnector, FetchOptions } from './base.connector'
import { UnifiedContact, ConnectorSource } from '../schema'
import { tokenStore } from '../auth/token.store'
import axios from 'axios'

export class HubSpotConnector extends BaseConnector {
  readonly name = 'HubSpot'
  readonly source: ConnectorSource = 'hubspot'
  isConnected = false

  // Called by GET /api/connectors/hubspot/callback?code=...
  // Exchange the OAuth code for access + refresh tokens and store them encrypted.
  async authenticate(code: string): Promise<void> {
    const res = await axios.post('https://api.hubapi.com/oauth/v1/token', new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.HUBSPOT_CLIENT_ID!,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
      redirect_uri: process.env.HUBSPOT_REDIRECT_URI!,
      code,
    }))
    await tokenStore.save(this.source, {
      accessToken: res.data.access_token,
      refreshToken: res.data.refresh_token,
      expiresAt: new Date(Date.now() + res.data.expires_in * 1000),
    })
    this.isConnected = true
  }

  // Called automatically before every sync.
  // Checks if the token is within 5 minutes of expiry and refreshes proactively.
  async refreshTokenIfNeeded(): Promise<void> {
    const token = await tokenStore.get(this.source)
    if (!token) { this.isConnected = false; return }
    this.isConnected = true
    if (!tokenStore.isExpired(token)) return
    const res = await axios.post('https://api.hubapi.com/oauth/v1/token', new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.HUBSPOT_CLIENT_ID!,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
      refresh_token: token.refreshToken!,
    }))
    await tokenStore.save(this.source, {
      accessToken: res.data.access_token,
      refreshToken: res.data.refresh_token,
      expiresAt: new Date(Date.now() + res.data.expires_in * 1000),
    })
  }

  // Fetch all records from the external API. Handle pagination here.
  // Call mapToContact() on each raw record — do not push to HL here.
  async fetchContacts(_options?: FetchOptions): Promise<UnifiedContact[]> {
    const token = await tokenStore.get(this.source)
    const contacts: UnifiedContact[] = []
    let after: string | undefined

    do {
      const res = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
        headers: { Authorization: `Bearer ${token!.accessToken}` },
        params: { limit: 100, after, properties: 'firstname,lastname,email,phone,company' },
      })
      contacts.push(...res.data.results.map((r: unknown) => this.mapToContact(r)))
      after = res.data.paging?.next?.after
    } while (after)

    return contacts
  }

  // Pure function — synchronous, no side effects, no API calls.
  // Maps one raw API response object → UnifiedContact.
  // Must be pure so it can be unit tested without any infrastructure.
  mapToContact(raw: unknown): UnifiedContact {
    const r = raw as { id: string; properties: Record<string, string> }
    return {
      id: crypto.randomUUID(),
      source: this.source,
      sourceId: r.id,
      firstName: r.properties.firstname ?? '',
      lastName: r.properties.lastname ?? '',
      email: r.properties.email ?? '',
      phone: r.properties.phone,         // omit key if undefined — do NOT send ''
      company: r.properties.company,
      tags: ['hubspot'],
      raw: r as unknown as Record<string, unknown>,
    }
  }

  // Return an OAuth URL for the frontend popup flow.
  // Called by POST /api/connectors/hubspot/connect.
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: process.env.HUBSPOT_CLIENT_ID!,
      redirect_uri: process.env.HUBSPOT_REDIRECT_URI!,
      scope: 'crm.objects.contacts.read',
      response_type: 'code',
    })
    return `https://app.hubspot.com/oauth/authorize?${params}`
  }

  async disconnect(): Promise<void> {
    await tokenStore.delete(this.source)
    this.isConnected = false
  }
}
```

### Rules for `mapToContact`

| Rule | Reason |
|---|---|
| Must be synchronous and pure | Lets it be unit-tested without mocking any infrastructure |
| `raw` must always be populated | Preserves original payload for debugging and future re-mapping |
| `email` must be a string (can be `''`) | HighLevel rejects `null`; omitting the field is handled by HighLevelClient |
| `phone` — omit key if not present | HighLevel rejects `''` for phone; `undefined` means the key is omitted from the push body |
| `id` must be `crypto.randomUUID()` | The internal ID is Nexus-scoped; `sourceId` carries the external record ID |

---

## Step 3 — Register in the registry

**`backend/src/connectors/connector.registry.ts`**
```typescript
import { HubSpotConnector } from './hubspot.connector'

registry.set('hubspot', new HubSpotConnector())
```

---

## Step 4 — Add env vars

**`backend/.env.example`**
```bash
# HubSpot OAuth
HUBSPOT_CLIENT_ID=
HUBSPOT_CLIENT_SECRET=
HUBSPOT_REDIRECT_URI=http://localhost:3000/api/connectors/hubspot/callback
```

The callback route `GET /api/connectors/:source/callback` is already implemented in `auth.routes.ts` and works for any registered source — no new route needed.

---

## Step 5 — Add the icon and meta to the frontend

**`frontend/src/components/primitives.tsx`** — add a glyph component and register it in `CONNECTOR_META`:

```typescript
function HubSpotGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {/* paste HubSpot's official SVG path here */}
    </svg>
  )
}

const CONNECTOR_META: Record<ConnectorSource, { Glyph: React.FC<{ size?: number }>; auth: string; leadCapable?: boolean }> = {
  google:      { Glyph: GoogleGlyph,   auth: 'oauth2' },
  facebook:    { Glyph: FacebookGlyph, auth: 'oauth2', leadCapable: true },
  stripe_mock: { Glyph: StripeGlyph,   auth: 'oauth2' },
  hubspot:     { Glyph: HubSpotGlyph,  auth: 'oauth2' },   // ← add this
}
```

Set `leadCapable: true` if your connector exposes `fetchLeads()` returning `UnifiedLead[]` with campaign/ad metadata.

---

## Step 6 — Add the card description

**`frontend/src/components/ConnectorCard.tsx`**
```typescript
const CONNECTOR_DESCRIPTIONS: Record<ConnectorSource, string> = {
  google:      'Pull contacts from Google People API and sync to HighLevel.',
  facebook:    'Capture leads from Facebook Lead Ads with campaign + ad metadata.',
  stripe_mock: 'Sync Stripe customers as contacts. Maps plan + lifecycle.',
  hubspot:     'Pull contacts from HubSpot CRM and sync to HighLevel.',   // ← add this
}
```

If the connector exposes lead metadata (campaign ID, ad ID, form ID), also add it to `LEADS_SOURCES` so the "View leads" button appears on the card:
```typescript
const LEADS_SOURCES: ConnectorSource[] = ['facebook', 'hubspot']
```

---

## Step 7 — Write unit tests

Add a test file at `backend/tests/unit/hubspot.mapper.test.ts`. `mapToContact()` is a pure function — it needs no mocking:

```typescript
import { HubSpotConnector } from '../../src/connectors/hubspot.connector'

const connector = new HubSpotConnector()

const fixture = {
  id: 'hs_001',
  properties: {
    firstname: 'Ananya',
    lastname: 'Mehta',
    email: 'ananya@example.com',
    phone: '+919001234567',
    company: 'Acme',
  },
}

describe('HubSpotConnector.mapToContact', () => {
  it('maps all fields correctly', () => {
    const contact = connector.mapToContact(fixture)
    expect(contact.firstName).toBe('Ananya')
    expect(contact.lastName).toBe('Mehta')
    expect(contact.email).toBe('ananya@example.com')
    expect(contact.phone).toBe('+919001234567')
    expect(contact.company).toBe('Acme')
    expect(contact.source).toBe('hubspot')
    expect(contact.sourceId).toBe('hs_001')
  })

  it('preserves raw field', () => {
    const contact = connector.mapToContact(fixture)
    expect(contact.raw).toEqual(fixture)
  })

  it('handles missing optional fields without throwing', () => {
    const minimal = { id: 'hs_002', properties: { firstname: 'Test', lastname: '', email: '' } }
    const contact = connector.mapToContact(minimal)
    expect(contact.phone).toBeUndefined()
    expect(contact.company).toBeUndefined()
  })

  it('tags contain connector source', () => {
    const contact = connector.mapToContact(fixture)
    expect(contact.tags).toContain('hubspot')
  })
})
```

---

## What you never need to change

| File | Why |
|---|---|
| `sync/sync.engine.ts` | Calls `connector.sync()` — inherited from `BaseConnector`, connector-agnostic |
| `routes/sync.routes.ts` | Uses `getConnector(source)` — works for any registered source |
| `routes/contacts.routes.ts` | Same — source-agnostic |
| `routes/auth.routes.ts` | `GET /api/connectors/:source/callback` handles any registered source |
| `highlevel/highlevel.client.ts` | Receives `UnifiedContact` — doesn't care where it came from |
| `auth/token.store.ts` | Keyed by `ConnectorSource` — works for any string value |

---

## Checklist

- [ ] `ConnectorSource` extended in `backend/src/schema/contact.schema.ts`
- [ ] `ConnectorSource` extended in `frontend/src/types/index.ts`
- [ ] Connector class created with all 5 abstract methods implemented
- [ ] `getAuthUrl()` added if OAuth popup flow is needed
- [ ] Registered in `connector.registry.ts`
- [ ] Env vars added to `.env.example`
- [ ] Glyph component + `CONNECTOR_META` entry added in `primitives.tsx`
- [ ] Description added to `CONNECTOR_DESCRIPTIONS` in `ConnectorCard.tsx`
- [ ] Unit tests written for `mapToContact()` covering full mapping, missing fields, raw preservation
