import React, { useEffect, useState, useMemo } from 'react'
import StatusBadge from './StatusBadge'
import { getAuditTrail, AUDIT_OPERATIONS, getNotes, addNote } from '../firebase/firestore'
import { useAuth } from '../context/AuthContext'

const formatDate = (ts) => {
  if (!ts) return '—'
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch { return '—' }
}

const formatTs = (ts) => {
  if (!ts) return '—'
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return '—' }
}

const OPERATION_STYLE = {
  INSERT:  { color: '#4ADE80', bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.25)',  label: 'Added'   },
  UPDATE:  { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)',  label: 'Updated' },
  DELETE:  { color: '#F87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', label: 'Deleted' },
  RECOVER: { color: '#FBBF24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)',  label: 'Recovered'},
}

const statusColor = (s) => {
  if (!s) return '#94A3B8'
  if (s.startsWith('APPROVED'))    return '#4ADE80'
  if (s.startsWith('PROCESSING'))  return '#60A5FA'
  if (s.startsWith('EXPIRING'))    return '#FBBF24'
  if (s.startsWith('EXPIRED'))     return '#F87171'
  return '#94A3B8'
}

function Field({ label, value, mono = false, wide = false }) {
  return (
    <div style={{ marginBottom: 18, gridColumn: wide ? '1 / -1' : undefined }}>
      <p style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 5 }}>
        {label}
      </p>
      <p style={{
        fontSize: '0.875rem',
        color: value ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.2)',
        fontFamily: mono ? "'Courier New', monospace" : "'DM Sans', system-ui, sans-serif",
        lineHeight: 1.55, wordBreak: 'break-word',
      }}>
        {value || '—'}
      </p>
    </div>
  )
}

export default function MOADetailPanel({ open, moa, onClose, canEdit = false, isAdmin = false, onEdit, onDelete, onRenew }) {
  const { user } = useAuth()
  const [auditAll,      setAuditAll]      = useState([])
  const [auditLoading,  setAuditLoading]  = useState(false)
  const [notes,         setNotes]         = useState([])
  const [notesLoading,  setNotesLoading]  = useState(false)
  const [noteText,      setNoteText]      = useState('')
  const [addingNote,    setAddingNote]    = useState(false)

  useEffect(() => {
    if (!open || !moa?.id) return
    setAuditLoading(true)
    getAuditTrail(moa.id)
      .then(entries => setAuditAll(entries))
      .catch(() => setAuditAll([]))
      .finally(() => setAuditLoading(false))
    if (canEdit || isAdmin) {
      setNotesLoading(true)
      getNotes(moa.id).then(n => setNotes(n)).catch(() => setNotes([])).finally(() => setNotesLoading(false))
    }
  }, [open, moa?.id])

  const statusTimeline = React.useMemo(() => {
    const entries = []
    const reversed = [...auditAll].reverse() // chronological order
    reversed.forEach(entry => {
      if (entry.operation === 'INSERT' && entry.changes?.new?.status) {
        entries.push({ status: entry.changes.new.status, performedByName: entry.performedByName, timestamp: entry.timestamp, label: 'Initial' })
      } else if (entry.operation === 'UPDATE') {
        const oldStatus = entry.changes?.old?.status
        const newStatus = entry.changes?.new?.status
        if (newStatus && oldStatus !== newStatus) {
          entries.push({ status: newStatus, performedByName: entry.performedByName, timestamp: entry.timestamp, label: 'Changed' })
        }
      }
    })
    return entries
  }, [auditAll])

  const handleAddNote = async () => {
    if (!noteText.trim() || addingNote) return
    setAddingNote(true)
    try {
      await addNote(moa.id, noteText, user)
      setNoteText('')
      const refreshed = await getNotes(moa.id)
      setNotes(refreshed)
    } catch(e) {
      // silent
    } finally {
      setAddingNote(false)
    }
  }

  if (!open || !moa) return null

  const showActions = canEdit || isAdmin

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9990,
          background: 'rgba(7,15,26,0.65)',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 56, right: 0, bottom: 0, zIndex: 9991,
        width: '100%', maxWidth: 540,
        background: 'linear-gradient(180deg, #0F2040 0%, #0D1B2A 100%)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '-24px 0 80px rgba(0,0,0,0.6)',
        overflowY: 'auto',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        animation: 'slideInRight 0.22s cubic-bezier(0.16,1,0.3,1) forwards',
      }}>

        {/* Sticky header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 1,
          padding: '20px 24px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(13,27,42,0.96)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.22)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 5 }}>
              MOA Details · {moa.hteId}
            </p>
            <h2 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '1.1rem', fontWeight: 600, color: 'rgba(255,255,255,0.92)',
              lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {moa.companyName}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1rem',
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>

          {/* Status */}
          <div style={{ marginBottom: 24, padding: '14px 18px', background: 'rgba(29,53,87,0.35)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
            <p style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 8 }}>Current Status</p>
            <StatusBadge status={moa.status} />
          </div>

          {/* Action buttons — for authorized users */}
          {showActions && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {canEdit && onEdit && (
                <button
                  onClick={() => { onClose(); onEdit(moa) }}
                  style={{
                    flex: 1, padding: '9px 16px', borderRadius: 9,
                    border: '1px solid rgba(212,168,67,0.35)',
                    background: 'rgba(212,168,67,0.1)', color: '#D4A843',
                    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,168,67,0.18)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,168,67,0.1)' }}
                >
                  ✎ Edit MOA
                </button>
              )}
              {onRenew && (moa.status?.startsWith('EXPIRING') || moa.status?.startsWith('EXPIRED')) && (
                <button
                  onClick={() => { onClose(); onRenew(moa) }}
                  style={{
                    flex: 1, padding: '9px 16px', borderRadius: 9,
                    border: '1px solid rgba(52,211,153,0.35)',
                    background: 'rgba(52,211,153,0.1)', color: '#34D399',
                    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.18)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.1)' }}
                >
                  ↻ Renew MOA
                </button>
              )}
              {isAdmin && onDelete && !moa.isDeleted && (
                <button
                  onClick={() => { onClose(); onDelete(moa) }}
                  style={{
                    flex: canEdit ? 'none' : 1, padding: '9px 16px', borderRadius: 9,
                    border: '1px solid rgba(248,113,113,0.25)',
                    background: 'rgba(248,113,113,0.08)', color: 'rgba(248,113,113,0.8)',
                    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)'; e.currentTarget.style.color = '#F87171' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; e.currentTarget.style.color = 'rgba(248,113,113,0.8)' }}
                >
                  ⌫ Delete
                </button>
              )}
            </div>
          )}

          {/* Company Information */}
          <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 14 }}>Company Information</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <Field label="HTE ID"        value={moa.hteId}        mono />
            <Field label="Industry Type" value={moa.industryType} />
          </div>

          <Field label="Company / Organization" value={moa.companyName} wide />
          {moa.description && (
            <div style={{ marginBottom: 18, gridColumn: '1 / -1' }}>
              <p style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 5 }}>Partnership Description</p>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{moa.description}</p>
            </div>
          )}
          <Field label="Address"               value={moa.address}     wide />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <Field label="Contact Person" value={moa.contactPerson} />
            <Field label="Contact Email"  value={moa.contactEmail}  mono />
          </div>

          {/* Agreement Logistics */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '8px 0 18px' }} />
          <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 14 }}>Agreement Logistics</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <Field label="Effective Date"  value={formatDate(moa.effectiveDate)}  />
            <Field label="Expiration Date" value={formatDate(moa.expirationDate)} />
          </div>
          <Field label="Endorsed by College" value={moa.endorsedByCollege} wide />

          {/* Status Timeline */}
          {(canEdit || isAdmin) && statusTimeline.length > 0 && (
            <>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '8px 0 18px' }} />
              <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 16 }}>Status Timeline</p>
              <div style={{ position: 'relative', paddingLeft: 24, marginBottom: 4 }}>
                {/* Vertical line */}
                <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }} />
                {statusTimeline.map((item, i) => (
                  <div key={i} style={{ position: 'relative', marginBottom: i < statusTimeline.length - 1 ? 18 : 0, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    {/* Dot */}
                    <div style={{
                      position: 'absolute', left: -24, top: 4,
                      width: 16, height: 16, borderRadius: '50%',
                      background: i === statusTimeline.length - 1 ? statusColor(item.status) : 'rgba(29,53,87,0.8)',
                      border: `2px solid ${statusColor(item.status)}`,
                      boxShadow: i === statusTimeline.length - 1 ? `0 0 8px ${statusColor(item.status)}60` : 'none',
                      flexShrink: 0,
                    }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: statusColor(item.status), marginBottom: 2, lineHeight: 1.4 }}>
                        {item.status}
                      </p>
                      <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>
                        {item.performedByName} · {formatTs(item.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Audit Trail inline */}
          {(canEdit || isAdmin) && (
            <>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '8px 0 18px' }} />
              <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 14 }}>
                Recent Audit Trail
              </p>

              {auditLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: 'rgba(255,255,255,0.2)', fontSize: '0.78rem' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.08)', borderTopColor: '#D4A843', animation: 'spin 0.8s linear infinite' }} />
                  Loading trail…
                </div>
              ) : auditAll.length === 0 ? (
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.18)', fontStyle: 'italic', padding: '8px 0' }}>No audit entries yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {auditAll.slice(0, 5).map((entry, i) => {
                    const opStyle = OPERATION_STYLE[entry.operation] || OPERATION_STYLE.UPDATE
                    return (
                      <div key={entry.id || i} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '10px 12px', borderRadius: 10,
                        background: 'rgba(29,53,87,0.25)',
                        border: '1px solid rgba(255,255,255,0.05)',
                      }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
                          borderRadius: 20, fontSize: '0.65rem', fontWeight: 600,
                          letterSpacing: '0.04em', flexShrink: 0, marginTop: 1,
                          color: opStyle.color, background: opStyle.bg, border: `1px solid ${opStyle.border}`,
                        }}>
                          {opStyle.label}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>
                            {entry.performedByName || 'Unknown'}
                          </p>
                          <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>
                            {formatTs(entry.timestamp)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* Internal Notes */}
          {(canEdit || isAdmin) && (
            <>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '8px 0 18px' }} />
              <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 14 }}>
                Internal Notes
              </p>

              {notesLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: 'rgba(255,255,255,0.2)', fontSize: '0.78rem' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.08)', borderTopColor: '#D4A843', animation: 'spin 0.8s linear infinite' }} />
                  Loading notes…
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  {notes.length === 0 && (
                    <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.18)', fontStyle: 'italic', padding: '8px 0' }}>No notes yet.</p>
                  )}
                  {notes.map((note, i) => (
                    <div key={note.id || i} style={{
                      background: 'rgba(29,53,87,0.2)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 10,
                      padding: '12px 14px',
                    }}>
                      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.55, marginBottom: 6 }}>{note.text}</p>
                      <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>— {note.createdByName} · {formatTs(note.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                rows={2}
                placeholder="Add an internal note…"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(13,27,42,0.6)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '0.85rem',
                  padding: '10px 12px',
                  resize: 'vertical',
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  outline: 'none',
                  marginBottom: 8,
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(212,168,67,0.35)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleAddNote}
                  disabled={addingNote || !noteText.trim()}
                  style={{
                    border: '1px solid rgba(212,168,67,0.35)',
                    background: 'rgba(212,168,67,0.08)',
                    color: '#D4A843',
                    padding: '7px 16px',
                    borderRadius: 8,
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: addingNote || !noteText.trim() ? 'not-allowed' : 'pointer',
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    opacity: addingNote || !noteText.trim() ? 0.5 : 1,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!addingNote && noteText.trim()) e.currentTarget.style.background = 'rgba(212,168,67,0.16)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,168,67,0.08)' }}
                >
                  {addingNote ? 'Adding…' : 'Add Note'}
                </button>
              </div>
            </>
          )}

          {/* Timestamps */}
          {(moa.createdAt || moa.updatedAt) && (
            <>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '20px 0 18px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                {moa.createdAt && <Field label="Created"      value={formatTs(moa.createdAt)}  />}
                {moa.updatedAt && <Field label="Last Updated" value={formatTs(moa.updatedAt)}  />}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
