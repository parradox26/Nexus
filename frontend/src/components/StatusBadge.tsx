type BadgeVariant = 'connected' | 'mock' | 'syncing' | 'neutral'

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string; border: string; label: string }> = {
  connected: { bg: '#EAF3DE', text: '#3B6D11', border: '#C0DD97', label: 'Connected' },
  mock:      { bg: '#FAEEDA', text: '#854F0B', border: '#FAC775', label: 'Mock' },
  syncing:   { bg: '#EEEDFE', text: '#534AB7', border: '#CECBF6', label: 'Syncing…' },
  neutral:   { bg: '#F1EFE8', text: '#5F5E5A', border: '#D3D1C7', label: 'Not connected' },
}

interface Props {
  connected: boolean
  isMock?: boolean
  isSyncing?: boolean
}

export function StatusBadge({ connected, isMock = false, isSyncing = false }: Props) {
  let variant: BadgeVariant = 'neutral'
  if (isSyncing) variant = 'syncing'
  else if (connected && isMock) variant = 'mock'
  else if (connected) variant = 'connected'

  const s = VARIANT_STYLES[variant]

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
        padding: '3px 10px',
        fontSize: '11px',
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: s.text,
          flexShrink: 0,
        }}
      />
      {s.label}
    </span>
  )
}
