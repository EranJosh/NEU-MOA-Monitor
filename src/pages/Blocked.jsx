import React from 'react'
import { signOutUser } from '../firebase/auth'
import { useNavigate } from 'react-router-dom'

export default function Blocked() {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOutUser()
    navigate('/login', { replace: true })
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0D1B2A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        padding: 24,
      }}
    >
      {/* Ambient */}
      <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(248,113,113,0.04) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <div
        style={{
          maxWidth: 440,
          width: '100%',
          background: 'rgba(17,34,64,0.7)',
          border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 20,
          padding: '48px 40px',
          textAlign: 'center',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'rgba(248,113,113,0.12)',
            border: '1px solid rgba(248,113,113,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            margin: '0 auto 24px',
          }}
        >
          ⊗
        </div>

        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '1.4rem',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.9)',
            marginBottom: 12,
          }}
        >
          Account Suspended
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.65, marginBottom: 32 }}>
          Your account has been suspended by an administrator.
          Please contact the NEU system administrator to restore access.
        </p>

        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', marginBottom: 28 }} />

        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
          Signed in as a suspended account
        </p>
        <button
          onClick={handleSignOut}
          style={{
            padding: '10px 24px',
            borderRadius: 9,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'transparent',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.875rem',
            cursor: 'pointer',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
