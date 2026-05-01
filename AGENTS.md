# AGENTS.md — Universal Project Context

Paste this file into any AI agent's context window to onboard it to this project.
This file is the canonical source of truth for architecture, conventions, and sharp edges.

---

## Project Overview

**Name:** Nexus
**Type:** Connector abstraction + normalization layer (like Merge.dev, not Zapier)
**Purpose:** Pull contacts from third-party apps, normalize to a unified schema, push to HighLevel CRM.

**Connectors built:**
- Google Contacts — real OAuth2 + Google People API
- Facebook Lead Ads — documented mock (real API requires 2–4 week App Review)

**Stack:**
- Backend: Node.js / TypeScript / Express v5 / Prisma v6 / PostgreSQL (Supabase)
- Frontend: React / Vite / Tailwind CSS v3 (Nexus design system)
- Auth: AES-256-GCM token encryption, Google OAuth2, HL Private Integration Token (PIT)

---

## Directory Layout

```
highlevel-integration-platform/
├── CLAUDE.md                         ← Claude Code auto-loads this
├── AGENTS.md                         ← This file (model-agnostic context)
├── backend/
│   ├── prisma/schema.prisma
│   ├── src/
│   │   ├── schema/contact.schema.ts  ← ALL shared types live here
│   │   ├── connectors/               ← BaseConnector + Google + Facebook + registry
│   │   ├── auth/token.store.ts       ← Encrypted token persistence (Prisma)
│   │   ├── highlevel/highlevel.client.ts ← HL API v2 client
│   │   ├── sync/                     ← SyncEngine + SyncLogger
│   │   ├── routes/                   ← connectors / contacts / sync / auth
│   │   ├── utils/                    ← crypto.ts (AES-256-GCM) + logger.ts (Pino)
│   │   └── app.ts
│   └── .env.example
└── frontend/
    ├── public/nexus_logo.svg         ← Swap this file to change the logo
    ├── tailwind.config.js
    └── src/
        ├── App.tsx
        ├── types/index.ts            ← Frontend mirror of backend schema types
        ├── api/client.ts             ← Typed fetch wrapper
        ├── hooks/                    ← useConnectors, useSyncLog
        └── components/               ← ConnectorCard, ConnectorList, MetricsStrip,
                                          StatusBadge, SyncLog, ContactsModal, LoadingSkeleton
```

---

## Core Types (single source of truth)

File: `backend/src/schema/contact.schema.ts`

```typescript
type ConnectorSource = 'google' | 'facebook' | 'stripe_mock'

interface UnifiedContact {
  id: string
  source: ConnectorSource
  sourceId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  company?: string
  tags?: string[]
  customFields?: Record<string, unknown>
  syncedAt?: Date
  raw: Record<string, unknown>  // always preserve the original API response
}

interface UnifiedLead extends UnifiedContact {
  leadSource?: string
  campaignId?: string
  formId?: string
  adId?: string
}

interface SyncResult {
  connectorSource: ConnectorSource
  attempted: number
  succeeded: number  // includes duplicates (they are skipped, not failed)
  failed: number
  errors: SyncError[]    // real failures — increments failed
  warnings: SyncError[]  // duplicate skips — increments succeeded, not failed
  timestamp: Date
}

interface SyncError {
  recordId: string
  reason: string
  raw?: unknown
}
```

**Rule:** When adding fields to these types, also update `frontend/src/types/index.ts` — it's a manual mirror.

---

## API Endpoints

Base URL: `http://localhost:3000` (dev) or Railway URL (prod)

All responses follow `{ success: boolean, data?: T, error?: string }`.

```
GET    /api/health
GET    /api/connectors
POST   /api/connectors/:source/connect
DELETE /api/connectors/:source/disconnect
GET    /api/connectors/:source/callback?code=   ← OAuth redirect handler
GET    /api/contacts?source=&limit=&skip=
POST   /api/sync/:source                        body: { dryRun?: boolean }
GET    /api/sync/logs?source=&limit=
```

---

## HighLevel API — Critical Facts

1. **Use v2 API only** (`https://services.leadconnectorhq.com`, header `Version: 2021-07-28`)
   - Old v1 (`rest.gohighlevel.com/v1`) does NOT work with PITs
2. **Auth:** Private Integration Token (PIT) in `Authorization: Bearer <pit-token>`
3. **`locationId` is required** in the POST body when creating contacts
4. **Phone format must be E.164** — `+919876543210`, NOT `+91-9876543210`
   - `normalizePhone()` in `highlevel.client.ts` handles this automatically
5. **Duplicate contacts** — HL returns HTTP **400** (not 409) with message `"does not allow duplicated contacts"`
   - Detected and thrown as `DuplicateContactError` in `postWithRetry()`
   - Caught in `BaseConnector.sync()` → `succeeded++` + `warnings.push()` (NOT a failure)
6. **Do not send `customFields`** unless those field keys exist in the HL account — causes 400
7. **Do not send `source` field** — HL accepts it but the enum is unpredictable across accounts

---

## BaseConnector Pattern

```typescript
abstract class BaseConnector {
  abstract readonly name: string
  abstract readonly source: ConnectorSource
  abstract isConnected: boolean

  // Implement these 5 in each connector:
  abstract authenticate(code: string): Promise<void>
  abstract refreshTokenIfNeeded(): Promise<void>
  abstract fetchContacts(options?: FetchOptions): Promise<UnifiedContact[]>
  abstract mapToContact(raw: unknown): UnifiedContact
  abstract disconnect(): Promise<void>

  // This is INHERITED — do not re-implement in concrete connectors:
  async sync(hlClient, dbLog, options): Promise<SyncResult>
  // sync() NEVER throws — catches everything, returns partial SyncResult
}
```

**Adding a connector:**
1. `src/connectors/yourapp.connector.ts` — extend `BaseConnector`, implement 5 methods
2. `src/connectors/connector.registry.ts` — `registry.set('yourapp', new YourAppConnector())`
3. `src/schema/contact.schema.ts` — add `'yourapp'` to `ConnectorSource`
4. `frontend/src/types/index.ts` — mirror the type change
5. `frontend/src/components/ConnectorCard.tsx` — add to `CONNECTOR_META` map
6. `backend/.env.example` — document new env vars

---

## Token Encryption

File: `backend/src/utils/crypto.ts`
- Algorithm: AES-256-GCM
- Key: 32-byte hex from `TOKEN_ENCRYPTION_KEY` env var
- Fresh random IV per encrypt call
- `encryptString(plain)` → JSON string with `{ciphertext, iv, authTag}`
- `decryptString(stored)` → original plaintext

File: `backend/src/auth/token.store.ts`
- Prisma `ConnectorToken` model, one row per source (upsert)
- `save(source, tokens)`, `get(source)`, `delete(source)`, `isExpired(source)`
- `isExpired` returns true if less than 5 minutes until expiry (proactive refresh buffer)

---

## Prisma Schema

```prisma
model ConnectorToken {
  id           String    @id @default(cuid())
  source       String    @unique
  accessToken  String    // AES-256-GCM encrypted JSON string
  refreshToken String?
  expiresAt    DateTime?
  iv           String    // set to 'embedded' — IV is inside the encrypted JSON
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model SyncLog {
  id          String   @id @default(cuid())
  source      String
  status      String   // 'success' | 'partial' | 'failed'
  attempted   Int
  succeeded   Int
  failed      Int
  errors      Json?    // contains both errors AND warnings from SyncResult
  durationMs  Int
  triggeredBy String
  createdAt   DateTime @default(now())
}
```

**Supabase dual-URL (required):**
- `DATABASE_URL` = Session Pooler — used at runtime
- `DIRECT_URL` = Direct connection — used only by `prisma db push` / `migrate`

---

## Frontend Design System (Nexus)

**Font:** Inter (Google Fonts, weights 400/500/600)
**Page background:** `#F5F4FF`
**Card surface:** `#FFFFFF`

**Key color tokens (also in `tailwind.config.js`):**
```
primary:        #6366F1   (indigo)
primary-dark:   #534AB7   (hover)
primary-light:  #EEEDFE   (backgrounds, pills)
n-border:       #E0DEF7   (all card/divider borders — 0.5px width)
n-bg:           #F5F4FF   (page background)
```

**Status semantic colors:**
```
connected: bg #EAF3DE  text #3B6D11  border #C0DD97
mock:      bg #FAEEDA  text #854F0B  border #FAC775
error:     bg #FCEBEB  text #A32D2D  border #F7C1C1
syncing:   bg #EEEDFE  text #534AB7  border #CECBF6
neutral:   bg #F1EFE8  text #5F5E5A  border #D3D1C7
```

**Header bar:** `#6366F1` background, `border-radius: 10px`, `padding: 14px 18px`
- Logo: `<img src="/nexus_logo.svg" width=24 height=24 style="filter: brightness(0) invert(1)">` — replace the file to update logo everywhere

**All borders:** `0.5px solid #E0DEF7`
**Border radii:** badges 4px, buttons/inputs 8px, cards 12px, status pills 20px

---

## Future Enhancements

### AI-Native Features (the platform is not yet AI-native at runtime)

The assignment title is "AI-Native Integration Platform." Currently AI was used to *build* the platform but is not used at *runtime*. The following features would make it genuinely AI-native:

| Feature | Description | Entry point |
|---|---|---|
| **AI field mapper** | Send any raw API response to Claude → receive a normalized `UnifiedContact` JSON. Eliminates hardcoded `mapToContact()` per connector. New sources work without writing mapping code. | Replace `mapToContact()` in `BaseConnector` with an LLM call for unknown connectors |
| **Semantic deduplication** | Use text embeddings to detect fuzzy duplicates — "R. Sharma / rahul@gmail.com" matches "Rahul Sharma / rahul@gmail.com". Current detection is exact string match on email only. | Pre-sync step in `sync()` before pushing to HL |
| **Auto-connector scaffolding** | User pastes a sample API response or API docs URL → Claude generates the full connector class (auth, fetch, map). | New `/api/connectors/scaffold` endpoint |
| **Natural language sync filters** | Sync rule expressed in plain English: "Only sync leads from paid campaigns" → LLM converts to a runtime filter function applied before push. | Filter step in `SyncEngine.run()` |
| **AI conflict resolution** | Two sources have same contact with conflicting fields → Claude picks the more recent/valid value with a reasoning trace. | Merge step during normalization |

### Data Model Gaps

| Model | Status | Notes |
|---|---|---|
| `UnifiedContact` | Implemented + synced | Google Contacts source |
| `UnifiedLead` | Schema defined, Facebook connector produces it, **not exposed via API** | Need `/api/leads` route + `fetchLeads()` on connectors that support it |
| `UnifiedDeal` | Not implemented | Would map to HL Opportunities |
| `UnifiedCompany` | Not implemented | Would map to HL account/company fields |
| `UnifiedNote` | Not implemented | Activity/note syncing |

**Leads gap specifically:** `FacebookConnector.mapToContact()` creates a `UnifiedLead` with `campaignId` and `adId`, but `fetchContacts()` returns `UnifiedContact[]` — the lead-specific fields are dropped at the return boundary. A proper implementation needs:
1. `fetchLeads()` abstract method on connectors that source leads
2. `/api/leads?source=` endpoint
3. Lead metadata (`campaignId`, `adId`) passed to HL as tags or custom fields

### Infrastructure

| Enhancement | Description |
|---|---|
| Scheduled sync | Cron-based background sync via `node-cron` or BullMQ. Currently manual-only. |
| Webhook ingestion | HL pushes events → platform reacts. Removes polling entirely. |
| Multi-tenant | One deployment serves multiple HL locations with isolated token stores. |
| Real Facebook connector | Replace mock with live Graph API. Requires Facebook App Review (2–4 weeks). |
| User authentication | Currently no auth on internal routes. Needs session or JWT layer. |

---

## Known Sharp Edges

| Issue | Root cause | Fix applied |
|---|---|---|
| Prisma v7 breaks | v7 removed `url` from `schema.prisma` | Pinned to v6 |
| Express v5 param types | `req.params.x` is `string \| string[]` | `strParam()` helper in each route file |
| Supabase IPv6 direct connection | Newer Supabase projects use IPv6 on direct host | `DIRECT_URL` = pooler host for migrations |
| HL 400 on duplicate contacts | HL returns 400 not 409 for duplicates | Detected by message string, thrown as `DuplicateContactError` |
| HL 400 on phone with dashes | HL requires E.164 format | `normalizePhone()` strips non-digit chars |
| HL 400 on unknown customFields | Keys must exist in HL account first | Removed customFields from POST body |
| SVG logo not updating | Inline SVG in App.tsx ignores file changes | Switched to `<img src="/nexus_logo.svg">` |

---

## Testing

```bash
cd backend && npm test
# 31 tests total:
# - unit/contact.mapper.test.ts    (13 tests) — Google + Facebook mapToContact() pure functions
# - unit/token.store.test.ts       (10 tests) — AES-256-GCM encrypt/decrypt roundtrips
# - integration/sync.flow.test.ts  (8 tests)  — Full Facebook sync with mocked HL client
```

All tests mock `tokenStore`, `syncLogger`, and `HighLevelClient`.
`mapToContact()` tests require no mocking — they're pure functions.

---

## Environment Variables Required

```bash
# backend/.env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres.[ref]:[pw]@aws-0-[region].pooler.supabase.com:5432/postgres
DIRECT_URL=postgresql://postgres:[pw]@db.[ref].supabase.co:5432/postgres
TOKEN_ENCRYPTION_KEY=<64-char hex>
INTERNAL_API_KEY=                  # optional in dev
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/connectors/google/callback
HL_API_KEY=pit-xxxx                # PIT — not the old agency API key
HL_LOCATION_ID=                    # Must match the location the PIT is scoped to

# frontend/.env (optional)
VITE_API_BASE_URL=http://localhost:3000
```
