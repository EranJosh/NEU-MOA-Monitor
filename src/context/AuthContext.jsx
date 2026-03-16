import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase/firebase'

const NEU_DOMAIN = '@neu.edu.ph'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null)
  const [userDoc, setUserDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [blocked, setBlocked] = useState(false)

  const unsubDocRef  = useRef(null)
  const initializedRef = useRef(false) // tracks if we've done the first-load write

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[AUTH] Auth state changed:', firebaseUser?.email ?? 'signed out')

      // Tear down previous doc listener
      if (unsubDocRef.current) {
        unsubDocRef.current()
        unsubDocRef.current = null
      }
      initializedRef.current = false

      if (!firebaseUser) {
        setUser(null)
        setUserDoc(null)
        setBlocked(false)
        setLoading(false)
        return
      }

      if (!firebaseUser.email?.endsWith(NEU_DOMAIN)) {
        await signOut(auth)
        setUser(null)
        setUserDoc(null)
        setBlocked(false)
        setLoading(false)
        return
      }

      const userRef = doc(db, 'users', firebaseUser.uid)
      let prevRole  = null

      // onSnapshot always delivers live server data — no cache risk.
      // We handle doc creation / lastLogin update inside the first callback.
      unsubDocRef.current = onSnapshot(
        userRef,
        async (snap) => {
          if (!snap.exists()) {
            // Brand-new user — create the document with default role
            console.log('[AUTH] No user doc found — creating with role: student')
            try {
              await setDoc(userRef, {
                uid:          firebaseUser.uid,
                email:        firebaseUser.email,
                displayName:  firebaseUser.displayName,
                photoURL:     firebaseUser.photoURL,
                role:         'student',
                isBlocked:    false,
                canManageMOA: false,
                createdAt:    serverTimestamp(),
                lastLogin:    serverTimestamp(),
              })
            } catch (err) {
              console.error('[AUTH] Error creating user doc:', err)
              setLoading(false)
            }
            // The setDoc above will re-trigger this callback with the new data
            return
          }

          const data = snap.data()
          console.log('[AUTH] Firestore user doc updated:', data)
          console.log('[AUTH] Role set to:', data.role)

          // On first successful read, update lastLogin without touching any other field
          if (!initializedRef.current) {
            initializedRef.current = true
            try {
              await updateDoc(userRef, { lastLogin: serverTimestamp() })
            } catch (err) {
              console.error('[AUTH] Error updating lastLogin:', err)
            }
          }

          setUser(firebaseUser)
          setUserDoc(data)

          if (data.isBlocked) {
            setBlocked(true)
          } else {
            setBlocked(false)

            if (prevRole !== null && data.role !== prevRole) {
              console.log('[AUTH] Role changed:', prevRole, '→', data.role, '— redirecting')
              window.location.href = '/dashboard'
            }
          }

          prevRole = data.role
          setLoading(false)
        },
        (err) => {
          console.error('[AUTH] User doc listener error:', err)
          setLoading(false)
        }
      )
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
