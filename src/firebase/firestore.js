import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
  limit,
} from 'firebase/firestore'
import { db } from './firebase'

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

export const MOA_STATUSES = {
  APPROVED_SIGNED:        'APPROVED: Signed by President',
  APPROVED_NOTARIZING:    'APPROVED: On-going notarization',
  APPROVED_NO_NOTARY:     'APPROVED: No notarization needed',
  PROCESSING_AWAITING:    'PROCESSING: Awaiting signature of the MOA draft by HTE partner',
  PROCESSING_LEGAL:       'PROCESSING: MOA draft sent to Legal Office for Review',
  PROCESSING_VPAA:        'PROCESSING: MOA draft and opinion of legal office sent to VPAA/OP for approval',
  EXPIRED:                'EXPIRED: No renewal done',
  EXPIRING:               'EXPIRING: Two months before expiration of date',
}

export const APPROVED_STATUSES = [
  'APPROVED – Active',
  'APPROVED – On Hold',
]

export const INDUSTRY_TYPES = [
  'Telecom',
  'Food',
  'Services',
  'Technology',
  'Finance',
]

export const COLLEGES = [
  'College of Engineering',
  'College of Computer Studies',
  'College of Business Administration',
  'College of Hotel and Restaurant Management',
  'College of Nursing',
  'College of Education',
  'College of Arts and Sciences',
  'College of Architecture',
  'College of Law',
]

export const AUDIT_OPERATIONS = {
  INSERT:  'INSERT',
  UPDATE:  'UPDATE',
  DELETE:  'DELETE',
  RECOVER: 'RECOVER',
}

// ─────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────

const serializeDoc = (snap) => ({ id: snap.id, ...snap.data() })

const writeAuditEntry = async (moaId, user, operation, changes = {}) => {
  const auditRef = collection(db, 'moas', moaId, 'auditTrail')
  await addDoc(auditRef, {
    performedBy:     user.uid,
    performedByName: user.displayName || user.email,
    operation,
    timestamp:       serverTimestamp(),
    changes,
  })
}

// ─────────────────────────────────────────────────────────────
// USER FUNCTIONS
// ─────────────────────────────────────────────────────────────

export const getUserRole = async (uid) => {
  const ref  = doc(db, 'users', uid)
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : null
}

export const createDefaultUserDoc = async (user) => {
  const ref  = doc(db, 'users', user.uid)
  const data = {
    uid:         user.uid,
    email:       user.email,
    displayName: user.displayName,
    photoURL:    user.photoURL,
    role:        'student',
    isBlocked:   false,
    createdAt:   serverTimestamp(),
    lastLogin:   serverTimestamp(),
  }
  await setDoc(ref, data)
  return data
}

export const getOrCreateUserDoc = async (user) => {
  const existing = await getUserRole(user.uid)
  if (existing) {
    // Update lastLogin on every sign-in
    await updateDoc(doc(db, 'users', user.uid), { lastLogin: serverTimestamp() })
    return existing
  }
  return createDefaultUserDoc(user)
}

/** Admin: get all users */
export const getUsers = async () => {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map(serializeDoc)
}

/** Admin: change a user's role */
export const updateUserRole = async (uid, role) => {
  await updateDoc(doc(db, 'users', uid), { role })
}

/** Admin: block or unblock a user */
export const blockUser = async (uid, isBlocked) => {
  await updateDoc(doc(db, 'users', uid), { isBlocked })
}

/** Admin: grant or revoke MOA management permission for a faculty user */
export const updateUserMOAPermission = async (uid, canManageMOA) => {
  await updateDoc(doc(db, 'users', uid), { canManageMOA })
}

// ─────────────────────────────────────────────────────────────
// MOA QUERY FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * getMOAs — role-aware query
 *
 * Student  → isDeleted=false + status in APPROVED_STATUSES
 * Faculty  → isDeleted=false (all statuses)
 * Admin    → everything (including soft-deleted)
 *
 * Optional filters: { college, industryType, search, dateFrom, dateTo }
 */
export const getMOAs = async (role, filters = {}) => {
  const moasRef = collection(db, 'moas')
  let constraints = []

  if (role === 'student') {
    constraints.push(where('isDeleted', '==', false))
    constraints.push(where('status', 'in', APPROVED_STATUSES))
  } else if (role === 'faculty') {
    constraints.push(where('isDeleted', '==', false))
  }
  // admin: no constraints — sees everything

  if (filters.college) {
    constraints.push(where('endorsedByCollege', '==', filters.college))
  }
  if (filters.industryType) {
    constraints.push(where('industryType', '==', filters.industryType))
  }
  if (filters.dateFrom) {
    constraints.push(where('effectiveDate', '>=', Timestamp.fromDate(new Date(filters.dateFrom))))
  }
  if (filters.dateTo) {
    constraints.push(where('effectiveDate', '<=', Timestamp.fromDate(new Date(filters.dateTo))))
  }

  constraints.push(orderBy('createdAt', 'desc'))

  const q    = query(moasRef, ...constraints)
  const snap = await getDocs(q)
  let docs   = snap.docs.map(serializeDoc)

  // Client-side search (Firestore doesn't support full-text natively)
  if (filters.search) {
    const term = filters.search.toLowerCase()
    docs = docs.filter(d =>
      d.companyName?.toLowerCase().includes(term)   ||
      d.address?.toLowerCase().includes(term)        ||
      d.contactPerson?.toLowerCase().includes(term)  ||
      d.contactEmail?.toLowerCase().includes(term)   ||
      d.endorsedByCollege?.toLowerCase().includes(term) ||
      d.industryType?.toLowerCase().includes(term)   ||
      d.hteId?.toLowerCase().includes(term)
    )
  }

  // Role-based column projection (strip audit-sensitive fields for non-admins)
  if (role === 'student') {
    docs = docs.map(({ id, companyName, address, contactPerson, contactEmail, status, industryType, endorsedByCollege, effectiveDate, expirationDate }) => ({
      id, companyName, address, contactPerson, contactEmail, status, industryType, endorsedByCollege, effectiveDate, expirationDate,
    }))
  }

  return docs
}

/** Get a single MOA by ID */
export const getMOAById = async (id) => {
  const snap = await getDoc(doc(db, 'moas', id))
  return snap.exists() ? serializeDoc(snap) : null
}

// ─────────────────────────────────────────────────────────────
// MOA WRITE FUNCTIONS
// ─────────────────────────────────────────────────────────────

/** Add a new MOA (faculty or admin) */
export const addMOA = async (data, user) => {
  const payload = {
    ...data,
    isDeleted:  false,
    deletedAt:  null,
    deletedBy:  null,
    createdAt:  serverTimestamp(),
    createdBy:  user.uid,
    updatedAt:  serverTimestamp(),
    updatedBy:  user.uid,
  }
  const ref = await addDoc(collection(db, 'moas'), payload)
  await writeAuditEntry(ref.id, user, AUDIT_OPERATIONS.INSERT, { new: data })
  return ref.id
}

/** Update an existing MOA (faculty or admin) */
export const updateMOA = async (id, data, user, previousData = {}) => {
  const updates = {
    ...data,
    updatedAt: serverTimestamp(),
    updatedBy: user.uid,
  }
  await updateDoc(doc(db, 'moas', id), updates)
  await writeAuditEntry(id, user, AUDIT_OPERATIONS.UPDATE, {
    old: previousData,
    new: data,
  })
}

/** Soft-delete an MOA (admin only) */
export const softDeleteMOA = async (id, user) => {
  await updateDoc(doc(db, 'moas', id), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: user.uid,
    updatedAt: serverTimestamp(),
    updatedBy: user.uid,
  })
  await writeAuditEntry(id, user, AUDIT_OPERATIONS.DELETE)
}

/** Recover a soft-deleted MOA (admin only) */
export const recoverMOA = async (id, user) => {
  await updateDoc(doc(db, 'moas', id), {
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    updatedAt: serverTimestamp(),
    updatedBy: user.uid,
  })
  await writeAuditEntry(id, user, AUDIT_OPERATIONS.RECOVER)
}

// ─────────────────────────────────────────────────────────────
// AUDIT TRAIL
// ─────────────────────────────────────────────────────────────

/** Admin only: get full audit trail for an MOA */
export const getAuditTrail = async (moaId) => {
  const ref  = collection(db, 'moas', moaId, 'auditTrail')
  const q    = query(ref, orderBy('timestamp', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(serializeDoc)
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD STATISTICS
// ─────────────────────────────────────────────────────────────

/**
 * getDashboardStats — returns counts broken down by status category
 * Respects role visibility (admin sees deleted too)
 */
export const getDashboardStats = async (role) => {
  const moasRef = collection(db, 'moas')
  let q

  if (role === 'admin') {
    q = query(moasRef)
  } else {
    q = query(moasRef, where('isDeleted', '==', false))
  }

  const snap = await getDocs(q)
  const docs = snap.docs.map(d => d.data())

  const stats = {
    total:      0,
    approved:   0,
    processing: 0,
    expiring:   0,
    expired:    0,
    deleted:    0,
  }

  docs.forEach(d => {
    stats.total++
    if (d.isDeleted) { stats.deleted++; return }
    const s = d.status || ''
    if (s.startsWith('APPROVED'))    stats.approved++
    else if (s.startsWith('PROCESSING')) stats.processing++
    else if (s.startsWith('EXPIRING'))   stats.expiring++
    else if (s.startsWith('EXPIRED'))    stats.expired++
  })

  return stats
}

// ─────────────────────────────────────────────────────────────
// AUTO-EXPIRY LOGIC
// ─────────────────────────────────────────────────────────────

/**
 * checkAndUpdateExpiredMOAs
 *
 * Runs on dashboard load.
 * - MOAs past expirationDate → "EXPIRED: No renewal done"
 * - MOAs within 60 days of expirationDate → "EXPIRING: Two months before expiration of date"
 *
 * Only touches active (non-deleted) MOAs that aren't already EXPIRED/EXPIRING.
 */
export const checkAndUpdateExpiredMOAs = async () => {
  const now      = new Date()
  const in60days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)

  const moasRef = collection(db, 'moas')

  // Query active MOAs that have an expirationDate
  const q    = query(moasRef, where('isDeleted', '==', false))
  const snap = await getDocs(q)

  const batch = writeBatch(db)
  let   count = 0

  snap.docs.forEach(docSnap => {
    const data   = docSnap.data()
    const expiry = data.expirationDate?.toDate?.()
    if (!expiry) return

    const currentStatus = data.status || ''
    // Skip if already correctly categorised
    if (currentStatus === MOA_STATUSES.EXPIRED || currentStatus === MOA_STATUSES.EXPIRING) return
    // Skip already-expired statuses that were manually set
    if (currentStatus.startsWith('EXPIRED'))  return

    const ref = doc(db, 'moas', docSnap.id)

    if (expiry < now) {
      batch.update(ref, { status: MOA_STATUSES.EXPIRED, updatedAt: serverTimestamp() })
      count++
    } else if (expiry <= in60days) {
      batch.update(ref, { status: MOA_STATUSES.EXPIRING, updatedAt: serverTimestamp() })
      count++
    }
  })

  if (count > 0) await batch.commit()
  return count
}

// ─────────────────────────────────────────────────────────────
// RECENT MOAs (for dashboards)
// ─────────────────────────────────────────────────────────────

/** Get the N most recent MOAs (role-aware: admin sees deleted, faculty/student don't) */
export const getRecentMOAs = async (role, count = 6) => {
  const moasRef = collection(db, 'moas')
  let constraints = []
  if (role === 'faculty') constraints.push(where('isDeleted', '==', false))
  constraints.push(orderBy('createdAt', 'desc'))
  constraints.push(limit(count))
  const q = query(moasRef, ...constraints)
  const snap = await getDocs(q)
  return snap.docs.map(serializeDoc)
}

// ─────────────────────────────────────────────────────────────
// STATISTICS DATA (admin/faculty statistics page)
// ─────────────────────────────────────────────────────────────

/**
 * getStatisticsData — full analytics breakdown for the statistics page.
 * Fetches all MOAs (role-aware) then filters/aggregates client-side.
 * Filters: { college, dateFrom, dateTo }
 */
export const getStatisticsData = async (role, filters = {}) => {
  const moasRef = collection(db, 'moas')
  const constraints = []
  if (role !== 'admin') constraints.push(where('isDeleted', '==', false))

  const snap = await getDocs(query(moasRef, ...constraints))
  let docs = snap.docs.map(d => d.data())

  // Client-side filters
  if (filters.college) docs = docs.filter(d => d.endorsedByCollege === filters.college)
  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom + 'T00:00:00')
    docs = docs.filter(d => { const dt = d.effectiveDate?.toDate?.(); return dt && dt >= from })
  }
  if (filters.dateTo) {
    const to = new Date(filters.dateTo + 'T23:59:59')
    docs = docs.filter(d => { const dt = d.effectiveDate?.toDate?.(); return dt && dt <= to })
  }

  // Category totals
  const cats = { total: 0, approved: 0, processing: 0, expiring: 0, expired: 0, deleted: 0 }
  // Per-status counts
  const statusCounts = {}
  Object.values(MOA_STATUSES).forEach(s => { statusCounts[s] = 0 })
  // Per-industry counts
  const industryCounts = {}
  // Per-college counts
  const collegeCounts = {}
  // Monthly (last 12 months)
  const now = new Date()
  const months = []
  const monthMap = {}
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    months.push({ key, label, count: 0 })
    monthMap[key] = months.length - 1
  }

  docs.forEach(d => {
    cats.total++
    if (d.isDeleted) { cats.deleted++; return }
    const s = d.status || ''
    if (s.startsWith('APPROVED'))    cats.approved++
    else if (s.startsWith('PROCESSING')) cats.processing++
    else if (s.startsWith('EXPIRING'))   cats.expiring++
    else if (s.startsWith('EXPIRED'))    cats.expired++
    if (statusCounts[s] !== undefined) statusCounts[s]++
    if (d.industryType) industryCounts[d.industryType] = (industryCounts[d.industryType] || 0) + 1
    if (d.endorsedByCollege) collegeCounts[d.endorsedByCollege] = (collegeCounts[d.endorsedByCollege] || 0) + 1
    const ts = d.createdAt?.toDate?.()
    if (ts) {
      const key = `${ts.getFullYear()}-${ts.getMonth()}`
      if (monthMap[key] !== undefined) months[monthMap[key]].count++
    }
  })

  return { cats, statusCounts, industryCounts, collegeCounts, monthly: months }
}

// ─────────────────────────────────────────────────────────────
// MONTHLY SUBMISSIONS (admin chart)
// ─────────────────────────────────────────────────────────────

/** Returns count of MOAs created per month for last 6 months */
export const getMonthlySubmissions = async () => {
  const snap = await getDocs(query(collection(db, 'moas'), orderBy('createdAt', 'desc')))
  const docs = snap.docs.map(d => ({ createdAt: d.data().createdAt }))

  const now = new Date()
  const result = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      key:   `${d.getFullYear()}-${d.getMonth()}`,
      count: 0,
    })
  }

  docs.forEach(({ createdAt }) => {
    const ts = createdAt?.toDate?.()
    if (!ts) return
    const key = `${ts.getFullYear()}-${ts.getMonth()}`
    const entry = result.find(r => r.key === key)
    if (entry) entry.count++
  })

  return result
}

// ─────────────────────────────────────────────────────────────
// NOTES (per-MOA internal notes, admin/faculty only)
// ─────────────────────────────────────────────────────────────

/** Get all notes for an MOA, sorted newest first */
export const getNotes = async (moaId) => {
  const ref  = collection(db, 'moas', moaId, 'notes')
  const q    = query(ref, orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(serializeDoc)
}

/** Add a note to an MOA */
export const addNote = async (moaId, text, user) => {
  const ref = collection(db, 'moas', moaId, 'notes')
  await addDoc(ref, {
    text:       text.trim(),
    createdBy:  user.uid,
    createdByName: user.displayName || user.email,
    createdAt:  serverTimestamp(),
  })
}

// ─────────────────────────────────────────────────────────────
// MOA ID AUTO-GENERATION
// ─────────────────────────────────────────────────────────────

/** Generate next sequential MOA ID: MOA-{YEAR}-{4-digit} */
export const generateMOAId = async () => {
  const year   = new Date().getFullYear()
  const prefix = `MOA-${year}-`
  const snap   = await getDocs(collection(db, 'moas'))
  const nums   = snap.docs
    .map(d => d.data().hteId || '')
    .filter(id => id.startsWith(prefix))
    .map(id => parseInt(id.slice(prefix.length)) || 0)
  const next = (nums.length > 0 ? Math.max(...nums) : 0) + 1
  return `${prefix}${String(next).padStart(4, '0')}`
}
