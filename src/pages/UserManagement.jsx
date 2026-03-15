import React, { useState, useEffect, useMemo } from 'react'
import AppLayout from '../layouts/AppLayout'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getUsers, updateUserRole, blockUser, updateUserMOAPermission } from '../firebase/firestore'

const ROLES = ['student', 'faculty', 'admin']

// Inline toggle switch
function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        disabled={disabled}
        style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
      />
      <div style={{
        width: 36, height: 20, borderRadius: 10, position: 'relative', flexShrink: 0,
        background: checked ? 'rgba(96,165,250,0.35)' : 'rgba(255,255,255,0.07)',
        border: `1px solid ${checked ? 'rgba(96,165,250,0.5)' : 'rgba(255,255,255,0.12)'}`,
        transition: 'all 0.2s',
        opacity: disabled ? 0.45 : 1,
      }}>
        <div style={{
          position: 'absolute', top: 2,
          left: checked ? 16 : 2,
          width: 14, height: 14, borderRadius: '50%',
          background: checked ? '#60A5FA' : 'rgba(255,255,255,0.28)',
          transition: 'left 0.2s, background 0.2s',
          boxShadow: checked ? '0 0 6px rgba(96,165,250,0.6)' : 'none',
        }} />
      </div>
    </label>
  )
}

const ROLE_STYLE = {
  admin:   { color: '#D4A843', bg: 'rgba(212,168,67,0.12)',  border: 'rgba(212,168,67,0.3)'  },
  faculty: { color: '#60A5FA', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)'  },
  student: { color: '#4ADE80', bg: 'rgba(74,222,128,0.10)',  border: 'rgba(74,222,128,0.25)' },
}

const formatDate = (ts) => {
  if (!ts) return 'Never'
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return '—' }
}

export default function UserManagement() {
  const { user: currentUser } = useAuth()
  const toast = useToast()
  const [users,      setUsers]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [saving,     setSaving]     = useState({})
  const [userSearch, setUserSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await getUsers()
      setUsers(data.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '')))
    } catch (e) {
      setError('Failed to load users.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filteredUsers = useMemo(() => {
    let list = [...users]
    if (roleFilter) list = list.filter(u => u.role === roleFilter)
    if (userSearch) {
      const t = userSearch.toLowerCase()
      list = list.filter(u =>
        u.displayName?.toLowerCase().includes(t) ||
        u.email?.toLowerCase().includes(t)
      )
    }
    return list
  }, [users, roleFilter, userSearch])

  const handleRoleChange = async (uid, newRole) => {
    if (uid === currentUser.uid && newRole !== 'admin') {
      toast.error('You cannot remove your own admin role.')
      return
    }
    setSaving(prev => ({ ...prev, [uid + '_role']: true }))
    try {
      await updateUserRole(uid, newRole)
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u))
      toast.success('Role updated.')
    } catch (e) {
      toast.error('Failed to update role. Please try again.')
    } finally { setSaving(prev => ({ ...prev, [uid + '_role']: false })) }
  }

  const handleBlockToggle = async (uid, isBlocked) => {
    if (uid === currentUser.uid) {
      toast.error('You cannot block your own account.')
      return
    }
    setSaving(prev => ({ ...prev, [uid + '_block']: true }))
    try {
      await blockUser(uid, isBlocked)
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, isBlocked } : u))
      toast.success(isBlocked ? 'User blocked.' : 'User unblocked.')
    } catch (e) {
      toast.error('Failed to update user status. Please try again.')
    } finally { setSaving(prev => ({ ...prev, [uid + '_block']: false })) }
  }

  const handleMOAPermission = async (uid, canManageMOA) => {
    setSaving(prev => ({ ...prev, [uid + '_moa']: true }))
    try {
      await updateUserMOAPermission(uid, canManageMOA)
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, canManageMOA } : u))
      toast.success(canManageMOA ? 'MOA access enabled.' : 'MOA access revoked.')
    } catch (e) {
      toast.error('Failed to update MOA access. Please try again.')
    } finally { setSaving(prev => ({ ...prev, [uid + '_moa']: false })) }
  }

  const selectStyle = {
    padding: '5px 10px',
    borderRadius: 7,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(13,27,42,0.9)',
    color: 'rgba(255,255,255,0.75)',
    fontSize: '0.78rem',
    cursor: 'pointer',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    outline: 'none',
  }

  return (
    <AppLayout>
      <div style={{ maxWidth: 1100 }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>Admin</p>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 600, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}>
            User Management
          </h1>
          <p style={{ marginTop: 4, fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
            {loading ? 'Loading…' : `${filteredUsers.length} of ${users.length} registered user${users.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#F87171', fontSize: '0.875rem', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Filter bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 16 }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 380 }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none"
              style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }}>
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Search by name or email…"
              style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(13,27,42,0.8)', color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', outline: 'none', fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = 'rgba(212,168,67,0.35)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.09)'}
            />
            {userSearch && (
              <button onClick={() => setUserSearch('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 2 }}
              >×</button>
            )}
          </div>
          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(17,34,64,0.8)', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", outline: 'none' }}
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="faculty">Faculty</option>
            <option value="student">Student</option>
          </select>
          {(userSearch || roleFilter) && (
            <button onClick={() => { setUserSearch(''); setRoleFilter('') }}
              style={{ background: 'none', border: 'none', color: 'rgba(212,168,67,0.65)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}
              onMouseEnter={e => e.currentTarget.style.color = '#D4A843'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(212,168,67,0.65)'}
            >Clear ×</button>
          )}
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>
            {filteredUsers.length} of {users.length} user{users.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div style={{ background: 'rgba(17,34,64,0.5)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['User', 'Email', 'Role', 'Status', 'MOA Access', 'Last Login', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(17,34,64,0.9)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.875rem' }}>Loading users…</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.875rem' }}>
                    {users.length === 0 ? 'No users found.' : 'No users match your search.'}
                  </td></tr>
                ) : filteredUsers.map(u => {
                  const isSelf        = u.uid === currentUser.uid
                  const roleStyle     = ROLE_STYLE[u.role] || ROLE_STYLE.student
                  const isRoleSaving  = saving[u.uid + '_role']
                  const isBlockSaving = saving[u.uid + '_block']
                  const isMoaSaving   = saving[u.uid + '_moa']

                  return (
                    <tr
                      key={u.uid}
                      style={{ opacity: u.isBlocked ? 0.55 : 1, transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(29,53,87,0.25)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* User */}
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {u.photoURL
                            ? <img src={u.photoURL} alt={u.displayName} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                            : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(212,168,67,0.15)', color: '#D4A843', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>
                                {(u.displayName || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                          }
                          <div>
                            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>
                              {u.displayName || 'Unknown'} {isSelf && <span style={{ fontSize: '0.65rem', color: '#D4A843', marginLeft: 4 }}>(you)</span>}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>{u.email}</td>

                      {/* Role */}
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <select
                          value={u.role}
                          disabled={isRoleSaving}
                          onChange={e => handleRoleChange(u.uid, e.target.value)}
                          style={{ ...selectStyle, color: roleStyle.color, background: roleStyle.bg, border: `1px solid ${roleStyle.border}` }}
                        >
                          {ROLES.map(r => <option key={r} value={r} style={{ background: '#112240', color: 'rgba(255,255,255,0.8)' }}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                        </select>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 9px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 500,
                          background: u.isBlocked ? 'rgba(248,113,113,0.1)' : 'rgba(74,222,128,0.1)',
                          border: `1px solid ${u.isBlocked ? 'rgba(248,113,113,0.25)' : 'rgba(74,222,128,0.25)'}`,
                          color: u.isBlocked ? '#F87171' : '#4ADE80',
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: u.isBlocked ? '#F87171' : '#4ADE80', boxShadow: `0 0 5px ${u.isBlocked ? '#F8717180' : '#4ADE8080'}` }} />
                          {u.isBlocked ? 'Blocked' : 'Active'}
                        </span>
                      </td>

                      {/* MOA Access */}
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {u.role === 'faculty' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ToggleSwitch
                              checked={u.canManageMOA === true}
                              onChange={val => handleMOAPermission(u.uid, val)}
                              disabled={isMoaSaving}
                            />
                            <span style={{ fontSize: '0.73rem', color: u.canManageMOA ? '#60A5FA' : 'rgba(255,255,255,0.22)' }}>
                              {isMoaSaving ? '…' : u.canManageMOA ? 'Enabled' : 'Read-only'}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.15)' }}>—</span>
                        )}
                      </td>

                      {/* Last Login */}
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
                        {formatDate(u.lastLogin)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {!isSelf && (
                          <button
                            onClick={() => handleBlockToggle(u.uid, !u.isBlocked)}
                            disabled={isBlockSaving}
                            style={{
                              padding: '5px 12px', borderRadius: 7, border: `1px solid ${u.isBlocked ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.2)'}`,
                              background: 'transparent',
                              color: u.isBlocked ? 'rgba(74,222,128,0.7)' : 'rgba(248,113,113,0.7)',
                              fontSize: '0.75rem', cursor: isBlockSaving ? 'not-allowed' : 'pointer',
                              opacity: isBlockSaving ? 0.5 : 1,
                              fontFamily: "'DM Sans', system-ui, sans-serif",
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { if (!isBlockSaving) { e.currentTarget.style.background = u.isBlocked ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)'; e.currentTarget.style.color = u.isBlocked ? '#4ADE80' : '#F87171' } }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = u.isBlocked ? 'rgba(74,222,128,0.7)' : 'rgba(248,113,113,0.7)' }}
                          >
                            {isBlockSaving ? '…' : u.isBlocked ? 'Unblock' : 'Block'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
