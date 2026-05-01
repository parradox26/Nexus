import { ConnectorStatus } from '../types'
import { ConnectorCard } from './ConnectorCard'
import { CardSkeleton } from './LoadingSkeleton'

interface Props {
  connectors: ConnectorStatus[]
  loading: boolean
  error: string | null
  onRefresh: () => void
  onSyncComplete: () => void
  selectedLocationId: string | null
}

export function ConnectorList({
  connectors,
  loading,
  error,
  onRefresh,
  onSyncComplete,
  selectedLocationId,
}: Props) {
  const gridStyle = {
    display: 'grid',
    gap: 16,
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  } as const

  if (loading) {
    return (
      <div className="nx-connectors-grid" style={gridStyle}>
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        background: '#FCEBEB', border: '1px solid #F7C1C1',
        borderRadius: 12, padding: '20px 24px', textAlign: 'center',
      }}>
        <p style={{ fontSize: 13, color: '#A32D2D', margin: 0 }}>{error}</p>
        <button
          onClick={onRefresh}
          style={{
            marginTop: 10, fontSize: 12, fontWeight: 500,
            color: '#A32D2D', textDecoration: 'underline',
            background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (connectors.length === 0) {
    return (
      <div style={{ border: '1px dashed #E0DEF7', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: '#534AB7', margin: 0 }}>No connectors available</p>
        <p style={{ fontSize: 12, color: '#888888', margin: '4px 0 0' }}>Add connectors in the backend configuration</p>
      </div>
    )
  }

  return (
    <div className="nx-connectors-grid" style={gridStyle}>
      {connectors.map((connector) => (
        <ConnectorCard
          key={connector.source}
          connector={connector}
          onRefresh={onRefresh}
          onSyncComplete={onSyncComplete}
          selectedLocationId={selectedLocationId}
        />
      ))}
    </div>
  )
}
