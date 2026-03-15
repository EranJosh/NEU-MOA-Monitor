import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const LoadingScreen = () => (
  <div className="min-h-screen bg-navy-900 flex items-center justify-center">
    <div className="flex flex-col items-center gap-6 animate-fade-in">
      <div className="w-10 h-10 rounded-full border-2 border-gold-500/30 border-t-gold-400 animate-spin" />
      <p className="font-sans text-sm text-white/30 tracking-widest uppercase">
        Authenticating
      </p>
    </div>
  </div>
)

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, userDoc, loading, blocked } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />
  if (!user)   return <Navigate to="/login"   state={{ from: location }} replace />
  // Tertiary guard — redirect non-NEU emails that somehow persist in auth state
  if (user && !user.email?.endsWith('@neu.edu.ph')) return <Navigate to="/login" replace />
  if (blocked) return <Navigate to="/blocked" replace />

  if (allowedRoles && userDoc && !allowedRoles.includes(userDoc.role)) {
    return <Navigate to="/dashboard" state={{ toast: 'Access restricted — you do not have permission to view that page.' }} replace />
  }

  return children
}

export default ProtectedRoute
