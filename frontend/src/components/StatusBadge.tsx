type BadgeStatus =
  | 'connected' | 'mock' | 'syncing' | 'connecting'
  | 'disconnecting' | 'error' | 'disconnected'
  | 'success' | 'partial' | 'failed' | 'neutral'

const STATUS_COLORS: Record<BadgeStatus, { bg: string; text: string; border: string; dot: string; label: string }> = {
  connected:     { bg: '#EAF3DE', text: '#3B6D11', border: '#C0DD97', dot: '#4F9914',  label: 'Connected' },
  mock:          { bg: '#FAEEDA', text: '#854F0B', border: '#FAC775', dot: '#C8810E',  label: 'Mock' },
  error:         { bg: '#FCEBEB', text: '#A32D2D', border: '#F7C1C1', dot: '#D33B3B',  label: 'Error' },
  syncing:       { bg: '#EEEDFE', text: '#534AB7', border: '#CECBF6', dot: '#6366F1',  label: 'Syncing' },
  connecting:    { bg: '#EEEDFE', text: '#534AB7', border: '#CECBF6', dot: '#6366F1',  label: 'Connecting' },
  disconnecting: { bg: '#FCEBEB', text: '#A32D2D', border: '#F7C1C1', dot: '#D33B3B',  label: 'Disconnecting' },
  disconnected:  { bg: '#F1EFE8', text: '#5F5E5A', border: '#D3D1C7', dot: '#8E8C84',  label: 'Not connected' },
  neutral:       { bg: '#F1EFE8', text: '#5F5E5A', border: '#D3D1C7', dot: '#8E8C84',  label: 'Idle' },
  partial:       { bg: '#FAEEDA', text: '#854F0B', border: '#FAC775', dot: '#C8810E',  label: 'Partial' },
  failed:        { bg: '#FCEBEB', text: '#A32D2D', border: '#F7C1C1', dot: '#D33B3B',  label: 'Failed' },
  success:       { bg: '#EAF3DE', text: '#3B6D11', border: '#C0DD97', dot: '#4F9914',  label: 'Success' },
}

interface Props {
  status: string
  label?: string
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, label, size = 'md' }: Props) {
  const c = STATUS_COLORS[status as BadgeStatus] ?? STATUS_COLORS.neutral
  const txt = label ?? c.label
  const isAnimated = status === 'syncing' || status === 'connecting' || status === 'disconnecting'
  const padding = size === 'sm' ? '2px 8px' : '3px 10px'
  const fontSize = size === 'sm' ? 11 : 12

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding,
      borderRadius: 20,
      background: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
      fontSize, fontWeight: 500,
      lineHeight: 1.2, whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: 999,
        background: c.dot,
        flexShrink: 0,
        animation: isAnimated ? 'nx-pulse 1.4s ease-in-out infinite' : 'none',
      }} />
      {txt}
    </span>
  )
}
