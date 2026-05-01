import { useEffect, useState } from 'react'
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
  const [isTwoColumn, setIsTwoColumn] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia('(min-width: 760px)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(min-width: 760px)')
    const onChange = (e: MediaQueryListEvent) => setIsTwoColumn(e.matches)
    setIsTwoColumn(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const gridStyle = {
    display: 'grid',
    gap: '16px',
    gridTemplateColumns: isTwoColumn ? 'repeat(2, minmax(0, 1fr))' : 'repeat(1, minmax(0, 1fr))',
  } as const

  if (loading) {
    return (
      <div style={gridStyle}>
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
    <div style={gridStyle}>
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
