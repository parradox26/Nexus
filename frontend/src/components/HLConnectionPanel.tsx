import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { HLLocationStatus } from '../types'

type OAuthPopupMessage = {
  type: string
  source: string
  success: boolean
  locationId?: string
  error?: string
}

const OAUTH_MESSAGE_TYPE = 'nexus:oauth'

function expiresLabel(expiresAt?: string): string {
  if (!expiresAt) return 'No expiry'
  const ms = new Date(expiresAt).getTime() - Date.now()
  const hours = Math.floor(ms / (60 * 60 * 1000))
  if (hours <= 0) return 'Expiring soon'
  if (hours < 48) return `Expires in ${hours}h`
  const days = Math.floor(hours / 24)
  return `Expires in ${days}d`
}

function waitForHighLevelOAuth(
  popup: Window,
  allowedOrigin: string,
  onLocationDiscovered: (locationId?: string) => Promise<boolean>
): Promise<void> {
  return new Promise((resolve, reject) => {
    let done = false

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

    const handlePayload = (data: OAuthPopupMessage) => {
      if (data.success) {
        void (async () => {
          const found = await onLocationDiscovered(data.locationId)
          if (found) finish(resolve)
        })()
        return
      }
      finish(() => reject(new Error(data.error ?? 'Authentication failed')))
    }

    const onMessage = (event: MessageEvent) => {
      if (event.source !== popup) return
      const originOk = event.origin === allowedOrigin || event.origin === 'null' || event.origin === ''
      if (!originOk) return
      const data = event.data as OAuthPopupMessage | undefined
      if (!data || data.type !== OAUTH_MESSAGE_TYPE || data.source !== 'highlevel') return
      handlePayload(data)
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key !== 'nexus:oauth_result' || !event.newValue) return
      try {
        const data = JSON.parse(event.newValue) as OAuthPopupMessage
        if (data.type !== OAUTH_MESSAGE_TYPE || data.source !== 'highlevel') return
        handlePayload(data)
      } catch (_err) {
        // Ignore malformed storage payloads.
      }
    }

    window.addEventListener('message', onMessage)
    window.addEventListener('storage', onStorage)

    const closedPoll = window.setInterval(() => {
      if (popup.closed) {
        void (async () => {
          const found = await onLocationDiscovered()
          if (found) {
            finish(resolve)
            return
          }
          finish(() => reject(new Error('Sign-in window was closed before completion')))
        })()
      }
    }, 350)

    const connectionPoll = window.setInterval(() => {
      void (async () => {
        const found = await onLocationDiscovered()
        if (found) finish(resolve)
      })()
    }, 1200)

    const timeout = window.setTimeout(() => {
      finish(() => reject(new Error('Sign-in timed out. Please try again.')))
    }, 120000)
  })
}

interface Props {
  selectedLocationId: string | null
  onSelectLocation: (locationId: string | null) => void
  embeddedLocationId?: string | null
}

export function HLConnectionPanel({ selectedLocationId, onSelectLocation, embeddedLocationId }: Props) {
  const [locations, setLocations] = useState<HLLocationStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshLocations = useCallback(async (): Promise<HLLocationStatus[]> => {
    const result = await api.highlevel.locations()
    setLocations(result.locations)
    return result.locations
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        setError(null)
        await refreshLocations()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load HighLevel destinations')
      } finally {
        setLoading(false)
      }
    })()
  }, [refreshLocations])

  useEffect(() => {
    if (embeddedLocationId) {
      // Embedded mode: always lock selection to the injected sub-account location
      onSelectLocation(embeddedLocationId)
      return
    }
    const available = new Set(locations.map((loc) => loc.locationId))
    if (locations.length === 0 && selectedLocationId !== null) {
      onSelectLocation(null)
      return
    }
    if (locations.length > 0 && (!selectedLocationId || !available.has(selectedLocationId))) {
      onSelectLocation(locations[0].locationId)
    }
  }, [locations, embeddedLocationId, onSelectLocation, selectedLocationId])

  const visibleLocations = useMemo(() => {
    const sorted = [...locations].sort((a, b) => a.locationId.localeCompare(b.locationId))
    if (embeddedLocationId) return sorted.filter((l) => l.locationId === embeddedLocationId)
    return sorted
  }, [locations, embeddedLocationId])

  const connected = visibleLocations.length > 0

  async function handleConnect() {
    setConnecting(true)
    setError(null)
    try {
      const { authUrl } = await api.highlevel.connect()
      const popup = window.open(authUrl, '_blank', 'width=520,height=680')
      if (!popup) throw new Error('Popup was blocked. Please allow popups and try again.')

      const allowedOrigin = new URL(authUrl).origin
      await waitForHighLevelOAuth(popup, allowedOrigin, async (locationId) => {
        const latest = await refreshLocations()
        if (locationId) return latest.some((loc) => loc.locationId === locationId)
        return latest.length > 0
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect HighLevel')
    } finally {
      setConnecting(false)
    }
  }

  async function handleDisconnect(locationId: string) {
    setDisconnecting(locationId)
    setError(null)
    try {
      await api.highlevel.disconnect(locationId)
      const latest = await refreshLocations()
      if (!latest.some((loc) => loc.locationId === selectedLocationId)) {
        onSelectLocation(latest[0]?.locationId ?? null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect location')
    } finally {
      setDisconnecting(null)
    }
  }

  return (
    <section
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>
            HighLevel Destination
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6F7190' }}>
            OAuth connection per sub-account location
          </p>
        </div>
        <span
          style={{
            background: connected ? '#EAF3DE' : '#F1EFE8',
            color: connected ? '#3B6D11' : '#5F5E5A',
            border: `0.5px solid ${connected ? '#C0DD97' : '#D3D1C7'}`,
            borderRadius: '20px',
            padding: '2px 10px',
            fontSize: '11px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          {connected ? (embeddedLocationId ? 'Connected' : `${visibleLocations.length} connected`) : 'Not connected'}
        </span>
      </div>

      {loading ? (
        <p style={{ margin: 0, fontSize: '12px', color: '#6F7190' }}>Loading destinations...</p>
      ) : (
        <>
          {!connected ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#6F7190' }}>
                Connect your HighLevel sub-account to enable sync.
              </p>
              <button
                onClick={() => void handleConnect()}
                disabled={connecting}
                style={{
                  background: connecting ? '#9496F3' : '#6366F1',
                  color: '#fff',
                  border: `0.5px solid ${connecting ? '#9496F3' : '#6366F1'}`,
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: connecting ? 'not-allowed' : 'pointer',
                }}
              >
                {connecting ? 'Connecting...' : 'Connect HighLevel'}
              </button>
            </div>
          ) : (
            <>
              {!embeddedLocationId && (
                <>
                  <label style={{ fontSize: '12px', color: '#534AB7', fontWeight: 500 }}>
                    Destination location
                  </label>
                  <select
                    value={selectedLocationId ?? ''}
                    onChange={(e) => onSelectLocation(e.target.value || null)}
                    style={{
                      border: '0.5px solid #E0DEF7',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      fontSize: '12px',
                      color: '#1A1A2E',
                    }}
                  >
                    {visibleLocations.map((loc) => (
                      <option key={loc.locationId} value={loc.locationId}>
                        {loc.locationId}
                      </option>
                    ))}
                  </select>
                </>
              )}

              <div style={{ display: 'grid', gap: '8px' }}>
                {visibleLocations.map((loc) => (
                  <div
                    key={loc.locationId}
                    style={{
                      border: '0.5px solid #E0DEF7',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          color: '#1A1A2E',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {loc.locationId}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#6F7190' }}>
                        {expiresLabel(loc.tokenExpiresAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => void handleDisconnect(loc.locationId)}
                      disabled={disconnecting === loc.locationId}
                      style={{
                        background: '#fff',
                        color: '#A32D2D',
                        border: '0.5px solid #F7C1C1',
                        borderRadius: '8px',
                        padding: '5px 10px',
                        fontSize: '11px',
                        fontWeight: 500,
                        cursor: disconnecting === loc.locationId ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {disconnecting === loc.locationId ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  </div>
                ))}
              </div>

            </>
          )}
        </>
      )}

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
    </section>
  )
}
