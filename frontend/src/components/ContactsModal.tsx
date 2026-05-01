import { useState, useEffect, useCallback } from 'react'
import { ConnectorSource, UnifiedContact } from '../types'
import { api } from '../api/client'
import { ConnectorIcon, Avatar, Icon, Spinner } from './primitives'

interface Props {
  source: ConnectorSource
  onClose: () => void
}

export function ContactsModal({ source, onClose }: Props) {
  const [contacts, setContacts] = useState<UnifiedContact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    api.contacts
      .list(source, 50, 0)
      .then((data) => setContacts(data.contacts))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load contacts'))
      .finally(() => setLoading(false))
  }, [source])

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onKeyDown])

  const filtered = contacts.filter((c) => {
    if (!query) return true
    const q = query.toLowerCase()
    return `${c.firstName} ${c.lastName}`.toLowerCase().includes(q)
      || (c.email ?? '').toLowerCase().includes(q)
      || (c.company ?? '').toLowerCase().includes(q)
  })

  const sourceName = source.replace('_mock', '').replace(/^./, (s) => s.toUpperCase())
  const subtitle = loading ? 'Loading…' : error
    ? 'Could not load contacts'
    : `${filtered.length} of ${contacts.length} records`

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
          width: '100%', maxWidth: 760, maxHeight: '82vh',
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
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1F1E2C' }}>{sourceName} contacts</div>
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

        {/* Search bar */}
        <div style={{ padding: '12px 20px', borderBottom: '0.5px solid #EFEDE6', background: '#FAFAFB' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#FFFFFF', border: '1px solid #E0DEF7',
            borderRadius: 8, padding: '8px 10px',
          }}>
            <Icon.Search size={14} color="#8A87A1" />
            <input
              type="text"
              placeholder="Search name, email, company…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                flex: 1, border: 'none', outline: 'none',
                fontSize: 13, color: '#1F1E2C', background: 'transparent',
                fontFamily: 'inherit',
              }}
            />
          </div>
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
          {!loading && !error && filtered.length === 0 && (
            <div style={{ padding: 48, textAlign: 'center', color: '#8A87A1', fontSize: 13 }}>
              {query ? 'No contacts match your search.' : 'No contacts found.'}
            </div>
          )}
          {!loading && !error && filtered.map((c, i) => (
            <div
              key={c.id}
              className="nx-row"
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: 14, alignItems: 'center',
                padding: '12px 20px',
                borderTop: i === 0 ? 'none' : '0.5px solid #EFEDE6',
              }}
            >
              <Avatar firstName={c.firstName} lastName={c.lastName} size={36} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1F1E2C' }}>
                  {c.firstName} {c.lastName}
                </div>
                <div style={{
                  fontSize: 12.5, color: '#6E6C84',
                  display: 'flex', gap: 12, alignItems: 'center',
                  flexWrap: 'wrap', marginTop: 2,
                }}>
                  {c.email && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Icon.Mail size={11} />{c.email}
                    </span>
                  )}
                  {c.phone && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Icon.Phone size={11} />{c.phone}
                    </span>
                  )}
                  {c.company && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Icon.Building size={11} />{c.company}
                    </span>
                  )}
                </div>
              </div>
              <span style={{
                fontSize: 11, color: '#534AB7', background: '#EEEDFE',
                border: '0.5px solid #CECBF6', padding: '2px 7px', borderRadius: 4,
                fontFamily: "ui-monospace, 'SF Mono', monospace",
                whiteSpace: 'nowrap',
              }}>
                {c.sourceId || c.id}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
