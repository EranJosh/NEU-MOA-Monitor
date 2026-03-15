import React from 'react'

const STATUS_STYLES = {
  APPROVED: {
    bg: 'rgba(74,222,128,0.12)',
    border: 'rgba(74,222,128,0.3)',
    text: '#4ADE80',
    dot: '#4ADE80',
  },
  PROCESSING: {
    bg: 'rgba(251,191,36,0.12)',
    border: 'rgba(251,191,36,0.3)',
    text: '#FBBF24',
    dot: '#FBBF24',
  },
  EXPIRING: {
    bg: 'rgba(251,146,60,0.12)',
    border: 'rgba(251,146,60,0.3)',
    text: '#FB923C',
    dot: '#FB923C',
  },
  EXPIRED: {
    bg: 'rgba(248,113,113,0.12)',
    border: 'rgba(248,113,113,0.3)',
    text: '#F87171',
    dot: '#F87171',
  },
}

const DEFAULT_STYLE = {
  bg: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.15)',
  text: 'rgba(255,255,255,0.5)',
  dot: 'rgba(255,255,255,0.3)',
}

export default function StatusBadge({ status, small }) {
  if (!status) return null
  const category = status.split(':')[0].trim()
  const style = STATUS_STYLES[category] || DEFAULT_STYLE
  const label = status

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: small ? '2px 7px' : '3px 9px',
        borderRadius: 20,
        background: style.bg,
        border: `1px solid ${style.border}`,
        fontSize: small ? '0.65rem' : '0.7rem',
        fontWeight: 500,
        color: style.text,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: style.dot,
          flexShrink: 0,
          boxShadow: `0 0 5px ${style.dot}80`,
        }}
      />
      {label}
    </span>
  )
}
