import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0D1B2A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      padding: 24,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{
          fontSize: '6rem',
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 700,
          color: 'rgba(212,168,67,0.15)',
          lineHeight: 1,
          letterSpacing: '-0.04em',
          marginBottom: 8,
          userSelect: 'none',
        }}>
          404
        </div>
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '1.6rem',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.85)',
          letterSpacing: '-0.02em',
          marginBottom: 12,
        }}>
          Page not found
        </h1>
        <p style={{
          fontSize: '0.875rem',
          color: 'rgba(255,255,255,0.35)',
          lineHeight: 1.6,
          marginBottom: 32,
        }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            border: '1px solid rgba(212,168,67,0.35)',
            background: 'rgba(212,168,67,0.1)',
            color: '#D4A843',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            transition: 'all 0.15s',
            letterSpacing: '0.02em',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,168,67,0.18)'; e.currentTarget.style.borderColor = 'rgba(212,168,67,0.55)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,168,67,0.1)'; e.currentTarget.style.borderColor = 'rgba(212,168,67,0.35)' }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  )
}
