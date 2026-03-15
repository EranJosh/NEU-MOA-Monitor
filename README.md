<div align="center">

# NEU MOA Monitoring System

**A full-stack web application for tracking and managing Memoranda of Agreement at New Era University**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Firebase](https://img.shields.io/badge/Firebase-10-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![React Router](https://img.shields.io/badge/React_Router-v6-CA4245?style=flat-square&logo=reactrouter&logoColor=white)](https://reactrouter.com)
[![Recharts](https://img.shields.io/badge/Recharts-2-22b5bf?style=flat-square)](https://recharts.org)
[![Deployed on Firebase](https://img.shields.io/badge/Deployed%20on-Firebase%20Hosting-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://pe-moa-monitor.web.app)
[![Status](https://img.shields.io/badge/Status-Live-brightgreen?style=flat-square)](https://pe-moa-monitor.web.app)

[Live Demo](https://pe-moa-monitor.web.app) · [Technical Docs](docs/TECHNICAL.md) · [Screenshots](docs/screenshots/)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features by Role](#features-by-role)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Screenshots](#screenshots)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [MOA Status Reference](#moa-status-reference)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Author](#author)
- [Acknowledgements](#acknowledgements)

---

## Overview

The **NEU MOA Monitoring System** is a role-based web platform designed to streamline the lifecycle management of Memoranda of Agreement (MOAs) at New Era University. MOAs are formal partnership agreements between the university and external companies or institutions that open internship and training opportunities for students.

Before this system, MOA records were tracked manually through spreadsheets — prone to version conflicts, status ambiguity, and lack of visibility. This application centralizes the entire process: from initial partnership processing to expiry and renewal.

### Why It Was Built

Professional Elective 2 presented an opportunity to build something with real institutional value. The OJT Coordinator's office at NEU manages dozens of active MOAs across multiple colleges, and a unified digital system was a clear gap. This project addresses that directly.

### Who Uses It

| Role | Description |
|------|-------------|
| **Admin** | OJT coordinators and registrars with full system access — manage MOAs, users, and all records |
| **Faculty** | College representatives who can view, add, and update MOAs relevant to their endorsing college |
| **Student** | OJT students who can browse approved partner companies and view partnership details |

---

## Features by Role

### Admin
- Full CRUD on all MOA records across all colleges
- Add, edit, and soft-delete MOA entries (records are never permanently lost)
- Update MOA status through the full 8-stage lifecycle
- Renew expiring/expired MOAs (creates new record, archives old automatically)
- View complete, immutable audit trail per MOA (every change logged with before/after)
- View chronological status timeline derived from audit history
- Add internal notes to MOA records
- Manage all user accounts (create, deactivate, reassign roles)
- View statistics dashboard with charts (by status, college, industry)
- View and manage student directory
- Seed and reset the database (dev/demo mode)

### Faculty
- View all MOA records with advanced filtering (status, college, industry, keyword search)
- Add new MOA records for their college
- Edit existing MOA entries and update statuses
- Trigger renewal workflow on expiring or expired MOAs
- View audit trail and add internal notes per MOA
- Access statistics dashboard and student directory

### Student
- Browse all **approved** MOA partner companies
- Filter by industry with live counts
- View full partnership details in a dedicated modal (description, contact info, slots, logistics)
- See 2-line partnership description preview on each card

---

## Tech Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| **React** | UI component library | 18 |
| **Vite** | Build tool and dev server | 5 |
| **React Router** | Client-side routing with role guards | v6 |
| **Firebase Auth** | Authentication (email/password) | 10 |
| **Firestore** | Real-time NoSQL database with sub-collections | 10 |
| **Firebase Storage** | File attachment storage (planned) | 10 |
| **Firebase Hosting** | Static site deployment and CDN | — |
| **Recharts** | Composable charts for statistics dashboard | 2 |
| **react-hot-toast** | Non-intrusive toast notifications | 2 |

All styling is written in **inline CSS** using a consistent dark design system — no external CSS framework dependency, zero class name conflicts.

---

## System Architecture

### Role-Based Access Control

Authentication is handled by Firebase Auth. On login, the user's UID is used to fetch their profile document from the `users` Firestore collection. The `role` field (`admin`, `faculty`, `student`) determines:

- Which navigation items are rendered
- Which routes are accessible (enforced by `<ProtectedRoute>` components)
- What data is fetched (Firestore query filters applied at the listener level)
- What actions are available (conditional UI rendering throughout)

### Firestore Data Model

```
users/
  {uid}
    email, displayName, role, college, isActive, createdAt, lastLogin

moas/
  {moaId}
    companyName, hteId, industry, endorsedByCollege, description,
    status, effectivityDate, expiryDate, slots,
    contactPerson, contactEmail, contactPhone, address,
    isDeleted, createdAt, updatedAt, createdBy, updatedBy

    auditTrail/        ← sub-collection, one doc per change event
      {entryId}
        operation, performedBy, performedByName, performedByRole,
        timestamp, changes: { old: {...}, new: {...} }

    notes/             ← sub-collection, one doc per note
      {noteId}
        text, authorId, authorName, authorRole, createdAt
```

### Real-Time Sync

All major data views use Firestore `onSnapshot` listeners — UI updates the moment any change is committed, across all connected clients simultaneously. No polling or manual refresh required.

### Soft Delete System

MOA records are never permanently removed. A flag `isDeleted: true` is set on deletion, and all queries filter with `where('isDeleted', '==', false)`. This preserves audit history and enables data recovery.

---

## Screenshots

> 📸 Screenshots coming soon — see [/docs/screenshots/](docs/screenshots/)

| View | Description |
|------|-------------|
| Login Page | Email/password auth with role-based redirect |
| Admin Dashboard | MOA stats, status breakdown, recent activity |
| MOA Registry | Filterable table with status badges and detail panel |
| MOA Detail Panel | Full MOA info, status timeline, audit trail, notes |
| Faculty Dashboard | Compact MOA cards with quick status overview |
| Student Dashboard | Industry-filtered card grid of approved partners |
| Student MOA Modal | Full-screen partnership detail view for students |
| Statistics Dashboard | Recharts graphs — status, college, industry breakdown |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- A Firebase project with **Firestore** and **Authentication** (email/password) enabled

### Local Setup

**1. Clone the repository**

```bash
git clone https://github.com/EranJosh/NEU-MOA-Monitor.git
cd NEU-MOA-Monitor
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure environment variables**

Copy the example file and fill in your Firebase project values:

```bash
cp .env.example .env
```

Open `.env` and replace all placeholder values with your actual Firebase credentials (see [Environment Variables](#environment-variables) below). Never commit this file.

**4. Start the development server**

```bash
npm run dev
```

App runs at `http://localhost:5173` by default.

**5. Seed the database** *(optional — loads 21 demo MOA records)*

Log in as an Admin user and navigate to the Dashboard. Click the **Seed Database** button in the admin panel. This populates realistic sample data covering all 8 statuses, 5 industries, and multiple colleges.

> ⚠️ Seeding is additive — click once, or reset before re-seeding.

---

## Environment Variables

Create a `.env` file in the project root with the following variables. **Never commit real values.**

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain (`project.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Cloud Storage bucket URL |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Cloud Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase App ID |

All variables are prefixed with `VITE_` so Vite exposes them to the browser at build time.

---

## MOA Status Reference

| Status | Category | Color | Meaning |
|--------|----------|:-----:|---------|
| `PROCESSING – Pending Review` | Processing | 🔵 | Submitted, awaiting initial review |
| `PROCESSING – Under Evaluation` | Processing | 🔵 | Actively being evaluated |
| `PROCESSING – For Signing` | Processing | 🔵 | Approved, awaiting signatures |
| `APPROVED – Active` | Approved | 🟢 | Fully executed and currently active |
| `APPROVED – On Hold` | Approved | 🟢 | Active but temporarily suspended |
| `EXPIRING – Renewal Pending` | Expiring | 🟡 | Within 90 days of expiry |
| `EXPIRING – Final Notice` | Expiring | 🟡 | Within 30 days of expiry, urgent |
| `EXPIRED` | Expired | 🔴 | Past expiry date, no longer active |

---

## Deployment

This app is deployed to **Firebase Hosting**.

**1. Build the project**

```bash
npm run build
```

**2. Install Firebase CLI** *(if not already installed)*

```bash
npm install -g firebase-tools
```

**3. Authenticate and deploy**

```bash
firebase login
firebase deploy --only hosting
```

> `firebase.json` and `.firebaserc` are already configured in this repo. Public directory is `dist`, SPA rewrites are enabled.

### Live URL

**https://pe-moa-monitor.web.app**

---

## Project Structure

```
src/
├── components/              # Reusable UI components
│   ├── MOADetailPanel.jsx       # Slide-in detail panel (admin/faculty)
│   ├── MOAModal.jsx             # Add / Edit / Renew MOA form modal
│   ├── StudentMOACard.jsx       # Full-screen MOA detail modal (student)
│   └── StatusBadge.jsx          # Color-coded status pill component
│
├── pages/                   # Route-level page components
│   ├── Dashboard.jsx            # Role-specific dashboard home
│   ├── MOARecords.jsx           # MOA registry (admin/faculty)
│   ├── Statistics.jsx           # Charts and analytics
│   ├── AuditTrail.jsx           # Global audit log viewer
│   ├── UserManagement.jsx       # User CRUD (admin only)
│   ├── StudentDirectory.jsx     # Student listing
│   ├── Login.jsx                # Auth entry point
│   ├── NotFound.jsx             # 404 page
│   └── Blocked.jsx              # Access denied page
│
├── layouts/                 # App shell
│   └── AppLayout.jsx            # Sidebar, top navbar, role-based nav
│
├── firebase/                # Firebase integration layer
│   ├── firebase.js              # App initialization (reads from .env)
│   ├── moas.js                  # MOA CRUD + audit trail writers
│   ├── users.js                 # User management functions
│   └── seed.js                  # Demo data seeder + patchDescriptions()
│
├── context/                 # React context
│   └── AuthContext.jsx          # Auth state + user profile provider
│
└── main.jsx                 # App entry point + React Router setup
```

---

## Author

**Eran Josh Reyes**
New Era University — College of Computer Studies
*Professional Elective 2 — Personal Project*

[![GitHub](https://img.shields.io/badge/GitHub-EranJosh-181717?style=flat-square&logo=github)](https://github.com/EranJosh)

---

## Acknowledgements

- **New Era University** — for the institutional context and the problem worth solving
- **Firebase by Google** — for the real-time backend infrastructure
- **React & Vite** — for the modern, fast development experience
- **Recharts** — for the clean, composable charting library
- **shields.io** — for the README badges
