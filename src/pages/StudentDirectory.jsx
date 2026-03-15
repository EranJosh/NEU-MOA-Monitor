import React, { useState, useEffect, useMemo } from 'react'
import AppLayout from '../layouts/AppLayout'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/firebase'
import { APPROVED_STATUSES, INDUSTRY_TYPES, COLLEGES } from '../firebase/firestore'
import StudentMOACard from '../components/StudentMOACard'

const PAGE_SIZE = 12

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

/* ── Skeleton ────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div style={{ borderRadius: 16, background: 'rgba(17,34,64,0.5)', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', minHeight: 260 }}>
      <div style={{ height: 80, background: 'rgba(255,255,255,0.04)', animation: 'shimmer 1.4s ease-in-out infinite' }} />
      <div style={{ padding: '16px 18px' }}>
        {[180, 130, 100, 150].map((w, i) => (
          <div key={i} style={{ height: 11, width: w, borderRadius: 6, background: 'rgba(255,255,255,0.06)', marginBottom: 12, animation: 'shimmer 1.4s ease-in-out infinite' }} />
        ))}
        <div style={{ height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.04)', marginTop: 16, animation: 'shimmer 1.4s ease-in-out infinite' }} />
      </div>
    </div>
  )
}

/* ── Rich MOA Card ───────────────────────────────────────────────── */
function MOACard({ moa, onSelect }) {
  const theme = getTheme(moa.industryType)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={() => onSelect(moa)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 16,
        background: hovered ? 'rgba(29,53,87,0.55)' : 'rgba(17,34,64,0.55)',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.07)'}`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'all 0.18s ease',
        boxShadow: hovered ? '0 12px 40px rgba(0,0,0,0.35)' : '0 4px 16px rgba(0,0,0,0.2)',
      }}
    >
      {/* ── Banner ── */}
      <div
        style={{
          height: 80,
          background: theme.gradient,
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* Watermark label */}
        <span
          style={{
            position: 'absolute',
            bottom: -4,
            right: 10,
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '2.5rem',
            fontWeight: 700,
            color: '#fff',
            opacity: 0.08,
            lineHeight: 1,
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {moa.industryType || 'MOA'}
        </span>

        {/* Industry icon */}
        <span
          style={{
            position: 'absolute',
            left: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '2rem',
            opacity: 0.6,
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          {theme.icon}
        </span>

        {/* APPROVED badge */}
        <span
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            fontSize: '0.62rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '3px 9px',
            borderRadius: 20,
            background: 'rgba(52,211,153,0.18)',
            border: '1px solid rgba(52,211,153,0.4)',
            color: '#34D399',
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}
        >
          Approved
        </span>
      </div>

      {/* ── Card Body ── */}
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {/* Company name */}
        <p style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '1rem',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.88)',
          lineHeight: 1.3,
          marginBottom: 2,
        }}>
          {moa.companyName}
        </p>

        {/* Address */}
        <p style={{
          fontSize: '0.75rem',
          color: 'rgba(255,255,255,0.4)',
          lineHeight: 1.45,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          <span style={{ marginRight: 4, opacity: 0.7 }}>📍</span>
          {moa.address || '—'}
        </p>

        {/* Contact person */}
        {moa.contactPerson && (
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.3 }}>
            <span style={{ marginRight: 4, opacity: 0.7 }}>👤</span>
            {moa.contactPerson}
          </p>
        )}

        {/* Contact email */}
        {moa.contactEmail ? (
          <a
            href={`mailto:${moa.contactEmail}`}
            onClick={e => e.stopPropagation()}
            style={{
              fontSize: '0.73rem',
              color: '#60A5FA',
              textDecoration: 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.3,
            }}
            onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
          >
            <span style={{ marginRight: 4, opacity: 0.7 }}>✉</span>
            {moa.contactEmail}
          </a>
        ) : null}

        {/* Badges row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 2 }}>
          {moa.industryType && (
            <span style={{
              fontSize: '0.65rem',
              padding: '2px 9px',
              borderRadius: 20,
              background: `${theme.accent}18`,
              border: `1px solid ${theme.accent}40`,
              color: theme.accent,
              fontWeight: 500,
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}>
              {moa.industryType}
            </span>
          )}
          {moa.endorsedByCollege && (
            <span style={{
              fontSize: '0.63rem',
              padding: '2px 9px',
              borderRadius: 20,
              background: 'rgba(212,168,67,0.09)',
              border: '1px solid rgba(212,168,67,0.25)',
              color: '#D4A843',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 160,
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}>
              {moa.endorsedByCollege}
            </span>
          )}
        </div>

        {/* View button */}
        <button
          onClick={e => { e.stopPropagation(); onSelect(moa) }}
          style={{
            marginTop: 'auto',
            paddingTop: 8,
            width: '100%',
            padding: '9px 0',
            borderRadius: 9,
            border: '1px solid rgba(96,165,250,0.4)',
            background: 'rgba(96,165,250,0.15)',
            color: '#60A5FA',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            transition: 'background 0.15s',
            letterSpacing: '0.02em',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(96,165,250,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(96,165,250,0.15)'}
        >
          View Internship Details
        </button>
      </div>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function StudentDirectory() {
  const [moas,          setMoas]         = useState([])
  const [loading,       setLoading]      = useState(true)
  const [search,        setSearch]       = useState('')
  const [filterInd,     setFilterInd]    = useState('')
  const [filterCollege, setFilterCollege] = useState('')
  const [page,          setPage]         = useState(1)
  const [selected,      setSelected]     = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'moas'), where('isDeleted', '==', false))
    const unsub = onSnapshot(q,
      snap => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        setMoas(all.filter(m => APPROVED_STATUSES.includes(m.status)))
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsub()
  }, [])

  /* Industry counts */
  const industryCounts = useMemo(() => {
    const counts = {}
    moas.forEach(m => {
      if (m.industryType) counts[m.industryType] = (counts[m.industryType] || 0) + 1
    })
    return counts
  }, [moas])

  const filtered = useMemo(() => {
    let rows = [...moas]
    if (filterInd)     rows = rows.filter(r => r.industryType === filterInd)
    if (filterCollege) rows = rows.filter(r => r.endorsedByCollege === filterCollege)
    if (search) {
      const t = search.toLowerCase()
      rows = rows.filter(r =>
        r.companyName?.toLowerCase().includes(t)  ||
        r.address?.toLowerCase().includes(t)       ||
        r.contactPerson?.toLowerCase().includes(t)
      )
    }
    return rows
  }, [moas, search, filterInd, filterCollege])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const hasFilters = search || filterInd || filterCollege
  const clearFilters = () => { setSearch(''); setFilterInd(''); setFilterCollege(''); setPage(1) }

  const selectStyle = {
    padding: '8px 12px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.09)',
    background: 'rgba(17,34,64,0.8)', color: 'rgba(255,255,255,0.7)',
    fontSize: '0.8rem', cursor: 'pointer',
    fontFamily: "'DM Sans', system-ui, sans-serif", outline: 'none',
  }

  return (
    <AppLayout>
      <div style={{ maxWidth: 1200 }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>
            Student View
          </p>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 600, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}>
            MOA Directory
          </h1>
          <p style={{ marginTop: 4, fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
            {loading ? 'Loading approved partnerships…' : `${filtered.length} approved MOA${filtered.length !== 1 ? 's' : ''}${hasFilters ? ' (filtered)' : ''}`}
          </p>
        </div>

        {/* Industry filter tabs with counts */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {['All', ...INDUSTRY_TYPES].map(t => {
            const val    = t === 'All' ? '' : t
            const active = filterInd === val
            const count  = t === 'All' ? moas.length : (industryCounts[t] || 0)
            return (
              <button
                key={t}
                onClick={() => { setFilterInd(val); setPage(1) }}
                style={{
                  padding: '6px 16px', borderRadius: 20, fontSize: '0.8rem',
                  border: `1px solid ${active ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.09)'}`,
                  background: active ? 'rgba(74,222,128,0.1)' : 'transparent',
                  color: active ? '#4ADE80' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', fontWeight: active ? 600 : 400,
                  fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all 0.15s',
                }}
              >
                {t}{!loading && count > 0 ? ` (${count})` : ''}
              </button>
            )
          })}
        </div>

        {/* Search + college filter */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', padding: '12px 14px', background: 'rgba(17,34,64,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, marginBottom: 20 }}>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by company, address, or contact…"
            style={{ ...selectStyle, flex: 1, minWidth: 220, background: 'rgba(13,27,42,0.8)', color: 'rgba(255,255,255,0.8)' }}
          />
          <select style={selectStyle} value={filterCollege} onChange={e => { setFilterCollege(e.target.value); setPage(1) }}>
            <option value="">All Colleges</option>
            {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {hasFilters && (
            <button
              onClick={clearFilters}
              style={{ background: 'none', border: 'none', color: 'rgba(212,168,67,0.7)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", padding: '2px 6px' }}
              onMouseEnter={e => e.currentTarget.style.color = '#D4A843'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(212,168,67,0.7)'}
            >
              Clear ×
            </button>
          )}
        </div>

        {/* Card grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {Array.from({ length: 8 }, (_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : paginated.length === 0 ? (
          <div style={{ padding: '72px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 16, opacity: 0.1, lineHeight: 1 }}>◈</div>
            <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
              {hasFilters ? 'No MOAs match your current filters.' : 'No approved MOAs found.'}
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                style={{ marginTop: 12, padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {paginated.map(moa => (
              <MOACard key={moa.id} moa={moa} onSelect={setSelected} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0 0', marginTop: 8 }}>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>Page {page} of {totalPages} · {filtered.length} entries</p>
            <div style={{ display: 'flex', gap: 6 }}>
              {page > 1 && (
                <button
                  onClick={() => setPage(p => p - 1)}
                  style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.09)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}
                >
                  ← Prev
                </button>
              )}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{ padding: '6px 11px', borderRadius: 7, border: `1px solid ${p === page ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.09)'}`, background: p === page ? 'rgba(74,222,128,0.12)' : 'transparent', color: p === page ? '#4ADE80' : 'rgba(255,255,255,0.4)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}
                  >
                    {p}
                  </button>
                )
              })}
              {page < totalPages && (
                <button
                  onClick={() => setPage(p => p + 1)}
                  style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.09)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {selected && <StudentMOACard moa={selected} onClose={() => setSelected(null)} />}
    </AppLayout>
  )
}
