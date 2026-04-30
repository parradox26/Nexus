import { useState } from 'react'
import { ConnectorSource, ConnectorStatus, SyncResult } from '../types'
import { api } from '../api/client'
import { StatusBadge } from './StatusBadge'
import { ContactsModal } from './ContactsModal'

// ── Status icon SVGs ──────────────────────────────────────────────────────────

function ConnectedIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path d="M5 10.5l3.5 3.5L15 7" stroke="#3B6D11" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MockIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <circle cx="10" cy="10" r="8" stroke="#854F0B" strokeWidth="1.5" strokeDasharray="3.5 2" />
      <circle cx="10" cy="10" r="2.5" fill="#854F0B" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path d="M6 6l8 8M14 6l-8 8" stroke="#A32D2D" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function DisconnectedIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <circle cx="10" cy="10" r="8" stroke="#534AB7" strokeWidth="1.5" opacity="0.5" />
      <path d="M7 10h6" stroke="#534AB7" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 7v6" stroke="#534AB7" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ── Config ────────────────────────────────────────────────────────────────────

type IconState = 'connected' | 'mock' | 'error' | 'disconnected'

const ICON_STATE_STYLES: Record<IconState, { bg: string; icon: React.ReactElement }> = {
  connected:    { bg: '#EAF3DE', icon: <ConnectedIcon /> },
  mock:         { bg: '#FAEEDA', icon: <MockIcon /> },
  error:        { bg: '#FCEBEB', icon: <ErrorIcon /> },
  disconnected: { bg: '#EEEDFE', icon: <DisconnectedIcon /> },
}

const MOCK_SOURCES: ConnectorSource[] = ['facebook', 'stripe_mock']

const SOURCE_LABELS: Record<ConnectorSource, string> = {
  google:       'google · oauth2',
  facebook:     'facebook · mock',
  stripe_mock:  'stripe · mock',
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  connector: ConnectorStatus
  onRefresh: () => void
  onSyncComplete: () => void
}

export function ConnectorCard({ connector, onRefresh, onSyncComplete }: Props) {
  const [syncing, setSyncing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [syncedCount, setSyncedCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showContacts, setShowContacts] = useState(false)

  const isMock = MOCK_SOURCES.includes(connector.source)
  const iconState: IconState = error
    ? 'error'
    : !connector.connected
    ? 'disconnected'
    : isMock
    ? 'mock'
    : 'connected'

  const { bg, icon } = ICON_STATE_STYLES[iconState]

  async function handleConnect() {
    setConnecting(true)
    setError(null)
    try {
      const result = await api.connectors.connect(connector.source)
      if (result.authUrl) {
        window.open(result.authUrl, '_blank', 'width=500,height=600')
      } else {
        onRefresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      setConnecting(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    setError(null)
    try {
      const result = await api.sync.run(connector.source)
      setSyncResult(result)
      setSyncedCount(result.succeeded)
      onSyncComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    setError(null)
    try {
      await api.connectors.disconnect(connector.source)
      setSyncResult(null)
      onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed')
    } finally {
      setDisconnecting(false)
    }
  }

  const successRate = syncResult
    ? Math.round((syncResult.succeeded / Math.max(syncResult.attempted, 1)) * 100)
    : null

  return (
    <>
      <div
        className="bg-white"
        style={{
          border: '0.5px solid #E0DEF7',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Status icon */}
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
            {/* Name + source */}
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a2e', lineHeight: 1.3 }}>
                {connector.name}
              </p>
              <p
                style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: '#534AB7',
                  background: '#EEEDFE',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  marginTop: '3px',
                  display: 'inline-block',
                }}
              >
                {SOURCE_LABELS[connector.source]}
              </p>
            </div>
          </div>
          <StatusBadge
            connected={connector.connected}
            isMock={isMock && connector.connected}
            isSyncing={syncing}
          />
        </div>

        {/* Meta row */}
        {(connector.lastSync || syncedCount !== null) && (
          <p style={{ fontSize: '12px', color: '#888888', margin: 0 }}>
            {connector.lastSync && `Last sync: ${relativeTime(connector.lastSync)}`}
            {syncedCount !== null && ` · ${syncedCount} contacts`}
          </p>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              background: '#FCEBEB',
              border: '0.5px solid #F7C1C1',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '12px',
              color: '#A32D2D',
            }}
          >
            {error}
          </div>
        )}

        {/* Sync progress bar */}
        {syncResult && successRate !== null && (
          <div style={{ background: '#F5F4FF', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: '#534AB7', fontWeight: 500 }}>
                {syncResult.succeeded} / {syncResult.attempted} synced
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: syncResult.failed > 0 ? '#854F0B' : '#3B6D11',
                  fontWeight: 500,
                }}
              >
                {successRate}%
              </span>
            </div>
            <div
              style={{
                height: '4px',
                background: '#E0DEF7',
                borderRadius: '20px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${successRate}%`,
                  background: syncResult.failed > 0 ? '#FAC775' : '#3B6D11',
                  borderRadius: '20px',
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
            {syncResult.warnings.length > 0 && (
              <p style={{ fontSize: '11px', color: '#854F0B', marginTop: '4px' }}>
                {syncResult.warnings.length} duplicate{syncResult.warnings.length > 1 ? 's' : ''} skipped (not overwritten)
              </p>
            )}
            {syncResult.failed > 0 && (
              <p style={{ fontSize: '11px', color: '#A32D2D', marginTop: '2px' }}>
                {syncResult.failed} failed to sync
              </p>
            )}
          </div>
        )}

        {/* Action row */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {!connector.connected ? (
            <button onClick={() => void handleConnect()} disabled={connecting} style={btnPrimary(connecting)}>
              {connecting ? 'Connecting…' : '→ Connect'}
            </button>
          ) : (
            <>
              <button onClick={() => void handleSync()} disabled={syncing} style={btnPrimary(syncing)}>
                {syncing ? 'Syncing…' : '↑ Sync now'}
              </button>
              <button onClick={() => setShowContacts(true)} style={btnSecondary}>
                View contacts
              </button>
              <button onClick={() => void handleDisconnect()} disabled={disconnecting} style={btnDanger(disconnecting)}>
                Disconnect
              </button>
            </>
          )}
        </div>
      </div>

      {showContacts && (
        <ContactsModal source={connector.source} onClose={() => setShowContacts(false)} />
      )}
    </>
  )
}

// ── Button style helpers ──────────────────────────────────────────────────────

function btnPrimary(disabled: boolean): React.CSSProperties {
  return {
    background: disabled ? '#9496F3' : '#6366F1',
    color: '#fff',
    border: `0.5px solid ${disabled ? '#9496F3' : '#6366F1'}`,
    borderRadius: '8px',
    padding: '5px 12px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s',
  }
}

const btnSecondary: React.CSSProperties = {
  background: '#fff',
  color: '#534AB7',
  border: '0.5px solid #E0DEF7',
  borderRadius: '8px',
  padding: '5px 12px',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
}

function btnDanger(disabled: boolean): React.CSSProperties {
  return {
    background: '#fff',
    color: disabled ? '#C08080' : '#A32D2D',
    border: `0.5px solid ${disabled ? '#E0DEF7' : '#F7C1C1'}`,
    borderRadius: '8px',
    padding: '5px 12px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
  }
}
