import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/firebase'
import AppLayout from '../layouts/AppLayout'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import {
  checkAndUpdateExpiredMOAs,
  INDUSTRY_TYPES,
  COLLEGES,
  APPROVED_STATUSES,
} from '../firebase/firestore'
import { runSeed, patchDescriptions, cleanupMOAs, patchColleges } from '../firebase/seed'
window.__cleanupNEUMOA = cleanupMOAs
window.__seedNEUMOA = async () => { const r = await runSeed(); await patchDescriptions().catch(() => {}); return r }
window.__patchColleges = patchColleges
window.__fixCollegeNames = patchColleges
import StatusBadge from '../components/StatusBadge'
import MOADetailPanel from '../components/MOADetailPanel'
import StudentMOACard from '../components/StudentMOACard'

const fmt = (ts) => {
  if (!ts) return '—'
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return '—' }
}

// ─── Helpers to derive stats from live MOA array ─────────────────────────
function computeStats(moas) {
  const s = { total: 0, approved: 0, processing: 0, expiring: 0, expired: 0, deleted: 0 }
  moas.forEach(d => {
    s.total++
    if (d.isDeleted) { s.deleted++; return }
    const st = d.status || ''
    if      (st.startsWith('APPROVED'))    s.approved++
    else if (st.startsWith('PROCESSING'))  s.processing++
    else if (st.startsWith('EXPIRING'))    s.expiring++
    else if (st.startsWith('EXPIRED'))     s.expired++
  })
  return s
}

function computeMonthly(moas, monthCount = 6) {
  const now    = new Date()
  const months = []
  const map    = {}
  for (let i = monthCount - 1; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key   = `${d.getFullYear()}-${d.getMonth()}`
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    months.push({ key, label, count: 0 })
    map[key] = months.length - 1
  }
  moas.forEach(d => {
    const ts = d.createdAt?.toDate?.()
    if (!ts) return
    const key = `${ts.getFullYear()}-${ts.getMonth()}`
    if (map[key] !== undefined) months[map[key]].count++
  })
  return months
}

// ─── Shared mini components ────────────────────────────────────────────────

function StatCard({ label, value, note, accent = '#D4A843', delay = 0, onClick }) {
  return (
    <div
      className="rounded-xl p-5 animate-fade-up"
      onClick={onClick}
      style={{
        background: 'rgba(17,34,64,0.6)', border: '1px solid rgba(255,255,255,0.07)',
        animationDelay: `${delay}ms`, animationFillMode: 'both',
        cursor: onClick ? 'pointer' : 'default', transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.borderColor = `${accent}50` }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
    >
      <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 10 }}>{label}</p>
      <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '2.2rem', fontWeight: 600, color: value === '—' ? 'rgba(255,255,255,0.15)' : accent, lineHeight: 1 }}>{value}</p>
      {note && <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', marginTop: 6 }}>{note}</p>}
    </div>
  )
}

function Dot({ color }) {
  return <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}80`, flexShrink: 0 }} />
}

function CollegePill({ label, count, color = '#60A5FA' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 14px', borderRadius: 9, background: 'rgba(29,53,87,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color, flexShrink: 0 }}>{count}</span>
    </div>
  )
}

function SearchBar({ onSearch, placeholder = 'Search MOAs…' }) {
  const [val, setVal] = useState('')
  const handleKey = (e) => { if (e.key === 'Enter' && val.trim()) onSearch(val.trim()) }
  return (
    <div style={{ position: 'relative', maxWidth: 440 }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }}>
        <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <input
        value={val} onChange={e => setVal(e.target.value)} onKeyDown={handleKey}
        placeholder={placeholder}
        style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(13,27,42,0.8)', color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', outline: 'none', fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'border-color 0.15s', boxSizing: 'border-box' }}
        onFocus={e => e.target.style.borderColor = 'rgba(212,168,67,0.4)'}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.09)'}
      />
      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.65rem', color: 'rgba(255,255,255,0.18)', pointerEvents: 'none' }}>Enter ↵</span>
    </div>
  )
}

function MonthlyChart({ data }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div style={{ background: 'rgba(17,34,64,0.55)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 24px' }}>
      <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>Monthly Submissions</p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 90 }}>
        {data.map((d) => (
          <div key={d.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.65rem', color: '#D4A843', fontWeight: 600 }}>{d.count > 0 ? d.count : ''}</span>
            <div style={{ width: '100%', background: d.count > 0 ? 'rgba(212,168,67,0.55)' : 'rgba(255,255,255,0.06)', borderRadius: '4px 4px 0 0', height: `${Math.max((d.count / max) * 68, d.count > 0 ? 6 : 2)}px`, transition: 'height 0.4s ease', boxShadow: d.count > 0 ? '0 0 8px rgba(212,168,67,0.2)' : 'none' }} />
            <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center', whiteSpace: 'nowrap' }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RecentMOARow({ moa, onClick }) {
  return (
    <div onClick={() => onClick(moa)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, cursor: 'pointer', transition: 'background 0.1s', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(29,53,87,0.3)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'rgba(255,255,255,0.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{moa.companyName}</p>
        <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{moa.endorsedByCollege}</p>
      </div>
      <StatusBadge status={moa.status} small />
      <span style={{ fontSize: '0.7rem', color: 'rgba(212,168,67,0.7)', fontWeight: 500, flexShrink: 0, marginLeft: 4 }}>View →</span>
    </div>
  )
}

function MOACompactCard({ moa, onClick }) {
  const isExpiring = moa.status?.startsWith('EXPIRING')
  return (
    <div onClick={() => onClick(moa)} style={{ padding: '14px 16px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s', background: isExpiring ? 'rgba(251,191,36,0.06)' : 'rgba(29,53,87,0.25)', border: `1px solid ${isExpiring ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.06)'}`, overflow: 'hidden' }}
      onMouseEnter={e => { e.currentTarget.style.background = isExpiring ? 'rgba(251,191,36,0.1)' : 'rgba(29,53,87,0.45)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.background = isExpiring ? 'rgba(251,191,36,0.06)' : 'rgba(29,53,87,0.25)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.85)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{moa.companyName}</p>
        <div style={{ flexShrink: 0, maxWidth: 120, overflow: 'hidden' }}><StatusBadge status={moa.status} small /></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.7rem', padding: '2px 9px', borderRadius: 20, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', color: '#60A5FA' }}>{moa.endorsedByCollege?.replace('College of ', '') || '—'}</span>
        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>Exp: {fmt(moa.expirationDate)}</span>
      </div>
    </div>
  )
}

function IndustryTabs({ active, onChange }) {
  const tabs = ['All', ...INDUSTRY_TYPES]
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {tabs.map(t => {
        const val = t === 'All' ? '' : t
        const isActive = active === val
        return (
          <button key={t} onClick={() => onChange(val)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: '0.78rem', fontWeight: isActive ? 600 : 400, border: `1px solid ${isActive ? 'rgba(212,168,67,0.4)' : 'rgba(255,255,255,0.09)'}`, background: isActive ? 'rgba(212,168,67,0.12)' : 'transparent', color: isActive ? '#D4A843' : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all 0.15s' }}
            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' } }}
            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)' } }}
          >{t}</button>
        )
      })}
    </div>
  )
}

// ─── Seed button (admin only, one-time setup) ─────────────────────────────
function SeedButton() {
  const toast = useToast()
  const [seeding, setSeeding] = useState(false)
  const [done,    setDone]    = useState(false)

  const handleSeed = async () => {
    if (seeding || done) return
    setSeeding(true)
    try {
      const result = await runSeed()
      await patchDescriptions().catch(() => {})
      toast.success(`Seeded ${result.success} MOA records successfully.`)
      setDone(true)
    } catch (err) {
      toast.error('Seed failed: ' + err.message)
    } finally {
      setSeeding(false)
    }
  }

  if (done) return null

  return (
    <button
      onClick={handleSeed}
      disabled={seeding}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(96,165,250,0.2)', background: 'rgba(96,165,250,0.07)', color: 'rgba(96,165,250,0.7)', fontSize: '0.75rem', cursor: seeding ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", opacity: seeding ? 0.6 : 1, transition: 'all 0.15s' }}
      onMouseEnter={e => { if (!seeding) { e.currentTarget.style.background = 'rgba(96,165,250,0.12)'; e.currentTarget.style.color = '#60A5FA' } }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(96,165,250,0.07)'; e.currentTarget.style.color = 'rgba(96,165,250,0.7)' }}
      title="One-time seed: adds sample MOA data to Firestore"
    >
      {seeding
        ? <><div style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.15)', borderTopColor: '#60A5FA', animation: 'spin 0.8s linear infinite' }} /> Seeding…</>
        : '⊕ Seed Sample Data'
      }
    </button>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
function AdminDashboard({ user, userDoc, canManageMOA }) {
  const navigate = useNavigate()
  const toast    = useToast()
  const firstName = (user?.displayName || userDoc?.displayName || 'there').split(' ')[0]

  const [allMoas,     setAllMoas]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [detailPanel, setDetailPanel] = useState({ open: false, moa: null })

  // ── Real-time subscription ──────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'moas'))
    const unsub = onSnapshot(q,
      snap => {
        setAllMoas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      err => { console.error(err); setLoading(false) }
    )
    // Auto-expiry check (silent)
    checkAndUpdateExpiredMOAs().catch(() => {})
    return () => unsub()
  }, [])

  // ── Derived data ────────────────────────────────────────────
  const stats = useMemo(() => computeStats(allMoas), [allMoas])

  const recentMOAs = useMemo(() =>
    [...allMoas]
      .filter(m => !m.isDeleted)
      .sort((a, b) => (b.createdAt?.toDate?.()?.getTime() ?? 0) - (a.createdAt?.toDate?.()?.getTime() ?? 0))
      .slice(0, 6)
  , [allMoas])

  const monthlyData = useMemo(() => computeMonthly(allMoas), [allMoas])

  const handleSearch = (q) => navigate('/moas', { state: { initialSearch: q } })
  const L = (v) => loading ? '—' : String(v ?? '—')

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Header + search */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
        <div className="animate-fade-up" style={{ animationFillMode: 'both' }}>
          <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>Welcome back</p>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.6rem,3.5vw,2.4rem)', fontWeight: 600, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {firstName}<span style={{ color: '#D4A843' }}>.</span>
          </h1>
          <p style={{ marginTop: 4, fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>Full system access — users, MOAs, and audit trail.</p>
        </div>
        <div className="animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'both', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <SearchBar onSearch={handleSearch} placeholder="Search MOAs by company, address, contact…" />
          <SeedButton />
        </div>
      </div>

      {/* Quick Management Shortcuts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 28 }}>
        {[
          { to: '/users',      accent: '#D4A843', bg: 'rgba(212,168,67,0.08)',  border: 'rgba(212,168,67,0.2)',  hoverBg: 'rgba(212,168,67,0.14)',  hoverBorder: 'rgba(212,168,67,0.35)',  icon: '◉', title: 'User Management',  sub: 'Roles, permissions & access', delay: 80  },
          { to: '/moas',       accent: '#60A5FA', bg: 'rgba(96,165,250,0.07)', border: 'rgba(96,165,250,0.18)', hoverBg: 'rgba(96,165,250,0.12)',  hoverBorder: 'rgba(96,165,250,0.3)',  icon: '⊞', title: 'MOA Registry',     sub: loading ? 'Add, edit & manage MOAs' : `${stats.total} total records`,     delay: 120 },
          { to: '/audit',      accent: '#4ADE80', bg: 'rgba(74,222,128,0.06)', border: 'rgba(74,222,128,0.15)', hoverBg: 'rgba(74,222,128,0.1)',   hoverBorder: 'rgba(74,222,128,0.25)', icon: '◎', title: 'Audit Trail',     sub: 'All change history',          delay: 160 },
          { to: '/statistics', accent: '#FB923C', bg: 'rgba(251,146,60,0.06)', border: 'rgba(251,146,60,0.15)', hoverBg: 'rgba(251,146,60,0.1)',   hoverBorder: 'rgba(251,146,60,0.25)', icon: '◐', title: 'Statistics',      sub: 'Charts & breakdowns',         delay: 200 },
        ].map(({ to, accent, bg, border, hoverBg, hoverBorder, icon, title, sub, delay }) => (
          <Link key={to} to={to} style={{ textDecoration: 'none' }}>
            <div className="animate-fade-up" style={{ padding: '18px 20px', borderRadius: 14, animationDelay: `${delay}ms`, animationFillMode: 'both', background: bg, border: `1px solid ${border}`, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 14 }}
              onMouseEnter={e => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.borderColor = hoverBorder; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = bg; e.currentTarget.style.borderColor = border; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>{icon}</div>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: accent }}>{title}</p>
                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{sub}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* MOA Status Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard label="Active (Approved)"  value={L(stats.approved)}   note="All approved kinds"    accent="#4ADE80" delay={100} onClick={() => navigate('/moas', { state: { initialStatus: 'APPROVED' } })} />
        <StatCard label="Processing"         value={L(stats.processing)}  note="Pending approval"     accent="#60A5FA" delay={150} onClick={() => navigate('/moas', { state: { initialStatus: 'PROCESSING' } })} />
        <StatCard label="Expiring Soon"      value={L(stats.expiring)}    note="Within 60 days"       accent="#FBBF24" delay={200} onClick={() => navigate('/moas', { state: { initialStatus: 'EXPIRING' } })} />
        <StatCard label="Expired"            value={L(stats.expired)}     note="No renewal done"      accent="#F87171" delay={250} onClick={() => navigate('/moas', { state: { initialStatus: 'EXPIRED' } })} />
        <StatCard label="Soft Deleted"       value={L(stats.deleted)}     note="Recoverable by admin" accent="rgba(255,255,255,0.3)" delay={300} onClick={() => navigate('/moas', { state: { initialStatus: 'DELETED' } })} />
        <StatCard label="Total Records"      value={L(stats.total)}       note="All including deleted" accent="#D4A843" delay={350} onClick={() => navigate('/moas')} />
      </div>

      {/* Chart + Recent MOAs */}
      <div className="grid-2col" style={{ gap: 18 }}>
        <MonthlyChart data={monthlyData} />

        <div style={{ background: 'rgba(17,34,64,0.55)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingLeft: 24, paddingRight: 24 }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Recent Submissions</p>
            <Link to="/moas" style={{ fontSize: '0.72rem', color: 'rgba(212,168,67,0.65)', textDecoration: 'none', fontWeight: 500 }}
              onMouseEnter={e => e.currentTarget.style.color = '#D4A843'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(212,168,67,0.65)'}
            >View all →</Link>
          </div>
          <div style={{ padding: '0 8px' }}>
            {loading ? (
              [1,2,3,4].map(i => (
                <div key={i} style={{ padding: '12px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ height: 13, width: 160, borderRadius: 4, background: 'rgba(255,255,255,0.06)', marginBottom: 6, animation: 'shimmer 1.4s ease-in-out infinite' }} />
                  <div style={{ height: 10, width: 100, borderRadius: 4, background: 'rgba(255,255,255,0.04)', animation: 'shimmer 1.4s ease-in-out infinite' }} />
                </div>
              ))
            ) : recentMOAs.length === 0 ? (
              <p style={{ padding: '24px 8px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>No MOAs yet. Use "Seed Sample Data" to add demo records.</p>
            ) : (
              recentMOAs.map(moa => (
                <RecentMOARow key={moa.id} moa={moa} onClick={m => setDetailPanel({ open: true, moa: m })} />
              ))
            )}
          </div>
        </div>
      </div>

      <MOADetailPanel
        open={detailPanel.open} moa={detailPanel.moa}
        onClose={() => setDetailPanel({ open: false, moa: null })}
        canEdit={canManageMOA} isAdmin={true}
        onEdit={() => { setDetailPanel({ open: false, moa: null }); navigate('/moas') }}
        onDelete={() => { setDetailPanel({ open: false, moa: null }); navigate('/moas') }}
      />
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// FACULTY DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
function FacultyDashboard({ user, userDoc, canManageMOA }) {
  const navigate = useNavigate()
  const firstName = (user?.displayName || userDoc?.displayName || 'there').split(' ')[0]

  const [allMoas,     setAllMoas]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [filterInd,   setFilterInd]   = useState('')
  const [detailPanel, setDetailPanel] = useState({ open: false, moa: null })

  // ── Real-time subscription (non-deleted only for faculty) ───
  useEffect(() => {
    const q = query(collection(db, 'moas'), where('isDeleted', '==', false))
    const unsub = onSnapshot(q,
      snap => {
        setAllMoas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      err => { console.error(err); setLoading(false) }
    )
    checkAndUpdateExpiredMOAs().catch(() => {})
    return () => unsub()
  }, [])

  const stats        = useMemo(() => computeStats(allMoas), [allMoas])
  const expiringMoas = useMemo(() => allMoas.filter(m => m.status?.startsWith('EXPIRING')), [allMoas])
  const activeMoas   = useMemo(() => {
    let rows = allMoas.filter(m => !m.status?.startsWith('EXPIRING') && !m.status?.startsWith('EXPIRED') && !m.isDeleted)
    if (filterInd) rows = rows.filter(m => m.industryType === filterInd)
    return rows
  }, [allMoas, filterInd])

  const handleSearch = (q) => navigate('/moas', { state: { initialSearch: q } })
  const L = (v) => loading ? '—' : String(v ?? '—')

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div className="animate-fade-up" style={{ animationFillMode: 'both' }}>
          <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>Welcome back</p>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.6rem,3.5vw,2.4rem)', fontWeight: 600, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {firstName}<span style={{ color: '#60A5FA' }}>.</span>
          </h1>
          <p style={{ marginTop: 4, fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
            {canManageMOA ? 'You have edit access to MOA records.' : 'Read-only access — contact admin for edit permissions.'}
          </p>
        </div>
        <SearchBar onSearch={handleSearch} placeholder="Search MOA records…" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard label="Active MOAs"   value={L(stats.approved)}   note="All approved kinds"  accent="#4ADE80" delay={80}  />
        <StatCard label="Processing"    value={L(stats.processing)}  note="Pending approval"   accent="#60A5FA" delay={130} />
        <StatCard label="Expiring Soon" value={L(stats.expiring)}    note="Within 60 days"     accent="#FBBF24" delay={180} />
        <StatCard label="Expired"       value={L(stats.expired)}     note="No renewal done"    accent="#F87171" delay={230} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <IndustryTabs active={filterInd} onChange={setFilterInd} />
      </div>

      {expiringMoas.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FBBF24', boxShadow: '0 0 8px rgba(251,191,36,0.6)', animation: 'glowPulse 2s ease-in-out infinite' }} />
            <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#FBBF24', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Expiring Soon — {expiringMoas.length} MOA{expiringMoas.length !== 1 ? 's' : ''}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {expiringMoas.map(moa => <MOACompactCard key={moa.id} moa={moa} onClick={m => setDetailPanel({ open: true, moa: m })} />)}
          </div>
        </div>
      )}

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Active MOAs {filterInd ? `· ${filterInd}` : ''} {loading ? '' : `(${activeMoas.length})`}
          </p>
          <Link to="/moas" style={{ fontSize: '0.78rem', color: 'rgba(212,168,67,0.65)', textDecoration: 'none', fontWeight: 500 }}>View all →</Link>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ height: 82, borderRadius: 12, background: 'rgba(255,255,255,0.04)', animation: 'shimmer 1.4s ease-in-out infinite' }} />)}
          </div>
        ) : activeMoas.length === 0 ? (
          <div style={{ padding: '36px 24px', textAlign: 'center', background: 'rgba(17,34,64,0.4)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.875rem' }}>{filterInd ? `No active MOAs in ${filterInd}.` : 'No active MOAs found.'}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {activeMoas.map(moa => <MOACompactCard key={moa.id} moa={moa} onClick={m => setDetailPanel({ open: true, moa: m })} />)}
          </div>
        )}
      </div>

      <MOADetailPanel
        open={detailPanel.open} moa={detailPanel.moa}
        onClose={() => setDetailPanel({ open: false, moa: null })}
        canEdit={canManageMOA} isAdmin={false}
        onEdit={() => { setDetailPanel({ open: false, moa: null }); navigate('/moas') }}
      />
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// STUDENT DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
function StudentDashboard({ user, userDoc }) {
  const firstName = (user?.displayName || userDoc?.displayName || 'there').split(' ')[0]

  const [moas,          setMoas]          = useState([])
  const [loading,       setLoading]       = useState(true)
  const [industryFilter, setIndustryFilter] = useState('')
  const [selectedMOA,   setSelectedMOA]   = useState(null)

  // ── Real-time: non-deleted, client-side filter to APPROVED ──
  useEffect(() => {
    console.log('[STUDENT] APPROVED_STATUSES filtering for:', APPROVED_STATUSES)
    const q = query(
      collection(db, 'moas'),
      where('isDeleted', '==', false),
      where('status', 'in', APPROVED_STATUSES)
    )
    const unsub = onSnapshot(q,
      snap => {
        console.log('[STUDENT] Firestore snapshot size:', snap.size)
        if (snap.size > 0) console.log('[STUDENT] First doc status:', snap.docs[0].data().status)
        const approved = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
        console.log('[STUDENT] Final moas count:', approved.length)
        setMoas(approved)
        setLoading(false)
      },
      err => { console.error('[STUDENT] Firestore error:', err); setLoading(false) }
    )
    return () => unsub()
  }, [])

  const industryCounts = useMemo(() => {
    const m = {}
    moas.forEach(d => { if (d.industryType) m[d.industryType] = (m[d.industryType] || 0) + 1 })
    return m
  }, [moas])

  const filteredMoas = useMemo(() =>
    industryFilter ? moas.filter(m => m.industryType === industryFilter) : moas
  , [moas, industryFilter])

  const tabs = ['All', ...INDUSTRY_TYPES]

  return (
    <div style={{ maxWidth: 1100 }}>
      <div className="animate-fade-up" style={{ animationFillMode: 'both', marginBottom: 28 }}>
        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>Welcome back</p>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.6rem,3.5vw,2.4rem)', fontWeight: 600, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {firstName}<span style={{ color: '#4ADE80' }}>.</span>
        </h1>
        <p style={{ marginTop: 4, fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>Browse approved industry partners of New Era University.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard label="Approved Partnerships" value={loading ? '—' : String(moas.length)} note="Active partner companies" accent="#4ADE80" delay={80} />
      </div>

      {/* Industry filter tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {tabs.map(t => {
          const val = t === 'All' ? '' : t
          const isActive = industryFilter === val
          const cnt = val ? (industryCounts[val] || 0) : moas.length
          return (
            <button key={t} onClick={() => setIndustryFilter(val)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: '0.78rem', fontWeight: isActive ? 600 : 400, border: `1px solid ${isActive ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.09)'}`, background: isActive ? 'rgba(74,222,128,0.12)' : 'transparent', color: isActive ? '#4ADE80' : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)' } }}
            >{t}{cnt > 0 ? ` (${cnt})` : ''}</button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {[1,2,3,4,5,6].map(i => <div key={i} style={{ height: 82, borderRadius: 12, background: 'rgba(255,255,255,0.04)', animation: 'shimmer 1.4s ease-in-out infinite' }} />)}
        </div>
      ) : filteredMoas.length === 0 ? (
        <div style={{ padding: '40px 24px', textAlign: 'center', background: 'rgba(17,34,64,0.4)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.875rem' }}>{industryFilter ? `No approved partners in ${industryFilter}.` : 'No approved partners available at this time.'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {filteredMoas.map(moa => (
            <div key={moa.id} onClick={() => setSelectedMOA(moa)}
              style={{ padding: '14px 16px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s', background: 'rgba(29,53,87,0.25)', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(29,53,87,0.45)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(29,53,87,0.25)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'rgba(255,255,255,0.88)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: moa.description ? 5 : 8 }}>
                {moa.companyName}
              </p>
              {moa.description && (
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.5, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {moa.description}
                </p>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {moa.industryType && (
                  <span style={{ fontSize: '0.7rem', padding: '2px 9px', borderRadius: 20, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ADE80' }}>{moa.industryType}</span>
                )}
                {moa.endorsedByCollege && (
                  <span style={{ fontSize: '0.7rem', padding: '2px 9px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.4)' }}>{moa.endorsedByCollege.replace('College of ', '')}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedMOA && <StudentMOACard moa={selectedMOA} onClose={() => setSelectedMOA(null)} />}
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { user, userDoc, role, canManageMOA } = useAuth()

  if (role === 'admin')   return <AppLayout><AdminDashboard   user={user} userDoc={userDoc} canManageMOA={true} /></AppLayout>
  if (role === 'faculty') return <AppLayout><FacultyDashboard user={user} userDoc={userDoc} canManageMOA={canManageMOA} /></AppLayout>
  return <AppLayout><StudentDashboard user={user} userDoc={userDoc} /></AppLayout>
}
