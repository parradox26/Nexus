import { useEffect } from 'react'
import { useSyncLog } from '../hooks/useSyncLog'
import { RowSkeleton } from './LoadingSkeleton'

const STATUS_DOT: Record<string, string> = {
  success: '#3B6D11',
  partial: '#854F0B',
  failed: '#A32D2D',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

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
      <div style={{ background: '#fff', border: '0.5px solid #E0DEF7', borderRadius: '12px', overflow: 'hidden' }}>
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
      </div>
    )
  }

  if (error) {
    return <p style={{ fontSize: '13px', color: '#A32D2D' }}>{error}</p>
  }

  if (logs.length === 0) {
    return (
      <div
        style={{
          border: '0.5px dashed #E0DEF7',
          borderRadius: '12px',
          padding: '48px 24px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '13px', fontWeight: 500, color: '#534AB7' }}>No syncs yet</p>
        <p style={{ fontSize: '12px', color: '#888888', marginTop: '4px' }}>
          Connect a connector above and click Sync now
        </p>
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', border: '0.5px solid #E0DEF7', borderRadius: '12px', overflow: 'hidden' }}>
      {logs.map((log, i) => {
        const dotColor = STATUS_DOT[log.status] ?? '#888888'
        const isLast = i === logs.length - 1

        return (
          <div
            key={log.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '11px 16px',
              borderBottom: isLast ? 'none' : '0.5px solid #F1EFE8',
            }}
          >
            {/* Status dot */}
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: dotColor,
                flexShrink: 0,
              }}
            />

            {/* Source name */}
            <span
              style={{
                width: '80px',
                flexShrink: 0,
                fontSize: '13px',
                fontWeight: 500,
                color: '#1a1a2e',
                textTransform: 'capitalize',
              }}
            >
              {log.source}
            </span>

            {/* Synced count */}
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#534AB7', minWidth: '60px' }}>
              {log.succeeded} synced
            </span>

            {/* Error count (only if > 0) */}
            {log.failed > 0 && (
              <span style={{ fontSize: '12px', color: '#A32D2D' }}>{log.failed} failed</span>
            )}

            {/* Duration */}
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#888888',
                background: '#F5F4FF',
                padding: '1px 6px',
                borderRadius: '4px',
              }}
            >
              {formatDuration(log.durationMs)}
            </span>

            {/* Timestamp — right-aligned */}
            <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#888888', whiteSpace: 'nowrap' }}>
              {formatDate(log.createdAt)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
