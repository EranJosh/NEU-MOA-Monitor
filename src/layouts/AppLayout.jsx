import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { signOutUser } from '../firebase/auth'

const NAV_ITEMS = {
  student: [
    { label: 'Overview', href: '/dashboard', icon: '◈' },
  ],
  faculty: [
    { label: 'Overview',    href: '/dashboard',   icon: '◈' },
    { label: 'MOA Records', href: '/moas',         icon: '⊞' },
    { label: 'Statistics',  href: '/statistics',  icon: '◐' },
  ],
  admin: [
    { label: 'Overview',        href: '/dashboard',  icon: '◈' },
    { label: 'MOA Registry',    href: '/moas',       icon: '⊞' },
    { label: 'Statistics',      href: '/statistics', icon: '◐' },
    { label: 'User Management', href: '/users',      icon: '◉' },
    { label: 'Audit Trail',     href: '/audit',      icon: '◎' },
  ],
}

const ROLE_BADGE = {
  admin:   { label: 'Admin',   bg: 'rgba(212,168,67,0.15)',  border: 'rgba(212,168,67,0.35)',  text: '#D4A843' },
  faculty: { label: 'Faculty', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)',   text: '#60A5FA' },
  student: { label: 'Student', bg: 'rgba(74,222,128,0.10)',  border: 'rgba(74,222,128,0.25)',  text: '#4ADE80' },
}

// ── Avatar component (photo or monogram fallback) ──────────────────────────
function Avatar({ user, size = 32, glowColor = '#D4A843', ring = false }) {
  const displayName = user?.displayName || 'User'
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const ringStyle = ring
    ? { boxShadow: `0 0 0 2px #0D1B2A, 0 0 0 3.5px ${glowColor}60, 0 0 12px ${glowColor}40` }
    : {}

  if (user?.photoURL) {
    return (
      <img
        src={user.photoURL}
        alt={displayName}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, ...ringStyle }}
      />
    )
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'rgba(212,168,67,0.18)',
        color: '#D4A843',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.35,
        fontWeight: 600,
        flexShrink: 0,
        letterSpacing: '0.02em',
        ...ringStyle,
      }}
    >
      {initials}
    </div>
  )
}

// ── Avatar dropdown ────────────────────────────────────────────────────────
function AvatarDropdown({ user, userDoc, role, onSignOut, signingOut }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const badge = ROLE_BADGE[role] || ROLE_BADGE.student

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const displayName = user?.displayName || userDoc?.displayName || 'User'
  const email = user?.email || userDoc?.email || ''

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderRadius: 10,
          outline: 'none',
        }}
        aria-label="User menu"
      >
        <Avatar user={user} size={34} ring />
        {/* Name + role — visible in sidebar trigger */}
        <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'rgba(255,255,255,0.82)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {displayName.split(' ')[0]}
          </p>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: '0.65rem',
              fontWeight: 600,
              letterSpacing: '0.07em',
              padding: '1px 7px',
              borderRadius: 4,
              background: badge.bg,
              border: `1px solid ${badge.border}`,
              color: badge.text,
              marginTop: 2,
            }}
          >
            {badge.label}
          </span>
        </div>
        {/* Chevron */}
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }}
        >
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            zIndex: 100,
            background: '#112240',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 14,
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(29,53,87,0.5) inset',
            overflow: 'hidden',
            animation: 'fadeUp 0.18s ease forwards',
          }}
        >
          {/* Profile info */}
          <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Avatar user={user} size={40} ring />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255,255,255,0.88)', marginBottom: 1 }}>
                  {displayName}
                </p>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {email}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 6px #4ADE8080' }} />
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>
                Active session · @neu.edu.ph
              </span>
            </div>
          </div>

          {/* Sign out */}
          <div style={{ padding: '8px' }}>
            <button
              onClick={() => { setOpen(false); onSignOut() }}
              disabled={signingOut}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 10px',
                borderRadius: 9,
                border: 'none',
                background: 'transparent',
                cursor: signingOut ? 'not-allowed' : 'pointer',
                color: 'rgba(196,80,80,0.85)',
                fontSize: '0.8rem',
                fontWeight: 500,
                letterSpacing: '0.02em',
                opacity: signingOut ? 0.5 : 1,
                transition: 'background 0.15s',
                fontFamily: "'DM Sans', system-ui, sans-serif",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(196,30,58,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3M10 10l3-3-3-3M13 7H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {signingOut ? 'Signing out…' : 'Sign Out'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Top-bar avatar button (compact, no dropdown — opens sidebar dropdown) ──
function TopBarAvatar({ user }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <Avatar user={user} size={30} ring />
    </div>
  )
}

// ── Main layout ────────────────────────────────────────────────────────────
export default function AppLayout({ children }) {
  const { user, userDoc, role } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [signingOut, setSigningOut] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Show toast from navigation state (e.g. unauthorized redirect)
  useEffect(() => {
    if (location.state?.toast) {
      toast.error(location.state.toast)
      window.history.replaceState({}, document.title)
    }
  }, [location.state?.toast])

  const navItems = NAV_ITEMS[role] || NAV_ITEMS.student

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOutUser()
      navigate('/login', { replace: true })
    } catch {
      setSigningOut(false)
    }
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: '#0D1B2A', fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      {/* ── Mobile sidebar overlay ──────────────────────────────────── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 45,
            background: 'rgba(7,15,26,0.65)',
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside
        className={`sidebar-nav flex flex-col w-64 min-h-screen fixed left-0 top-0 z-50${sidebarOpen ? ' open' : ''}`}
        style={{
          background: 'rgba(17,34,64,0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '28px 24px 22px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src="/neu-logo.png"
              alt="NEU"
              style={{ width: 32, height: 32, borderRadius: '50%', filter: 'drop-shadow(0 0 6px rgba(212,168,67,0.3))' }}
            />
            <div>
              <p style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '0.95rem',
                fontWeight: 600,
                letterSpacing: '-0.01em',
                background: 'linear-gradient(135deg, #F5D78E, #D4A843)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                MOA Monitor
              </p>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.22)', letterSpacing: '0.06em' }}>
                NEU · {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 10,
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.38)',
                  background: isActive ? 'rgba(29,53,87,0.7)' : 'transparent',
                  border: isActive ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
                  letterSpacing: '0.01em',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.65)'
                    e.currentTarget.style.background = 'rgba(29,53,87,0.35)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.38)'
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <span style={{ opacity: 0.55, fontSize: '1rem' }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User area with dropdown */}
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 12,
              background: 'rgba(29,53,87,0.3)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <AvatarDropdown
              user={user}
              userDoc={userDoc}
              role={role}
              onSignOut={handleSignOut}
              signingOut={signingOut}
            />
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="flex-1 md:ml-64 min-h-screen">
        {/* Top bar */}
        <div
          className="sticky top-0 z-30 flex items-center justify-between px-6 md:px-8"
          style={{
            height: 56,
            background: 'rgba(13,27,42,0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {/* Left: mobile menu + breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 6, borderRadius: 8 }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <rect y="2" width="18" height="1.5" rx="0.75"/>
                <rect y="8.25" width="18" height="1.5" rx="0.75"/>
                <rect y="14.5" width="18" height="1.5" rx="0.75"/>
              </svg>
            </button>
            <p
              className="hidden md:block"
              style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.14em', textTransform: 'uppercase' }}
            >
              New Era University · MOA Monitoring System
            </p>
          </div>

          {/* Right: 50yr logo + avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img
              src="/neu-50years.png"
              alt="50 Years"
              style={{ height: 28, width: 'auto', opacity: 0.45, filter: 'drop-shadow(0 0 4px rgba(212,168,67,0.3))' }}
            />
            {/* Avatar in topbar — decorative, main dropdown is in sidebar */}
            <div className="hidden md:block">
              <TopBarAvatar user={user} />
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="px-6 md:px-8 py-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
