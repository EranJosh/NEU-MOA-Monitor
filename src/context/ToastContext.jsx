import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

const TYPE_CONFIG = {
  success: { bg: 'rgba(6,22,14,0.97)',  border: 'rgba(74,222,128,0.35)',  icon: '✓', color: '#4ADE80' },
  error:   { bg: 'rgba(22,6,10,0.97)',  border: 'rgba(248,113,113,0.35)', icon: '⚠', color: '#F87171' },
  warning: { bg: 'rgba(22,15,4,0.97)',  border: 'rgba(251,191,36,0.35)',  icon: '!', color: '#FBBF24' },
  info:    { bg: 'rgba(6,14,28,0.97)',  border: 'rgba(96,165,250,0.35)',  icon: 'ℹ', color: '#60A5FA' },
}

function ToastItem({ toast, onDismiss }) {
  const s = TYPE_CONFIG[toast.type] || TYPE_CONFIG.info
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '11px 14px', borderRadius: 12,
      minWidth: 260, maxWidth: 400,
      background: s.bg, border: `1px solid ${s.border}`,
      boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      animation: 'slideInRight 0.25s cubic-bezier(0.16,1,0.3,1) forwards',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <span style={{ color: s.color, fontSize: '0.9rem', flexShrink: 0, lineHeight: 1 }}>{s.icon}</span>
      <span style={{ flex: 1, fontSize: '0.82rem', color: 'rgba(255,255,255,0.88)', lineHeight: 1.45 }}>{toast.message}</span>
      <button
        onClick={onDismiss}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.28)', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: '0 2px', flexShrink: 0, transition: 'color 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.28)'}
      >×</button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'info', duration = 3200) => {
    const id = ++nextId.current
    setToasts(prev => [...prev.slice(-4), { id, message, type }])
    setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  const toast = {
    success: (msg)  => addToast(msg, 'success'),
    error:   (msg)  => addToast(msg, 'error',   4500),
    warning: (msg)  => addToast(msg, 'warning'),
    info:    (msg)  => addToast(msg, 'info'),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 99999,
          display: 'flex', flexDirection: 'column', gap: 8,
          pointerEvents: 'none',
        }}>
          {toasts.map(t => (
            <div key={t.id} style={{ pointerEvents: 'all' }}>
              <ToastItem toast={t} onDismiss={() => dismiss(t.id)} />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
