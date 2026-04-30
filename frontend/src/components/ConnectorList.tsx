import { ConnectorStatus } from '../types'
import { ConnectorCard } from './ConnectorCard'
import { CardSkeleton } from './LoadingSkeleton'

interface Props {
  connectors: ConnectorStatus[]
  loading: boolean
  error: string | null
  onRefresh: () => void
  onSyncComplete: () => void
}

export function ConnectorList({ connectors, loading, error, onRefresh, onSyncComplete }: Props) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          background: '#FCEBEB',
          border: '0.5px solid #F7C1C1',
          borderRadius: '12px',
          padding: '20px 24px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '13px', color: '#A32D2D' }}>{error}</p>
        <button
          onClick={onRefresh}
          style={{
            marginTop: '10px',
            fontSize: '12px',
            fontWeight: 500,
            color: '#A32D2D',
            textDecoration: 'underline',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (connectors.length === 0) {
    return (
      <div
        style={{
          border: '0.5px dashed #E0DEF7',
          borderRadius: '12px',
          padding: '48px 24px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '13px', fontWeight: 500, color: '#534AB7' }}>No connectors available</p>
        <p style={{ fontSize: '12px', color: '#888888', marginTop: '4px' }}>
          Add connectors in the backend configuration
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {connectors.map((connector) => (
        <ConnectorCard
          key={connector.source}
          connector={connector}
          onRefresh={onRefresh}
          onSyncComplete={onSyncComplete}
        />
      ))}
    </div>
  )
}
