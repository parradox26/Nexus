import type { CSSProperties, ReactNode } from 'react'
import { ConnectorSource } from '../types'

// ─── Brand glyphs ────────────────────────────────────────────────────────────

export function GoogleGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.5-5.9 7.7-11.3 7.7-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 5.4 29.3 3.5 24 3.5 12.7 3.5 3.5 12.7 3.5 24S12.7 44.5 24 44.5 44.5 35.3 44.5 24c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 5.4 29.3 3.5 24 3.5c-7.7 0-14.4 4.4-17.7 10.6z"/>
      <path fill="#4CAF50" d="M24 44.5c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.4 35.5 26.8 36.5 24 36.5c-5.4 0-9.7-3.2-11.3-7.6l-6.5 5C9.5 40 16.2 44.5 24 44.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2 3.7-3.7 4.9l6.3 5.3C42.5 35 44.5 30 44.5 24c0-1.2-.1-2.3-.9-3.5z"/>
    </svg>
  )
}

export function FacebookGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#1877F2" d="M22 12a10 10 0 1 0-11.6 9.9V14.9H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.5 2.9h-2.3v7A10 10 0 0 0 22 12z"/>
    </svg>
  )
}

export function StripeGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#635BFF"/>
      <path fill="#fff" d="M13.5 9.4c0-.6.5-.8 1.3-.8 1.2 0 2.7.4 3.9 1V6.1c-1.3-.5-2.6-.7-3.9-.7-3.2 0-5.3 1.7-5.3 4.4 0 4.3 5.9 3.6 5.9 5.5 0 .7-.6.9-1.5.9-1.3 0-3-.5-4.3-1.2v3.5c1.5.6 2.9.9 4.3.9 3.3 0 5.5-1.6 5.5-4.4 0-4.6-5.9-3.8-5.9-5.6z"/>
    </svg>
  )
}

const CONNECTOR_META: Record<ConnectorSource, { Glyph: React.FC<{ size?: number }>; auth: string; leadCapable?: boolean }> = {
  google:      { Glyph: GoogleGlyph,   auth: 'oauth2' },
  facebook:    { Glyph: FacebookGlyph, auth: 'oauth2', leadCapable: true },
  stripe_mock: { Glyph: StripeGlyph,   auth: 'oauth2' },
}

export function ConnectorIcon({ source, size = 36 }: { source: ConnectorSource; size?: number }) {
  const meta = CONNECTOR_META[source]
  if (!meta) return null
  const { Glyph } = meta
  return (
    <div style={{
      width: size, height: size,
      borderRadius: 8,
      background: '#FFFFFF',
      border: '1px solid #E5E2F4',
      display: 'grid', placeItems: 'center',
      flexShrink: 0,
    }}>
      <Glyph size={Math.round(size * 0.55)} />
    </div>
  )
}

export function getConnectorMeta(source: ConnectorSource) {
  return CONNECTOR_META[source]
}

// ─── NexusLogo ───────────────────────────────────────────────────────────────

export function NexusLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="nx-logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1"/>
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.78"/>
        </linearGradient>
      </defs>
      <path
        d="M5 4.5 L5 19.5 M19 4.5 L19 19.5 M5 4.5 L19 19.5"
        stroke="url(#nx-logo-grad)"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="5" cy="4.5" r="1.6" fill="#FFFFFF"/>
      <circle cx="19" cy="19.5" r="1.6" fill="#FFFFFF"/>
      <circle cx="5" cy="19.5" r="1.2" fill="#FFFFFF" opacity="0.55"/>
      <circle cx="19" cy="4.5" r="1.2" fill="#FFFFFF" opacity="0.55"/>
    </svg>
  )
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

export function Spinner({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      style={{ animation: 'nx-spin 0.9s linear infinite' }}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2.5" fill="none" opacity="0.2"/>
      <path d="M21 12a9 9 0 0 0-9-9" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

// ─── Avatar with initials ─────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: '#EEEDFE', fg: '#534AB7' },
  { bg: '#EAF3DE', fg: '#3B6D11' },
  { bg: '#FAEEDA', fg: '#854F0B' },
  { bg: '#FCEBEB', fg: '#A32D2D' },
  { bg: '#E5F0FA', fg: '#1A5285' },
  { bg: '#F2E8F8', fg: '#5E3187' },
]

export function Avatar({ firstName, lastName, size = 32 }: { firstName: string; lastName: string; size?: number }) {
  const initials = ((firstName?.[0] ?? '') + (lastName?.[0] ?? '')).toUpperCase() || '?'
  const seed = (firstName + lastName).split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const c = AVATAR_PALETTE[seed % AVATAR_PALETTE.length]
  return (
    <div style={{
      width: size, height: size,
      borderRadius: size / 2,
      background: c.bg, color: c.fg,
      display: 'grid', placeItems: 'center',
      fontSize: size * 0.4, fontWeight: 600,
      flexShrink: 0,
      letterSpacing: '0.02em',
    }}>
      {initials}
    </div>
  )
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────

export function ProgressBar({
  succeeded, warnings, failed, attempted,
}: {
  succeeded: number; warnings: number; failed: number; attempted: number
}) {
  const total = Math.max(1, attempted)
  const sPct = (succeeded / total) * 100
  const wPct = (warnings / total) * 100
  const fPct = (failed / total) * 100
  return (
    <div style={{
      width: '100%', height: 6, borderRadius: 999,
      background: '#F1EFE8',
      display: 'flex', overflow: 'hidden',
    }}>
      <div style={{ width: `${sPct}%`, background: '#4F9914' }} />
      <div style={{ width: `${wPct}%`, background: '#C8810E' }} />
      <div style={{ width: `${fPct}%`, background: '#D33B3B' }} />
    </div>
  )
}

// ─── MonoPill ────────────────────────────────────────────────────────────────

export function MonoPill({ children, label }: { children?: string | null; label?: string }) {
  if (!children) return <span style={{ color: '#A6A39C' }}>—</span>
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 7px',
      borderRadius: 4,
      background: '#F5F4FF',
      border: '0.5px solid #E0DEF7',
      color: '#534AB7',
      fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
      fontSize: 11,
      fontWeight: 500,
    }}>
      {label && <span style={{ color: '#8A87A1', fontWeight: 400 }}>{label}:</span>}
      {children}
    </span>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

type IconProps = { size?: number; color?: string }
type IconComponent = (props: IconProps) => ReactNode

export const Icon: Record<string, IconComponent> = {
  Sync:     ({ size = 14, color = 'currentColor' }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 1-15.5 6.4L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.4L21 8"/><polyline points="21 3 21 8 16 8"/><polyline points="3 21 3 16 8 16"/></svg>),
  Plug:     ({ size = 14, color = 'currentColor' }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2v6"/><path d="M15 2v6"/><path d="M6 8h12v4a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8z"/><path d="M12 18v4"/></svg>),
  Users:    ({ size = 14, color = 'currentColor' }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/></svg>),
  Target:   ({ size = 14, color = 'currentColor' }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>),
  Check:    ({ size = 14, color = 'currentColor' }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>),
  X:        ({ size = 14, color = 'currentColor' }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>),
  Alert:    ({ size = 14, color = 'currentColor' }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>),
  Clock:    ({ size = 14, color = 'currentColor' }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
  Search:   ({ size = 14, color = 'currentColor' }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>),
  Mail:     ({ size = 14, color = 'currentColor' }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>),
  Phone:    ({ size = 14, color = 'currentColor' }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>),
  Building: ({ size = 14, color = 'currentColor' }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M8 10h.01"/><path d="M12 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/></svg>),
  Plus:     ({ size = 14, color = 'currentColor' }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>),
  Dots:     ({ size = 14, color = 'currentColor' }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill={color}><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>),
  Megaphone:({ size = 14, color = 'currentColor' }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>),
}

// ─── Shared button ────────────────────────────────────────────────────────────

type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

interface ButtonProps {
  kind?: ButtonKind
  size?: ButtonSize
  icon?: IconComponent
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  full?: boolean
  children?: ReactNode
  title?: string
}

export function NxButton({ kind = 'secondary', size = 'md', icon: IconComp, children, onClick, disabled, loading, full, title }: ButtonProps) {
  const s = size === 'sm'
    ? { padX: 10, padY: 6, font: 12, gap: 6, iconSize: 13 }
    : { padX: 12, padY: 8, font: 13, gap: 6, iconSize: 14 }

  const variants: Record<ButtonKind, CSSProperties> = {
    primary:   { background: disabled ? '#A6A2E8' : '#6366F1', color: '#FFFFFF', border: '1px solid transparent' },
    secondary: { background: '#FFFFFF', color: '#1F1E2C', border: '1px solid #E0DEF7' },
    ghost:     { background: 'transparent', color: '#534AB7', border: '1px solid transparent' },
    danger:    { background: '#FFFFFF', color: '#A32D2D', border: '1px solid #F7C1C1' },
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className="nx-btn"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: s.gap,
        padding: `${s.padY}px ${s.padX}px`,
        borderRadius: 8,
        fontSize: s.font, fontWeight: 500, lineHeight: 1,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'background 120ms ease, color 120ms ease, border-color 120ms ease',
        width: full ? '100%' : 'auto',
        fontFamily: 'inherit',
        ...variants[kind],
      }}
    >
      {loading ? <Spinner size={s.iconSize} /> : IconComp ? <IconComp size={s.iconSize} /> : null}
      {children}
    </button>
  )
}
