import React from 'react'

export default function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', confirmDanger = true, onConfirm, onCancel, loading }) {
  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(7,15,26,0.8)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          margin: '0 16px',
          background: '#112240',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 18,
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          padding: '28px 28px 24px',
          animation: 'fadeUp 0.2s ease forwards',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Icon */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: confirmDanger ? 'rgba(248,113,113,0.12)' : 'rgba(212,168,67,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 18,
            fontSize: '1.2rem',
          }}
        >
          {confirmDanger ? '⚠' : '?'}
        </div>

        <h3
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '1.1rem',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.9)',
            marginBottom: 10,
          }}
        >
          {title}
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: 24 }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '9px 18px',
              borderRadius: 9,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontFamily: "'DM Sans', system-ui, sans-serif",
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '9px 18px',
              borderRadius: 9,
              border: 'none',
              background: confirmDanger ? 'rgba(239,68,68,0.85)' : 'rgba(212,168,67,0.85)',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontFamily: "'DM Sans', system-ui, sans-serif",
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = loading ? '0.6' : '1' }}
          >
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
