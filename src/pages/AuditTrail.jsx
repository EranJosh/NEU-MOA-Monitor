import React, { useState, useEffect, useMemo } from 'react'
import AppLayout from '../layouts/AppLayout'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/firebase'

const PAGE_SIZE = 15

const OP_STYLE = {
  INSERT:  { color: '#4ADE80', bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.25)'  },
  UPDATE:  { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)'  },
  DELETE:  { color: '#F87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
  RECOVER: { color: '#FB923C', bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.25)'  },
}

const formatTs = (ts) => {
  if (!ts) return '—'
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch { return '—' }
}

const summariseChanges = (changes) => {
  if (!changes) return '—'
  if (changes.new?.companyName) return `Company: ${changes.new.companyName}`
  if (changes.old && changes.new) {
    const keys = Object.keys(changes.new).filter(k => changes.new[k] !== changes.old?.[k])
    if (!keys.length) return 'No field changes recorded'
    return keys.slice(0, 3).map(k => `${k} → ${String(changes.new[k]).slice(0, 30)}`).join(' · ')
  }
  return '—'
}

function renderChanges(changes) {
  if (!changes) return <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>No change details recorded.</p>

  // INSERT: show new fields
  if (changes.new && !changes.old) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {Object.entries(changes.new).slice(0, 8).map(([k, v]) => (
          <div key={k} style={{ padding: '5px 10px', borderRadius: 7, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)' }}>
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginRight: 4 }}>{k}:</span>
            <span style={{ fontSize: '0.75rem', color: '#4ADE80' }}>{String(v).slice(0, 40)}</span>
          </div>
        ))}
      </div>
    )
  }

  // UPDATE: show changed fields old → new
  if (changes.old && changes.new) {
    const changedKeys = Object.keys(changes.new).filter(k => {
      const oldV = String(changes.old[k] ?? '')
      const newV = String(changes.new[k] ?? '')
      return oldV !== newV
    })
    if (!changedKeys.length) return <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>No field changes detected.</p>
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {changedKeys.slice(0, 10).map(k => (
          <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 10px', borderRadius: 7, background: 'rgba(29,53,87,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', minWidth: 90, flexShrink: 0 }}>{k}</span>
            <span style={{ fontSize: '0.73rem', color: '#F87171', textDecoration: 'line-through', flex: 1, wordBreak: 'break-word' }}>{String(changes.old[k] ?? '—').slice(0, 60)}</span>
            <span style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>→</span>
            <span style={{ fontSize: '0.73rem', color: '#4ADE80', flex: 1, wordBreak: 'break-word' }}>{String(changes.new[k] ?? '—').slice(0, 60)}</span>
          </div>
        ))}
      </div>
    )
  }

  return <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>No change details recorded.</p>
}

export default function AuditTrail() {
  const [entries,  setEntries]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [expanded,       setExpanded]       = useState(null)
  const [page,           setPage]           = useState(1)
  const [filterOp,       setFilterOp]       = useState('')
  const [filterBy,       setFilterBy]       = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo,   setFilterDateTo]   = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        // Step 1 — load all MOA documents (id + companyName only)
        const moasSnap = await getDocs(collection(db, 'moas'))
        const moaMap = {}
        moasSnap.docs.forEach(d => {
          moaMap[d.id] = d.data().companyName || d.id
        })

        // Step 2 — for each MOA, load its auditTrail sub-collection
        // Uses regular collection queries — no composite index required
        const all = []
        for (const [moaId, companyName] of Object.entries(moaMap)) {
          const auditSnap = await getDocs(collection(db, 'moas', moaId, 'auditTrail'))
          auditSnap.docs.forEach(d => {
            all.push({ id: d.id, moaId, companyName, ...d.data() })
          })
        }

        // Step 3 — sort descending by timestamp client-side
        all.sort((a, b) => {
          const ta = a.timestamp?.toDate?.()?.getTime() ?? 0
          const tb = b.timestamp?.toDate?.()?.getTime() ?? 0
          return tb - ta
        })

        setEntries(all)
      } catch (e) {
        console.error(e)
        setError('Failed to load audit trail: ' + (e.message || 'Unknown error'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const uniqueMOAs = useMemo(() => new Set(entries.map(e => e.moaId)).size, [entries])

  const filtered = useMemo(() => {
    let rows = [...entries]
    if (filterOp) rows = rows.filter(r => r.operation === filterOp)
    if (filterBy) {
      const t = filterBy.toLowerCase()
      rows = rows.filter(r =>
        r.performedByName?.toLowerCase().includes(t) ||
        r.companyName?.toLowerCase().includes(t) ||
        r.moaId?.toLowerCase().includes(t)
      )
    }
    if (filterDateFrom) {
      const from = new Date(filterDateFrom + 'T00:00:00').getTime()
      rows = rows.filter(r => { const ts = r.timestamp?.toDate?.()?.getTime(); return ts && ts >= from })
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo + 'T23:59:59').getTime()
      rows = rows.filter(r => { const ts = r.timestamp?.toDate?.()?.getTime(); return ts && ts <= to })
    }
    return rows
  }, [entries, filterOp, filterBy, filterDateFrom, filterDateTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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
      <div style={{ maxWidth: 1200 }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>
            Admin Only
          </p>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 600, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}>
            Audit Trail
          </h1>
          <p style={{ marginTop: 4, fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
            {loading
              ? 'Loading entries…'
              : `${filtered.length} entr${filtered.length !== 1 ? 'ies' : 'y'} across ${uniqueMOAs} MOA${uniqueMOAs !== 1 ? 's' : ''}`
            }
          </p>
        </div>

        {/* Filter bar */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
          padding: '14px 16px',
          background: 'rgba(17,34,64,0.5)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12,
          marginBottom: 16,
        }}>
          <select
            style={selectStyle}
            value={filterOp}
            onChange={e => { setFilterOp(e.target.value); setPage(1) }}
          >
            <option value="">All Operations</option>
            {['INSERT', 'UPDATE', 'DELETE', 'RECOVER'].map(op => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>

          <input
            value={filterBy}
            onChange={e => { setFilterBy(e.target.value); setPage(1) }}
            placeholder="Filter by user or company name…"
            style={{ ...selectStyle, minWidth: 240, background: 'rgba(13,27,42,0.8)', color: 'rgba(255,255,255,0.8)' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>Date</span>
            <input type="date" value={filterDateFrom}
              onChange={e => { setFilterDateFrom(e.target.value); setPage(1) }}
              style={{ ...selectStyle, padding: '6px 10px', fontSize: '0.78rem', colorScheme: 'dark' }} />
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>–</span>
            <input type="date" value={filterDateTo}
              onChange={e => { setFilterDateTo(e.target.value); setPage(1) }}
              min={filterDateFrom || undefined}
              style={{ ...selectStyle, padding: '6px 10px', fontSize: '0.78rem', colorScheme: 'dark' }} />
          </div>

          {(filterOp || filterBy || filterDateFrom || filterDateTo) && (
            <button
              onClick={() => { setFilterOp(''); setFilterBy(''); setFilterDateFrom(''); setFilterDateTo(''); setPage(1) }}
              style={{ background: 'none', border: 'none', color: 'rgba(212,168,67,0.7)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", padding: '2px 6px', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#D4A843'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(212,168,67,0.7)'}
            >
              Clear ×
            </button>
          )}
        </div>

        {/* Expand hint */}
        <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.18)', fontStyle: 'italic', marginBottom: 10 }}>
          Click any row to view change details.
        </p>

        {/* Error */}
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#F87171', fontSize: '0.825rem', marginBottom: 16, lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        {/* Table */}
        <div style={{ background: 'rgba(17,34,64,0.5)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
              <thead>
                <tr>
                  {['Operation', 'Company', 'MOA ID', 'Performed By', 'Date & Time', 'Changes'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(17,34,64,0.9)', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '56px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.2)', fontSize: '0.875rem' }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#D4A843', animation: 'spin 0.8s linear infinite' }} />
                        Loading audit entries…
                      </div>
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '56px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.875rem' }}>
                      {filterOp || filterBy || filterDateFrom || filterDateTo ? 'No entries match the current filters.' : 'No audit entries found.'}
                    </td>
                  </tr>
                ) : paginated.map(entry => {
                  const opStyle = OP_STYLE[entry.operation] || OP_STYLE.INSERT
                  const rowKey = `${entry.moaId}-${entry.id}`
                  const isExpanded = expanded === rowKey
                  return (
                    <React.Fragment key={rowKey}>
                      <tr
                        style={{ transition: 'background 0.1s', cursor: 'pointer' }}
                        onClick={() => setExpanded(prev => prev === rowKey ? null : rowKey)}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(29,53,87,0.25)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 6, background: opStyle.bg, border: `1px solid ${opStyle.border}`, color: opStyle.color, fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em', fontFamily: 'monospace' }}>
                            {entry.operation}
                          </span>
                          <span style={{ marginLeft: 6, fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', transition: 'transform 0.15s', display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)' }}>▶</span>
                        </td>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.8rem', fontWeight: 500, color: 'rgba(255,255,255,0.78)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.companyName || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.72rem', color: '#D4A843', fontFamily: 'monospace', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.moaId}
                        </td>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
                            {entry.performedByName || 'System'}
                          </p>
                          {entry.performedBy && entry.performedBy !== 'SYSTEM_SEED' && (
                            <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.22)', marginTop: 2, fontFamily: 'monospace' }}>
                              {entry.performedBy.slice(0, 14)}…
                            </p>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
                          {formatTs(entry.timestamp)}
                        </td>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.38)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={summariseChanges(entry.changes)}
                        >
                          {summariseChanges(entry.changes)}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} style={{ padding: '0 16px 14px 16px', background: 'rgba(17,34,64,0.4)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ padding: '14px 16px', background: 'rgba(13,27,42,0.6)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', marginTop: 4 }}>
                              <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', marginBottom: 10 }}>Change Details</p>
                              {renderChanges(entry.changes)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filtered.length > PAGE_SIZE && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>
                Page {page} of {totalPages} · {filtered.length} entries
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                {page > 1 && (
                  <button onClick={() => setPage(p => p - 1)} style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.09)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    ← Prev
                  </button>
                )}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
                  return (
                    <button key={p} onClick={() => setPage(p)} style={{ padding: '6px 11px', borderRadius: 7, border: `1px solid ${p === page ? 'rgba(212,168,67,0.4)' : 'rgba(255,255,255,0.09)'}`, background: p === page ? 'rgba(212,168,67,0.15)' : 'transparent', color: p === page ? '#D4A843' : 'rgba(255,255,255,0.4)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                      {p}
                    </button>
                  )
                })}
                {page < totalPages && (
                  <button onClick={() => setPage(p => p + 1)} style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.09)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    Next →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
