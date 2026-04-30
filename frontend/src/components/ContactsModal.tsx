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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(26,26,46,0.4)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[12px] bg-white shadow-xl"
        style={{ border: '0.5px solid #E0DEF7', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '0.5px solid #E0DEF7' }}
        >
          <div>
            <p className="font-semibold capitalize" style={{ fontSize: '14px', color: '#1a1a2e' }}>
              {source} contacts
            </p>
            {!loading && (
              <p style={{ fontSize: '12px', color: '#888888', marginTop: '1px' }}>
                {contacts.length} records
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[6px] transition-colors hover:bg-[#F5F4FF]"
            style={{ color: '#888888', fontSize: '16px' }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <svg className="h-5 w-5 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}

          {error && (
            <p className="px-5 py-4 text-sm" style={{ color: '#A32D2D' }}>{error}</p>
          )}

          {!loading && !error && contacts.length === 0 && (
            <div className="px-5 py-10 text-center">
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#534AB7' }}>No contacts yet</p>
              <p style={{ fontSize: '12px', color: '#888888', marginTop: '4px' }}>
                Sync this connector to pull in contacts
              </p>
            </div>
          )}

          {contacts.map((c, i) => (
            <div
              key={c.id}
              className="flex items-center gap-3 px-5 py-3"
              style={{
                borderBottom: i < contacts.length - 1 ? '0.5px solid #F1EFE8' : 'none',
              }}
            >
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                style={{ background: '#EEEDFE', color: '#534AB7' }}
              >
                {(c.firstName[0] ?? c.email[0] ?? '?').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="truncate"
                  style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a2e' }}
                >
                  {c.firstName} {c.lastName}
                </p>
                <p className="truncate" style={{ fontSize: '12px', color: '#888888' }}>
                  {c.email}
                  {c.phone && ` · ${c.phone}`}
                </p>
              </div>
              {c.company && (
                <span
                  className="flex-shrink-0 rounded-[4px] px-2 py-0.5 text-[11px]"
                  style={{ background: '#F5F4FF', color: '#534AB7' }}
                >
                  {c.company}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
