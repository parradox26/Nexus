import { useState, useEffect } from 'react'
import { ConnectorSource, UnifiedLead } from '../types'
import { api } from '../api/client'
import { LeadRow } from './LeadRow'

interface Props {
  source: ConnectorSource
  onClose: () => void
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '54px 0' }}>
      <svg viewBox="0 0 24 24" fill="none" style={{ width: '20px', height: '20px', color: '#6366F1' }}>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
        <path fill="currentColor" opacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z">
          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
        </path>
      </svg>
    </div>
  )
}

export function LeadsModal({ source, onClose }: Props) {
  const [leads, setLeads] = useState<UnifiedLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia('(min-width: 640px)').matches
  })

  useEffect(() => {
    api.leads
      .list(source, 50, 0)
      .then((data) => setLeads(data.leads))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load leads'))
      .finally(() => setLoading(false))
  }, [source])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(min-width: 640px)')
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    setIsDesktop(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(26, 26, 46, 0.48)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '760px',
          maxHeight: '82vh',
          borderRadius: '12px',
          border: '0.5px solid #E0DEF7',
          background: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(29, 36, 78, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '14px 16px',
            borderBottom: '0.5px solid #E0DEF7',
            background: 'linear-gradient(180deg, #F9F8FF 0%, #FFFFFF 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '9px',
                border: '0.5px solid #FAC775',
                background: '#FAEEDA',
                color: '#854F0B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 600,
                textTransform: 'uppercase',
                flexShrink: 0,
              }}
            >
              {source[0]}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1A1A2E', textTransform: 'capitalize' }}>
                {source} leads
              </p>
              {!loading && (
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6F7190' }}>
                  {leads.length} records with campaign metadata
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              border: '0.5px solid #E0DEF7',
              background: '#FFFFFF',
              color: '#7E7FA4',
              fontSize: '18px',
              lineHeight: 1,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            x
          </button>
        </div>

        {/* Column headers */}
        {!loading && !error && leads.length > 0 && isDesktop && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 140px 100px 100px',
              gap: '8px',
              padding: '8px 14px',
              borderBottom: '0.5px solid #E0DEF7',
              background: '#FAFAFE',
            }}
          >
            {['Contact', 'Lead Source', 'Campaign', 'Ad'].map((h) => (
              <span key={h} style={{ fontSize: '11px', fontWeight: 600, color: '#7E7FA4', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {h}
              </span>
            ))}
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {loading && <Spinner />}

          {error && (
            <p style={{ margin: 0, padding: '8px', fontSize: '13px', color: '#A32D2D' }}>{error}</p>
          )}

          {!loading && !error && leads.length === 0 && (
            <div style={{ padding: '42px 8px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#534AB7' }}>No leads yet</p>
              <p style={{ fontSize: '12px', color: '#888888', marginTop: '4px' }}>
                This connector has not returned any lead data
              </p>
            </div>
          )}

          {!loading && !error && leads.map((lead) => (
            <LeadRow key={lead.id} lead={lead} isDesktop={isDesktop} />
          ))}
        </div>
      </div>
    </div>
  )
}
