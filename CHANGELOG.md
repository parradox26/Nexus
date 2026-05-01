# Changelog

All notable changes to this project will be documented in this file.

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
