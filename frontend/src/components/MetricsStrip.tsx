import { ConnectorStatus } from '../types'
import { useSyncLog } from '../hooks/useSyncLog'

interface MetricCardProps {
  label: string
  value: string | number
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div style={{ background: '#F5F4FF', borderRadius: '8px', padding: '10px 12px' }}>
      <p style={{ fontSize: '20px', fontWeight: 500, color: '#534AB7', lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontSize: '11px', fontWeight: 400, color: '#888888', marginTop: '2px' }}>
        {label}
      </p>
    </div>
  )
}

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
  const { logs } = useSyncLog(50)

  const activeCount = connectors.filter((c) => c.connected).length
  const totalSynced = logs.reduce((sum, l) => sum + l.succeeded, 0)

  const lastLog = logs[0]
  const lastSync = lastLog ? relativeTime(lastLog.createdAt) : '—'

  // syncTrigger is consumed here to re-render after a sync (logs refresh via useSyncLog)
  void syncTrigger

  return (
    <div className="grid grid-cols-3 gap-3">
      <MetricCard label="Active connectors" value={`${activeCount} / ${connectors.length}`} />
      <MetricCard label="Total contacts synced" value={totalSynced} />
      <MetricCard label="Last sync" value={lastSync} />
    </div>
  )
}
