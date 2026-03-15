import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/firebase'
import { getOrCreateUserDoc } from '../firebase/firestore'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user,     setUser]     = useState(null)
  const [userDoc,  setUserDoc]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [blocked,  setBlocked]  = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const docData = await getOrCreateUserDoc(firebaseUser)
          if (docData.isBlocked) {
            setBlocked(true)
            setUser(firebaseUser)   // keep user so Blocked page can sign out
            setUserDoc(docData)
          } else {
            setBlocked(false)
            setUser(firebaseUser)
            setUserDoc(docData)
          }
        } catch (err) {
          console.error('Error fetching user doc:', err)
          setUser(null)
          setUserDoc(null)
        }
      } else {
        setUser(null)
        setUserDoc(null)
        setBlocked(false)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const value = {
    user,
    userDoc,
    loading,
    blocked,
    role:         userDoc?.role || null,
    isAdmin:      userDoc?.role === 'admin',
    isFaculty:    userDoc?.role === 'faculty',
    isStudent:    userDoc?.role === 'student',
    canManageMOA: userDoc?.canManageMOA === true,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
