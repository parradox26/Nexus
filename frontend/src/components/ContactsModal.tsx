import { useState, useEffect } from 'react'
import { ConnectorSource, UnifiedContact } from '../types'
import { api } from '../api/client'

interface Props {
  source: ConnectorSource
  onClose: () => void
}

export function ContactsModal({ source, onClose }: Props) {
  const [contacts, setContacts] = useState<UnifiedContact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.contacts
      .list(source, 50, 0)
      .then((data) => setContacts(data.contacts))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load contacts'))
      .finally(() => setLoading(false))
  }, [source])

  function getDisplayName(contact: UnifiedContact): string {
    const first = contact.firstName.trim()
    const last = contact.lastName.trim()
    const fullName = `${first} ${last}`.trim()
    if (fullName) return fullName
    const fallback = contact.email.split('@')[0]
    return fallback || 'Unnamed contact'
  }

  function getAvatarLabel(contact: UnifiedContact): string {
    const first = contact.firstName.trim()
    const last = contact.lastName.trim()
    if (first && last) return `${first[0]}${last[0]}`.toUpperCase()
    if (first) return first[0].toUpperCase()
    if (contact.email) return contact.email[0].toUpperCase()
    return '?'
  }

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
          maxWidth: '720px',
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
                border: '0.5px solid #CECBF6',
                background: '#EEEDFE',
                color: '#534AB7',
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
                {source} contacts
              </p>
              {!loading && (
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6F7190' }}>
                  {contacts.length} records
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

        <div style={{ overflowY: 'auto', flex: 1, padding: '14px' }}>
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '54px 0' }}>
              <svg viewBox="0 0 24 24" fill="none" style={{ width: '20px', height: '20px', color: '#6366F1' }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
                <path fill="currentColor" opacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 12 12"
                    to="360 12 12"
                    dur="0.9s"
                    repeatCount="indefinite"
                  />
                </path>
              </svg>
            </div>
          )}

          {error && (
            <p style={{ margin: 0, padding: '8px', fontSize: '13px', color: '#A32D2D' }}>
              {error}
            </p>
          )}

          {!loading && !error && contacts.length === 0 && (
            <div style={{ padding: '42px 8px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#534AB7' }}>No contacts yet</p>
              <p style={{ fontSize: '12px', color: '#888888', marginTop: '4px' }}>
                Sync this connector to pull in contacts
              </p>
            </div>
          )}

          {!loading && !error && contacts.map((contact) => (
            <div
              key={contact.id}
              style={{
                border: '0.5px solid #E0DEF7',
                borderRadius: '10px',
                padding: '11px 12px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                background: '#FFFFFF',
                boxShadow: '0 1px 0 rgba(77, 82, 136, 0.05)',
                marginBottom: '8px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  border: '0.5px solid #CECBF6',
                  background: '#EEEDFE',
                  color: '#534AB7',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                }}
              >
                {getAvatarLabel(contact)}
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#1A1A2E',
                    lineHeight: 1.3,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {getDisplayName(contact)}
                </p>
                <p
                  style={{
                    margin: '3px 0 0',
                    fontSize: '12px',
                    color: '#6F7190',
                    lineHeight: 1.35,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {contact.email}
                </p>
                {contact.phone && (
                  <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#8C8EA9', lineHeight: 1.3 }}>
                    {contact.phone}
                  </p>
                )}
              </div>

              {contact.company && (
                <span
                  style={{
                    flexShrink: 0,
                    borderRadius: '999px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    border: '0.5px solid #E0DEF7',
                    background: '#F5F4FF',
                    color: '#534AB7',
                    maxWidth: '130px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {contact.company}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
