# Nexus UI Specs and Wireframes

## 1. Purpose and Scope

This document defines UI specifications and low-fidelity wireframes for the Nexus frontend based on:
- `AGENTS.md`
- `CLAUDE.md`
- `README.md`

Product intent: a connector abstraction UI for pulling records from third-party sources, normalizing them, and syncing to HighLevel CRM. This is an integration control panel, not a workflow builder.

## 2. Users and Core Jobs

Primary user:
- RevOps/admin user managing connector health and sync operations.

Core jobs:
- Connect or disconnect data sources.
- Trigger manual sync.
- Inspect sync success/failure quickly.
- Inspect fetched records (contacts/leads) before or after sync.

## 3. Information Architecture

Single-page structure:
- Header: product identity + active connector summary.
- Metrics strip: top-level operational KPIs.
- Connectors section: one card per connector with actions.
- Sync history section: recent sync logs.
- Overlays/modals: contacts list, leads list.

## 4. Visual System Specification

### 4.1 Design Tokens

Use Nexus tokens documented in `AGENTS.md` / `CLAUDE.md`:
- Page background: `#F5F4FF` (`n-bg`)
- Card surface: `#FFFFFF`
- Primary: `#6366F1`
- Primary hover/dark: `#534AB7`
- Primary light: `#EEEDFE`
- Border: `#E0DEF7` (`0.5px`)

Status semantics:
- Connected: `bg #EAF3DE`, text `#3B6D11`, border `#C0DD97`
- Mock: `bg #FAEEDA`, text `#854F0B`, border `#FAC775`
- Error: `bg #FCEBEB`, text `#A32D2D`, border `#F7C1C1`
- Syncing: `bg #EEEDFE`, text `#534AB7`, border `#CECBF6`
- Neutral: `bg #F1EFE8`, text `#5F5E5A`, border `#D3D1C7`

Radii:
- Badge: 4px
- Inputs/buttons: 8px
- Cards: 12px
- Pills: 20px

Typography:
- Inter, weights 400/500/600

### 4.2 Spacing and Layout

- App container: `max-width ~80rem` (`max-w-5xl` in current app).
- Vertical rhythm between major sections: 20px.
- Card padding: ~16px to 20px.
- Internal card row gap: 8px to 12px.

## 5. Screen Specifications

## 5.1 Main Dashboard (`App.tsx`)

Purpose:
- Operational command center for integrations.

Content:
- Header bar with logo/title/subtitle and active count pill.
- Metrics strip.
- Connectors grid/list.
- Sync history list/table.

Behavior:
- Refresh connector and log data after connect/disconnect/sync completion.
- Keep API failures non-fatal at UI level and show error surfaces in component context.

Empty states:
- No connectors: show placeholder cards or text in connector section.
- No logs: show empty sync history message.

## 5.2 Connector Card (`ConnectorCard.tsx`)

Purpose:
- Per-connector control + feedback.

Data shown:
- Connector name + source label.
- Status badge (`connected`, `mock`, `syncing`, disconnected).
- Last sync relative timestamp.
- Last sync result summary (attempted/succeeded/failed/warnings).

Primary actions:
- Disconnected: `Connect`.
- Connected: `Sync now`, `View contacts`, optional `View leads`, `Disconnect`.

Rules:
- `View leads` appears only for lead-capable sources (`facebook` currently).
- Duplicate records are warnings, not failures; surface count separately in sync result block.
- `Syncing...`, `Connecting...`, `Disconnecting...` states disable relevant actions.

Error handling:
- In-card error panel (red semantic styling).
- Preserve last valid sync summary when possible unless explicitly reset.

## 5.3 Contacts Modal (`ContactsModal.tsx`)

Purpose:
- Inspect fetched contacts for a connector.

Requirements:
- Overlay with dismiss on backdrop click and close button.
- Scrollable list body with loading, error, and empty states.
- Show core fields: name, email, phone/company if available.

## 5.4 Leads Modal (`LeadsModal.tsx`)

Purpose:
- Inspect lead-specific metadata from lead sources.

Columns:
- Contact
- Lead Source
- Campaign
- Ad

Requirements:
- Show monospaced metadata pills for source/campaign/ad IDs.
- Show clean fallback glyph (`-`) when metadata missing.
- Keep lead identity readable (avatar initials + display name + email).

## 5.5 Sync History (`SyncLog.tsx`)

Purpose:
- Audit recent sync runs and outcomes.

Requirements:
- Show source, status, attempted/succeeded/failed, duration, timestamp.
- Preserve clear status color mapping.
- Support recent-limit fetch (default currently 10).

## 6. Interaction and State Matrix

Connector card states:
1. Disconnected idle
2. Connecting (OAuth popup flow or mock connect)
3. Connected idle
4. Syncing
5. Partial success (warnings/failures present)
6. Error (connect/sync/disconnect failure)

Modal states (contacts/leads):
1. Loading spinner
2. Error text state
3. Empty result state
4. Populated list state

OAuth flow notes:
- Popup blocked: show actionable error.
- Popup closed before completion: show specific cancellation message.
- Timeout (~120s): show timeout message.
- If callback message is missed, fallback polling checks connector status.

## 7. Low-Fidelity Wireframes

## 7.1 Desktop Dashboard

```text
+----------------------------------------------------------------------------------+
| [Nexus logo] Nexus                          [ 2 of 3 active ]                  |
| Integration Platform for HighLevel                                             |
+----------------------------------------------------------------------------------+
| [Metric 1: Active Connectors] [Metric 2: Total Synced] [Metric 3: Last Sync]   |
+----------------------------------------------------------------------------------+
| CONNECTORS                                                                       |
| +--------------------------------+  +--------------------------------+          |
| | [icon] Google        [Connected]|  | [icon] Facebook      [Mock]   |          |
| | google - oauth2                 |  | facebook - mock                |          |
| | Last sync: 2h ago - 21 contacts |  | Last sync: 5m ago - 5 contacts |          |
| | 21 / 22 synced          95%      |  | 5 / 5 synced           100%    |          |
| | [=======progress====== ]         |  | [=======progress=======]       |          |
| | [Sync now] [View contacts]       |  | [Sync now] [View contacts]     |          |
| | [Disconnect]                     |  | [View leads] [Disconnect]      |          |
| +--------------------------------+  +--------------------------------+          |
+----------------------------------------------------------------------------------+
| SYNC HISTORY                                                                     |
| Source     Status    Attempted   Succeeded   Failed   Duration   Time            |
| Google     Success   22          21          1        1.4s       2h ago          |
| Facebook   Success   5           5           0        0.7s       5m ago          |
+----------------------------------------------------------------------------------+
```

## 7.2 Connector Card (Disconnected)

```text
+------------------------------------+
| [icon] Google          [Not Connected]
| google - oauth2                    |
|                                    |
| [Connect]                          |
+------------------------------------+
```

## 7.3 Leads Modal

```text
+------------------------------------------------------------------------------+
| [f] Facebook leads                                     [x]                  |
| 5 records with campaign metadata                                            |
+------------------------------------------------------------------------------+
| Contact                         | Lead Source | Campaign  | Ad              |
+------------------------------------------------------------------------------+
| [RS] Rahul Sharma               | src:meta    | camp:123  | ad:456          |
|      rahul@email.com            |             |           |                 |
| [AM] Ana Mora                   | -           | camp:987  | -               |
|      ana@email.com              |             |           |                 |
+------------------------------------------------------------------------------+
```

## 7.4 Mobile Dashboard

```text
+--------------------------------------+
| [Nexus]                 [2/3 active] |
+--------------------------------------+
| [Metric 1] [Metric 2] [Metric 3]     |
+--------------------------------------+
| CONNECTORS                            |
| +----------------------------------+ |
| | Google                [Connected]| |
| | Last sync: 2h ago                | |
| | [Sync now]                        | |
| | [View contacts] [Disconnect]      | |
| +----------------------------------+ |
| +----------------------------------+ |
| | Facebook               [Mock]     | |
| | [Sync now]                        | |
| | [View contacts] [View leads]      | |
| | [Disconnect]                      | |
| +----------------------------------+ |
+--------------------------------------+
| SYNC HISTORY                          |
| Google - success - 21/22 - 2h ago     |
| Facebook - success - 5/5 - 5m ago     |
+--------------------------------------+
```

## 8. API and Data Binding Requirements

Endpoints used by UI:
- `GET /api/connectors`
- `POST /api/connectors/:source/connect`
- `DELETE /api/connectors/:source/disconnect`
- `GET /api/contacts?source=&limit=&skip=`
- `GET /api/leads?source=&limit=&skip=`
- `POST /api/sync/:source`
- `POST /api/sync/:source/leads`
- `GET /api/sync/logs?source=&limit=`

Contract expectation:
- Response envelope is always `{ success, data?, error? }`.
- UI should display server `error` string directly where safe and user-actionable.

## 9. UX Acceptance Criteria

1. User can connect a disconnected connector from its card without page reload.
2. After successful connection/sync/disconnect, connector status refreshes automatically.
3. During connect/sync/disconnect, action buttons show loading labels and prevent duplicate clicks.
4. Sync summary shows attempted, succeeded, failed, and warnings clearly.
5. Duplicate-contact warnings are visible but do not appear as hard failures.
6. Lead-capable connectors expose `View leads` and open a dedicated lead metadata modal.
7. All sections handle loading, empty, and error states without layout collapse.
8. Desktop and mobile layouts remain readable with long names/emails via truncation.

## 10. Not In Scope (Current Iteration)

- Workflow automation builder
- Real-time websocket activity
- Advanced filtering/search in modals
- Multi-tenant workspace switcher
- AI-native runtime features (mapper, dedupe, NL rules) beyond placeholders

## 11. Notes on Doc Alignment

There is one known documentation mismatch:
- `AGENTS.md` describes leads as not yet exposed.
- Current frontend/api surface includes `/api/leads`, `/api/sync/:source/leads`, and `LeadsModal`.

Recommendation:
- Keep this UI spec aligned to the implemented behavior and update `AGENTS.md` to remove that outdated lead gap note if backend implementation is confirmed complete.


