import { useState } from 'react'
import { useConnectors } from './hooks/useConnectors'
import { ConnectorList } from './components/ConnectorList'
import { MetricsStrip } from './components/MetricsStrip'
import { SyncLog } from './components/SyncLog'

export function App() {
  const [syncTrigger, setSyncTrigger] = useState(0)
  const { connectors, loading, error, refetch } = useConnectors()

  const activeCount = connectors.filter((c) => c.connected).length

  return (
    <div className="min-h-screen bg-n-bg p-6 font-sans">
      <div className="mx-auto max-w-5xl space-y-5">

        {/* Nexus header bar */}
        <header
          style={{
            background: '#6366F1',
            borderRadius: '10px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: 'white',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="/nexus_logo.svg"
              alt="Nexus"
              width={24}
              height={24}
              style={{ filter: 'brightness(0) invert(1)', flexShrink: 0 }}
            />
            <div>
              <p style={{ fontSize: '16px', fontWeight: 600, lineHeight: 1.2, margin: 0 }}>
                Nexus
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.2 }}>
                Integration Platform for HighLevel
              </p>
            </div>
          </div>
          <span
            style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '20px',
              padding: '3px 12px',
              fontSize: '12px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            {activeCount} of {connectors.length} active
          </span>
        </header>

        {/* Metrics strip */}
        <MetricsStrip connectors={connectors} syncTrigger={syncTrigger} />

        {/* Connectors */}
        <section>
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.05em] text-[#888888]">
            Connectors
          </p>
          <ConnectorList
            connectors={connectors}
            loading={loading}
            error={error}
            onRefresh={() => void refetch()}
            onSyncComplete={() => setSyncTrigger((n) => n + 1)}
          />
        </section>

        {/* Sync history */}
        <section>
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.05em] text-[#888888]">
            Sync History
          </p>
          <SyncLog refreshTrigger={syncTrigger} />
        </section>

      </div>
    </div>
  )
}
