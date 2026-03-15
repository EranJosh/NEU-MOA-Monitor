import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { signInWithGoogle } from '../firebase/auth'
import { useAuth } from '../context/AuthContext'

// Google SVG icon
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

// Animated background grid lines
const GridBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <svg
      className="absolute inset-0 w-full h-full opacity-[0.04]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
    {/* Radial gradient overlay */}
    <div
      className="absolute inset-0"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,168,67,0.07) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(29,53,87,0.6) 0%, transparent 50%)',
      }}
    />
  </div>
)

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading } = useAuth()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [error, setError] = useState(location.state?.error || null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Small delay to allow fonts to load before animating
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, loading, navigate])

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return
    setIsSigningIn(true)
    setError(null)
    try {
      await signInWithGoogle()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error(err)
      if (err.message?.includes('ACCESS_DENIED')) {
        setError('Access restricted to @neu.edu.ph institutional accounts only.')
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError(null)
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError(null)
      } else {
        setError('Authentication failed. Please try again.')
      }
      setIsSigningIn(false)
    }
  }

  const animClass = (delay) =>
    mounted
      ? `opacity-100 translate-y-0 transition-all duration-700 ease-out delay-[${delay}ms]`
      : 'opacity-0 translate-y-5'

  return (
    <div
      className="relative min-h-screen bg-navy-900 flex items-center justify-center overflow-hidden"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <GridBackground />

      {/* Ambient orbs */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-10%',
          left: '-5%',
          width: '50vw',
          height: '50vw',
          background: 'radial-gradient(circle, rgba(212,168,67,0.06) 0%, transparent 65%)',
          borderRadius: '50%',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-15%',
          right: '-10%',
          width: '60vw',
          height: '60vw',
          background: 'radial-gradient(circle, rgba(17,34,64,0.8) 0%, transparent 65%)',
          borderRadius: '50%',
        }}
      />

      {/* 50 Years logo — rotated, floating, glowing */}
      <div
        className="absolute pointer-events-none select-none"
        style={{
          top: '6%',
          right: '5%',
          width: 'clamp(120px, 14vw, 200px)',
          transform: 'rotate(12deg)',
          filter: 'drop-shadow(0 0 20px rgba(212,168,67,0.55)) drop-shadow(0 0 50px rgba(212,168,67,0.25))',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 1.4s ease 0.8s, filter 3s ease-in-out',
          animation: mounted ? 'glowPulse 3s ease-in-out infinite' : 'none',
        }}
      >
        <img src="/neu-50years.png" alt="NEU 50 Years" className="w-full h-auto" />
      </div>

      {/* Small decorative NEU logo — bottom left, subtle */}
      <div
        className="absolute bottom-8 left-8 pointer-events-none select-none"
        style={{
          width: 'clamp(40px, 4vw, 56px)',
          opacity: mounted ? 0.12 : 0,
          transition: 'opacity 1.2s ease 1.2s',
        }}
      >
        <img src="/neu-logo.png" alt="NEU Logo" className="w-full h-auto" />
      </div>

      {/* Main login card */}
      <div
        className="relative z-10 w-full max-w-md mx-4"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.8s ease 0.1s, transform 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s',
        }}
      >
        {/* Card */}
        <div
          className="rounded-2xl p-8 md:p-10"
          style={{
            background: 'rgba(17,34,64,0.65)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(29,53,87,0.4) inset, 0 1px 0 rgba(255,255,255,0.08) inset',
          }}
        >
          {/* Institution header */}
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(12px)',
              transition: 'opacity 0.7s ease 0.2s, transform 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s',
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <img
                src="/neu-logo.png"
                alt="NEU"
                className="w-9 h-9 rounded-full"
                style={{ filter: 'drop-shadow(0 0 6px rgba(212,168,67,0.3))' }}
              />
              <div>
                <p className="text-xs font-sans font-medium tracking-[0.18em] uppercase text-white/40">
                  New Era University
                </p>
                <p className="text-xs font-sans text-white/20 tracking-wider">
                  Philippines · Est. 1975
                </p>
              </div>
            </div>
          </div>

          {/* Headline */}
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(14px)',
              transition: 'opacity 0.7s ease 0.35s, transform 0.7s cubic-bezier(0.16,1,0.3,1) 0.35s',
            }}
          >
            <h1
              className="mb-2"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 'clamp(1.75rem, 5vw, 2.25rem)',
                fontWeight: 600,
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(135deg, #F5D78E 0%, #D4A843 55%, #9A7428 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              MOA Monitor
            </h1>
            <p
              className="font-sans text-sm leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.38)', letterSpacing: '0.01em' }}
            >
              Memoranda of Agreement tracking for industry partnerships — refined, precise, authoritative.
            </p>
          </div>

          {/* Divider */}
          <div
            className="my-8"
            style={{
              opacity: mounted ? 1 : 0,
              transition: 'opacity 0.7s ease 0.45s',
            }}
          >
            <div
              className="h-px w-full"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(212,168,67,0.25) 50%, transparent 100%)',
              }}
            />
          </div>

          {/* Sign in section */}
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(12px)',
              transition: 'opacity 0.7s ease 0.5s, transform 0.7s cubic-bezier(0.16,1,0.3,1) 0.5s',
            }}
          >
            <p
              className="font-sans text-xs mb-5"
              style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}
            >
              Institutional Access Only
            </p>

            {/* Error state */}
            {error && (
              <div
                className="mb-5 rounded-xl px-4 py-3"
                style={{
                  background: 'rgba(196,30,58,0.1)',
                  border: '1px solid rgba(196,30,58,0.25)',
                }}
              >
                <p className="font-sans text-xs text-red-400/90 leading-relaxed">{error}</p>
              </div>
            )}

            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn || loading}
              className="w-full flex items-center justify-center gap-3 rounded-xl py-3.5 px-5 font-sans text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
              style={{
                background: isSigningIn
                  ? 'rgba(255,255,255,0.04)'
                  : 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.85)',
                letterSpacing: '0.02em',
                boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset',
              }}
              onMouseEnter={(e) => {
                if (!isSigningIn) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.09)'
                  e.currentTarget.style.borderColor = 'rgba(212,168,67,0.25)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.06) inset'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.06) inset'
              }}
            >
              {isSigningIn ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
                  <span>Authenticating…</span>
                </>
              ) : (
                <>
                  <GoogleIcon />
                  <span>Sign in with Google</span>
                </>
              )}
            </button>

            <p
              className="font-sans text-center mt-4 text-xs"
              style={{ color: 'rgba(255,255,255,0.18)', letterSpacing: '0.04em' }}
            >
              Use your <span style={{ color: 'rgba(212,168,67,0.6)' }}>@neu.edu.ph</span> account to continue
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className="mt-6 text-center"
          style={{
            opacity: mounted ? 1 : 0,
            transition: 'opacity 0.7s ease 0.7s',
          }}
        >
          <p
            className="font-sans text-xs"
            style={{ color: 'rgba(255,255,255,0.15)', letterSpacing: '0.06em' }}
          >
            MOA MONITORING SYSTEM · NEW ERA UNIVERSITY · 2025
          </p>
        </div>
      </div>
    </div>
  )
}
