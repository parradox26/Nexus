import { useEffect, useState } from 'react'
import { useConnectors } from './hooks/useConnectors'
import { ConnectorList } from './components/ConnectorList'
import { MetricsStrip } from './components/MetricsStrip'
import { SyncLog } from './components/SyncLog'
import { HLConnectionPanel } from './components/HLConnectionPanel'
import { Icon, Spinner } from './components/primitives'
import { api } from './api/client'

function SectionHeader({
  title,
  count,
}: {
  title: string
  count?: number
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 2px' }}>
      <h2 style={{
        margin: 0,
        fontSize: 11.5, fontWeight: 600, color: '#1F1E2C',
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {title}
      </h2>
      {count != null && (
        <span style={{
          fontSize: 11.5, color: '#8A87A1', background: '#FFFFFF',
          padding: '1px 7px', borderRadius: 999,
          border: '0.5px solid #E0DEF7',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {count}
        </span>
      )}
    </div>
  )
}

export function App() {
  const [syncTrigger, setSyncTrigger] = useState(0)
  const [syncingAll, setSyncingAll] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem('nexus:hl_location_id')
  })

  const { connectors, loading, error, refetch } = useConnectors()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (selectedLocationId) {
      window.localStorage.setItem('nexus:hl_location_id', selectedLocationId)
      return
    }
    window.localStorage.removeItem('nexus:hl_location_id')
  }, [selectedLocationId])

  const activeCount = connectors.filter((c) => c.connected).length

  async function handleSyncAll() {
    setSyncingAll(true)
    const connected = connectors.filter((c) => c.connected)
    await Promise.allSettled(connected.map((c) => api.sync.run(c.source)))
    setSyncingAll(false)
    setSyncTrigger((n) => n + 1)
    void refetch()
  }

  return (
    <div
      className="nx-app-shell"
      style={{
        minHeight: '100vh',
        background: '#F5F4FF',
        padding: '24px 24px 48px',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#1F1E2C',
      }}
    >
      <div className="nx-app-main" style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <header
          className="nx-header"
          style={{
            background: 'linear-gradient(135deg, #6366F1 0%, #5751D8 100%)',
            borderRadius: 12,
            padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 16,
            color: '#FFFFFF',
            boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 6px 18px -8px rgba(99,102,241,0.45)',
          }}
        >
          <div
            className="nx-header-identity"
            style={{
              width: 40, height: 40,
              background: 'rgba(255,255,255,0.14)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 10,
              display: 'grid', placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <img
              src="/nexus_logo.svg"
              alt="Nexus"
              width={22}
              height={22}
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="nx-header-title-row" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>Nexus</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '3px 10px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.16)',
                border: '1px solid rgba(255,255,255,0.20)',
                fontSize: 11.5, fontWeight: 500,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: '#A8E063' }} />
                {activeCount} of {connectors.length} active
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.72)', marginTop: 2 }}>
              Integration platform for HighLevel - v1.4.0
            </div>
          </div>

          <div className="nx-header-actions">
            <button
              onClick={() => void handleSyncAll()}
              disabled={syncingAll}
              className="nx-btn nx-header-btn"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.14)',
                border: '1px solid rgba(255,255,255,0.20)',
                color: '#FFFFFF',
                fontSize: 13, fontWeight: 500,
                cursor: syncingAll ? 'wait' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {syncingAll ? <Spinner size={14} color="#FFFFFF" /> : <Icon.Sync size={14} />}
              {syncingAll ? 'Syncing all...' : 'Sync all'}
            </button>
            <button
              className="nx-btn nx-header-btn"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 8,
                background: '#FFFFFF', border: 'none',
                color: '#534AB7',
                fontSize: 13, fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Icon.Plus size={14} />
              Add connector
            </button>
          </div>
        </header>

        {/* Metrics strip */}
        <MetricsStrip connectors={connectors} syncTrigger={syncTrigger} />

        {/* Destination section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SectionHeader title="Destination" />
          <HLConnectionPanel
            selectedLocationId={selectedLocationId}
            onSelectLocation={setSelectedLocationId}
          />
        </div>

        {/* Connectors section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SectionHeader title="Connectors" count={connectors.length} />
          <ConnectorList
            connectors={connectors}
            loading={loading}
            error={error}
            onRefresh={() => void refetch()}
            onSyncComplete={() => setSyncTrigger((n) => n + 1)}
            selectedLocationId={selectedLocationId}
          />
        </div>

        {/* Sync history section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SectionHeader title="Sync History" />
          <SyncLog refreshTrigger={syncTrigger} />
        </div>

        <div style={{ textAlign: 'center', padding: '4px 0', fontSize: 11.5, color: '#A6A39C' }}>
          Nexus - Connector abstraction layer for HighLevel CRM
        </div>
      </div>
    </div>
  )
}
