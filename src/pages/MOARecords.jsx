import React, { useState, useEffect, useRef, useMemo } from 'react'
import AppLayout from '../layouts/AppLayout'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/firebase'
import { softDeleteMOA, recoverMOA, MOA_STATUSES, INDUSTRY_TYPES, COLLEGES } from '../firebase/firestore'
import StatusBadge from '../components/StatusBadge'
import ConfirmModal from '../components/ConfirmModal'
import MOAModal from '../components/MOAModal'
import MOADetailPanel from '../components/MOADetailPanel'

// PAGE_SIZE replaced by pageSize state below

// Highlights the first occurrence of `query` inside `text`
function Highlight({ text, query }) {
  if (!query || !text) return <>{text || ''}</>
  const idx = String(text).toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(212,168,67,0.28)', color: '#F5D78E', borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

const formatDate = (ts) => {
  if (!ts) return '—'
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return '—' }
}

const TH = ({ children, sortKey, sortState, onSort, style }) => {
  const active = !!sortKey && sortState?.field === sortKey
  return (
    <th
      onClick={() => sortKey && onSort(sortKey)}
      style={{
        padding: '10px 14px',
        textAlign: 'left',
        fontSize: '0.65rem',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: active ? '#D4A843' : 'rgba(255,255,255,0.3)',
        whiteSpace: 'nowrap',
        cursor: sortKey ? 'pointer' : 'default',
        userSelect: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(17,34,64,0.9)',
        position: 'sticky',
        top: 0,
        zIndex: 2,
        ...style,
      }}
    >
      {children}
      {active && <span style={{ marginLeft: 4 }}>{sortState.dir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  )
}

export default function MOARecords() {
  const { user, role, userDoc } = useAuth()
  const canManageMOA = role === 'admin' || (role === 'faculty' && userDoc?.canManageMOA === true)
  const toast = useToast()

  const [moas,      setMoas]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')

  // Filters
  const [filterStatus,   setFilterStatus]   = useState('')
  const [filterIndustry, setFilterIndustry] = useState('')
  const [filterCollege,  setFilterCollege]  = useState('')
  const [filterSearch,   setFilterSearch]   = useState('')   // debounced applied value
  const [searchInput,    setSearchInput]    = useState('')   // live input value
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo,   setFilterDateTo]   = useState('')
  const [filterExpiring, setFilterExpiring] = useState(false)
  const [showDeleted,    setShowDeleted]    = useState(true)
  const [filtersOpen,    setFiltersOpen]    = useState(true)

  // Debounce search input → filterSearch (300 ms)
  const debounceRef = useRef(null)
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFilterSearch(searchInput)
      setPage(1)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [searchInput])

  // Sort
  const [sort, setSort] = useState({ field: 'companyName', dir: 'asc' })

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Modals + detail panel
  const [moaModal,     setMoaModal]     = useState({ open: false, moa: null })
  const [deleteModal,  setDeleteModal]  = useState({ open: false, moa: null, loading: false })
  const [recoverModal, setRecoverModal] = useState({ open: false, moa: null, loading: false })
  const [detailPanel,  setDetailPanel]  = useState({ open: false, moa: null })
  const [renewMOA,     setRenewMOA]     = useState(null)

  const location = useLocation()
  useEffect(() => {
    if (location.state?.initialSearch) {
      setSearchInput(location.state.initialSearch)
      setFilterSearch(location.state.initialSearch)
    }
    if (location.state?.initialStatus) {
      const s = location.state.initialStatus
      if (s === 'DELETED') {
        setShowDeleted(true)
        // don't set a status filter, admin can see deleted via showDeleted toggle
      } else {
        setFilterStatus(s) // 'APPROVED', 'PROCESSING', 'EXPIRING', 'EXPIRED' — these are prefixes, not exact values
      }
    }
    if (location.state?.initialSearch || location.state?.initialStatus) {
      window.history.replaceState({}, document.title)
    }
  }, [])

  useEffect(() => {
    if (!role) return
    setLoading(true)
    setError('')
    // Faculty only sees non-deleted; admin sees all and toggles via showDeleted client-side
    const q = role === 'admin'
      ? query(collection(db, 'moas'))
      : query(collection(db, 'moas'), where('isDeleted', '==', false))
    const unsub = onSnapshot(q,
      snap => {
        setMoas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      err => {
        setError('Failed to load MOA records.')
        setLoading(false)
      }
    )
    return () => unsub()
  }, [role])

  // Client-side filter + sort
  const filtered = useMemo(() => {
    let rows = [...moas]

    if (role === 'admin' && !showDeleted) rows = rows.filter(r => !r.isDeleted)
    if (filterExpiring) rows = rows.filter(r => r.status?.startsWith('EXPIRING'))
    if (filterStatus)   rows = rows.filter(r => r.status === filterStatus || r.status?.startsWith(filterStatus))
    if (filterIndustry) rows = rows.filter(r => r.industryType === filterIndustry)
    if (filterCollege)  rows = rows.filter(r => r.endorsedByCollege === filterCollege)
    if (filterSearch) {
      const t = filterSearch.toLowerCase()
      rows = rows.filter(r =>
        r.companyName?.toLowerCase().includes(t) ||
        r.hteId?.toLowerCase().includes(t) ||
        r.contactPerson?.toLowerCase().includes(t) ||
        r.contactEmail?.toLowerCase().includes(t) ||
        r.address?.toLowerCase().includes(t)
      )
    }
    if (filterDateFrom) {
      const from = new Date(filterDateFrom + 'T00:00:00')
      rows = rows.filter(r => { const d = r.effectiveDate?.toDate?.(); return d && d >= from })
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo + 'T23:59:59')
      rows = rows.filter(r => { const d = r.effectiveDate?.toDate?.(); return d && d <= to })
    }

    rows.sort((a, b) => {
      let av = a[sort.field] ?? ''
      let bv = b[sort.field] ?? ''
      if (av?.toDate) av = av.toDate().getTime()
      if (bv?.toDate) bv = bv.toDate().getTime()
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      if (av < bv) return sort.dir === 'asc' ? -1 : 1
      if (av > bv) return sort.dir === 'asc' ? 1 : -1
      return 0
    })

    return rows
  }, [moas, filterStatus, filterIndustry, filterCollege, filterSearch, filterDateFrom, filterDateTo, filterExpiring, sort, showDeleted, role])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize)

  const handleSort = (field) => {
    setSort(prev => ({ field, dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc' }))
    setPage(1)
  }

  const handleDelete = async () => {
    setDeleteModal(prev => ({ ...prev, loading: true }))
    try {
      await softDeleteMOA(deleteModal.moa.id, user)
      setDeleteModal({ open: false, moa: null, loading: false })
      toast.success('MOA removed.')
    } catch (e) {
      toast.error('Failed to remove MOA. Please try again.')
      setDeleteModal(prev => ({ ...prev, loading: false }))
    }
  }

  const handleRecover = async () => {
    setRecoverModal(prev => ({ ...prev, loading: true }))
    try {
      await recoverMOA(recoverModal.moa.id, user)
      setRecoverModal({ open: false, moa: null, loading: false })
      toast.success('MOA recovered.')
    } catch (e) {
      toast.error('Failed to recover MOA. Please try again.')
      setRecoverModal(prev => ({ ...prev, loading: false }))
    }
  }

  const handleExportCSV = () => {
    const cols = role === 'admin'
      ? ['hteId','companyName','address','contactPerson','contactEmail','industryType','effectiveDate','expirationDate','status','endorsedByCollege','isDeleted']
      : ['hteId','companyName','address','contactPerson','contactEmail','industryType','effectiveDate','expirationDate','status','endorsedByCollege']

    const fmtCell = (v) => {
      if (v == null) return ''
      if (v?.toDate) return v.toDate().toLocaleDateString('en-PH')
      return String(v).replace(/"/g, '""')
    }

    const header = cols.join(',')
    const rows = filtered.map(row => cols.map(c => `"${fmtCell(row[c])}"`).join(','))
    const csv = [header, ...rows].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `NEU-MOA-Export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearFilters = () => {
    setFilterStatus('')
    setFilterIndustry('')
    setFilterCollege('')
    setSearchInput('')
    setFilterSearch('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterExpiring(false)
    setPage(1)
  }

  const activeFilterCount = [
    filterStatus, filterIndustry, filterCollege, filterSearch, filterDateFrom, filterDateTo,
    filterExpiring ? 'x' : '',
  ].filter(Boolean).length

  const hasFilters = activeFilterCount > 0

  const selectStyle = {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.09)',
    background: 'rgba(17,34,64,0.8)',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.8rem',
    cursor: 'pointer',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    outline: 'none',
  }

  return (
    <AppLayout>
      <div style={{ maxWidth: 1400 }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>
              {role === 'admin' ? 'Admin View — All Records' : 'Faculty View'}
            </p>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 600, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}>
              MOA Registry
            </h1>
            <p style={{ marginTop: 4, fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
              {loading ? 'Loading…' : `Showing ${filtered.length} of ${moas.length} MOA${moas.length !== 1 ? 's' : ''}${hasFilters ? ' (filtered)' : ''}`}
            </p>
          </div>
          {(canManageMOA || role === 'faculty') && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                onClick={handleExportCSV}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
                  background: 'transparent', color: 'rgba(255,255,255,0.55)',
                  fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
                  fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.82)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}
                title={`Export ${filtered.length} records as CSV`}
              >
                ↓ Export CSV
              </button>
              {canManageMOA && (
                <button
                  onClick={() => setMoaModal({ open: true, moa: null })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 18px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'rgba(212,168,67,0.9)',
                    color: '#0D1B2A',
                    fontSize: '0.875rem', fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    transition: 'all 0.15s',
                    letterSpacing: '0.02em',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#D4A843'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(212,168,67,0.9)'}
                >
                  <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span>
                  Add MOA
                </button>
              )}
            </div>
          )}
        </div>

        {/* Search + filter toggle row */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
          {/* Live search input */}
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 420 }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none"
              style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }}>
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search company, HTE ID, contact, email…"
              style={{ ...selectStyle, width: '100%', paddingLeft: 32, background: 'rgba(13,27,42,0.8)', color: 'rgba(255,255,255,0.8)', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = 'rgba(212,168,67,0.35)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.09)'}
            />
            {searchInput && (
              <button onClick={() => setSearchInput('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 2 }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
              >×</button>
            )}
          </div>

          {/* Filter toggle button with badge */}
          <button
            onClick={() => setFiltersOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
              border: `1px solid ${filtersOpen ? 'rgba(212,168,67,0.35)' : 'rgba(255,255,255,0.09)'}`,
              background: filtersOpen ? 'rgba(212,168,67,0.08)' : 'transparent',
              color: filtersOpen ? '#D4A843' : 'rgba(255,255,255,0.5)',
              fontSize: '0.8rem', fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!filtersOpen) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)' } }}
            onMouseLeave={e => { if (!filtersOpen) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' } }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1 2.5h11M3 6.5h7M5 10.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', background: '#D4A843', color: '#0D1B2A', fontSize: '0.65rem', fontWeight: 700, lineHeight: 1 }}>
                {activeFilterCount}
              </span>
            )}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
              style={{ transform: filtersOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
              <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {hasFilters && (
            <button onClick={clearFilters}
              style={{ background: 'none', border: 'none', color: 'rgba(212,168,67,0.65)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", padding: '2px 4px', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#D4A843'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(212,168,67,0.65)'}
            >
              Clear all ×
            </button>
          )}
        </div>

        {/* Collapsible filter panel */}
        {filtersOpen && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
            padding: '12px 14px',
            background: 'rgba(17,34,64,0.5)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10,
            marginBottom: 14,
          }}>
            <select style={selectStyle} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
              <option value="">All Statuses</option>
              {Object.values(MOA_STATUSES).map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select style={selectStyle} value={filterIndustry} onChange={e => { setFilterIndustry(e.target.value); setPage(1) }}>
              <option value="">All Industries</option>
              {INDUSTRY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select style={selectStyle} value={filterCollege} onChange={e => { setFilterCollege(e.target.value); setPage(1) }}>
              <option value="">All Colleges</option>
              {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Expiring Soon toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.8rem', color: filterExpiring ? '#FBBF24' : 'rgba(255,255,255,0.4)', cursor: 'pointer', userSelect: 'none', padding: '4px 10px', borderRadius: 7, border: `1px solid ${filterExpiring ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.07)'}`, background: filterExpiring ? 'rgba(251,191,36,0.08)' : 'transparent', transition: 'all 0.15s' }}>
              <input type="checkbox" checked={filterExpiring} onChange={e => { setFilterExpiring(e.target.checked); setPage(1) }} style={{ accentColor: '#FBBF24' }} />
              Expiring Soon
            </label>

            {role === 'admin' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} style={{ accentColor: '#D4A843' }} />
                Show deleted
              </label>
            )}

            {/* Date range */}
            <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10, marginTop: 2 }}>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>Effective Date</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>From</span>
                <input type="date" value={filterDateFrom}
                  onChange={e => { setFilterDateFrom(e.target.value); setPage(1) }}
                  style={{ ...selectStyle, width: 'auto', padding: '6px 10px', fontSize: '0.78rem', colorScheme: 'dark' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>To</span>
                <input type="date" value={filterDateTo}
                  onChange={e => { setFilterDateTo(e.target.value); setPage(1) }}
                  min={filterDateFrom || undefined}
                  style={{ ...selectStyle, width: 'auto', padding: '6px 10px', fontSize: '0.78rem', colorScheme: 'dark' }} />
              </div>
            </div>
          </div>
        )}

        {/* Read-only banner for faculty without canManageMOA */}
        {role === 'faculty' && !canManageMOA && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 16px', marginBottom: 14,
            background: 'rgba(96,165,250,0.07)',
            border: '1px solid rgba(96,165,250,0.18)',
            borderRadius: 10,
            fontSize: '0.8rem', color: 'rgba(96,165,250,0.8)',
            lineHeight: 1.45,
          }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>ℹ</span>
            <span>You have <strong style={{ color: '#60A5FA', fontWeight: 600 }}>read-only access</strong>. Contact an admin to request edit permissions.</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#F87171', fontSize: '0.875rem', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Table wrapper */}
        <div
          style={{
            background: 'rgba(17,34,64,0.5)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
              <thead>
                <tr>
                  <TH sortKey="hteId"             sortState={sort} onSort={handleSort}>HTE ID</TH>
                  <TH sortKey="companyName"        sortState={sort} onSort={handleSort}>Company</TH>
                  <TH>Address</TH>
                  <TH sortKey="contactPerson"      sortState={sort} onSort={handleSort}>Contact</TH>
                  <TH>Email</TH>
                  <TH sortKey="industryType"       sortState={sort} onSort={handleSort}>Industry</TH>
                  <TH sortKey="effectiveDate"      sortState={sort} onSort={handleSort}>Effective</TH>
                  <TH sortKey="expirationDate"     sortState={sort} onSort={handleSort}>Expires</TH>
                  <TH sortKey="status"             sortState={sort} onSort={handleSort}>Status</TH>
                  <TH sortKey="endorsedByCollege"  sortState={sort} onSort={handleSort}>College</TH>
                  <TH>Actions</TH>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} style={{ padding: '48px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.875rem' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#D4A843', animation: 'spin 0.8s linear infinite' }} />
                        Loading records…
                      </div>
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ padding: '48px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.875rem' }}>
                      {filterSearch ? `No MOAs match "${filterSearch}".` : hasFilters ? 'No records match the current filters.' : 'No MOA records found.'}
                    </td>
                  </tr>
                ) : paginated.map((moa, i) => {
                  const isDeleted = moa.isDeleted
                  const rowStyle = {
                    opacity: isDeleted ? 0.45 : 1,
                    transition: 'background 0.1s',
                  }
                  const cellStyle = {
                    padding: '12px 14px',
                    fontSize: '0.8rem',
                    color: isDeleted ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.75)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    verticalAlign: 'top',
                    textDecoration: isDeleted ? 'line-through' : 'none',
                    maxWidth: 180,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }
                  return (
                    <tr
                      key={moa.id}
                      style={{ ...rowStyle, cursor: isDeleted ? 'default' : 'pointer' }}
                      onClick={() => { if (!isDeleted) setDetailPanel({ open: true, moa }) }}
                      onMouseEnter={e => { if (!isDeleted) e.currentTarget.style.background = 'rgba(29,53,87,0.3)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <td style={{ ...cellStyle, fontFamily: 'monospace', fontSize: '0.75rem', color: '#D4A843', textDecoration: 'none' }}><Highlight text={moa.hteId} query={filterSearch} /></td>
                      <td style={{ ...cellStyle, fontWeight: 500, maxWidth: 200 }}><Highlight text={moa.companyName} query={filterSearch} /></td>
                      <td style={{ ...cellStyle, maxWidth: 160, fontSize: '0.75rem' }} title={moa.address}>{moa.address}</td>
                      <td style={cellStyle}><Highlight text={moa.contactPerson} query={filterSearch} /></td>
                      <td style={{ ...cellStyle, fontSize: '0.75rem' }}><Highlight text={moa.contactEmail} query={filterSearch} /></td>
                      <td style={cellStyle}>{moa.industryType}</td>
                      <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>{formatDate(moa.effectiveDate)}</td>
                      <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>{formatDate(moa.expirationDate)}</td>
                      <td style={{ ...cellStyle, textDecoration: 'none' }}>
                        {isDeleted
                          ? <span style={{ fontSize: '0.7rem', color: '#F87171', letterSpacing: '0.04em' }}>DELETED</span>
                          : <StatusBadge status={moa.status} small />
                        }
                      </td>
                      <td style={{ ...cellStyle, maxWidth: 160, fontSize: '0.75rem' }}>{moa.endorsedByCollege}</td>
                      <td
                        style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', whiteSpace: 'nowrap' }}
                        onClick={e => e.stopPropagation()}
                      >
                        <div style={{ display: 'flex', gap: 6 }}>
                          {!isDeleted && canManageMOA && (
                            <button
                              onClick={() => setMoaModal({ open: true, moa })}
                              style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.55)', fontSize: '0.73rem', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}
                            >
                              Edit
                            </button>
                          )}
                          {!isDeleted && role === 'admin' && (
                            <button
                              onClick={() => setDeleteModal({ open: true, moa, loading: false })}
                              style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(248,113,113,0.2)', background: 'transparent', color: 'rgba(248,113,113,0.7)', fontSize: '0.73rem', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; e.currentTarget.style.color = '#F87171' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(248,113,113,0.7)' }}
                            >
                              Delete
                            </button>
                          )}
                          {isDeleted && role === 'admin' && (
                            <button
                              onClick={() => setRecoverModal({ open: true, moa, loading: false })}
                              style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(74,222,128,0.2)', background: 'transparent', color: 'rgba(74,222,128,0.7)', fontSize: '0.73rem', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(74,222,128,0.08)'; e.currentTarget.style.color = '#4ADE80' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(74,222,128,0.7)' }}
                            >
                              Recover
                            </button>
                          )}
                          {!isDeleted && !canManageMOA && role === 'faculty' && (
                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.18)', fontStyle: 'italic' }}>Read-only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filtered.length > pageSize && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.25)' }}>Rows</span>
                  <select
                    value={pageSize}
                    onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                    style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(17,34,64,0.8)', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", outline: 'none' }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>
                  Page {page} of {totalPages} · {filtered.length} records
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {page > 1 && (
                  <button onClick={() => setPage(p => p - 1)} style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.09)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>← Prev</button>
                )}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      style={{ padding: '6px 11px', borderRadius: 7, border: `1px solid ${p === page ? 'rgba(212,168,67,0.4)' : 'rgba(255,255,255,0.09)'}`, background: p === page ? 'rgba(212,168,67,0.15)' : 'transparent', color: p === page ? '#D4A843' : 'rgba(255,255,255,0.4)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}
                    >
                      {p}
                    </button>
                  )
                })}
                {page < totalPages && (
                  <button onClick={() => setPage(p => p + 1)} style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.09)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>Next →</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      <MOADetailPanel
        open={detailPanel.open}
        moa={detailPanel.moa}
        onClose={() => setDetailPanel({ open: false, moa: null })}
        canEdit={canManageMOA}
        isAdmin={role === 'admin'}
        onEdit={(moa) => setMoaModal({ open: true, moa })}
        onDelete={(moa) => setDeleteModal({ open: true, moa, loading: false })}
        onRenew={canManageMOA ? (moa) => { setRenewMOA(moa); setMoaModal({ open: true, moa: null }) } : undefined}
      />

      {/* Modals */}
      <MOAModal
        open={moaModal.open}
        moa={moaModal.moa}
        renewFrom={renewMOA}
        onClose={() => { setMoaModal({ open: false, moa: null }); setRenewMOA(null) }}
        onSaved={() => {
          if (renewMOA) toast.success(`MOA renewed. ${renewMOA.companyName} marked as expired.`)
          else toast.success(moaModal.moa ? 'MOA updated.' : 'MOA added successfully.')
          setRenewMOA(null)
        }}
        statusReadOnly={role === 'faculty'}
        onDelete={role === 'admin' ? (moa) => { setMoaModal({ open: false, moa: null }); setRenewMOA(null); setDeleteModal({ open: true, moa, loading: false }) } : undefined}
      />
      <ConfirmModal
        open={deleteModal.open}
        title="Remove MOA Record"
        message={`Are you sure you want to remove "${deleteModal.moa?.companyName}"? This action can be recovered by an admin.`}
        confirmLabel="Remove"
        confirmDanger
        loading={deleteModal.loading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ open: false, moa: null, loading: false })}
      />
      <ConfirmModal
        open={recoverModal.open}
        title="Recover MOA Record"
        message={`Restore "${recoverModal.moa?.companyName}" to the active registry?`}
        confirmLabel="Recover"
        confirmDanger={false}
        loading={recoverModal.loading}
        onConfirm={handleRecover}
        onCancel={() => setRecoverModal({ open: false, moa: null, loading: false })}
      />
    </AppLayout>
  )
}
