# Changelog

All notable changes to this project will be documented in this file.

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
