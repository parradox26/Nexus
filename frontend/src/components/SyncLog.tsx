import { useEffect } from 'react'
import { useSyncLog } from '../hooks/useSyncLog'
import { RowSkeleton } from './LoadingSkeleton'

const STATUS_META: Record<string, { dot: string; bg: string; text: string; border: string; label: string }> = {
  success: { dot: '#3B6D11', bg: '#EAF3DE', text: '#3B6D11', border: '#C0DD97', label: 'Success' },
  partial: { dot: '#854F0B', bg: '#FAEEDA', text: '#854F0B', border: '#FAC775', label: 'Partial' },
  failed: { dot: '#A32D2D', bg: '#FCEBEB', text: '#A32D2D', border: '#F7C1C1', label: 'Failed' },
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

function StatusPill({ status }: { status: string }) {
  const s = STATUS_META[status] ?? {
    dot: '#888888',
    bg: '#F1EFE8',
    text: '#5F5E5A',
    border: '#D3D1C7',
    label: status,
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        background: s.bg,
        color: s.text,
        border: `0.5px solid ${s.border}`,
        borderRadius: '20px',
        padding: '2px 9px',
        fontSize: '11px',
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  )
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
      <div
        className="hidden sm:grid"
        style={{
          gridTemplateColumns: 'minmax(80px, 1fr) 92px 76px 80px 60px 74px minmax(120px, 1fr)',
          gap: '12px',
          padding: '9px 16px',
          borderBottom: '0.5px solid #E0DEF7',
          background: '#FAFAFE',
        }}
      >
        {['Source', 'Status', 'Attempted', 'Succeeded', 'Failed', 'Duration', 'Time'].map((h) => (
          <span
            key={h}
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#7E7FA4',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {h}
          </span>
        ))}
      </div>

      {logs.map((log, i) => {
        const isLast = i === logs.length - 1

        return (
          <div
            key={log.id}
            style={{
              padding: '11px 16px',
              borderBottom: isLast ? 'none' : '0.5px solid #F1EFE8',
            }}
          >
            <div className="flex flex-col gap-[7px] sm:hidden">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a2e', textTransform: 'capitalize' }}>
                  {log.source}
                </span>
                <StatusPill status={log.status} />
              </div>
              <div style={{ fontSize: '12px', color: '#534AB7', fontWeight: 500 }}>
                {log.succeeded}/{log.attempted} synced
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#A32D2D' }}>{log.failed} failed</span>
                <span style={{ fontSize: '11px', color: '#888888' }}>{formatDuration(log.durationMs)}</span>
                <span style={{ fontSize: '11px', color: '#888888' }}>{formatDate(log.createdAt)}</span>
              </div>
            </div>

            <div
              className="hidden sm:grid"
              style={{
                gridTemplateColumns: 'minmax(80px, 1fr) 92px 76px 80px 60px 74px minmax(120px, 1fr)',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a2e', textTransform: 'capitalize' }}>
                {log.source}
              </span>
              <StatusPill status={log.status} />
              <span style={{ fontSize: '13px', color: '#1a1a2e' }}>{log.attempted}</span>
              <span style={{ fontSize: '13px', color: '#534AB7', fontWeight: 500 }}>{log.succeeded}</span>
              <span style={{ fontSize: '13px', color: log.failed > 0 ? '#A32D2D' : '#888888' }}>{log.failed}</span>
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: '#888888',
                  background: '#F5F4FF',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  width: 'fit-content',
                }}
              >
                {formatDuration(log.durationMs)}
              </span>
              <span style={{ fontSize: '12px', color: '#888888', whiteSpace: 'nowrap' }}>
                {formatDate(log.createdAt)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
