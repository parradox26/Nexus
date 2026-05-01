import { UnifiedLead } from '../types'

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <span
      style={{
        fontFamily: 'monospace',
        fontSize: '10px',
        padding: '2px 6px',
        borderRadius: '4px',
        background: '#F5F4FF',
        border: '0.5px solid #E0DEF7',
        color: '#534AB7',
        whiteSpace: 'nowrap',
      }}
    >
      {label}:{value}
    </span>
  )
}

function getAvatarLabel(lead: UnifiedLead): string {
  const first = lead.firstName.trim()
  const last = lead.lastName.trim()
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase()
  if (first) return first[0].toUpperCase()
  if (lead.email) return lead.email[0].toUpperCase()
  return '?'
}

function getDisplayName(lead: UnifiedLead): string {
  const name = `${lead.firstName} ${lead.lastName}`.trim()
  return name || lead.email.split('@')[0] || 'Unnamed lead'
}

function LeadIdentity({ lead }: { lead: UnifiedLead }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '9px',
          border: '0.5px solid #FAC775',
          background: '#FAEEDA',
          color: '#854F0B',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        {getAvatarLabel(lead)}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#1A1A2E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {getDisplayName(lead)}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#6F7190', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {lead.email}
        </p>
      </div>
    </div>
  )
}

export function LeadRow({ lead }: { lead: UnifiedLead }) {
  return (
    <div
      style={{
        border: '0.5px solid #E0DEF7',
        borderRadius: '10px',
        padding: '10px 12px',
        background: '#FFFFFF',
      }}
    >
      <div className="sm:hidden" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <LeadIdentity lead={lead} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          <MetaPill label="src" value={lead.leadSource ?? '-'} />
          <MetaPill label="camp" value={lead.campaignId ?? '-'} />
          <MetaPill label="ad" value={lead.adId ?? '-'} />
        </div>
      </div>

      <div
        className="hidden sm:grid"
        style={{
          gridTemplateColumns: '1fr 140px 100px 100px',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        <LeadIdentity lead={lead} />

        <div>
          {lead.leadSource
            ? <MetaPill label="src" value={lead.leadSource} />
            : <span style={{ fontSize: '11px', color: '#C0C0C0' }}>-</span>}
        </div>

        <div>
          {lead.campaignId
            ? <MetaPill label="camp" value={lead.campaignId} />
            : <span style={{ fontSize: '11px', color: '#C0C0C0' }}>-</span>}
        </div>

        <div>
          {lead.adId
            ? <MetaPill label="ad" value={lead.adId} />
            : <span style={{ fontSize: '11px', color: '#C0C0C0' }}>-</span>}
        </div>
      </div>
    </div>
  )
}
