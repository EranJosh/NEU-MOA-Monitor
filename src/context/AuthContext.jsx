import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/firebase'

const NEU_DOMAIN = '@neu.edu.ph'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null)
  const [userDoc, setUserDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [blocked, setBlocked] = useState(false)

  const unsubDocRef = useRef(null)

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[AUTH] Auth state changed:', firebaseUser?.email ?? 'signed out')

      // Tear down previous doc listener
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

      // NEU domain check
      if (!firebaseUser.email?.endsWith(NEU_DOMAIN)) {
        await signOut(auth)
        setUser(null)
        setUserDoc(null)
        setBlocked(false)
        setLoading(false)
        return
      }

      // Ensure user doc exists before attaching listener.
      // Use getDoc with server source to bypass cache entirely.
      const userRef = doc(db, 'users', firebaseUser.uid)
      try {
        const snap = await getDoc(userRef)
        if (!snap.exists()) {
          // First login — create the doc
          await setDoc(userRef, {
            uid:         firebaseUser.uid,
            email:       firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL:    firebaseUser.photoURL,
            role:        'student',
            isBlocked:   false,
            canManageMOA: false,
            createdAt:   serverTimestamp(),
            lastLogin:   serverTimestamp(),
          })
        } else {
          // Existing user — only update lastLogin, no other fields touched
          await updateDoc(userRef, { lastLogin: serverTimestamp() })
        }
      } catch (err) {
        console.error('[AUTH] Error ensuring user doc:', err)
      }

      // Now attach the live listener. It fires immediately with current server
      // data and re-fires on any change (role, isBlocked, canManageMOA, etc.)
      let prevRole = null

      unsubDocRef.current = onSnapshot(
        userRef,
        (snap) => {
          if (!snap.exists()) {
            setLoading(false)
            return
          }

          const data = snap.data()
          console.log('[AUTH] Firestore user doc updated:', data)
          console.log('[AUTH] Role set to:', data.role)

          setUser(firebaseUser)
          setUserDoc(data)

          if (data.isBlocked) {
            setBlocked(true)
          } else {
            setBlocked(false)

            // Redirect on live role change (not on initial load)
            if (prevRole !== null && data.role !== prevRole) {
              console.log('[AUTH] Role changed from', prevRole, 'to', data.role, '— redirecting')
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
