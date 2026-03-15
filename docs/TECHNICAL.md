# Technical Documentation — NEU MOA Monitoring System

## Table of Contents
- [Firestore Schema](#firestore-schema)
- [Security Rules](#security-rules)
- [Role Permission Matrix](#role-permission-matrix)
- [Data Flow](#data-flow)
- [Auto-Expiry Logic](#auto-expiry-logic)
- [Audit Trail System](#audit-trail-system)
- [File Attachment System](#file-attachment-system)
- [Known Limitations & Future Improvements](#known-limitations--future-improvements)

---

## Firestore Schema

### Collection: `users`

| Field | Type | Description |
|-------|------|-------------|
| `uid` | `string` | Firebase Auth UID |
| `email` | `string` | User email address |
| `displayName` | `string` | Full name |
| `role` | `string` | `admin` \| `faculty` \| `student` |
| `college` | `string` | College affiliation (faculty/student) |
| `isActive` | `boolean` | Whether the account is enabled |
| `createdAt` | `Timestamp` | Account creation timestamp |
| `lastLogin` | `Timestamp` | Last authenticated session |

---

### Collection: `moas`

| Field | Type | Description |
|-------|------|-------------|
| `companyName` | `string` | Name of partner institution/company |
| `hteId` | `string` | Unique HTE (Higher Training Establishment) ID |
| `industry` | `string` | Industry classification |
| `endorsedByCollege` | `string` | NEU college that endorsed the MOA |
| `description` | `string` | Brief description of the partnership |
| `status` | `string` | One of 8 MOA status values (see below) |
| `effectivityDate` | `string` | Date MOA takes effect (`YYYY-MM-DD`) |
| `expiryDate` | `string` | Date MOA expires (`YYYY-MM-DD`) |
| `slots` | `number` | Number of available student slots |
| `contactPerson` | `string` | Primary contact at the partner company |
| `contactEmail` | `string` | Contact email |
| `contactPhone` | `string` | Contact phone number |
| `address` | `string` | Company address |
| `notes` | `string` | General notes (legacy inline field) |
| `isDeleted` | `boolean` | Soft-delete flag |
| `createdAt` | `Timestamp` | Record creation timestamp |
| `updatedAt` | `Timestamp` | Last update timestamp |
| `createdBy` | `string` | UID of creator |
| `updatedBy` | `string` | UID of last editor |

#### MOA Status Values

| Status | Category | Meaning |
|--------|----------|---------|
| `PROCESSING – Pending Review` | Processing | Submitted, awaiting initial review |
| `PROCESSING – Under Evaluation` | Processing | Actively being evaluated |
| `PROCESSING – For Signing` | Processing | Approved, awaiting signatures |
| `APPROVED – Active` | Approved | Fully executed, currently active |
| `APPROVED – On Hold` | Approved | Active but temporarily suspended |
| `EXPIRING – Renewal Pending` | Expiring | Within 90 days of expiry, renewal initiated |
| `EXPIRING – Final Notice` | Expiring | Within 30 days of expiry, urgent renewal |
| `EXPIRED` | Expired | Past expiry date, no longer active |

---

### Sub-collection: `moas/{moaId}/auditTrail`

Each document represents one audit event.

| Field | Type | Description |
|-------|------|-------------|
| `operation` | `string` | `INSERT` \| `UPDATE` \| `DELETE` |
| `performedBy` | `string` | UID of the user who made the change |
| `performedByName` | `string` | Display name of the user |
| `performedByRole` | `string` | Role of the user at time of action |
| `timestamp` | `Timestamp` | When the action occurred |
| `changes.old` | `object` | Snapshot of fields before change |
| `changes.new` | `object` | Snapshot of fields after change |

---

### Sub-collection: `moas/{moaId}/notes`

Each document represents one admin/faculty note.

| Field | Type | Description |
|-------|------|-------------|
| `text` | `string` | Note content |
| `authorId` | `string` | UID of note author |
| `authorName` | `string` | Display name of author |
| `authorRole` | `string` | Role of author |
| `createdAt` | `Timestamp` | When the note was created |

---

## Security Rules

> Firestore security rules are defined in `firestore.rules`.

### Summary of Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can read their own profile; admins can read all
    match /users/{userId} {
      allow read: if request.auth != null &&
        (request.auth.uid == userId || isAdmin());
      allow write: if isAdmin();
    }

    // MOAs: students read non-deleted; faculty/admin read all; admin writes
    match /moas/{moaId} {
      allow read: if request.auth != null &&
        (isAdmin() || isFaculty() || isStudent());
      allow create, update, delete: if isAdmin() || isFaculty();

      // Audit trail: read by faculty/admin, write by system
      match /auditTrail/{entryId} {
        allow read: if isAdmin() || isFaculty();
        allow write: if isAdmin() || isFaculty();
      }

      // Notes: faculty/admin read and write
      match /notes/{noteId} {
        allow read, write: if isAdmin() || isFaculty();
      }
    }

    function isAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    function isFaculty() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'faculty';
    }
    function isStudent() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'student';
    }
  }
}
```

---

## Role Permission Matrix

| Action | Admin | Faculty | Student |
|--------|:-----:|:-------:|:-------:|
| View all MOAs | ✅ | ✅ | ✅ (approved only) |
| View MOA detail panel | ✅ | ✅ | ✅ (modal) |
| Add new MOA | ✅ | ✅ | ❌ |
| Edit MOA | ✅ | ✅ | ❌ |
| Delete MOA (soft) | ✅ | ❌ | ❌ |
| Change MOA status | ✅ | ✅ | ❌ |
| Renew MOA | ✅ | ✅ | ❌ |
| View audit trail | ✅ | ✅ | ❌ |
| Add notes | ✅ | ✅ | ❌ |
| View statistics | ✅ | ✅ | ❌ |
| View student directory | ✅ | ✅ | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| Seed/reset database | ✅ | ❌ | ❌ |
| Export to PDF | ✅ | ✅ | ❌ |

---

## Data Flow

### MOA Creation Flow

```
User (Admin/Faculty)
  │
  ▼
MOAModal.jsx (form input + validation)
  │
  ├─→ addMOA() [src/firebase/moas.js]
  │     ├─→ addDoc(collection(db, 'moas'), payload)
  │     └─→ addDoc(auditTrail, { operation: 'INSERT', changes: { new: payload } })
  │
  └─→ Toast notification → Panel auto-opens on new MOA
```

### Real-Time Sync Flow

```
Firestore (moas collection)
  │
  ▼
onSnapshot listener [MOARecords.jsx / Dashboard.jsx]
  │
  ├─→ filters: isDeleted=false, role-based
  ├─→ setState(moas) → triggers re-render
  └─→ UI updates automatically (no manual refresh needed)
```

### Status Update Flow

```
User clicks status dropdown in MOADetailPanel
  │
  ▼
updateMOA(id, { status: newStatus }, user, prevMoa)
  │
  ├─→ updateDoc(doc(db, 'moas', id), { status, updatedAt, updatedBy })
  └─→ addDoc(auditTrail, {
        operation: 'UPDATE',
        changes: {
          old: { status: prevStatus },
          new: { status: newStatus }
        }
      })
```

### MOA Renewal Flow

```
User clicks "↻ Renew MOA" on EXPIRING/EXPIRED MOA
  │
  ▼
MOAModal opens pre-filled with renewFrom data
  │
  ▼
User adjusts dates/details → Submit
  │
  ├─→ addMOA(newPayload)          ← creates new MOA record
  └─→ updateMOA(renewFrom.id,     ← marks old MOA as EXPIRED
        { status: 'EXPIRED' })
```

---

## Auto-Expiry Logic

The system does **not** currently use a Cloud Function for auto-expiry. Instead, expiry awareness is handled client-side via computed status display.

MOAs with `expiryDate` within 90 days of today are candidates for manual status update to `EXPIRING – Renewal Pending`. The admin/faculty is responsible for updating the status manually.

**Future improvement:** A Firebase Cloud Function scheduled to run daily could auto-transition MOA statuses:

```
Scheduled Cloud Function (daily, 00:00 PHT)
  │
  ├─→ Query moas where expiryDate < now()
  │     └─→ Batch update status → 'EXPIRED'
  │
  └─→ Query moas where expiryDate < now() + 90 days
        └─→ Batch update status → 'EXPIRING – Renewal Pending'
```

---

## Audit Trail System

Every mutation to a MOA document generates an immutable audit entry in the sub-collection `moas/{moaId}/auditTrail`.

### Entry Types

| Operation | When Triggered | Contents |
|-----------|---------------|----------|
| `INSERT` | MOA created | `changes.new` = full document snapshot |
| `UPDATE` | Any field edited | `changes.old` + `changes.new` = changed fields only |
| `DELETE` | Soft delete (isDeleted=true) | `changes.old.isDeleted=false`, `changes.new.isDeleted=true` |

### Status Timeline Derivation

The `MOADetailPanel` derives a chronological status timeline from the audit trail using `useMemo`:

1. All audit entries are loaded via `onSnapshot` on mount
2. Entries are reversed (oldest → newest)
3. `INSERT` entries contribute the initial status
4. `UPDATE` entries where `old.status !== new.status` contribute status changes
5. Rendered as a vertical timeline with color-coded dots

---

## File Attachment System

> **Status:** Planned — not yet implemented.

### Intended Design

Each MOA can have one PDF attachment stored in Firebase Storage.

**Storage path:** `moa-documents/{moaId}/{filename}.pdf`

**Firestore field:** `attachmentUrl: string` (download URL stored on MOA document)

### Upload Flow (Planned)

```
User selects PDF in MOAModal
  │
  ▼
uploadBytes(ref(storage, `moa-documents/${moaId}/${file.name}`), file)
  │
  ▼
getDownloadURL(uploadRef) → stored as moa.attachmentUrl
  │
  ▼
"View MOA Document" button renders in MOADetailPanel
  └─→ Opens URL in new tab
```

---

## Known Limitations & Future Improvements

### Current Limitations

| Limitation | Impact |
|------------|--------|
| No Cloud Functions | Auto-expiry and email notifications require manual action |
| Client-side filtering | Large datasets (1000+ MOAs) may slow render |
| No offline support | Firestore offline persistence not enabled |
| No file attachments | PDF documents cannot be uploaded yet |
| Statistics page uses `getDocs` | Not real-time; requires manual refresh |
| No mobile-optimized modals | Modals not full-screen on small viewports |
| No college registry admin page | College list is currently hardcoded |
| No export to PDF | jsPDF integration planned but not implemented |

### Planned Improvements

- [ ] Firebase Cloud Functions for scheduled auto-expiry
- [ ] Email notifications via Firebase Extensions (Trigger Email)
- [ ] PDF upload per MOA (Firebase Storage)
- [ ] Export to PDF (jsPDF with NEU header)
- [ ] College Registry admin page (CRUD for college list)
- [ ] Mobile-responsive modals (`@media max-width: 767px`)
- [ ] Animated stat counters on admin dashboard
- [ ] Convert Statistics page to `onSnapshot`
- [ ] Full audit trail viewer with per-MOA filtering
- [ ] Progressive Web App (PWA) support
