import React, { useState, useEffect } from 'react'
import AppLayout from '../layouts/AppLayout'
import { useAuth } from '../context/AuthContext'
import { getStatisticsData, COLLEGES, INDUSTRY_TYPES, MOA_STATUSES } from '../firebase/firestore'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Cell,
} from 'recharts'

// ─── Status config ────────────────────────────────────────────────────────
const STATUS_CONFIG = [
  { key: MOA_STATUSES.APPROVED_SIGNED,     short: 'Approved: Signed',       color: '#4ADE80' },
  { key: MOA_STATUSES.APPROVED_NOTARIZING, short: 'Approved: Notarizing',   color: '#34D399' },
  { key: MOA_STATUSES.APPROVED_NO_NOTARY,  short: 'Approved: No Notary',    color: '#6EE7B7' },
  { key: MOA_STATUSES.PROCESSING_AWAITING, short: 'Processing: Awaiting',   color: '#60A5FA' },
  { key: MOA_STATUSES.PROCESSING_LEGAL,    short: 'Processing: Legal',      color: '#93C5FD' },
  { key: MOA_STATUSES.PROCESSING_VPAA,     short: 'Processing: VPAA',       color: '#BFDBFE' },
  { key: MOA_STATUSES.EXPIRING,            short: 'Expiring',               color: '#FBBF24' },
  { key: MOA_STATUSES.EXPIRED,             short: 'Expired',                color: '#F87171' },
]

// ─── Chart tooltip style ─────────────────────────────────────────────────
const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#112240',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#E8E8EC',
    fontSize: 12,
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  cursor: { fill: 'rgba(255,255,255,0.03)' },
}

// ─── Reusable sub-components ─────────────────────────────────────────────
function SummaryCard({ label, value, note, accent, delay = 0 }) {
  return (
    <div
      className="rounded-xl p-5 animate-fade-up"
      style={{
        background: 'rgba(17,34,64,0.6)',
        border: '1px solid rgba(255,255,255,0.07)',
        animationDelay: `${delay}ms`,
        animationFillMode: 'both',
      }}
    >
      <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 10 }}>{label}</p>
      <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '2.2rem', fontWeight: 600, color: accent, lineHeight: 1 }}>{value ?? '—'}</p>
      {note && <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', marginTop: 6 }}>{note}</p>}
    </div>
  )
}

function ChartPanel({ title, children, style }) {
  return (
    <div style={{
      background: 'rgba(17,34,64,0.55)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16,
      padding: '20px 24px',
      ...style,
    }}>
      <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 18 }}>{title}</p>
      {children}
    </div>
  )
}

function IndustryBar({ label, count, total, color = '#60A5FA' }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)' }}>{label}</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color }}>{count} <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>({pct}%)</span></span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.07)' }}>
        <div style={{ height: '100%', borderRadius: 3, background: color, width: `${pct}%`, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

function CollegeRow({ label, count, max, color = '#D4A843' }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{label}</span>
      </div>
      <div style={{ width: 80, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <div style={{ height: '100%', borderRadius: 2, background: color, width: `${pct}%`, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color, width: 22, textAlign: 'right', flexShrink: 0 }}>{count}</span>
    </div>
  )
}

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

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN STATISTICS
// ═══════════════════════════════════════════════════════════════════════════
function AdminStatistics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterCollege,  setFilterCollege]  = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo,   setFilterDateTo]   = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const d = await getStatisticsData('admin', {
        college:  filterCollege  || undefined,
        dateFrom: filterDateFrom || undefined,
        dateTo:   filterDateTo   || undefined,
      })
      setData(d)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterCollege, filterDateFrom, filterDateTo])

  const hasFilters = filterCollege || filterDateFrom || filterDateTo

  const clearFilters = () => {
    setFilterCollege('')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  const L = (v) => loading ? '—' : String(v ?? 0)

  // Build status chart data
  const statusChartData = STATUS_CONFIG.map(cfg => ({
    name:  cfg.short,
    count: data?.statusCounts[cfg.key] ?? 0,
    color: cfg.color,
  })).filter(d => d.count > 0)

  // Industry breakdown
  const industryTotal = Object.values(data?.industryCounts || {}).reduce((a, b) => a + b, 0)
  const industryRows = INDUSTRY_TYPES.map(ind => ({
    label: ind,
    count: data?.industryCounts[ind] || 0,
  })).sort((a, b) => b.count - a.count)

  // College breakdown
  const collegeMax = Math.max(...Object.values(data?.collegeCounts || {}), 1)
  const collegeRows = COLLEGES.map(col => ({
    label: col,
    count: data?.collegeCounts[col] || 0,
  })).filter(r => r.count > 0).sort((a, b) => b.count - a.count)

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div className="animate-fade-up" style={{ animationFillMode: 'both', marginBottom: 28 }}>
        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>Admin View</p>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 600, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}>
          Statistics<span style={{ color: '#D4A843' }}>.</span>
        </h1>
        <p style={{ marginTop: 4, fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>Full data breakdown across all MOA records.</p>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
        padding: '12px 16px', marginBottom: 24,
        background: 'rgba(17,34,64,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12,
      }}>
        <select style={selectStyle} value={filterCollege} onChange={e => setFilterCollege(e.target.value)}>
          <option value="">All Colleges</option>
          {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>From</span>
          <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
            style={{ ...selectStyle, width: 'auto', padding: '6px 10px', fontSize: '0.78rem', colorScheme: 'dark' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>To</span>
          <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
            min={filterDateFrom || undefined}
            style={{ ...selectStyle, width: 'auto', padding: '6px 10px', fontSize: '0.78rem', colorScheme: 'dark' }} />
        </div>
        {hasFilters && (
          <button onClick={clearFilters}
            style={{ background: 'none', border: 'none', color: 'rgba(212,168,67,0.7)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", padding: '2px 6px', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#D4A843'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(212,168,67,0.7)'}
          >
            Clear filters ×
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        <SummaryCard label="Active (Approved)"  value={L(data?.cats.approved)}   note="All approved kinds"    accent="#4ADE80" delay={0}   />
        <SummaryCard label="Processing"          value={L(data?.cats.processing)}  note="Pending approval"     accent="#60A5FA" delay={60}  />
        <SummaryCard label="Expiring Soon"        value={L(data?.cats.expiring)}    note="Within 60 days"       accent="#FBBF24" delay={120} />
        <SummaryCard label="Expired"              value={L(data?.cats.expired)}     note="No renewal done"      accent="#F87171" delay={180} />
      </div>

      {/* Charts row */}
      <div className="grid-2col" style={{ gap: 18, marginBottom: 18 }}>
        {/* Monthly submissions */}
        <ChartPanel title="Monthly Submissions (Last 12 Months)">
          {loading ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#D4A843', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.monthly || []} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [v, 'MOAs added']} />
                <Bar dataKey="count" fill="rgba(212,168,67,0.65)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>

        {/* Status distribution */}
        <ChartPanel title="Status Distribution">
          {loading ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#D4A843', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : statusChartData.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.825rem', textAlign: 'center', paddingTop: 60 }}>No data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart layout="vertical" data={statusChartData} margin={{ top: 0, right: 30, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 9.5 }} axisLine={false} tickLine={false} width={118} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [v, 'MOAs']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {statusChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.75} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>
      </div>

      {/* Industry + College breakdown */}
      <div className="grid-2col" style={{ gap: 18 }}>
        {/* Industry */}
        <ChartPanel title="Breakdown by Industry">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3,4,5].map(i => <div key={i} style={{ height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.04)', animation: 'shimmer 1.4s ease-in-out infinite' }} />)}
            </div>
          ) : (
            industryRows.map(r => (
              <IndustryBar key={r.label} label={r.label} count={r.count} total={industryTotal} color="#60A5FA" />
            ))
          )}
        </ChartPanel>

        {/* College */}
        <ChartPanel title="Breakdown by College">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3,4,5,6].map(i => <div key={i} style={{ height: 24, borderRadius: 4, background: 'rgba(255,255,255,0.04)', animation: 'shimmer 1.4s ease-in-out infinite' }} />)}
            </div>
          ) : collegeRows.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.825rem', textAlign: 'center', paddingTop: 20 }}>No data.</p>
          ) : (
            collegeRows.map(r => (
              <CollegeRow key={r.label} label={r.label} count={r.count} max={collegeMax} color="#D4A843" />
            ))
          )}
        </ChartPanel>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// FACULTY STATISTICS
// ═══════════════════════════════════════════════════════════════════════════
function FacultyStatistics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStatisticsData('faculty', {})
      .then(d => setData(d))
      .catch(e => console.error(e))
      .finally(() => setLoading(false))
  }, [])

  const L = (v) => loading ? '—' : String(v ?? 0)

  const industryTotal = Object.values(data?.industryCounts || {}).reduce((a, b) => a + b, 0)
  const industryRows = INDUSTRY_TYPES.map(ind => ({
    label: ind,
    count: data?.industryCounts[ind] || 0,
  })).sort((a, b) => b.count - a.count)

  const collegeMax = Math.max(...Object.values(data?.collegeCounts || {}), 1)
  const collegeRows = COLLEGES.map(col => ({
    label: col,
    count: data?.collegeCounts[col] || 0,
  })).filter(r => r.count > 0).sort((a, b) => b.count - a.count)

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div className="animate-fade-up" style={{ animationFillMode: 'both', marginBottom: 28 }}>
        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>Faculty View</p>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 600, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}>
          Statistics<span style={{ color: '#60A5FA' }}>.</span>
        </h1>
        <p style={{ marginTop: 4, fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>Overview of active MOA records.</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        <SummaryCard label="Active (Approved)"  value={L(data?.cats.approved)}   note="All approved kinds" accent="#4ADE80" delay={0}   />
        <SummaryCard label="Expiring Soon"        value={L(data?.cats.expiring)}    note="Within 60 days"    accent="#FBBF24" delay={60}  />
      </div>

      {/* Charts */}
      <div className="grid-2col" style={{ gap: 18, marginBottom: 18 }}>
        <ChartPanel title="Industry Breakdown">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3,4,5].map(i => <div key={i} style={{ height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.04)', animation: 'shimmer 1.4s ease-in-out infinite' }} />)}
            </div>
          ) : (
            industryRows.map(r => (
              <IndustryBar key={r.label} label={r.label} count={r.count} total={industryTotal} color="#60A5FA" />
            ))
          )}
        </ChartPanel>

        <ChartPanel title="College Breakdown">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3,4,5].map(i => <div key={i} style={{ height: 24, borderRadius: 4, background: 'rgba(255,255,255,0.04)', animation: 'shimmer 1.4s ease-in-out infinite' }} />)}
            </div>
          ) : collegeRows.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.825rem', textAlign: 'center', paddingTop: 20 }}>No data.</p>
          ) : (
            collegeRows.map(r => (
              <CollegeRow key={r.label} label={r.label} count={r.count} max={collegeMax} color="#60A5FA" />
            ))
          )}
        </ChartPanel>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════
export default function Statistics() {
  const { role } = useAuth()
  if (role === 'faculty') return <AppLayout><FacultyStatistics /></AppLayout>
  return <AppLayout><AdminStatistics /></AppLayout>
}
