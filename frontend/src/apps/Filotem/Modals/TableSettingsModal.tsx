import { useState, useEffect } from 'react'
import { authFetch } from '../../../utils/apiClient'
import { useAuth } from '../../../context/useAuth'

export function TableSettingsModal({ 
  tableId, 
  tableName, 
  onClose,
  onDelete
}: { 
  tableId: string 
  tableName: string 
  onClose: () => void 
  onDelete?: () => void
}) {
  const { user } = useAuth()
  const [name, setName] = useState(tableName)
  const [avatar, setAvatar] = useState('')
  const [members, setMembers] = useState<any[]>([])
  const [admins, setAdmins] = useState<string[]>([])
  const [friends, setFriends] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmAction, setConfirmAction] = useState<{ type: 'kick' | 'delete'; memberId?: string } | null>(null)

  useEffect(() => {
    fetchTableDetails()
    fetchFriends()
  }, [])

  const fetchTableDetails = async () => {
    try {
      const res = await authFetch('/api/tables')
      const tableInfo = res.find((t: any) => t._id === tableId)
      if (tableInfo) {
        setMembers(tableInfo.members)
        const adminIds = tableInfo.admins.map((a: any) => String(a._id || a))
        setAdmins(adminIds)
        setAvatar(tableInfo.avatar || '')
      }
    } catch (err: any) {
      console.error(err)
    }
  }

  const fetchFriends = async () => {
    try {
      const res = await authFetch('/api/friends')
      setFriends(res)
    } catch(err) {
      console.error(err)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) return alert('Image too large (max 2MB)')
      const reader = new FileReader()
      reader.onloadend = () => setAvatar(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleUpdate = async () => {
    try {
      setLoading(true)
      await authFetch(`/api/tables/${tableId}/update`, {
        method: 'PUT',
        data: { name, avatar }
      })
      alert('Settings updated!')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleKick = async (memberId: string) => {
    try {
      await authFetch(`/api/tables/${tableId}/members/${memberId}`, {
        method: 'DELETE'
      })
      setConfirmAction(null)
      fetchTableDetails()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDeleteTable = async () => {
    try {
      setLoading(true)
      await authFetch(`/api/tables/${tableId}`, {
        method: 'DELETE'
      })
      alert('Table deleted successfully.')
      if (onDelete) onDelete()
      onClose()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (friendId: string) => {
    try {
      await authFetch(`/api/tables/${tableId}/add`, {
        method: 'PUT',
        data: { userId: friendId }
      })
      fetchTableDetails()
    } catch (err: any) {
      alert(err.message)
    }
  }

  // isAdmin check — admins is now a flat string[] of IDs
  const isAdmin = user && admins.includes(user.id)
  
  // Exclude people already in the table
  const invitableFriends = friends.filter(f => !members.some(m => m._id === f._id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-800 animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-stone-100 dark:border-stone-800">
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Table Settings</h2>
          <button 
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {error && <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg">{error}</div>}

          {/* Group Icon (Avatar) */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-24 h-24 group">
              <div className="w-full h-full rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 overflow-hidden shadow-inner">
                {avatar ? (
                  <img src={avatar} className="w-full h-full object-cover" alt="Table Icon" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                )}
              </div>
              {isAdmin && (
                <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white rounded-2xl opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity backdrop-blur-sm shadow-xl border border-white/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mb-1"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                  <span className="text-[10px] font-bold tracking-widest uppercase">Icon</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                </label>
              )}
            </div>
            {!isAdmin && avatar === '' && <p className="text-xs text-stone-500">No custom icon set</p>}
          </div>

          {/* Group Info */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-700 dark:text-stone-300 block">Table Name</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isAdmin}
                className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-60"
              />
              {isAdmin && (
                <button 
                  onClick={handleUpdate}
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-indigo-700 transition"
                >
                  Save
                </button>
              )}
            </div>
            {!isAdmin && <p className="text-xs text-stone-500">Only admins can modify table details.</p>}
          </div>

          {/* Members List */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Members ({members.length})</h3>
            <div className="space-y-2">
              {members.map(m => {
                const isMemberAdmin = admins.includes(String(m._id))
                return (
                  <div key={m._id} className="flex items-center justify-between p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-100 dark:border-stone-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center font-bold text-sm text-stone-600 dark:text-stone-300">
                        {m.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-stone-900 dark:text-stone-100">{m.name} {user?.id === m._id && '(You)'}</p>
                        <p className="text-xs text-stone-500">@{m.username}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isMemberAdmin && (
                        <span className="px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-md border border-indigo-200/50 dark:border-indigo-800/50">Admin</span>
                      )}
                      {isAdmin && !isMemberAdmin && (
                        confirmAction?.type === 'kick' && confirmAction.memberId === m._id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleKick(m._id)}
                              className="px-2 py-1 text-xs text-white bg-red-600 rounded-lg font-bold"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmAction(null)}
                              className="px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setConfirmAction({ type: 'kick', memberId: m._id })}
                            className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors font-medium border border-transparent hover:border-red-200 dark:hover:border-red-800"
                          >
                            Kick
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Add Members Section */}
          {isAdmin && invitableFriends.length > 0 && (
             <div className="space-y-4 border-t border-stone-200 dark:border-stone-800 pt-6">
                <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Invite Friends</h3>
                <div className="space-y-2">
                  {invitableFriends.map(friend => (
                     <div key={friend._id} className="flex items-center justify-between p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-100 dark:border-stone-800">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center font-bold text-sm text-stone-600 dark:text-stone-300">
                            {friend.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-stone-900 dark:text-stone-100">{friend.name}</p>
                            <p className="text-xs text-stone-500">@{friend.username}</p>
                          </div>
                        </div>
                        <button 
                           onClick={() => handleInvite(friend._id)}
                           className="px-3 py-1.5 text-xs bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-semibold rounded-lg hover:bg-indigo-600 dark:hover:bg-indigo-500 dark:hover:text-white transition-colors"
                        >
                          Invite
                        </button>
                     </div>
                  ))}
                </div>
             </div>
          )}

          {/* Danger Zone */}
          {isAdmin && (
            <div className="pt-6 border-t border-stone-200 dark:border-stone-800">
              {confirmAction?.type === 'delete' ? (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm font-bold text-red-600">Delete this table for EVERYONE?</p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDeleteTable}
                      disabled={loading}
                      className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-50"
                    >
                      {loading ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                    <button
                      onClick={() => setConfirmAction(null)}
                      className="px-6 py-2 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl font-bold hover:bg-stone-300 dark:hover:bg-stone-600 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => setConfirmAction({ type: 'delete' })}
                    disabled={loading}
                    className="w-full py-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-2xl font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-all border border-red-100 dark:border-red-900/50 flex items-center justify-center gap-2 group"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:shake-animation">
                      <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                    Delete Table Permanently
                  </button>
                  <p className="mt-2 text-[10px] text-center text-stone-500 uppercase tracking-widest font-bold">Admin Only Action</p>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
