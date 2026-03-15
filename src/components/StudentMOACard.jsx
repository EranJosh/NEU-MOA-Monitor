import React from 'react'

/* ── Industry theming ────────────────────────────────────────────── */
const INDUSTRY_THEME = {
  Technology: {
    gradient: 'linear-gradient(135deg, #0d2547, #1a3560)',
    accent: '#60A5FA',
    icon: '💻',
  },
  Finance: {
    gradient: 'linear-gradient(135deg, #0d3528, #1a4a38)',
    accent: '#34D399',
    icon: '💳',
  },
  Food: {
    gradient: 'linear-gradient(135deg, #1a2e0a, #2a4010)',
    accent: '#86EFAC',
    icon: '🍽',
  },
  Services: {
    gradient: 'linear-gradient(135deg, #1f1040, #2a1550)',
    accent: '#C084FC',
    icon: '🏢',
  },
  Telecom: {
    gradient: 'linear-gradient(135deg, #2a1800, #3d2600)',
    accent: '#FBBF24',
    icon: '📡',
  },
}
const DEFAULT_THEME = {
  gradient: 'linear-gradient(135deg, #112240, #1a3254)',
  accent: '#60A5FA',
  icon: '🏭',
}

function getTheme(industryType) {
  return INDUSTRY_THEME[industryType] || DEFAULT_THEME
}

/* ── Date formatting ─────────────────────────────────────────────── */
const formatDate = (ts) => {
  if (!ts) return '—'
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return '—' }
}

/* ── Section header ──────────────────────────────────────────────── */
function SectionHeader({ children }) {
  return (
    <p style={{
      fontSize: '0.6rem',
      fontWeight: 700,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.22)',
      marginBottom: 10,
      marginTop: 0,
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      {children}
    </p>
  )
}

/* ── Info row with icon prefix ───────────────────────────────────── */
function InfoRow({ icon, children, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, ...style }}>
      <span style={{ fontSize: '0.9rem', opacity: 0.65, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div style={{ minWidth: 0, flex: 1 }}>{children}</div>
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────────── */
export default function StudentMOACard({ moa, onClose }) {
  if (!moa) return null

  const theme = getTheme(moa.industryType)

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onKeyDown={handleKeyDown}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        background: 'rgba(7,15,26,0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: '72px 16px 24px',
        overflowY: 'auto',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 580,
          background: 'linear-gradient(160deg, #0F2040 0%, #0D1B2A 100%)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 22,
          boxShadow: '0 40px 100px rgba(0,0,0,0.75)',
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
          animation: 'scaleIn 0.2s cubic-bezier(0.34, 1.26, 0.64, 1) forwards',
          transformOrigin: 'center center',
        }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.94) translateY(10px); }
            to   { opacity: 1; transform: scale(1)    translateY(0);    }
          }
        `}</style>

        {/* ── Gradient Banner Header ── */}
        <div
          style={{
            height: 120,
            background: theme.gradient,
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '22px 22px 0 0',
            flexShrink: 0,
          }}
        >
          {/* Large watermark */}
          <span
            style={{
              position: 'absolute',
              bottom: -8,
              right: 14,
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '5rem',
              fontWeight: 700,
              color: '#fff',
              opacity: 0.07,
              lineHeight: 1,
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {moa.industryType || 'MOA'}
          </span>

          {/* Industry icon background decoration */}
          <span
            style={{
              position: 'absolute',
              left: 22,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '2.8rem',
              opacity: 0.25,
              lineHeight: 1,
              userSelect: 'none',
            }}
          >
            {theme.icon}
          </span>

          {/* Company name overlay */}
          <div
            style={{
              position: 'absolute',
              left: 22,
              bottom: 18,
              right: 90,
            }}
          >
            <p style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '1.3rem',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.92)',
              lineHeight: 1.25,
              margin: 0,
              textShadow: '0 1px 8px rgba(0,0,0,0.5)',
            }}>
              {moa.companyName}
            </p>
          </div>

          {/* APPROVED badge */}
          <span
            style={{
              position: 'absolute',
              top: 14,
              right: 50,
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '3px 9px',
              borderRadius: 20,
              background: 'rgba(52,211,153,0.2)',
              border: '1px solid rgba(52,211,153,0.45)',
              color: '#34D399',
            }}
          >
            Approved
          </span>

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              width: 30,
              height: 30,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.95rem',
              transition: 'all 0.15s',
              lineHeight: 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.45)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.25)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* ── MOA ID strip ── */}
        {moa.hteId && (
          <div style={{
            padding: '8px 22px',
            background: 'rgba(212,168,67,0.06)',
            borderBottom: '1px solid rgba(212,168,67,0.1)',
          }}>
            <span style={{
              fontSize: '0.7rem',
              fontFamily: 'monospace',
              color: 'rgba(212,168,67,0.75)',
              letterSpacing: '0.04em',
            }}>
              MOA ID: {moa.hteId}
            </span>
          </div>
        )}

        {/* ── Description tagline ── */}
        {moa.description && (
          <div style={{ padding: '14px 22px 0' }}>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, fontStyle: 'italic', margin: 0 }}>
              {moa.description}
            </p>
          </div>
        )}

        {/* ── Body ── */}
        <div style={{ padding: '20px 22px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* 1. Company Information */}
          <div style={{ marginBottom: 20 }}>
            <SectionHeader>Company Information</SectionHeader>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {moa.industryType && (
                <span style={{
                  fontSize: '0.72rem',
                  padding: '3px 11px',
                  borderRadius: 20,
                  background: `${theme.accent}18`,
                  border: `1px solid ${theme.accent}40`,
                  color: theme.accent,
                  fontWeight: 500,
                }}>
                  {moa.industryType}
                </span>
              )}
              {moa.endorsedByCollege && (
                <span style={{
                  fontSize: '0.7rem',
                  padding: '3px 11px',
                  borderRadius: 20,
                  background: 'rgba(212,168,67,0.1)',
                  border: '1px solid rgba(212,168,67,0.28)',
                  color: '#D4A843',
                  fontWeight: 500,
                }}>
                  {moa.endorsedByCollege}
                </span>
              )}
            </div>
            {moa.hteId && (
              <p style={{ fontSize: '0.72rem', color: 'rgba(212,168,67,0.6)', fontFamily: 'monospace', margin: 0 }}>
                HTE ID: {moa.hteId}
              </p>
            )}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginBottom: 20 }} />

          {/* 2. Location */}
          <div style={{ marginBottom: 20 }}>
            <SectionHeader>Location</SectionHeader>
            <InfoRow icon="📍">
              <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.72)', lineHeight: 1.55, margin: 0 }}>
                {moa.address || '—'}
              </p>
            </InfoRow>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginBottom: 20 }} />

          {/* 3. Contact Details */}
          <div style={{ marginBottom: 20 }}>
            <SectionHeader>Contact Details</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <InfoRow icon="👤">
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.82)', fontWeight: 500, margin: 0 }}>
                  {moa.contactPerson || '—'}
                </p>
              </InfoRow>
              <InfoRow icon="✉">
                {moa.contactEmail ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <a
                      href={`mailto:${moa.contactEmail}`}
                      style={{ fontSize: '0.82rem', color: '#60A5FA', textDecoration: 'none', wordBreak: 'break-all', fontFamily: 'monospace' }}
                      onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                    >
                      {moa.contactEmail}
                    </a>
                    <a
                      href={`mailto:${moa.contactEmail}`}
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: 7,
                        background: 'rgba(96,165,250,0.15)',
                        border: '1px solid rgba(96,165,250,0.35)',
                        color: '#60A5FA',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(96,165,250,0.26)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(96,165,250,0.15)'}
                    >
                      Send Email
                    </a>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.2)', margin: 0 }}>—</p>
                )}
              </InfoRow>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginBottom: 20 }} />

          {/* 4. Agreement Period */}
          <div style={{ marginBottom: 20 }}>
            <SectionHeader>Agreement Period</SectionHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              {/* Start date block */}
              <div style={{ textAlign: 'center', minWidth: 100 }}>
                <p style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 4, margin: '0 0 4px 0' }}>Effective</p>
                <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'rgba(255,255,255,0.82)', margin: 0 }}>{formatDate(moa.effectiveDate)}</p>
              </div>

              {/* Connector line + arrow */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.12), rgba(255,255,255,0.25), rgba(255,255,255,0.12))' }} />
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)', margin: '0 6px', userSelect: 'none' }}>→</span>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.12), rgba(255,255,255,0.25), rgba(255,255,255,0.12))' }} />
              </div>

              {/* End date block */}
              <div style={{ textAlign: 'center', minWidth: 100 }}>
                <p style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 4, margin: '0 0 4px 0' }}>Expires</p>
                <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'rgba(255,255,255,0.82)', margin: 0 }}>{formatDate(moa.expirationDate)}</p>
              </div>
            </div>
          </div>

          {/* 5. Endorsed By */}
          {moa.endorsedByCollege && (
            <>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginBottom: 20 }} />
              <div style={{ marginBottom: 8 }}>
                <SectionHeader>Endorsed By</SectionHeader>
                <span style={{
                  display: 'inline-block',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  padding: '5px 14px',
                  borderRadius: 20,
                  background: 'rgba(212,168,67,0.12)',
                  border: '1px solid rgba(212,168,67,0.3)',
                  color: '#D4A843',
                  letterSpacing: '0.01em',
                }}>
                  {moa.endorsedByCollege}
                </span>
              </div>
            </>
          )}
        </div>

        {/* ── Footer close button ── */}
        <div style={{ padding: '0 22px 22px' }}>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '11px 0',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: "'DM Sans', system-ui, sans-serif",
              transition: 'all 0.15s',
              letterSpacing: '0.02em',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
