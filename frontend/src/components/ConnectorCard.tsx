import { useState } from 'react'
import { ConnectorSource, ConnectorStatus, SyncResult } from '../types'
import { api } from '../api/client'
import { StatusBadge } from './StatusBadge'
import { ContactsModal } from './ContactsModal'
import { LeadsModal } from './LeadsModal'
import { ConnectorIcon, Icon, NxButton, ProgressBar, Spinner, getConnectorMeta } from './primitives'

const LEADS_SOURCES: ConnectorSource[] = ['facebook']

const CONNECTOR_DESCRIPTIONS: Record<ConnectorSource, string> = {
  google:      'Pull contacts from Google People API and sync to HighLevel.',
  facebook:    'Capture leads from Facebook Lead Ads with campaign + ad metadata.',
  stripe_mock: 'Sync Stripe customers as contacts. Maps plan + lifecycle.',
}

type OAuthPopupMessage = {
  type: string
  source: ConnectorSource
  success: boolean
  error?: string
}

const OAUTH_MESSAGE_TYPE = 'nexus:oauth'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function waitForOAuthResult(popup: Window, source: ConnectorSource, allowedOrigin: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let done = false
    let checking = false

    const cleanup = () => {
      window.removeEventListener('message', onMessage)
      window.removeEventListener('storage', onStorage)
      window.clearInterval(closedPoll)
      window.clearInterval(connectionPoll)
      window.clearTimeout(timeout)
    }

    const finish = (fn: () => void) => {
      if (done) return
      done = true
      cleanup()
      fn()
    }

    const checkConnected = async () => {
      if (done || checking) return
      checking = true
      try {
        const { connectors } = await api.connectors.list()
        const target = connectors.find((c) => c.source === source)
        if (target?.connected) {
          try { popup.close() } catch (_err) {}
          finish(resolve)
        }
      } catch (_err) {
      } finally {
        checking = false
      }
    }

    const handlePayload = (data: OAuthPopupMessage) => {
      if (data.success) { finish(resolve); return }
      finish(() => reject(new Error(data.error ?? 'Authentication failed')))
    }

    const onMessage = (event: MessageEvent) => {
      if (event.source !== popup) return
      const originOk = event.origin === allowedOrigin || event.origin === 'null' || event.origin === ''
      if (!originOk) return
      const data = event.data as OAuthPopupMessage | undefined
      if (!data || data.type !== OAUTH_MESSAGE_TYPE || data.source !== source) return
      handlePayload(data)
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key !== 'nexus:oauth_result' || !event.newValue) return
      try {
        const data = JSON.parse(event.newValue) as OAuthPopupMessage
        if (data.type !== OAUTH_MESSAGE_TYPE || data.source !== source) return
        handlePayload(data)
      } catch (_err) {}
    }

    window.addEventListener('message', onMessage)
    window.addEventListener('storage', onStorage)

    const closedPoll = window.setInterval(() => {
      if (popup.closed) {
        void (async () => {
          await checkConnected()
          if (!done) finish(() => reject(new Error('Sign-in window was closed before completion')))
        })()
      }
    }, 350)

    const connectionPoll = window.setInterval(() => { void checkConnected() }, 1000)

    const timeout = window.setTimeout(() => {
      void (async () => {
        await checkConnected()
        if (!done) finish(() => reject(new Error('Sign-in timed out. Please try again.')))
      })()
    }, 120000)
  })
}

interface Props {
  connector: ConnectorStatus
  onRefresh: () => void
  onSyncComplete: () => void
  selectedLocationId: string | null
}

export function ConnectorCard({
  connector,
  onRefresh,
  onSyncComplete,
  selectedLocationId,
}: Props) {
  const [syncing, setSyncing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showContacts, setShowContacts] = useState(false)
  const [showLeads, setShowLeads] = useState(false)

  const meta = getConnectorMeta(connector.source)
  const isMock = connector.source === 'facebook' || connector.source === 'stripe_mock'
  const leadCapable = LEADS_SOURCES.includes(connector.source)
  const isLoading = syncing || connecting || disconnecting

  let badgeStatus: string = 'disconnected'
  if (disconnecting) badgeStatus = 'disconnecting'
  else if (connecting) badgeStatus = 'connecting'
  else if (syncing) badgeStatus = 'syncing'
  else if (error && connector.connected) badgeStatus = 'error'
  else if (connector.connected && isMock) badgeStatus = 'mock'
  else if (connector.connected) badgeStatus = 'connected'

  async function handleConnect() {
    setConnecting(true)
    setError(null)
    try {
      const result = await api.connectors.connect(connector.source)
      if (result.authUrl) {
        const popup = window.open(result.authUrl, '_blank', 'width=500,height=600')
        if (!popup) throw new Error('Popup was blocked. Please allow popups and try again.')
        const allowedOrigin = new URL(result.authUrl).origin
        await waitForOAuthResult(popup, connector.source, allowedOrigin)
      }
      onRefresh()
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
      const result = await api.sync.run(connector.source, false, selectedLocationId ?? undefined)
      setSyncResult(result)
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

  const warningCount = syncResult?.warnings.length ?? 0
  const successRate = syncResult
    ? Math.round((syncResult.succeeded / Math.max(syncResult.attempted, 1)) * 100)
    : null

  return (
    <>
      <div
        className="nx-card"
        style={{
          background: '#FFFFFF',
          border: '1px solid #E0DEF7',
          borderRadius: 12,
          padding: '18px 20px',
          display: 'flex', flexDirection: 'column', gap: 12,
          position: 'relative', overflow: 'hidden',
          transition: 'border-color 160ms ease, box-shadow 160ms ease',
        }}
      >
        {/* Top row: identity + status */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <ConnectorIcon source={connector.source} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#1F1E2C' }}>{connector.name}</span>
              <StatusBadge status={badgeStatus} />
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: '#6E6C84', marginTop: 3,
            }}>
              <span style={{ fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>{connector.source}</span>
              <span style={{ color: '#C9C7BC' }}>-</span>
              <span>{meta?.auth ?? 'oauth2'}</span>
              {leadCapable && (
                <>
                  <span style={{ color: '#C9C7BC' }}>-</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#534AB7' }}>
                    <Icon.Megaphone size={11} /> leads
                  </span>
                </>
              )}
            </div>
          </div>
          <button
            aria-label="More actions"
            style={{
              background: 'transparent', border: 'none', padding: 4, borderRadius: 6,
              cursor: 'pointer', color: '#8A87A1', display: 'grid', placeItems: 'center',
            }}
            className="nx-icon-btn"
          >
            <Icon.Dots size={16} />
          </button>
        </div>

        {/* Description when disconnected */}
        {!connector.connected && !connecting && (
          <div style={{ fontSize: 13, color: '#6E6C84', lineHeight: 1.5 }}>
            {CONNECTOR_DESCRIPTIONS[connector.source]}
          </div>
        )}

        {/* Last sync row */}
        {connector.connected && connector.lastSync && !syncResult && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '4px 0 0',
            borderTop: '0.5px solid #EFEDE6',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#6E6C84' }}>
              <Icon.Clock size={12} />
              <span>Last sync</span>
              <span style={{ color: '#1F1E2C', fontWeight: 500 }}>{relativeTime(connector.lastSync)}</span>
            </div>
          </div>
        )}

        {/* Sync result block (after a sync completes) */}
        {connector.connected && syncResult && successRate !== null && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '4px 0 0', borderTop: '0.5px solid #EFEDE6',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#6E6C84' }}>
                <Icon.Clock size={12} />
                <span>Just now</span>
              </div>
            </div>
            <div style={{
              padding: '12px 14px', borderRadius: 10,
              background: '#FAFAFB', border: '0.5px solid #EFEDE6',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#1F1E2C', fontWeight: 500 }}>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{syncResult.succeeded}</span>
                  <span style={{ color: '#8A87A1' }}> / </span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{syncResult.attempted}</span>
                  <span style={{ color: '#6E6C84', fontWeight: 400 }}>  synced</span>
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: syncResult.failed > 0 ? '#854F0B' : '#3B6D11',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {successRate}%
                </span>
              </div>
              <ProgressBar
                succeeded={syncResult.succeeded - warningCount}
                warnings={warningCount}
                failed={syncResult.failed}
                attempted={syncResult.attempted}
              />
              {(syncResult.failed > 0 || warningCount > 0) && (
                <div style={{ display: 'flex', gap: 14, fontSize: 11.5, color: '#6E6C84' }}>
                  {syncResult.failed > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: '#D33B3B' }} />
                      {syncResult.failed} failed
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: '#C8810E' }} />
                      {warningCount} duplicate{warningCount === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Syncing in-progress panel */}
        {syncing && (
          <div style={{
            padding: '12px 14px', borderRadius: 10,
            background: '#F5F4FF', border: '1px solid #CECBF6',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Spinner size={16} color="#6366F1" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#534AB7' }}>Syncing in progress...</div>
              <div style={{ fontSize: 11.5, color: '#6E6C84', marginTop: 2 }}>
                Fetching from {connector.source.replace('_mock', '')} - pushing to HighLevel
              </div>
            </div>
          </div>
        )}

        {/* Error panel */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '10px 12px', borderRadius: 8,
            background: '#FCEBEB', border: '1px solid #F7C1C1', color: '#A32D2D',
          }}>
            <Icon.Alert size={14} />
            <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.45 }}>{error}</div>
            <button
              onClick={() => setError(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A32D2D', padding: 0, display: 'grid', placeItems: 'center' }}
            >
              <Icon.X size={12} />
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="nx-connector-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
          {!connector.connected && !connecting ? (
            <NxButton kind="primary" icon={Icon.Plug} onClick={() => void handleConnect()} full>
              Connect
            </NxButton>
          ) : connecting ? (
            <NxButton kind="primary" loading disabled full>Connecting...</NxButton>
          ) : (
            <>
              <NxButton
                kind="primary"
                icon={syncing ? undefined : Icon.Sync}
                loading={syncing}
                disabled={isLoading}
                onClick={() => void handleSync()}
              >
                {syncing ? 'Syncing...' : 'Sync now'}
              </NxButton>
              <NxButton kind="secondary" icon={Icon.Users} disabled={isLoading} onClick={() => setShowContacts(true)}>
                Contacts
              </NxButton>
              {leadCapable && (
                <NxButton kind="secondary" icon={Icon.Megaphone} disabled={isLoading} onClick={() => setShowLeads(true)}>
                  Leads
                </NxButton>
              )}
              <div className="nx-connector-actions-spacer" style={{ flex: 1 }} />
              <NxButton
                kind="ghost"
                disabled={isLoading}
                loading={disconnecting}
                onClick={() => void handleDisconnect()}
              >
                {disconnecting ? 'Disconnecting...' : 'Disconnect'}
              </NxButton>
            </>
          )}
        </div>
      </div>

      {showContacts && <ContactsModal source={connector.source} onClose={() => setShowContacts(false)} />}
      {showLeads && <LeadsModal source={connector.source} onClose={() => setShowLeads(false)} />}
    </>
  )
}

