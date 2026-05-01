import { useState, useEffect, useCallback } from 'react'
import { ConnectorSource, UnifiedLead } from '../types'
import { api } from '../api/client'
import { ConnectorIcon, Avatar, MonoPill, Icon, Spinner } from './primitives'

interface Props {
  source: ConnectorSource
  onClose: () => void
}

export function LeadsModal({ source, onClose }: Props) {
  const [leads, setLeads] = useState<UnifiedLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.leads
      .list(source, 50, 0)
      .then((data) => setLeads(data.leads))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load leads'))
      .finally(() => setLoading(false))
  }, [source])

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onKeyDown])

  const sourceName = source.replace('_mock', '').replace(/^./, (s) => s.toUpperCase())
  const subtitle = loading ? 'Loading…' : error
    ? 'Could not load leads'
    : `${leads.length} records with campaign metadata`

  const COL = 'minmax(220px, 1.4fr) 130px 130px 130px'

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(28, 26, 60, 0.32)',
        backdropFilter: 'blur(2px)',
        display: 'grid', placeItems: 'center',
        zIndex: 80, padding: 24,
        animation: 'nx-fade 160ms ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF', borderRadius: 14,
          width: '100%', maxWidth: 880, maxHeight: '82vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px -16px rgba(28, 26, 60, 0.25), 0 0 0 1px rgba(28, 26, 60, 0.04)',
          overflow: 'hidden',
          animation: 'nx-rise 200ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        {/* Modal header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '16px 20px',
          borderBottom: '0.5px solid #E0DEF7',
        }}>
          <ConnectorIcon source={source} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1F1E2C' }}>{sourceName} leads</div>
            <div style={{ fontSize: 12.5, color: '#6E6C84', marginTop: 2 }}>{subtitle}</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent', border: 'none', padding: 6, borderRadius: 6,
              cursor: 'pointer', color: '#6E6C84', display: 'grid', placeItems: 'center',
            }}
            className="nx-icon-btn"
          >
            <Icon.X size={16} />
          </button>
        </div>

        {/* Column headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: COL, gap: 16,
          padding: '10px 20px',
          background: '#FAFAFB', borderBottom: '0.5px solid #E0DEF7',
          fontSize: 11, color: '#6E6C84', textTransform: 'uppercase',
          letterSpacing: '0.05em', fontWeight: 500,
        }}>
          <span>Contact</span>
          <span>Lead Source</span>
          <span>Campaign</span>
          <span>Ad</span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {loading && (
            <div style={{ padding: 48, display: 'grid', placeItems: 'center' }}>
              <Spinner size={24} color="#6366F1" />
            </div>
          )}
          {error && !loading && (
            <div style={{
              margin: 24, padding: '10px 12px', borderRadius: 8,
              background: '#FCEBEB', border: '1px solid #F7C1C1', color: '#A32D2D', fontSize: 13,
            }}>
              {error}
            </div>
          )}
          {!loading && !error && leads.length === 0 && (
            <div style={{ padding: 48, textAlign: 'center', color: '#8A87A1', fontSize: 13 }}>
              No leads found.
            </div>
          )}
          {!loading && !error && leads.map((lead, i) => (
            <div
              key={lead.id}
              className="nx-row"
              style={{
                display: 'grid', gridTemplateColumns: COL,
                gap: 16, alignItems: 'center',
                padding: '12px 20px',
                borderTop: i === 0 ? 'none' : '0.5px solid #EFEDE6',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <Avatar firstName={lead.firstName} lastName={lead.lastName} size={32} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: '#1F1E2C' }}>
                    {lead.firstName} {lead.lastName}
                  </div>
                  <div style={{ fontSize: 12, color: '#6E6C84' }}>{lead.email}</div>
                </div>
              </div>
              <MonoPill label="src">{lead.leadSource?.replace('_', ':') ?? null}</MonoPill>
              <MonoPill label="camp">{lead.campaignId?.replace('camp_', '') ?? null}</MonoPill>
              <MonoPill label="ad">{lead.adId?.replace('ad_', '') ?? null}</MonoPill>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
