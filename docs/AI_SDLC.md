# AI-First SDLC Documentation
## How AI Was Used to Build Nexus End-to-End

**Model used:** Claude Sonnet 4.6 via Claude Code (Anthropic CLI)  
**Orchestration:** Conversational agent with tool use (Read, Write, Edit, Bash, Grep, Glob)  
**Session approach:** Single long-running agent session, context-preserved across the full build

---

## Overview

This project was built using an **AI-first SDLC** — not AI-assisted, but AI-driven. Claude Code acted as the primary engineer across every phase: product definition, architecture, implementation, debugging, testing, and documentation. The human role was direction, review, and feedback.

The agent was given:
1. A high-level product brief ("build a Merge.dev-style integration platform for HighLevel")
2. A 12-step build order
3. A quality constraint set (no `any`, files under 200 lines, never crash on connector error)
4. Feedback on each output (errors, test results, UI screenshots)

Everything below documents the exact prompts, strategies, and AI decisions made at each stage.

---

## Stage 1 — Product & Architecture

### What AI did
- Interpreted the brief and clarified scope (normalization layer, not workflow builder)
- Defined the `UnifiedContact` / `UnifiedLead` / `SyncResult` schema
- Designed the `BaseConnector` abstraction pattern
- Proposed the connector registry (`Map<ConnectorSource, BaseConnector>`)
- Designed the dual-URL Supabase setup for Prisma migrations

### Key prompt
```
Build a fullstack "AI-native integration platform" for HighLevel.
This is a connector abstraction and normalization layer (like Merge.dev, not Zapier).
It must:
- Connect Google Contacts (real OAuth) and Facebook Lead Ads (documented mock)
- Normalize data into a UnifiedContact/UnifiedLead schema
- Sync normalized data into HighLevel CRM via their REST API
- Expose a consistent internal REST API across all connectors
- Render a React UI embeddable in HighLevel via Custom JS (single bundle)

Quality rules:
- No `any` — use unknown + type narrowing
- All files under 200 lines
- connector errors never crash the sync engine
- Consistent { success, data, error } response shape
- AES-256-GCM token encryption, fresh IV per call
```

### AI decisions made
- Chose `abstract class` over `interface` for `BaseConnector` so `sync()` can be concrete and inherited
- Put `sync()` in the base class (not connectors) so all error handling and logging is centralized
- Used `Map<ConnectorSource, BaseConnector>` in the registry (not array) for O(1) lookup and clean TS types
- Chose Prisma v6 explicitly after detecting v7 broke the `schema.prisma` format

---

## Stage 2 — Backend Scaffolding

### What AI did
- Generated the full directory structure from the brief
- Wrote all TypeScript files in dependency order (schema → utils → auth → connectors → routes → app)
- Configured `tsconfig.json`, `package.json`, Prisma schema
- Set up Pino logger, Express v5 middleware, CORS headers for HL embedding

### Prompt strategy: **dependency-ordered generation**

AI was prompted to generate files in strict dependency order so each file could import from already-written modules:

```
Step 1: schema/contact.schema.ts        (no imports)
Step 2: utils/crypto.ts                 (only Node crypto)
Step 3: auth/token.store.ts             (imports crypto + Prisma)
Step 4: connectors/base.connector.ts   (imports schema + token.store)
Step 5: connectors/google.connector.ts (imports base)
Step 6: connectors/facebook.connector.ts (imports base)
Step 7: highlevel/highlevel.client.ts  (imports schema)
Step 8: sync/sync.engine.ts            (imports connector types)
Step 9: routes/*                        (imports everything)
Step 10: app.ts                         (mounts routes)
```

This eliminated circular dependency issues entirely.

### TypeScript errors caught and fixed by AI
| Error | Root cause | Fix |
|---|---|---|
| `ConnectorMap` type mismatch | TS inferred wrong value type from constructor array | Changed to `new Map<ConnectorSource, BaseConnector>()` + `.set()` |
| `FacebookLead` cast to `Record<string,unknown>` | No index signature | Double cast: `as unknown as Record<string, unknown>` |
| Express v5 `req.params` typed as `string \| string[]` | `@types/express@5.0.6` change | Added `strParam()` helper in each route file |
| `AUTH_TAG_LENGTH` unused | Left over from crypto refactor | Removed |

---

## Stage 3 — Connector Implementation

### Google Connector (real)

**Prompt:**
```
Implement GoogleConnector extending BaseConnector.
- getAuthUrl() builds Google OAuth2 authorization URL with contacts.readonly scope
- authenticate(code) exchanges code for access + refresh tokens, stores encrypted
- fetchContacts() handles pagination via nextPageToken, retries on 401 (token refresh),
  surfaces 403 scope errors and 429 rate limits with Retry-After header
- mapToContact() maps GooglePerson → UnifiedContact
All HL API calls go through the inherited sync() — do not re-implement sync logic.
```

**AI decisions:**
- Stored tokens as a single encrypted JSON blob (not separate fields) to avoid partial-write issues
- Added 5-minute buffer on `isExpired()` for proactive token refresh before API calls fail
- `mapToContact()` made pure (no side effects, no async) so it can be unit tested without mocking

### Facebook Connector (mock)

**Prompt:**
```
Implement FacebookConnector as a clearly documented mock.
- Add a comment block at the top explaining what real implementation requires
  (App Review, leads_retrieval permission, webhook subscription)
- 5 hardcoded leads with realistic field_data structure matching real Facebook Lead Ads API
- mapToContact() must use the real field_data parsing pattern (find by name, values[0])
- Token storage must use real AES encryption even though the token is fake
- Mark clearly: "production-accurate mapping, simulated OAuth"
```

**AI decision:** Mock was not a shortcut — it was designed to be a drop-in replacement. The real connector would only change `authenticate()` and `fetchContacts()`. `mapToContact()` is identical.

---

## Stage 4 — HighLevel API Integration

### Initial implementation (v1 — wrong)
The AI initially used the v1 HL API (`rest.gohighlevel.com/v1`). When the user reported auth failures, the AI diagnosed:

> "The v1 API doesn't accept Private Integration Tokens (PITs). PITs are for the v2 API only."

**Fix prompt (user-initiated):**
```
im using HL PIT
```

**AI action:** Updated base URL to `services.leadconnectorhq.com`, added `Version: 2021-07-28` header, added `locationId` to request body, updated all paths to v2 format.

### Duplicate contact handling

**Problem reported by user:**
```json
{ "reason": "Request failed with status code 400", "recordId": "fb_lead_005" }
```

**AI diagnosis process:**
1. Added error body logging to surface HL's actual response
2. HL returned: `"This location does not allow duplicated contacts."`
3. HL uses HTTP 400 (not 409) for duplicates — standard REST convention violated

**Fix prompt (user-specified behavior):**
```
duplicate should not fail, they should get accepted and error should be a 
warning that tried adding duplicates, dont overwrite though
```

**AI solution:**
- Added `DuplicateContactError` class
- Detected in `postWithRetry()` by message string match: `"does not allow duplicated contacts"`
- Caught in `BaseConnector.sync()` loop → `succeeded++` + `warnings.push()` (not `failed++`)
- Added `warnings: SyncError[]` to `SyncResult` schema
- Updated frontend to show warnings in amber below sync progress bar

### Phone normalization

**Problem:** All 5 Facebook leads failed. AI traced it to E.164 format requirement.

```
+91-9876543210   →  HighLevel rejects (has dashes)
+919876543210    →  HighLevel accepts (E.164)
```

**Fix:** Added `normalizePhone()` to `HighLevelClient` — strips all non-digit characters except leading `+`. Runs on every contact before push.

---

## Stage 5 — Testing

### Unit tests (AI-generated)

**Prompt:**
```
Write Jest unit tests for GoogleConnector.mapToContact() and 
FacebookConnector.mapToContact(). These are pure functions — no mocking of 
external APIs needed. Test:
- Full field mapping (all fields present)
- Missing optional fields (phone, company — should not throw)
- Empty arrays (names[], emailAddresses[] — graceful fallback)
- Null nested values
- raw field preservation (original object must be in result.raw)
- source field is exactly 'google' / 'facebook'
```

**Result:** 13 unit tests, all passing. AI correctly identified that `mapToContact()` is pure and requires zero mocking.

### Crypto tests (AI-generated)

**Prompt:**
```
Test the encrypt/decrypt roundtrip in utils/crypto.ts:
- Roundtrip: encrypt then decrypt returns original string
- Empty string handling
- Unicode characters (emoji, CJK)
- IV randomness: two encryptions of same plaintext produce different IVs and ciphertexts
- encryptString/decryptString JSON roundtrip
- isExpired: 4 minutes until expiry → expired (5min buffer), 10 minutes → not expired
```

**Result:** 10 tests, all passing.

### Integration test (AI-generated)

**Prompt:**
```
Write integration tests for the full Facebook sync flow.
Mock: tokenStore (in-memory), syncLogger (capture calls), HighLevelClient (track calls).
Test:
1. connect() stores mock token
2. fetchContacts() returns 5 contacts
3. mapToContact() output shape (firstName, lastName, email, source)
4. full sync returns SyncResult with attempted:5, succeeded:5, failed:0
5. HighLevelClient.createOrUpdateContact() called with correct shape
6. partial failure: 1 of 5 HL calls rejects → succeeded:4, failed:1
7. dryRun: HL client never called, result still returned
8. SyncLogger.write() called with correct status
```

**Result:** 8 integration tests, all passing. Total: 31/31.

### Edge case scenarios (AI-generated)

AI was also asked to identify edge cases not yet covered:

```
What are the top edge cases a developer would miss when building a contact 
sync engine that reads from Google People API and writes to HighLevel CRM?
```

AI identified:
- Token expiry during a long paginated fetch (handled: refresh before each page)
- HL rate limiting mid-sync (handled: exponential backoff on 429)
- Contact with no email (unhandled — HL requires email; future: skip + warn)
- Concurrent syncs from two browser tabs (unhandled — no lock; future: distributed lock)
- HL returning 400 for duplicates instead of 409 (discovered during real testing)
- Phone format variation across countries (handled: `normalizePhone()`)

---

## Stage 6 — Frontend

### UI scaffolding

**Prompt:**
```
Build a React/Vite frontend for this platform. Single bundle output for HighLevel Custom JS.
Components needed:
- ConnectorCard: connect/sync/disconnect with loading states, OAuth popup, sync result
- ConnectorList: responsive grid, loading skeleton, error state
- SyncLog: colored status badges, timestamp, duration column
- StatusBadge: connected/not connected pill

Quality rules: typed hooks, no prop drilling beyond 2 levels, 
useConnectors and useSyncLog custom hooks, API client typed with return types.
```

### Nexus design system

User provided a detailed design spec. AI implemented it across 12 files in one pass:

**AI approach:** Rather than Tailwind utility classes for one-off pixel values, AI used inline `style` props for spec-exact values (`0.5px` borders, `#E0DEF7` border colors, `20px` pill radius) and Tailwind classes only for layout (`flex`, `grid`, `gap-*`). This avoided Tailwind's JIT generating incorrect approximations for fractional values.

**Key design decisions:**
- `ConnectorCard` status icon: 44×44px with state-aware background (green/amber/red/indigo) + SVG icon — communicates connection state visually without text
- `StatusBadge` semantic variants: `connected`, `mock`, `syncing`, `neutral` — Facebook as "mock" not "connected" accurately represents its simulated state
- `ContactsModal` triggered by "View contacts" button — lets users verify what will be synced before committing
- Logo via `<img src="/nexus_logo.svg">` not inline SVG — so swapping the file updates the logo everywhere without code changes

### Logo bug (AI self-correction)

Initial implementation used an inline SVG component in App.tsx. User reported:
1. Logo was huge (no explicit size constraints on SVG without width/height attributes)
2. Changing the `/public/nexus_logo.svg` file had no effect (inline SVG ignores the file)

AI diagnosed both causes and switched to `<img src="/nexus_logo.svg" width={24} height={24} style={{ filter: 'brightness(0) invert(1)' }}>` — fixing size control and making the file the single source of truth.

---

## Stage 7 — Documentation

**Prompt:**
```
add your context in a common agents file so that other models can use that
```

AI created:
- `CLAUDE.md` — auto-loaded by Claude Code, contains critical rules and sharp edges
- `AGENTS.md` — model-agnostic version for GPT/Gemini/other agents, pasteable as context
- `docs/PRD.md` — this PRD
- `docs/AI_SDLC.md` — this document

**Design principle for agent docs:** The files prioritize **sharp edges and gotchas** over happy-path documentation. Any agent reading `CLAUDE.md` learns within the first 10 lines: use Prisma v6, HL returns 400 for duplicates, phone must be E.164. These are the facts that take hours to discover through errors.

---

## Orchestration Strategy

### How the AI session was structured

```
User provides brief
       ↓
AI generates plan (12 steps, dependency order)
       ↓
AI implements step → runs tsc → fixes errors → confirms zero errors
       ↓
User tests → reports error / behavior
       ↓
AI diagnoses root cause → proposes fix → implements
       ↓
User confirms or gives new direction
       ↓
(repeat)
```

### What worked well
- **Dependency-ordered file generation** — writing files in import order eliminated most circular dependency errors
- **TypeScript as the feedback loop** — running `tsc --noEmit` after every change caught errors immediately before they became runtime bugs
- **Pure function isolation** — `mapToContact()` being pure meant it could be tested without infrastructure; AI designed this intentionally
- **Error body logging** — when HL returned opaque 400 errors, AI added explicit logging of `err.response?.data` to surface the real cause

### What required human feedback
- v1 vs v2 HL API — AI used v1 initially; user's "im using HL PIT" redirected to v2
- Duplicate handling behavior — "don't fail, treat as warning" was a product decision only the user could make
- Design system — colors, radii, typography were user-specified; AI implemented exactly
- Logo file issue — user noticed the visual problem; AI diagnosed and fixed

### Prompt patterns that worked best

**1. Behavioral constraints upfront:**
> "The sync() method must never throw. Catch all errors, return partial SyncResult."

This produced safer code than asking for error handling as an afterthought.

**2. "Documented mock" framing:**
> "Implement as a clearly documented mock. The real implementation would only change authenticate() and fetchContacts()."

This kept the mock production-accurate rather than simplified.

**3. Specific test scenarios:**
> "Test: partial failure — 1 of 5 HL calls rejects → succeeded:4, failed:1"

Concrete scenarios produced better tests than "test edge cases."

**4. Error reproduction:**
> Pasting the exact JSON error response into the prompt

Let AI trace the exact failure path rather than guessing.

---

## Stage 8 — Post-MVP Iterations

After the initial MVP was complete, the user drove a second session of targeted changes through conversational prompts. Each change below maps a user prompt to the exact code that changed.

---

### 8.1 — Redirect URI Blocked by HighLevel

**User prompt:**
```
can not have highlevel reference in uri
```

**Context:** HighLevel's Marketplace rejects OAuth redirect URIs that contain the word "highlevel" in the path. The original route was mounted at `/api/connectors/highlevel/callback`.

**AI action:**
- Renamed all HL routes from `/api/connectors/highlevel` to `/api/hl` in `app.ts`
- Updated all frontend API calls in `frontend/src/api/client.ts`
- Updated `HL_REDIRECT_URI` in `.env.example` and `.env`
- Updated the registered redirect URI in the HighLevel Marketplace app settings (user action)

**Files changed:** `backend/src/app.ts`, `frontend/src/api/client.ts`, `backend/.env`, `backend/.env.example`

---

### 8.2 — Merge Conflict Resolution

**User prompt:**
```
resolve merge conflicts
```

**Context:** A feature branch (`7b2f591`) had been merged in that added a new gradient header layout, a `SyncHeader` component, and a `handleSyncAll` function. This conflicted with `App.tsx` and `ConnectorList.tsx` on `main`.

**AI action:**
- Kept both the new gradient header/`SyncHeader` from the incoming branch and the `HLConnectionPanel` Destination section from HEAD
- Added missing `const [syncingAll, setSyncingAll] = useState(false)` — the incoming branch's `handleSyncAll` referenced this state but never declared it
- Dropped unused `isTwoColumn` state from HEAD (CSS `auto-fill` handles responsiveness)

**Files changed:** `frontend/src/App.tsx`, `frontend/src/components/ConnectorList.tsx`

---

### 8.3 — Google Sync 422 Errors

**User prompt:**
```
[Shared JSON of 4 failing Google contacts with 422 errors]
EMAIL IS NULLABLE IN BOTH API
```

**Context:** 4 Google contacts failed to sync with HTTP 422. Initial diagnosis was that HL requires email — AI added a skip guard in `BaseConnector`. User then linked the HL API docs showing email is nullable, not required.

**AI diagnosis:** The real issue was `email: ''` (empty string) being sent to HL. HL rejects empty string but accepts omitted field.

**Fix:**
```typescript
// Before — always sent email:
const body = { firstName, lastName, email: contact.email, locationId }

// After — only include email when truthy:
const body: Record<string, unknown> = { firstName, lastName, locationId }
if (contact.email) body.email = contact.email
```

**Also reverted:** The skip guard added to `BaseConnector.sync()` was removed — contacts without email should still be attempted.

**Files changed:** `backend/src/highlevel/highlevel.client.ts`, `backend/src/connectors/base.connector.ts`

---

### 8.4 — iframe Embedding via Custom Pages

**User prompt:**
```
[Shared HighLevel Custom Pages docs URL]
```

**Context:** The original plan was to embed Nexus via HighLevel Custom JS (a script tag). The user shared docs showing Custom Pages use iframes. The browser blocks iframes unless the server sends a `frame-ancestors` CSP header.

**AI action:**
- Added `Content-Security-Policy: frame-ancestors` header to Express middleware allowing `*.gohighlevel.com`, `*.leadconnectorhq.com`, `*.msgsndr.com`
- Confirmed relative API URLs work correctly inside the iframe (iframe origin = Railway URL)
- Updated README Embedding section from Custom JS to Custom Pages

```typescript
res.header(
  'Content-Security-Policy',
  'frame-ancestors https://*.gohighlevel.com https://*.leadconnectorhq.com https://*.msgsndr.com'
)
```

**Files changed:** `backend/src/app.ts`, `README.md`

---

### 8.5 — Sub-Account Scoping

**User prompt:**
```
im seeing both accounts attached on a subaccount A in highlevel, idea should be 
that when nexus app is installed it should automatically register to sidebar if 
possible, and then sign in for that subaccount only
```

**Context:** HighLevel Custom Pages inject `?locationId={{location.id}}` into the iframe URL per sub-account. Without reading this param, the UI showed all connected locations regardless of which sub-account the user was viewing.

**AI action:**
- Added `embeddedLocationId` — read from URL params in `App.tsx`:
  ```typescript
  const embeddedLocationId = useMemo(() =>
    new URLSearchParams(window.location.search).get('locationId'), [])
  ```
- Passed `embeddedLocationId` to `HLConnectionPanel`
- Added `visibleLocations` filter: when embedded, only show the location matching the URL param
- Updated status badge to show "Connected"/"Not connected" when embedded (instead of count)
- Hidden when embedded: location selector dropdown
- Also noted: the Custom Page URL in HL Marketplace app settings must include `?locationId={{location.id}}`

**Files changed:** `frontend/src/App.tsx`, `frontend/src/components/HLConnectionPanel.tsx`

---

### 8.6 — Remove "Add Connector" Button

**User prompt:**
```
remove the add connector button from top bar
```

**AI action:** Removed the "Add connector" `<button>` element from the header in `App.tsx`. No logic changes — the button had no handler implementation.

**Files changed:** `frontend/src/App.tsx`

---

### 8.7 — Remove "Add Another Location" Button

**User prompt:**
```
remove add another sub-account button, can this be automated during 
installation or after installation
```

**Context:** The `HLConnectionPanel` had an "Add another location" button to connect additional HL sub-accounts. The user wanted a single location per installation.

**AI action:**
- Removed "Add another location" button entirely from `HLConnectionPanel`
- Explained the two automation levels:
  - **Level 1 (implemented):** Marketplace install flow auto-connects via `window.opener` detection in the OAuth bridge
  - **Level 2 (future):** HL webhook on install event could trigger auto-connect server-side

**Files changed:** `frontend/src/components/HLConnectionPanel.tsx`

---

### 8.8 — Marketplace Install-Triggered OAuth

**User prompt:**
```
lets implement level 1
```
```
[Shared install URL format from HL Marketplace — auto-generated, not a separate Install URL field]
```

**Context:** When a user installs the app from the HL Marketplace, HL sends an OAuth code to the registered redirect URI — same URI as manual connect. The challenge was distinguishing install flow (full-page redirect, no opener) from manual popup flow (has opener).

**First approach (wrong):** Server-side `?install=1` detection. Reverted when user revealed HL auto-generates the install URL from the registered redirect_uri — there is no separate Install URL field.

**Final approach:** Client-side `window.opener` detection in the bridge HTML:

```javascript
const isPopup = !!(window.opener && !window.opener.closed);
if (!isPopup) {
  // Marketplace install — full-page redirect to app
  setTimeout(function () {
    if (payload.success && payload.locationId) {
      window.location.href = '/?locationId=' + encodeURIComponent(payload.locationId);
    } else {
      window.location.href = '/';
    }
  }, payload.success ? 800 : 1500);
  return;
}
// Manual popup — postMessage + close
try { window.opener.postMessage(payload, '*'); } catch (_err) {}
setTimeout(function() { window.close(); }, 150);
```

**Files changed:** `backend/src/routes/highlevel.routes.ts`

---

### 8.9 — Production OAuth Error

**User prompt:**
```
after login redirection opens:
https://nexus-production-ca4a.up.railway.app/api/hl/callback?code=3f1fb911...
but give error
is anything needed to change in .env
```

**AI diagnosis:** Railway's environment still had `HL_REDIRECT_URI=http://localhost:3000/api/hl/callback`. During the OAuth token exchange, HL validates that the `redirect_uri` in the request matches what is registered in the Marketplace app settings. Mismatch → token exchange fails.

**Fix:** Update `HL_REDIRECT_URI` in Railway dashboard to the production URL:
```
HL_REDIRECT_URI=https://nexus-production-ca4a.up.railway.app/api/hl/callback
```

**No code changes** — environment-only fix. Also cleaned up stale `.env` variables (`HL_PIT`, `HL_API_KEY`, `HL_LOCATION_ID`) that had been leftover from the v1 PIT-based implementation.

**Files changed:** `backend/.env` (env vars only, not code)

---

## Trade-offs and Decisions

| Decision | Alternative | Why this choice |
|---|---|---|
| Prisma v6 (pinned) | Prisma v7 | v7 removed `url` from `schema.prisma`, requires `prisma.config.ts` adapter — unnecessary complexity |
| AES-256-GCM for token storage | Plaintext or bcrypt | Tokens need to be decrypted for API calls — bcrypt is one-way; AES is reversible with key |
| Single encrypted JSON blob | Separate columns per field | Atomic write — no partial token state possible |
| `DuplicateContactError` as warning | Skip silently or fail | User specified: "accept duplicates, show warning" — middle ground |
| `<img>` for logo | Inline SVG | Inline SVG ignores file changes; img tag makes file the single source of truth |
| Inline style props for pixel-exact values | Tailwind arbitrary values | `0.5px` borders and specific hex colors are cleaner in style props; Tailwind JIT can approximate |
| `mapToContact()` as pure function | Async method with side effects | Pure = testable without mocking; async = harder to test and unnecessary |
| Facebook as documented mock | Skip until real | Shows the abstraction works; documents the real path; production-replaceable |
| Warnings separate from errors in SyncResult | Single `errors` array | Semantic distinction matters: duplicates are not failures; UI can style them differently |
