import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../firebase/firebase'
import { getOrCreateUserDoc } from '../firebase/firestore'

const NEU_DOMAIN = '@neu.edu.ph'

const ROLE_HOME = {
  admin:   '/dashboard',
  faculty: '/dashboard',
  student: '/dashboard',
}

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null)
  const [userDoc, setUserDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [blocked, setBlocked] = useState(false)

  // Holds the unsubscribe fn for the Firestore doc listener
  const unsubDocRef = useRef(null)

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Tear down any previous doc listener before switching users
      if (unsubDocRef.current) {
        unsubDocRef.current()
        unsubDocRef.current = null
      }

      if (!firebaseUser) {
        setUser(null)
        setUserDoc(null)
        setBlocked(false)
        setLoading(false)
        return
      }

      // Secondary NEU domain check
      if (!firebaseUser.email?.endsWith(NEU_DOMAIN)) {
        await signOut(auth)
        setUser(null)
        setUserDoc(null)
        setBlocked(false)
        setLoading(false)
        return
      }

      try {
        // Ensure the Firestore user doc exists (creates on first login)
        await getOrCreateUserDoc(firebaseUser)

        // Attach live listener — fires immediately with current data,
        // then again whenever role / isBlocked / canManageMOA changes
        let prevRole = null

        unsubDocRef.current = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          (snap) => {
            if (!snap.exists()) {
              setLoading(false)
              return
            }

            const data = snap.data()

            setUser(firebaseUser)
            setUserDoc(data)

            if (data.isBlocked) {
              setBlocked(true)
              // Redirect to blocked page — ProtectedRoute handles the UI
            } else {
              setBlocked(false)

              // Redirect if role changed after initial load
              if (prevRole !== null && data.role !== prevRole) {
                const dest = ROLE_HOME[data.role] || '/dashboard'
                window.location.href = dest
              }
            }

            prevRole = data.role
            setLoading(false)
          },
          (err) => {
            console.error('User doc listener error:', err)
            setLoading(false)
          }
        )
      } catch (err) {
        console.error('Error setting up user doc listener:', err)
        setUser(null)
        setUserDoc(null)
        setLoading(false)
      }
    })

    return () => {
      unsubAuth()
      if (unsubDocRef.current) unsubDocRef.current()
    }
  }, [])

  const value = {
    user,
    userDoc,
    loading,
    blocked,
    role:         userDoc?.role         || null,
    isAdmin:      userDoc?.role         === 'admin',
    isFaculty:    userDoc?.role         === 'faculty',
    isStudent:    userDoc?.role         === 'student',
    canManageMOA: userDoc?.canManageMOA === true,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
