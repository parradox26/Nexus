# CLAUDE.md — Project Context for AI Agents

This file is auto-loaded by Claude Code. It captures everything an agent needs to work on this project without re-discovering conventions, sharp edges, or fixes already applied.

---

## What This Project Is

**Nexus** — a connector abstraction and normalization layer between third-party apps and HighLevel CRM.
- Think **Merge.dev**, not Zapier. It normalizes data, not workflows.
- Connectors pull contacts, map them to a `UnifiedContact` schema, and push to HighLevel via REST.
- Single-page React UI (`/frontend`) embeddable in HighLevel via Custom JS.
- Express backend (`/backend`) with Prisma + Supabase (PostgreSQL).

---

## Tech Stack (exact versions matter)

| Layer | Choice | Notes |
|---|---|---|
| Runtime | Node.js + TypeScript | `strict: true`, no `any` |
| Backend | Express v5 | Params typed as `string \| string[]` — use `strParam()` helper |
| ORM | Prisma **v6** (not v7) | v7 removed `url` from schema.prisma — stay on v6 |
| Database | PostgreSQL via Supabase | Dual-URL: pooler for runtime, direct for migrations |
| Frontend | React + Vite + Tailwind v3 | Single bundle output for HL Custom JS embedding |
| Styling | Nexus design system | Inter font, indigo `#6366F1` primary — see `AGENTS.md` |

---

## Project Structure

```
highlevel-integration-platform/
├── backend/
│   ├── prisma/schema.prisma          # Two models: ConnectorToken, SyncLog
│   ├── src/
│   │   ├── schema/contact.schema.ts  # UnifiedContact, SyncResult, SyncError — source of truth
│   │   ├── connectors/
│   │   │   ├── base.connector.ts     # Abstract class + sync() loop (never throws)
│   │   │   ├── google.connector.ts   # Real OAuth2, Google People API
│   │   │   ├── facebook.connector.ts # Documented mock (5 hardcoded leads)
│   │   │   └── connector.registry.ts # Map<ConnectorSource, BaseConnector>
│   │   ├── auth/token.store.ts       # Prisma-backed AES-256-GCM encrypted token store
│   │   ├── highlevel/highlevel.client.ts # HL API v2 client (services.leadconnectorhq.com)
│   │   ├── sync/
│   │   │   ├── sync.engine.ts        # Connector-agnostic run() / runAll()
│   │   │   └── sync.logger.ts        # Writes SyncLog rows to Prisma
│   │   ├── routes/
│   │   │   ├── connectors.routes.ts  # GET /api/connectors, POST /:source/connect, DELETE /:source/disconnect
│   │   │   ├── contacts.routes.ts    # GET /api/contacts?source=&limit=&skip=
│   │   │   ├── leads.routes.ts       # GET /api/leads?source=&limit=&skip=
│   │   │   ├── sync.routes.ts        # POST /api/sync/:source, POST /api/sync/:source/leads, GET /api/sync/logs
│   │   │   └── auth.routes.ts        # GET /api/connectors/:source/callback (OAuth)
│   │   ├── utils/
│   │   │   ├── crypto.ts             # AES-256-GCM encrypt/decrypt (fresh IV per call)
│   │   │   └── logger.ts             # Pino logger
│   │   └── app.ts                    # Express app, CORS *, error middleware
│   └── .env.example                  # All required env vars documented
├── railway.json                      # Railway deploy config — build + start commands
└── frontend/
    ├── public/nexus_logo.svg         # Logo file — header loads this via <img> + CSS filter
    ├── tailwind.config.js            # Nexus color tokens (primary, n-bg, n-border, etc.)
    ├── src/
    │   ├── App.tsx                   # Nexus header (indigo pill) + MetricsStrip + sections
    │   ├── types/index.ts            # Frontend mirror of backend schema types
    │   ├── api/client.ts             # Typed fetch wrapper — all routes covered
    │   ├── hooks/
    │   │   ├── useConnectors.ts      # Fetches connector list with loading/error/refetch
    │   │   └── useSyncLog.ts         # Fetches sync logs with configurable limit
    │   └── components/
    │       ├── ConnectorCard.tsx      # Full card anatomy — status icon, meta, progress bar, actions
    │       ├── ConnectorList.tsx      # Grid — receives connectors as props (lifted to App.tsx)
    │       ├── MetricsStrip.tsx       # 3-metric summary (active count, total synced, last sync)
    │       ├── StatusBadge.tsx        # Semantic pill: connected/mock/syncing/neutral
    │       ├── SyncLog.tsx            # Dot-row table with duration column
    │       ├── ContactsModal.tsx      # Overlay — fetches and lists contacts for a connector
    │       └── LoadingSkeleton.tsx    # CardSkeleton + RowSkeleton (animated bars)
```

---

## Canonical Types (never duplicate these)

Everything imports from `backend/src/schema/contact.schema.ts`:

```typescript
type ConnectorSource = 'google' | 'facebook' | 'stripe_mock'

interface UnifiedContact {
  id: string; source: ConnectorSource; sourceId: string
  firstName: string; lastName: string; email: string
  phone?: string; company?: string; tags?: string[]
  customFields?: Record<string, unknown>; syncedAt?: Date
  raw: Record<string, unknown>  // always preserved
}

interface SyncResult {
  connectorSource: ConnectorSource
  attempted: number; succeeded: number; failed: number
  errors: SyncError[]    // real failures — count toward failed
  warnings: SyncError[]  // duplicates skipped — count toward succeeded
  timestamp: Date
}
```

Frontend mirror lives in `frontend/src/types/index.ts` — keep in sync manually.

---

## API Contract

All responses: `{ success: boolean, data?: T, error?: string }`

| Method | Path | Body / Query | Returns |
|---|---|---|---|
| GET | `/api/health` | — | `{ status: 'ok' }` |
| GET | `/api/connectors` | — | `{ connectors: ConnectorStatus[] }` |
| POST | `/api/connectors/:source/connect` | — | `{ authUrl? }` or `{ connected: true }` |
| DELETE | `/api/connectors/:source/disconnect` | — | `{ connected: false }` |
| GET | `/api/contacts` | `?source=&limit=&skip=` | `{ contacts[], total }` |
| GET | `/api/leads` | `?source=&limit=&skip=` | `{ leads[], total }` |
| POST | `/api/sync/:source` | `{ dryRun?: boolean }` | `SyncResult` |
| POST | `/api/sync/:source/leads` | `{ dryRun?: boolean }` | `SyncResult` |
| GET | `/api/sync/logs` | `?source=&limit=` | `{ logs: SyncLog[] }` |
| GET | `/api/connectors/:source/callback` | `?code=` | OAuth redirect handler |

---

## Critical Rules

### Never break these

1. **`sync()` never throws** — the `BaseConnector.sync()` method catches all errors and returns partial `SyncResult`. A connector error must not crash the engine.

2. **Duplicate contacts = warning, not failure** — HL returns HTTP 400 with `"does not allow duplicated contacts"`. Detected in `postWithRetry()`, throws `DuplicateContactError`, caught in sync loop → `succeeded++` + `warnings.push()`. Do not revert this to a failure.

3. **Phone numbers must be E.164** — `normalizePhone()` in `highlevel.client.ts` strips dashes/spaces before sending to HL. `+91-9876543210` → `+919876543210`. Always run phone through this.

4. **Prisma v6 only** — v7 changed the schema format. `package.json` pins `prisma` and `@prisma/client` to `^6.7.0`. Do not upgrade.

5. **HL API v2 only** — base URL is `https://services.leadconnectorhq.com`, requires header `Version: 2021-07-28`. The old v1 (`rest.gohighlevel.com/v1`) does not work with PITs (Private Integration Tokens).

6. **No custom fields in HL contact body** — sending `customFields` with keys that don't exist in the account causes HTTP 400. The body sent to HL contains only: `firstName`, `lastName`, `email`, `phone` (if present), `tags` (if present), `locationId`.

7. **`strParam()` on all Express route params** — Express v5 types params as `string | string[]`. Use the local helper in each route file: `function strParam(val) { return Array.isArray(val) ? val[0] ?? '' : val ?? '' }`.

8. **Supabase dual-URL** — `DATABASE_URL` = Session Pooler (runtime), `DIRECT_URL` = direct connection (migrations only). Both must be set.

### Style rules

- No `any` — use `unknown` + type narrowing or double cast `as unknown as T`
- Files stay under 200 lines
- Response shape: always `{ success, data?, error? }`
- No comments explaining what code does — only why (hidden constraints, workarounds)

---

## Environment Variables

```bash
# backend/.env
PORT=3000
NODE_ENV=development

DATABASE_URL=postgresql://postgres.[ref]:[pw]@aws-0-[region].pooler.supabase.com:5432/postgres
DIRECT_URL=postgresql://postgres:[pw]@db.[ref].supabase.co:5432/postgres

TOKEN_ENCRYPTION_KEY=<64-char hex>   # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
INTERNAL_API_KEY=                    # optional in dev

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/connectors/google/callback

HL_API_KEY=pit-xxxx                  # Private Integration Token (PIT), not Agency key
HL_LOCATION_ID=                      # Must match the location the PIT is scoped to

# frontend/.env (optional — defaults to localhost:3000)
VITE_API_BASE_URL=http://localhost:3000
```

---

## HighLevel Integration Notes

- **PIT (Private Integration Token)** is the correct auth method, not the old agency API key.
- `HL_LOCATION_ID` must match the location the PIT was created for. Mismatch causes silent 400s.
- HL API returns HTTP 400 (not 409) for duplicate contacts — message contains `"does not allow duplicated contacts"`.
- HL rejects phone numbers with dashes — must be E.164 (`+919876543210` not `+91-9876543210`).
- Do not send `source` field or `customFields` unless those custom fields are created in the HL account first.

---

## Git & Deployment

- **Git root**: `highlevel-integration-platform/` is the repo root (`.git` lives here). The parent `d:\work\highlevel` is NOT the repo.
- **Railway**: `railway.json` at repo root. Build command builds frontend then backend. Start command: `node backend/dist/app.js`.
- **HL embed**: Frontend is served as static files from Express (`/index.js`, `/index.css`). Add to HL Custom Code:
  ```html
  <div id="nexus-app" style="min-height:700px;width:100%"></div>
  <link rel="stylesheet" href="https://YOUR.railway.app/index.css">
  <script type="module" src="https://YOUR.railway.app/index.js"></script>
  ```
- **Frontend mount point**: `main.tsx` looks for `#nexus-app` first, then falls back to `#root` (local dev).
- **API base URL**: Empty string in production (relative URLs, co-hosted). Set `VITE_API_BASE_URL=http://localhost:3000` in `frontend/.env.local` for local dev.

---

## Running the Project

```bash
# Backend
cd backend
cp .env.example .env   # fill in values
npm install
npm run db:generate
npm run db:push        # needs DIRECT_URL set
npm run dev            # http://localhost:3000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev            # http://localhost:5173

# Tests (backend)
cd backend
npm test               # 31 tests — unit + integration
```

---

## Adding a New Connector

1. Create `backend/src/connectors/yourapp.connector.ts` extending `BaseConnector`
2. Implement: `authenticate`, `refreshTokenIfNeeded`, `fetchContacts`, `mapToContact`, `disconnect`
3. Add to registry: `registry.set('yourapp', new YourAppConnector())` in `connector.registry.ts`
4. Extend `ConnectorSource` type in `schema/contact.schema.ts` and `frontend/src/types/index.ts`
5. Add env vars to `.env.example`
6. Add brand icon and meta to `CONNECTOR_META` in `frontend/src/components/ConnectorCard.tsx`

Do **not** add sync logic to the connector — `sync()` is inherited from `BaseConnector`.

---

## Future Enhancements

### AI-Native Features (not yet implemented at runtime)

The platform is not yet AI-native at runtime — AI was used to build it, not used by it. These are the enhancements that would fulfill the "AI-Native Integration Platform" title:

| Feature | What to build | Where |
|---|---|---|
| **AI field mapper** | LLM maps any raw API response → `UnifiedContact`. Eliminates hardcoded `mapToContact()` for new sources. | New `ai.mapper.ts` util, called as fallback in `BaseConnector` |
| **Semantic deduplication** | Embeddings-based fuzzy match before HL push. Current logic is exact email match only. | Pre-sync step in `BaseConnector.sync()` |
| **Auto-connector scaffolding** | User pastes sample API response → Claude generates full connector class | New `POST /api/connectors/scaffold` route |
| **Natural language sync filters** | Plain English rule → runtime filter function via LLM | Filter step in `SyncEngine.run()` |
| **AI conflict resolution** | Conflicting field values across sources → LLM picks canonical value with reasoning trace | Merge step during normalization |

### Data Model Gaps

`UnifiedLead` — implemented and exposed via `/api/leads` and `POST /api/sync/:source/leads`. Lead metadata synced to HL as prefixed tags (`campaign:`, `ad:`, `source:`).

Missing unified models (not yet implemented):

| Model | HL Endpoint | Source candidates | Priority |
|---|---|---|---|
| `UnifiedDeal` | `/opportunities/` | Stripe payments, CRM exports | High — Stripe customers map cleanly to pipeline deals with value + stage |
| `UnifiedNote` | `/contacts/{id}/notes/` | CRM migrations, support tickets | Medium — attach sync provenance notes per contact |
| `UnifiedTask` | `/contacts/{id}/tasks/` | Asana, Notion, Linear | Medium |
| `UnifiedAppointment` | `/calendars/events/` | Google Calendar, Calendly | Medium — Google connector already OAuth'd |
| `UnifiedMessage` | `/conversations/messages/` | SMS history, email threads | Low |
| `UnifiedInvoice` | `/invoices/` | Stripe, QuickBooks | Low |
| `UnifiedCompany` | (via contact `companyName` field) | HubSpot, Salesforce exports | Low |

**Highest value next step**: `UnifiedDeal` + Stripe connector — Stripe customers have monetary value, plan, and status that map directly to HL opportunity stage and deal value. No mock needed; Stripe's test mode covers dev.

### HL API Notes for New Entity Types

- **Opportunities** require `pipelineId` and `pipelineStageId` — both must be fetched from `/opportunities/pipelines/` first and stored per location
- **Notes/Tasks** are sub-resources scoped to a contact ID — contact must exist in HL before note/task can be created
- **Appointments** require `calendarId` — fetch from `/calendars/` first
- **Messages** require an existing conversation — use `/conversations/search/` to find or create one by contact
- All entity pushes follow the same pattern as contacts: normalize → push → handle 400/429/5xx in `postWithRetry`

### Infrastructure

- **Scheduled sync** — `node-cron` or BullMQ for background auto-sync (currently manual only)
- **Webhook ingestion** — HL pushes events → platform reacts in real time
- **Real Facebook connector** — replace mock; requires Facebook App Review (2–4 weeks)
- **User auth** — no auth on internal routes currently; needs JWT or session layer
- **Two-way sync** — HL webhooks exist but require a public endpoint; currently push-only
- **Marketplace install-triggered OAuth** — when a user installs the app from the HL Marketplace, HL sends an OAuth code to the Install URL at install time. The callback should detect `?install=1` and redirect to the app UI instead of returning the popup-close bridge page. This would connect the HL sub-account automatically at install, eliminating the manual "Connect HighLevel" step entirely.
