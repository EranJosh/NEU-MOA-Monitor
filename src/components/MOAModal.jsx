import React, { useState, useEffect } from 'react'
import { Timestamp } from 'firebase/firestore'
import { addMOA, updateMOA, MOA_STATUSES, INDUSTRY_TYPES, COLLEGES, generateMOAId } from '../firebase/firestore'
import { useAuth } from '../context/AuthContext'

const FACULTY_DEFAULT_STATUS = MOA_STATUSES.PROCESSING_AWAITING

const FIELD_STYLE = {
  width: '100%',
  padding: '10px 13px',
  borderRadius: 9,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(13,27,42,0.8)',
  color: 'rgba(255,255,255,0.88)',
  fontSize: '0.875rem',
  fontFamily: "'DM Sans', system-ui, sans-serif",
  outline: 'none',
  transition: 'border-color 0.15s ease',
  boxSizing: 'border-box',
}

const LABEL_STYLE = {
  display: 'block',
  fontSize: '0.7rem',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.35)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 6,
}

const ERROR_STYLE = {
  fontSize: '0.7rem',
  color: '#F87171',
  marginTop: 4,
}

const tsToDateInput = (ts) => {
  if (!ts) return ''
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toISOString().split('T')[0]
  } catch { return '' }
}

const dateInputToTs = (str) => {
  if (!str) return null
  return Timestamp.fromDate(new Date(str + 'T00:00:00'))
}

const EMPTY_FORM = {
  hteId: '',
  companyName: '',
  description: '',
  address: '',
  contactPerson: '',
  contactEmail: '',
  industryType: '',
  effectiveDate: '',
  expirationDate: '',
  status: '',
  endorsedByCollege: '',
}

function FieldGroup({ label, error, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={LABEL_STYLE}>{label}</label>
      {children}
      {error && <p style={ERROR_STYLE}>{error}</p>}
    </div>
  )
}

export default function MOAModal({ open, moa, onClose, onSaved, statusReadOnly = false, onDelete, renewFrom = null }) {
  const { user } = useAuth()
  const isEdit = Boolean(moa)

  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState('')
  const [generatingId, setGeneratingId] = useState(false)

  useEffect(() => {
    if (!open) return
    if (isEdit && moa) {
      setForm({
        hteId:             moa.hteId || '',
        companyName:       moa.companyName || '',
        description:       moa.description || '',
        address:           moa.address || '',
        contactPerson:     moa.contactPerson || '',
        contactEmail:      moa.contactEmail || '',
        industryType:      moa.industryType || '',
        effectiveDate:     tsToDateInput(moa.effectiveDate),
        expirationDate:    tsToDateInput(moa.expirationDate),
        status:            moa.status || '',
        endorsedByCollege: moa.endorsedByCollege || '',
      })
    } else {
      const baseStatus = statusReadOnly ? FACULTY_DEFAULT_STATUS : ''
      if (renewFrom) {
        setForm({
          hteId: '',
          companyName:       renewFrom.companyName || '',
          description:       renewFrom.description || '',
          address:           renewFrom.address || '',
          contactPerson:     renewFrom.contactPerson || '',
          contactEmail:      renewFrom.contactEmail || '',
          industryType:      renewFrom.industryType || '',
          effectiveDate:     '',
          expirationDate:    '',
          status:            baseStatus,
          endorsedByCollege: renewFrom.endorsedByCollege || '',
        })
      } else {
        setForm({ ...EMPTY_FORM, status: baseStatus })
      }
      // Auto-generate MOA ID
      setGeneratingId(true)
      generateMOAId()
        .then(id => setForm(prev => ({ ...prev, hteId: id })))
        .catch(() => {}) // silent — user can type manually
        .finally(() => setGeneratingId(false))
    }
    setErrors({})
    setApiError('')
  }, [open, moa, isEdit, statusReadOnly, renewFrom])

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.hteId.trim())            e.hteId = 'HTE ID is required'
    if (!form.companyName.trim())       e.companyName = 'Company name is required'
    if (!form.address.trim())           e.address = 'Address is required'
    if (!form.contactPerson.trim())     e.contactPerson = 'Contact person is required'
    if (!form.contactEmail.trim())      e.contactEmail = 'Contact email is required'
    else if (!/\S+@\S+\.\S+/.test(form.contactEmail)) e.contactEmail = 'Enter a valid email'
    if (!form.industryType)             e.industryType = 'Industry type is required'
    if (!form.effectiveDate)            e.effectiveDate = 'Effective date is required'
    if (!form.expirationDate)           e.expirationDate = 'Expiration date is required'
    else if (form.effectiveDate && form.expirationDate <= form.effectiveDate)
                                        e.expirationDate = 'Must be after effective date'
    if (!statusReadOnly && !form.status) e.status = 'Status is required'
    if (!form.endorsedByCollege.trim()) e.endorsedByCollege = 'College is required'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    setApiError('')
    try {
      const payload = {
        hteId:             form.hteId.trim(),
        companyName:       form.companyName.trim(),
        description:       form.description.trim(),
        address:           form.address.trim(),
        contactPerson:     form.contactPerson.trim(),
        contactEmail:      form.contactEmail.trim(),
        industryType:      form.industryType,
        effectiveDate:     dateInputToTs(form.effectiveDate),
        expirationDate:    dateInputToTs(form.expirationDate),
        status:            form.status,
        endorsedByCollege: form.endorsedByCollege.trim(),
      }
      if (isEdit) {
        await updateMOA(moa.id, payload, user, moa)
      } else {
        await addMOA(payload, user)
        if (renewFrom) {
          await updateMOA(renewFrom.id, { status: MOA_STATUSES.EXPIRED }, user, renewFrom)
        }
      }
      onSaved()
      onClose()
    } catch (err) {
      console.error(err)
      setApiError(err.message || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const inputFocus = e => { e.target.style.borderColor = 'rgba(212,168,67,0.5)' }
  const inputBlur  = e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        background: 'rgba(7,15,26,0.75)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        overflowY: 'auto', padding: '40px 16px',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 680,
          background: '#0F1F35',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 20,
          boxShadow: '0 40px 100px rgba(0,0,0,0.7)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.2rem', fontWeight: 600, color: 'rgba(255,255,255,0.92)', marginBottom: 3 }}>
              {isEdit ? 'Edit MOA Record' : renewFrom ? 'Renew MOA Record' : 'New MOA Record'}
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
              {isEdit ? `Editing: ${moa?.companyName}` : renewFrom ? `Renewing: ${renewFrom.companyName}` : 'Add a new Memorandum of Agreement'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1, padding: 4, borderRadius: 6, transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px 28px' }}>
          {apiError && (
            <div style={{ marginBottom: 20, padding: '11px 14px', borderRadius: 9, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', fontSize: '0.8rem', color: '#F87171' }}>
              {apiError}
            </div>
          )}

          {/* Row 1 */}
          <div className="grid-2col-form" style={{ gap: '0 20px' }}>
            <FieldGroup label="HTE ID (auto-generated)" error={errors.hteId}>
              <div style={{ position: 'relative' }}>
                <input
                  style={{ ...FIELD_STYLE, paddingRight: generatingId ? 80 : 13 }}
                  value={form.hteId}
                  onChange={e => set('hteId', e.target.value)}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                  placeholder={generatingId ? 'Generating…' : 'e.g. MOA-2026-0001'}
                  disabled={generatingId}
                />
                {generatingId && (
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '0.68rem', color: 'rgba(212,168,67,0.6)', fontFamily: "'DM Sans', system-ui, sans-serif", pointerEvents: 'none' }}>
                    generating…
                  </span>
                )}
              </div>
            </FieldGroup>
            <FieldGroup label="Industry Type" error={errors.industryType}>
              <select style={{ ...FIELD_STYLE, cursor: 'pointer' }} value={form.industryType} onChange={e => set('industryType', e.target.value)} onFocus={inputFocus} onBlur={inputBlur}>
                <option value="">Select industry…</option>
                {INDUSTRY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </FieldGroup>
          </div>

          {/* Row 2 */}
          <FieldGroup label="Company Name" error={errors.companyName}>
            <input style={FIELD_STYLE} value={form.companyName} onChange={e => set('companyName', e.target.value)} onFocus={inputFocus} onBlur={inputBlur} placeholder="Full legal company name" />
          </FieldGroup>

          {/* Row 2b */}
          <FieldGroup label="Partnership Description">
            <textarea
              style={{ ...FIELD_STYLE, resize: 'vertical', minHeight: 68 }}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              onFocus={inputFocus} onBlur={inputBlur}
              placeholder="Briefly describe the nature of this MOA partnership..."
            />
          </FieldGroup>

          {/* Row 3 */}
          <FieldGroup label="Address" error={errors.address}>
            <textarea
              style={{ ...FIELD_STYLE, resize: 'vertical', minHeight: 72 }}
              value={form.address}
              onChange={e => set('address', e.target.value)}
              onFocus={inputFocus} onBlur={inputBlur}
              placeholder="Complete company address"
            />
          </FieldGroup>

          {/* Row 4 */}
          <div className="grid-2col-form" style={{ gap: '0 20px' }}>
            <FieldGroup label="Contact Person" error={errors.contactPerson}>
              <input style={FIELD_STYLE} value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)} onFocus={inputFocus} onBlur={inputBlur} placeholder="Full name" />
            </FieldGroup>
            <FieldGroup label="Contact Email" error={errors.contactEmail}>
              <input type="email" style={FIELD_STYLE} value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} onFocus={inputFocus} onBlur={inputBlur} placeholder="contact@company.com" />
            </FieldGroup>
          </div>

          {/* Row 5 */}
          <div className="grid-2col-form" style={{ gap: '0 20px' }}>
            <FieldGroup label="Effective Date" error={errors.effectiveDate}>
              <input type="date" style={FIELD_STYLE} value={form.effectiveDate} onChange={e => set('effectiveDate', e.target.value)} onFocus={inputFocus} onBlur={inputBlur} />
            </FieldGroup>
            <FieldGroup label="Expiration Date" error={errors.expirationDate}>
              <input type="date" style={FIELD_STYLE} value={form.expirationDate} onChange={e => set('expirationDate', e.target.value)} onFocus={inputFocus} onBlur={inputBlur} />
            </FieldGroup>
          </div>

          {/* Row 6 */}
          <FieldGroup label={statusReadOnly ? 'Status (admin-managed)' : 'Status'} error={errors.status}>
            {statusReadOnly ? (
              <div style={{ ...FIELD_STYLE, display: 'flex', alignItems: 'center', gap: 8, opacity: 0.6, cursor: 'default', background: 'rgba(9,20,34,0.6)' }}>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)' }}>{form.status || '—'}</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em' }}>LOCKED</span>
              </div>
            ) : (
              <select style={{ ...FIELD_STYLE, cursor: 'pointer' }} value={form.status} onChange={e => set('status', e.target.value)} onFocus={inputFocus} onBlur={inputBlur}>
                <option value="">Select status…</option>
                {Object.values(MOA_STATUSES).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </FieldGroup>

          {/* Row 7 */}
          <FieldGroup label="Endorsed by College" error={errors.endorsedByCollege}>
            <select style={{ ...FIELD_STYLE, cursor: 'pointer' }} value={form.endorsedByCollege} onChange={e => set('endorsedByCollege', e.target.value)} onFocus={inputFocus} onBlur={inputBlur}>
              <option value="">Select college…</option>
              {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </FieldGroup>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 8 }}>
            <div>
              {isEdit && onDelete && (
                <button
                  type="button"
                  onClick={() => { onClose(); onDelete(moa) }}
                  disabled={saving}
                  style={{ padding: '10px 16px', borderRadius: 9, border: '1px solid rgba(248,113,113,0.25)', background: 'transparent', color: 'rgba(248,113,113,0.7)', fontSize: '0.875rem', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; e.currentTarget.style.color = '#F87171' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(248,113,113,0.7)' }}
                >
                  Delete MOA Entry
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{ padding: '10px 20px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: 'rgba(212,168,67,0.9)', color: '#0D1B2A', fontSize: '0.875rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all 0.15s', letterSpacing: '0.02em' }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#D4A843' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,168,67,0.9)' }}
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add MOA'}
            </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
