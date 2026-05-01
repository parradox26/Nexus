import { useEffect } from 'react'
import { useSyncLog } from '../hooks/useSyncLog'
import { RowSkeleton } from './LoadingSkeleton'
import { StatusBadge } from './StatusBadge'
import { ConnectorIcon } from './primitives'
import { ConnectorSource } from '../types'

function formatDuration(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d === 1 ? 'Yesterday' : `${d}d ago`
}

const COL = 'minmax(140px, 1.1fr) 110px 100px 100px 100px 110px 110px'

interface Props {
  refreshTrigger: number
}

export function SyncLog({ refreshTrigger }: Props) {
  const { logs, loading, error, refetch } = useSyncLog(10)

  useEffect(() => {
    if (refreshTrigger > 0) void refetch()
  }, [refreshTrigger, refetch])

  if (loading) {
    return (
      <div style={{ background: '#fff', border: '1px solid #E0DEF7', borderRadius: 12, overflow: 'hidden' }}>
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
      </div>
    )
  }

  if (error) {
    return <p style={{ fontSize: 13, color: '#A32D2D' }}>{error}</p>
  }

  if (logs.length === 0) {
    return (
      <div style={{
        border: '1px dashed #E0DEF7', borderRadius: 12,
        padding: '48px 24px', textAlign: 'center',
      }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: '#534AB7', margin: 0 }}>No syncs yet</p>
        <p style={{ fontSize: 12, color: '#888888', marginTop: 4, margin: '4px 0 0' }}>
          Connect a connector above and click Sync now
        </p>
      </div>
    )
  }

  return (
    <div className="nx-sync-log" style={{ background: '#FFFFFF', border: '1px solid #E0DEF7', borderRadius: 12, overflowX: 'auto' }}>
      {/* Header row */}
      <div style={{
        display: 'grid', gridTemplateColumns: COL, gap: 12,
        minWidth: 770,
        padding: '10px 16px',
        background: '#FAFAFB', borderBottom: '0.5px solid #E0DEF7',
        fontSize: 11, color: '#6E6C84', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500,
      }}>
        <span>Source</span>
        <span>Status</span>
        <span style={{ textAlign: 'right' }}>Attempted</span>
        <span style={{ textAlign: 'right' }}>Succeeded</span>
        <span style={{ textAlign: 'right' }}>Failed</span>
        <span style={{ textAlign: 'right' }}>Duration</span>
        <span style={{ textAlign: 'right' }}>Time</span>
      </div>

      {logs.map((log, i) => (
        <div
          key={log.id}
          className="nx-row"
          style={{
            display: 'grid', gridTemplateColumns: COL, gap: 12,
            minWidth: 770,
            padding: '11px 16px', alignItems: 'center',
            borderTop: i === 0 ? 'none' : '0.5px solid #EFEDE6',
            fontSize: 13,
          }}
        >
          {/* Source */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <ConnectorIcon source={log.source as ConnectorSource} size={22} />
            <span style={{ color: '#1F1E2C', fontWeight: 500, textTransform: 'capitalize' }}>
              {log.source.replace('_mock', '')}
            </span>
            {log.triggeredBy === 'scheduled' && (
              <span style={{
                fontSize: 10, color: '#534AB7', background: '#EEEDFE',
                border: '0.5px solid #CECBF6', padding: '1px 6px', borderRadius: 4,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                cron
              </span>
            )}
          </div>

          {/* Status */}
          <StatusBadge status={log.status} size="sm" />

          {/* Attempted */}
          <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#1F1E2C' }}>
            {log.attempted}
          </span>

          {/* Succeeded */}
          <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#3B6D11', fontWeight: 500 }}>
            {log.succeeded}
          </span>

          {/* Failed */}
          <span style={{
            textAlign: 'right', fontVariantNumeric: 'tabular-nums',
            color: log.failed > 0 ? '#A32D2D' : '#A6A39C',
            fontWeight: log.failed > 0 ? 500 : 400,
          }}>
            {log.failed}
          </span>

          {/* Duration */}
          <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#6E6C84' }}>
            {formatDuration(log.durationMs)}
          </span>

          {/* Time */}
          <span style={{ textAlign: 'right', color: '#6E6C84' }}>
            {relativeTime(log.createdAt)}
          </span>
        </div>
      ))}
    </div>
  )
}
