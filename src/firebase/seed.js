/**
 * NEU MOA Monitor — Firestore Seed Script
 *
 * HOW TO RUN (one-time only):
 *   1. Open the app in the browser while logged in as an admin.
 *   2. Open the browser DevTools console (F12).
 *   3. The seed function is exposed on window.__seedNEUMOA().
 *      Type: await window.__seedNEUMOA()
 *   4. Wait for "Seed complete" in the console.
 *   5. Refresh the app — data will appear in all dashboards.
 *
 * To expose the function, temporarily import runSeed in main.jsx:
 *   import { runSeed } from './firebase/seed'
 *   window.__seedNEUMOA = runSeed
 *
 * Remove the import after seeding.
 */

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  Timestamp,
  writeBatch,
  doc,
} from 'firebase/firestore'
import { db } from './firebase'
import { MOA_STATUSES } from './firestore'

// ─── Date helpers ────────────────────────────────────────────
const ts = (date) => Timestamp.fromDate(date)
const daysAgo     = (n) => new Date(Date.now() - n * 86400000)
const daysFromNow = (n) => new Date(Date.now() + n * 86400000)

// System UID used as "createdBy" for seeded data
const SEED_UID  = 'SYSTEM_SEED'
const SEED_NAME = 'System Seed'

// ─── Seed data ───────────────────────────────────────────────
const SEED_MOAS = [
  // ── APPROVED ─────────────────────────────────────────────
  {
    hteId:             'HTE-2021-001',
    companyName:       'Globe Telecom Inc.',
    address:           'The Globe Tower, 32nd Street, Bonifacio Global City, Taguig',
    contactPerson:     'Maria Santos',
    contactEmail:      'msantos@globe.com.ph',
    industryType:      'Telecom',
    effectiveDate:     ts(daysAgo(365)),
    expirationDate:    ts(daysFromNow(730)),
    status:            MOA_STATUSES.APPROVED_SIGNED,
    endorsedByCollege: 'College of Engineering',
    description:       'Globe Telecom Inc. partners with NEU to provide Engineering students with telecommunications network operations exposure through structured on-the-job training programs.',
    isDeleted:         false,
    deletedAt:         null,
    deletedBy:         null,
    createdBy:         SEED_UID,
    updatedBy:         SEED_UID,
  },
  {
    hteId:             'HTE-2021-002',
    companyName:       'PLDT Inc.',
    address:           'PLDT Convergent Technologies Park, Cabuyao, Laguna',
    contactPerson:     'Jose dela Cruz',
    contactEmail:      'jdelacruz@pldt.com.ph',
    industryType:      'Telecom',
    effectiveDate:     ts(daysAgo(300)),
    expirationDate:    ts(daysFromNow(700)),
    status:            MOA_STATUSES.APPROVED_NOTARIZING,
    endorsedByCollege: 'College of Computer Studies',
    description:       'PLDT Inc. collaborates with NEU to give Computer Studies students real-world experience in enterprise IT infrastructure, network management, and digital innovation.',
    isDeleted:         false,
    deletedAt:         null,
    deletedBy:         null,
    createdBy:         SEED_UID,
    updatedBy:         SEED_UID,
  },
  {
    hteId:             'HTE-2022-003',
    companyName:       'IBM Philippines Inc.',
    address:           'ELJ Communications Center, Roxas Boulevard, Pasay City',
    contactPerson:     'Ana Reyes',
    contactEmail:      'areyes@ph.ibm.com',
    industryType:      'Technology',
    effectiveDate:     ts(daysAgo(400)),
    expirationDate:    ts(daysFromNow(600)),
    status:            MOA_STATUSES.APPROVED_SIGNED,
    endorsedByCollege: 'College of Computer Studies',
    description:       'IBM Philippines Inc. engages NEU students in cutting-edge technology projects spanning artificial intelligence, cloud computing, and enterprise software development.',
    isDeleted:         false,
    deletedAt:         null,
    deletedBy:         null,
    createdBy:         SEED_UID,
    updatedBy:         SEED_UID,
  },
  {
    hteId:             'HTE-2022-004',
    companyName:       'Microsoft Philippines Inc.',
    address:           '6750 Ayala Avenue, Makati City',
    contactPerson:     'Paolo Mendoza',
    contactEmail:      'pmendoza@microsoft.com',
    industryType:      'Technology',
    effectiveDate:     ts(daysAgo(200)),
    expirationDate:    ts(daysFromNow(800)),
    status:            MOA_STATUSES.APPROVED_NO_NOTARY,
    endorsedByCollege: 'College of Engineering',
    description:       'Microsoft Philippines Inc. partners with NEU to offer Engineering students immersive exposure to cloud platforms, software engineering practices, and digital transformation initiatives.',
    isDeleted:         false,
    deletedAt:         null,
    deletedBy:         null,
    createdBy:         SEED_UID,
    updatedBy:         SEED_UID,
  },
  {
    hteId:             'HTE-2023-005',
    companyName:       'Dell Technologies Philippines',
    address:           'Bonifacio High Street, BGC, Taguig City',
    contactPerson:     'Carmela Bautista',
    contactEmail:      'cbautista@dell.com',
    industryType:      'Technology',
    effectiveDate:     ts(daysAgo(180)),
    expirationDate:    ts(daysFromNow(545)),
    status:            MOA_STATUSES.APPROVED_SIGNED,
    endorsedByCollege: 'College of Engineering',
    description:       'Dell Technologies Philippines provides NEU Engineering students with hands-on internship experience in hardware engineering, IT infrastructure, and enterprise solutions delivery.',
    isDeleted:         false,
    deletedAt:         null,
    deletedBy:         null,
    createdBy:         SEED_UID,
    updatedBy:         SEED_UID,
  },
  {
    hteId:             'HTE-2023-006',
    companyName:       'Sun Life of Canada Philippines',
    address:           '5th Avenue corner Rizal Drive, BGC, Taguig City',
    contactPerson:     'Ricardo Lim',
    contactEmail:      'rlim@sunlife.com.ph',
    industryType:      'Finance',
    effectiveDate:     ts(daysAgo(150)),
    expirationDate:    ts(daysFromNow(580)),
    status:            MOA_STATUSES.APPROVED_NOTARIZING,
    endorsedByCollege: 'College of Business Administration',
    description:       'Sun Life of Canada Philippines partners with NEU to provide Business Administration students with practical training in financial planning, insurance services, and wealth management.',
    isDeleted:         false,
    deletedAt:         null,
    deletedBy:         null,
    createdBy:         SEED_UID,
    updatedBy:         SEED_UID,
  },

  // ── PROCESSING ────────────────────────────────────────────
  {
    hteId:             'HTE-2024-007',
    companyName:       'Jollibee Foods Corporation',
    address:           '10 Jollibee Plaza, F. Ortigas Jr. Road, Ortigas Center, Pasig City',
    contactPerson:     'Liza Tan',
    contactEmail:      'ltan@jollibee.com.ph',
    industryType:      'Food',
    effectiveDate:     ts(daysAgo(30)),
    expirationDate:    ts(daysFromNow(1095)),
    status:            MOA_STATUSES.PROCESSING_AWAITING,
    endorsedByCollege: 'College of Hotel and Restaurant Management',
    description:       'Jollibee Foods Corporation engages NEU Hotel and Restaurant Management students in food service operations, kitchen management, and quality assurance training.',
    isDeleted:         false,
    deletedAt:         null,
    deletedBy:         null,
    createdBy:         SEED_UID,
    updatedBy:         SEED_UID,
  },
  {
    hteId:             'HTE-2024-008',
    companyName:       'SM Investments Corporation',
    address:           'SM Corporate Offices, Reclamation Area, Pasay City',
    contactPerson:     'Eduardo Sy',
    contactEmail:      'esy@sminvestments.com',
    industryType:      'Finance',
    effectiveDate:     ts(daysAgo(20)),
    expirationDate:    ts(daysFromNow(1095)),
    status:            MOA_STATUSES.PROCESSING_LEGAL,
    endorsedByCollege: 'College of Business Administration',
    description:       'SM Investments Corporation partners with NEU to expose Business Administration students to large-scale retail finance, corporate strategy, and investment portfolio management.',
    isDeleted:         false,
    deletedAt:         null,
    deletedBy:         null,
    createdBy:         SEED_UID,
    updatedBy:         SEED_UID,
  },
  {
    hteId:             'HTE-2024-009',
    companyName:       'BDO Unibank Inc.',
    address:           'BDO Corporate Center, Makati Ave., Makati City',
    contactPerson:     'Theresa Go',
    contactEmail:      'tgo@bdo.com.ph',
    industryType:      'Finance',
    effectiveDate:     ts(daysAgo(10)),
    expirationDate:    ts(daysFromNow(1095)),
    status:            MOA_STATUSES.PROCESSING_VPAA,
    endorsedByCollege: 'College of Business Administration',
    description:       'BDO Unibank Inc. provides NEU Business Administration students with comprehensive training in retail and corporate banking operations, credit analysis, and financial services.',
    isDeleted:         false,
    deletedAt:         null,
    deletedBy:         null,
    createdBy:         SEED_UID,
    updatedBy:         SEED_UID,
  },
  {
    hteId:             'HTE-2024-010',
    companyName:       'Grab Philippines Inc.',
    address:           'Grab Philippines, Bonifacio Global City, Taguig',
    contactPerson:     'Jerome Cruz',
    contactEmail:      'jcruz@grab.com',
    industryType:      'Technology',
    effectiveDate:     ts(daysAgo(5)),
    expirationDate:    ts(daysFromNow(1095)),
    status:            MOA_STATUSES.PROCESSING_AWAITING,
    endorsedByCollege: 'College of Computer Studies',
    description:       'Grab Philippines Inc. collaborates with NEU to immerse Computer Studies students in platform engineering, data science, and mobile application development within a high-growth tech environment.',
    isDeleted:         false,
    deletedAt:         null,
    deletedBy:         null,
    createdBy:         SEED_UID,
    updatedBy:         SEED_UID,
  },

  // ── EXPIRING (within 60 days) ─────────────────────────────
  {
    hteId:             'HTE-2022-011',
    companyName:       'Concentrix Philippines',
    address:           'Cybergate Tower, Pioneer Street, Mandaluyong City',
    contactPerson:     'Grace Villanueva',
    contactEmail:      'gvillanueva@concentrix.com',
    industryType:      'Services',
    effectiveDate:     ts(daysAgo(700)),
    expirationDate:    ts(daysFromNow(45)),
    status:            MOA_STATUSES.EXPIRING,
    endorsedByCollege: 'College of Computer Studies',
    description:       'Concentrix Philippines partners with NEU to provide Computer Studies students with practical exposure to business process outsourcing, customer experience management, and digital service operations.',
    isDeleted:         false,
    deletedAt:         null,
    deletedBy:         null,
    createdBy:         SEED_UID,
    updatedBy:         SEED_UID,
  },
  {
    hteId:             'HTE-2021-012',
    companyName:       'Convergys Philippines Services Corp.',
    address:           'Robinsons Summit Center, Ayala Avenue, Makati City',
    contactPerson:     'Benjamin Aquino',
    contactEmail:      'baquino@convergys.com',
    industryType:      'Services',
    effectiveDate:     ts(daysAgo(690)),
    expirationDate:    ts(daysFromNow(55)),
    status:            MOA_STATUSES.EXPIRING,
    endorsedByCollege: 'College of Arts and Sciences',
    description:       'Convergys Philippines Services Corp. engages NEU Arts and Sciences students in customer relations management and communications-focused internship programs.',
    isDeleted:         false,
    deletedAt:         null,
    deletedBy:         null,
    createdBy:         SEED_UID,
    updatedBy:         SEED_UID,
  },

  // ── EXPIRED ───────────────────────────────────────────────
  {
    hteId:             'HTE-2020-013',
    companyName:       'Accenture Inc.',
    address:           '6788 Ayala Avenue, Makati City',
    contactPerson:     'Florence Navarro',
    contactEmail:      'fnavarro@accenture.com',
    industryType:      'Services',
    effectiveDate:     ts(daysAgo(1095)),
    expirationDate:    ts(daysAgo(180)),
    status:            MOA_STATUSES.EXPIRED,
    endorsedByCollege: 'College of Computer Studies',
    description:       'Accenture Inc. partners with NEU to provide Computer Studies students with internship opportunities in management consulting, technology implementation, and digital transformation projects.',
    isDeleted:         false,
    deletedAt:         null,
    deletedBy:         null,
    createdBy:         SEED_UID,
    updatedBy:         SEED_UID,
  },
  {
    hteId:             'HTE-2019-014',
    companyName:       'Robinsons Land Corporation',
    address:           'Galleria Corporate Center, EDSA corner Ortigas Ave., Quezon City',
    contactPerson:     'Henry Gokongwei',
    contactEmail:      'hgokongwei@robinsonsland.com',
    industryType:      'Services',
    effectiveDate:     ts(daysAgo(1200)),
    expirationDate:    ts(daysAgo(300)),
    status:            MOA_STATUSES.EXPIRED,
    endorsedByCollege: 'College of Architecture',
    description:       'Robinsons Land Corporation collaborates with NEU Architecture students through exposure to large-scale commercial real estate development, mall design, and construction project management.',
    isDeleted:         false,
    deletedAt:         null,
    deletedBy:         null,
    createdBy:         SEED_UID,
    updatedBy:         SEED_UID,
  },

  // ── SOFT-DELETED (admin recovery testing) ─────────────────
  {
    hteId:             'HTE-2020-015',
    companyName:       'Maxicare Healthcare Corporation',
    address:           '2281 Pasong Tamo Extension, Makati City',
    contactPerson:     'Sandra Uy',
    contactEmail:      'suy@maxicare.com.ph',
    industryType:      'Services',
    effectiveDate:     ts(daysAgo(900)),
    expirationDate:    ts(daysAgo(120)),
    status:            MOA_STATUSES.EXPIRED,
    endorsedByCollege: 'College of Nursing',
    description:       'Maxicare Healthcare Corporation partners with NEU Nursing students to deliver hands-on clinical exposure in managed health care services, patient coordination, and medical insurance operations.',
    isDeleted:         true,
    deletedAt:         ts(daysAgo(90)),
    deletedBy:         SEED_UID,
    createdBy:         SEED_UID,
    updatedBy:         SEED_UID,
  },
  {
    hteId:             'HTE-2021-016',
    companyName:       'Eastern Telecommunications Philippines',
    address:           'Eastern Telecom Building, Buendia Avenue, Makati City',
    contactPerson:     'Roberto Coyiuto',
    contactEmail:      'rcoyiuto@eastern.com.ph',
    industryType:      'Telecom',
    effectiveDate:     ts(daysAgo(500)),
    expirationDate:    ts(daysFromNow(365)),
    status:            MOA_STATUSES.PROCESSING_LEGAL,
    endorsedByCollege: 'College of Engineering',
    description:       'Eastern Telecommunications Philippines engages NEU Engineering students in telecommunications infrastructure deployment, network operations, and enterprise connectivity solutions.',
    isDeleted:         true,
    deletedAt:         ts(daysAgo(60)),
    deletedBy:         SEED_UID,
    createdBy:         SEED_UID,
    updatedBy:         SEED_UID,
  },
  {
    hteId:             'HTE-2022-017',
    companyName:       'Jollibee Food Corporation — Commissary',
    address:           'Jollibee Foods Complex, Canlubang Industrial Estate, Calamba, Laguna',
    contactPerson:     'Ernesto Tanmantiong',
    contactEmail:      'etanmantiong@jollibee.com.ph',
    industryType:      'Food',
    effectiveDate:     ts(daysAgo(600)),
    expirationDate:    ts(daysFromNow(400)),
    status:            MOA_STATUSES.APPROVED_SIGNED,
    endorsedByCollege: 'College of Hotel and Restaurant Management',
    description:       'Jollibee Foods Corporation Commissary provides NEU Hotel and Restaurant Management students with training in large-scale food production, quality control, and supply chain management.',
    isDeleted:         true,
    deletedAt:         ts(daysAgo(30)),
    deletedBy:         SEED_UID,
    createdBy:         SEED_UID,
    updatedBy:         SEED_UID,
  },
  // ── Additional APPROVED to reach 4 SIGNED / 3 NOTARIZING / 3 NO_NOTARY ──
  {
    hteId:             'HTE-2023-016A',
    companyName:       'Jollibee Foods Corporation — Training Division',
    address:           'Jollibee Plaza, F. Ortigas Jr. Road, Ortigas Center, Pasig City',
    contactPerson:     'Marie Tolentino',
    contactEmail:      'mtolentino@jollibee.com.ph',
    industryType:      'Food',
    effectiveDate:     ts(daysAgo(250)),
    expirationDate:    ts(daysFromNow(1095)),
    status:            MOA_STATUSES.APPROVED_SIGNED,
    endorsedByCollege: 'College of Nursing',
    description:       'Jollibee Foods Corporation Training Division partners with NEU to support student development through structured training in food safety, nutritional standards, and healthcare food service management.',
    isDeleted:         false,
    deletedAt:         null,
    deletedBy:         null,
    createdBy:         SEED_UID,
    updatedBy:         SEED_UID,
  },
  {
    hteId:             'HTE-2023-017A',
    companyName:       'Ateneo de Manila University Hospital',
    address:           'Katipunan Avenue, Loyola Heights, Quezon City',
    contactPerson:     'Dr. Elena Mercado',
    contactEmail:      'emercado@admuhosp.edu.ph',
    industryType:      'Services',
    effectiveDate:     ts(daysAgo(220)),
    expirationDate:    ts(daysFromNow(1095)),
    status:            MOA_STATUSES.APPROVED_NOTARIZING,
    endorsedByCollege: 'College of Education',
    description:       'Ateneo de Manila University Hospital collaborates with NEU College of Education to provide student-teachers with clinical observation hours and healthcare education practicum opportunities.',
    isDeleted:         false,
    deletedAt:         null,
    deletedBy:         null,
    createdBy:         SEED_UID,
    updatedBy:         SEED_UID,
  },
  {
    hteId:             'HTE-2023-018A',
    companyName:       'Ayala Malls Philippines Inc.',
    address:           'Ayala Center, Makati City',
    contactPerson:     'Rafael Zobel',
    contactEmail:      'rzobel@ayalamalls.com.ph',
    industryType:      'Services',
    effectiveDate:     ts(daysAgo(190)),
    expirationDate:    ts(daysFromNow(1095)),
    status:            MOA_STATUSES.APPROVED_NO_NOTARY,
    endorsedByCollege: 'College of Education',
    description:       'Ayala Malls Philippines Inc. partners with NEU College of Education to offer students practical immersion in retail management, consumer services, and corporate social responsibility programs.',
    isDeleted:         false,
    deletedAt:         null,
    deletedBy:         null,
    createdBy:         SEED_UID,
    updatedBy:         SEED_UID,
  },
  // ── Smart Communications ───────────────────────────────────
  {
    hteId:             'HTE-2023-018',
    companyName:       'Smart Communications Inc.',
    address:           'Smart Tower, 6799 Ayala Avenue, Makati City',
    contactPerson:     'Katrina Ramos',
    contactEmail:      'kramos@smart.com.ph',
    industryType:      'Telecom',
    effectiveDate:     ts(daysAgo(100)),
    expirationDate:    ts(daysFromNow(900)),
    status:            MOA_STATUSES.APPROVED_NO_NOTARY,
    endorsedByCollege: 'College of Engineering',
    description:       'Smart Communications Inc. partners with NEU to provide Engineering students with industry exposure in wireless network engineering, telecommunications research, and 5G technology deployment.',
    isDeleted:         false,
    deletedAt:         null,
    deletedBy:         null,
    createdBy:         SEED_UID,
    updatedBy:         SEED_UID,
  },
]

// ─────────────────────────────────────────────────────────────
// CLEANUP — hard-delete ALL moa docs + sub-collections
// ─────────────────────────────────────────────────────────────

export const cleanupMOAs = async () => {
  console.log('[NEU CLEANUP] Scanning moas collection...')
  const moasRef = collection(db, 'moas')
  const snap = await getDocs(moasRef)

  if (snap.empty) {
    console.log('[NEU CLEANUP] Nothing to delete — collection is already empty.')
    return 0
  }

  let deleted = 0
  for (const moaDoc of snap.docs) {
    // Delete auditTrail sub-collection
    const auditSnap = await getDocs(collection(db, 'moas', moaDoc.id, 'auditTrail'))
    for (const entry of auditSnap.docs) {
      await deleteDoc(entry.ref)
    }
    // Delete notes sub-collection
    const notesSnap = await getDocs(collection(db, 'moas', moaDoc.id, 'notes'))
    for (const note of notesSnap.docs) {
      await deleteDoc(note.ref)
    }
    // Delete the MOA document itself
    await deleteDoc(moaDoc.ref)
    deleted++
    console.log(`[NEU CLEANUP]  ✓ Deleted ${moaDoc.id} — ${moaDoc.data().companyName || '(no name)'}`)
  }

  console.log(`[NEU CLEANUP] Done. Deleted ${deleted} MOA document(s).`)
  return deleted
}

// ─────────────────────────────────────────────────────────────
// MAIN SEED RUNNER
// ─────────────────────────────────────────────────────────────

export const runSeed = async () => {
  // Guard: abort if data already exists
  const existingSnap = await getDocs(collection(db, 'moas'))
  if (!existingSnap.empty) {
    console.warn(
      `[NEU SEED] Seed aborted — data already exists (${existingSnap.size} docs found). ` +
      'Run cleanup first before reseeding: await window.__cleanupNEUMOA()'
    )
    return { success: 0, failed: 0, aborted: true }
  }

  console.log('[NEU SEED] Starting seed — inserting', SEED_MOAS.length, 'MOAs...')

  const moasRef = collection(db, 'moas')
  const now     = Timestamp.now()

  let success = 0
  let failed  = 0

  for (const moa of SEED_MOAS) {
    try {
      const payload = {
        ...moa,
        createdAt: now,
        updatedAt: now,
      }
      const ref = await addDoc(moasRef, payload)

      // Write a seed audit entry
      const auditRef = collection(db, 'moas', ref.id, 'auditTrail')
      await addDoc(auditRef, {
        performedBy:     SEED_UID,
        performedByName: SEED_NAME,
        operation:       'INSERT',
        timestamp:       now,
        changes:         { new: { companyName: moa.companyName, status: moa.status } },
      })

      console.log(`[NEU SEED]  ✓ ${moa.hteId} — ${moa.companyName}`)
      success++
    } catch (err) {
      console.error(`[NEU SEED]  ✗ ${moa.hteId} — ${moa.companyName}:`, err.message)
      failed++
    }
  }

  console.log(`[NEU SEED] Complete: ${success} inserted, ${failed} failed.`)
  return { success, failed }
}

// ─────────────────────────────────────────────────────────────
// PATCH: add description to existing MOA docs
// ─────────────────────────────────────────────────────────────

const DESCRIPTION_MAP = {
  'HTE-2021-001': 'Globe Telecom Inc. partners with NEU to provide Engineering students with telecommunications network operations exposure through structured on-the-job training programs.',
  'HTE-2021-002': 'PLDT Inc. collaborates with NEU to give Computer Studies students real-world experience in enterprise IT infrastructure, network management, and digital innovation.',
  'HTE-2022-003': 'IBM Philippines Inc. engages NEU students in cutting-edge technology projects spanning artificial intelligence, cloud computing, and enterprise software development.',
  'HTE-2022-004': 'Microsoft Philippines Inc. partners with NEU to offer Engineering students immersive exposure to cloud platforms, software engineering practices, and digital transformation initiatives.',
  'HTE-2023-005': 'Dell Technologies Philippines provides NEU Engineering students with hands-on internship experience in hardware engineering, IT infrastructure, and enterprise solutions delivery.',
  'HTE-2023-006': 'Sun Life of Canada Philippines partners with NEU to provide Business Administration students with practical training in financial planning, insurance services, and wealth management.',
  'HTE-2024-007': 'Jollibee Foods Corporation engages NEU Hotel and Restaurant Management students in food service operations, kitchen management, and quality assurance training.',
  'HTE-2024-008': 'SM Investments Corporation partners with NEU to expose Business Administration students to large-scale retail finance, corporate strategy, and investment portfolio management.',
  'HTE-2024-009': 'BDO Unibank Inc. provides NEU Business Administration students with comprehensive training in retail and corporate banking operations, credit analysis, and financial services.',
  'HTE-2024-010': 'Grab Philippines Inc. collaborates with NEU to immerse Computer Studies students in platform engineering, data science, and mobile application development within a high-growth tech environment.',
  'HTE-2022-011': 'Concentrix Philippines partners with NEU to provide Computer Studies students with practical exposure to business process outsourcing, customer experience management, and digital service operations.',
  'HTE-2021-012': 'Convergys Philippines Services Corp. engages NEU Arts and Sciences students in customer relations management and communications-focused internship programs.',
  'HTE-2020-013': 'Accenture Inc. partners with NEU to provide Computer Studies students with internship opportunities in management consulting, technology implementation, and digital transformation projects.',
  'HTE-2019-014': 'Robinsons Land Corporation collaborates with NEU Architecture students through exposure to large-scale commercial real estate development, mall design, and construction project management.',
  'HTE-2020-015': 'Maxicare Healthcare Corporation partners with NEU Nursing students to deliver hands-on clinical exposure in managed health care services, patient coordination, and medical insurance operations.',
  'HTE-2021-016': 'Eastern Telecommunications Philippines engages NEU Engineering students in telecommunications infrastructure deployment, network operations, and enterprise connectivity solutions.',
  'HTE-2022-017': 'Jollibee Foods Corporation Commissary provides NEU Hotel and Restaurant Management students with training in large-scale food production, quality control, and supply chain management.',
  'HTE-2023-016A': 'Jollibee Foods Corporation Training Division partners with NEU to support student development through structured training in food safety, nutritional standards, and healthcare food service management.',
  'HTE-2023-017A': 'Ateneo de Manila University Hospital collaborates with NEU College of Education to provide student-teachers with clinical observation hours and healthcare education practicum opportunities.',
  'HTE-2023-018A': 'Ayala Malls Philippines Inc. partners with NEU College of Education to offer students practical immersion in retail management, consumer services, and corporate social responsibility programs.',
  'HTE-2023-018': 'Smart Communications Inc. partners with NEU to provide Engineering students with industry exposure in wireless network engineering, telecommunications research, and 5G technology deployment.',
}

export const patchDescriptions = async () => {
  const { getDocs } = await import('firebase/firestore')
  const snap = await getDocs(collection(db, 'moas'))
  const batch = writeBatch(db)
  let count = 0
  snap.docs.forEach(docSnap => {
    const data = docSnap.data()
    if (data.description) return // already has one
    const desc = DESCRIPTION_MAP[data.hteId]
    if (!desc) return
    batch.update(doc(db, 'moas', docSnap.id), { description: desc })
    count++
  })
  if (count > 0) await batch.commit()
  console.log(`[NEU PATCH] Updated ${count} MOA docs with descriptions.`)
  return count
}
