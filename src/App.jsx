import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ProtectedRoute } from './routes/ProtectedRoute'

const Login           = lazy(() => import('./pages/Login'))
const Dashboard       = lazy(() => import('./pages/Dashboard'))
const MOARecords      = lazy(() => import('./pages/MOARecords'))
const UserManagement  = lazy(() => import('./pages/UserManagement'))
const AuditTrail      = lazy(() => import('./pages/AuditTrail'))
const Blocked         = lazy(() => import('./pages/Blocked'))
const StudentDirectory = lazy(() => import('./pages/StudentDirectory'))
const Statistics      = lazy(() => import('./pages/Statistics'))
const NotFound        = lazy(() => import('./pages/NotFound'))

const PageLoader = () => (
  <div style={{ minHeight: '100vh', background: '#0D1B2A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.08)', borderTopColor: '#D4A843', animation: 'spin 0.8s linear infinite' }} />
  </div>
)

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <ToastProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login"   element={<Login />} />
            <Route path="/blocked" element={<Blocked />} />

            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />

            <Route path="/moas" element={
              <ProtectedRoute allowedRoles={['admin', 'faculty']}><MOARecords /></ProtectedRoute>
            } />

            <Route path="/directory" element={
              <ProtectedRoute allowedRoles={['student']}><StudentDirectory /></ProtectedRoute>
            } />

            <Route path="/users" element={
              <ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>
            } />

            <Route path="/audit" element={
              <ProtectedRoute allowedRoles={['admin']}><AuditTrail /></ProtectedRoute>
            } />

            <Route path="/statistics" element={
              <ProtectedRoute allowedRoles={['admin', 'faculty']}><Statistics /></ProtectedRoute>
            } />

            <Route path="/"  element={<Navigate to="/dashboard" replace />} />
            <Route path="*"  element={<NotFound />} />
          </Routes>
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
