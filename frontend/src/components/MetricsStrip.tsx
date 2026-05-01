import { useEffect } from 'react'
import { ConnectorStatus } from '../types'
import { useSyncLog } from '../hooks/useSyncLog'
import { Icon } from './primitives'

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

interface Props {
  connectors: ConnectorStatus[]
  syncTrigger: number
}

export function MetricsStrip({ connectors, syncTrigger }: Props) {
  const { logs, refetch } = useSyncLog(50)

  const activeCount = connectors.filter((c) => c.connected).length
  const totalSynced = logs.reduce((sum, l) => sum + l.succeeded, 0)
  const totalAttempted = logs.reduce((sum, l) => sum + l.attempted, 0)
  const successRate = totalAttempted > 0
    ? Math.round((totalSynced / totalAttempted) * 1000) / 10
    : 100

  const lastLog = logs[0]
  const lastSync = lastLog ? relativeTime(lastLog.createdAt) : '-'
  const lastSyncSub = lastLog
    ? `${lastLog.source.replace('_mock', '')} - ${lastLog.succeeded} / ${lastLog.attempted}`
    : 'No syncs yet'

  useEffect(() => {
    if (syncTrigger > 0) void refetch()
  }, [syncTrigger, refetch])

  const items = [
    {
      key: 'active',
      label: 'Active connectors',
      value: (
        <span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{activeCount}</span>
          <span style={{ color: '#A6A39C', fontWeight: 400 }}>{' / '}{connectors.length}</span>
        </span>
      ),
      sub: <span style={{ color: '#3B6D11' }}>Healthy</span>,
      IconComp: Icon.Plug,
    },
    {
      key: 'synced',
      label: 'Contacts synced (30d)',
      value: totalSynced.toLocaleString('en-US'),
      sub: <span style={{ color: '#3B6D11' }}>today</span>,
      IconComp: Icon.Users,
    },
    {
      key: 'rate',
      label: 'Sync success rate',
      value: (
        <span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{successRate}</span>
          <span style={{ fontSize: '0.7em', color: '#6E6C84', fontWeight: 500 }}>%</span>
        </span>
      ),
      sub: <span style={{ color: '#6E6C84' }}>last 30 days</span>,
      IconComp: Icon.Target,
    },
    {
      key: 'last',
      label: 'Last sync',
      value: lastSync,
      sub: <span style={{ color: '#6E6C84' }}>{lastSyncSub}</span>,
      IconComp: Icon.Clock,
    },
  ]

  return (
    <div
      className="nx-metrics-strip"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        background: '#FFFFFF',
        border: '1px solid #E0DEF7',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {items.map((it, i) => (
        <div key={it.key} className="nx-metric-item" style={{
          padding: '16px 18px',
          borderLeft: i === 0 ? 'none' : '0.5px solid #EFEDE6',
          display: 'flex', flexDirection: 'column', gap: 6,
          minWidth: 0,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11.5, color: '#8A87A1',
            textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500,
          }}>
            <it.IconComp size={11} color="#8A87A1" />
            <span>{it.label}</span>
          </div>
          <div className="nx-metric-value" style={{
            fontSize: 26, fontWeight: 600, color: '#1F1E2C',
            lineHeight: 1.1, fontVariantNumeric: 'tabular-nums',
            wordBreak: 'break-word',
          }}>
            {it.value}
          </div>
          <div className="nx-metric-sub" style={{ fontSize: 12, color: '#6E6C84' }}>
            {it.sub}
          </div>
        </div>
      ))}
    </div>
  )
}
