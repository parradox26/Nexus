# Changelog

All notable changes to this project will be documented in this file.

## 2026-05-02

### Changed: HighLevel authentication migrated from PIT to App-level OAuth 2.0

Previously Nexus used a Private Integration Token (PIT) scoped to a single sub-account, set via `HL_API_KEY` and `HL_LOCATION_ID` environment variables. This locked the platform to one HL location per deployment. It has been replaced with App-level OAuth 2.0, allowing any number of HL sub-accounts to connect to the same Nexus instance.

**Backend**

- `backend/prisma/schema.prisma` — Added `accountId String @default("")` to `ConnectorToken`; replaced `source @unique` with `@@unique([source, accountId])` so multiple HL locations can each have their own encrypted token row.
- `backend/src/auth/token.store.ts` — All methods (`save`, `get`, `delete`, `isExpired`) now accept an optional `accountId` parameter (defaults to `""`, preserving backwards-compatibility for Google/Facebook tokens). Added `listBySource(source)` to enumerate all tokens for a given source (used to list connected HL locations).
- `backend/src/highlevel/highlevel.client.ts` — Constructor changed from reading `HL_API_KEY` globally to accepting a `locationId`; access token is fetched from the token store per request with automatic refresh on expiry or 401. Removed all env-var-based auth. Static methods added: `getAuthUrl()`, `exchangeCode(code)`, `listConnectedLocations()`, `disconnectLocation(locationId)`. Token exchange uses `application/x-www-form-urlencoded` with `user_type: Location` as required by the HL OAuth endpoint.
- `backend/src/routes/highlevel.routes.ts` (new file) — Four routes mounted at `/api/connectors/highlevel`:
  - `POST /connect` → returns OAuth authorization URL for the frontend to open as a popup.
  - `GET /callback` → exchanges the authorization code, stores the token, returns an HTML bridge page that posts the result back to the opener and auto-closes.
  - `GET /locations` → lists all connected HL locations with token expiry timestamps.
  - `DELETE /locations/:locationId` → disconnects a specific location.
- `backend/src/sync/sync.engine.ts` — Removed the pre-built `HighLevelClient` constructor argument (kept only for test injection). Sync runs now resolve the HL location from the token store: if exactly one location is connected it is used automatically; if multiple are connected the caller must pass an explicit `locationId`; if none are connected the sync fails with a clear message.
- `backend/src/routes/sync.routes.ts` — `POST /:source` and `POST /:source/leads` now accept an optional `locationId` in the request body and forward it to the sync engine.
- `backend/src/app.ts` — Mounts `highlevelRouter` at `/api/connectors/highlevel` (before the generic connectors router so the path does not get swallowed).
- `backend/.env.example` — Removed `HL_API_KEY` and `HL_LOCATION_ID`; added `HL_REDIRECT_URI`. Updated comment to point to the HL Marketplace app registration page.

**Frontend**

- `frontend/src/types/index.ts` — Added `HLLocationStatus` interface (`locationId`, `tokenExpiresAt`).
- `frontend/src/api/client.ts` — Added `api.highlevel` namespace: `connect()`, `locations()`, `disconnect(locationId)`. `api.sync.run` and `api.sync.runLeads` now accept an optional `locationId` argument.
- `frontend/src/components/HLConnectionPanel.tsx` (new file) — Destination panel card. Shows "Not connected" state with a "Connect HighLevel" button, or a location selector and per-location disconnect controls when connected. Handles the OAuth popup lifecycle (postMessage + localStorage storage-event fallback, popup-closed poll, 120 s timeout). Exposes `selectedLocationId` / `onSelectLocation` props so the parent can lift selection state.
- `frontend/src/components/ConnectorList.tsx` — Accepts and forwards new `selectedLocationId` prop to each `ConnectorCard`.
- `frontend/src/components/ConnectorCard.tsx` — Passes `selectedLocationId` into `api.sync.run()` so every sync targets the correct HL sub-account.
- `frontend/src/App.tsx` — Adds a "Destination" section above the Connectors grid, renders `HLConnectionPanel`. Selected `locationId` is persisted to `localStorage` under `nexus:hl_location_id` so it survives page reloads.

**Tests**

- `backend/tests/integration/sync.flow.test.ts` — Replaced `process.env.HL_API_KEY` setup with the new OAuth env vars (`HL_CLIENT_ID`, `HL_CLIENT_SECRET`, `HL_REDIRECT_URI`). Updated `new HighLevelClient()` (no args) to `new HighLevelClient('test_location')` to satisfy the updated constructor signature.

**Migration steps required**

1. Run `npm run db:push` from `backend/` to apply the schema change (adds `accountId` column, updates unique constraint).
2. Register a HighLevel Marketplace app at `https://marketplace.gohighlevel.com/apps` to obtain `HL_CLIENT_ID` and `HL_CLIENT_SECRET`.
3. Set `HL_CLIENT_ID`, `HL_CLIENT_SECRET`, and `HL_REDIRECT_URI` in `.env`. Remove the now-unused `HL_API_KEY` and `HL_LOCATION_ID`.
4. Connect each HL sub-account through the Nexus UI — the "Destination" panel will guide through the OAuth flow.

---

## 2026-05-01

### Fixed: UI alignment to wireframe spec (metrics refresh, sync log detail, mobile responsiveness)

What changed:
- Updated `frontend/src/components/MetricsStrip.tsx`:
  - Metrics now refetch sync logs when `syncTrigger` changes, so "Total contacts synced" and "Last sync" update immediately after sync actions.
  - Metrics layout is now responsive (`1` column on small screens, `3` on larger screens).
- Updated `frontend/src/components/SyncLog.tsx`:
  - Replaced compact dot-row-only presentation with a richer status table view on desktop (`Source`, `Status`, `Attempted`, `Succeeded`, `Failed`, `Duration`, `Time`).
  - Added a dedicated mobile row layout for readability on narrow viewports.
  - Added semantic status pills for success/partial/failed.
- Updated `frontend/src/components/LeadsModal.tsx` and added `frontend/src/components/LeadRow.tsx`:
  - Leads now render with explicit desktop and mobile layouts.
  - Desktop keeps the 4-column structure; mobile stacks identity + metadata pills to prevent horizontal squeeze.
- Added `docs/UI_SPECS_WIREFRAMES.md` as the canonical UI spec + low-fidelity wireframes for current implementation and future iteration.

Why this was fixed:
- The implemented UI had drifted from the intended wireframe behavior in three places: metric freshness, sync history detail level, and mobile behavior for dense tables/grids.
- These updates make connector operations clearer, keep dashboard KPIs current after user actions, and preserve readability across desktop and mobile.

## 2026-04-30

### Fixed: Contacts modal card UI and readability

What changed:
- Reworked `frontend/src/components/ContactsModal.tsx` to render each contact as a clear, bordered card with consistent spacing, typography, and avatar treatment.
- Added resilient display fallbacks for incomplete contact data (name/avatar fallback logic).
- Replaced fragile utility-class dependence in key modal layout areas with explicit styles to avoid broken rendering in embedded environments.

Why this was fixed:
- Contact rows were rendering as visually broken/plain lines, making the modal look unpolished and hard to scan.
- Some records with partial data degraded the UI further.
- Explicit styling and better fallbacks make the modal consistently readable across desktop/mobile and embedded contexts.

### Fixed: Google OAuth popup did not close or update connector state automatically

What changed:
- Updated `backend/src/routes/auth.routes.ts` OAuth callback response behavior:
  - Default browser callback now returns a small HTML bridge (instead of raw JSON) that posts OAuth status to the opener and attempts auto-close.
  - Added fallback signaling via `localStorage` (`nexus:oauth_result`).
  - Kept JSON callback support for explicit API use with `?format=json`.
- Updated `frontend/src/components/ConnectorCard.tsx` connect flow:
  - Waits for OAuth completion via `postMessage`.
  - Listens for `storage` events as a cross-window fallback.
  - Polls connector status while popup is open, then refreshes UI immediately on success.
  - Adds clearer handling for popup-blocked, timeout, and early-close scenarios.

Why this was fixed:
- Users had to manually close the Google sign-in popup and refresh the main page before connector status changed to connected.
- In some embedded/sandboxed environments, popup messaging can be unreliable; multi-channel fallback handling ensures reliable completion behavior.
