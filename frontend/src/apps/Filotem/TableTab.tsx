import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { authFetch } from '../../utils/apiClient'
import { useSocket } from '../../context/useSocket'
import { FriendProfileModal } from './Modals/FriendProfileModal'

interface Friend {
  _id: string
  name: string
  username: string
  bio?: string
  avatar?: string
  isOnline?: boolean
}

interface TableDTO {
  _id: string
  name: string
  avatar?: string
  description?: string
  members: Friend[]
  admins: Friend[]
}

export function TableTab({ 
  onSelectFriend, 
  onSelectTable,
  activeChatId
}: { 
  onSelectFriend: (id: string, name: string, avatar?: string) => void,
  onSelectTable: (id: string, name: string, avatar?: string) => void,
  activeChatId?: string
}) {
  const { socket, unreadCounts, setUnreadCounts, onlineUsers } = useSocket()
  
  const [friends, setFriends] = useState<Friend[]>([])
  const [tables, setTables] = useState<TableDTO[]>([])
  const [loading, setLoading] = useState(true)
  
  const [isCreating, setIsCreating] = useState(false)
  const [newTableName, setNewTableName] = useState('')
  const [viewProfileId, setViewProfileId] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      const [friendsData, tablesData, unreadsData] = await Promise.all([
        authFetch('/api/friends').catch(err => { console.error(err); return []; }),
        authFetch('/api/tables').catch(err => { console.error(err); return []; }),
        authFetch('/api/messages/unread-counts').catch(err => { console.error(err); return {}; })
      ])
      setFriends(friendsData)
      setTables(tablesData)
      setUnreadCounts(unreadsData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // REAL-TIME UPDATES
  useEffect(() => {
    if (!socket) return

    const handleRefresh = () => fetchData()
    
    const handleTableUpdate = (table: TableDTO) => {
      setTables(prev => prev.map(t => t._id === table._id ? table : t))
    }

    socket.on('table_updated', handleTableUpdate)
    socket.on('table_created', handleRefresh)
    socket.on('table_deleted', handleRefresh)
    socket.on('friend_accepted', handleRefresh)
    socket.on('friend_removed', handleRefresh)

    return () => {
      socket.off('table_updated', handleTableUpdate)
      socket.off('table_created', handleRefresh)
      socket.off('table_deleted', handleRefresh)
      socket.off('friend_accepted', handleRefresh)
      socket.off('friend_removed', handleRefresh)
    }
  }, [socket])

  // Effect to automatically clear unread dots upon chat selection mapping
  useEffect(() => {
    if (activeChatId) {
      setUnreadCounts(prev => {
        if (prev[activeChatId]) {
          const newCounts = { ...prev }
          delete newCounts[activeChatId]
          return newCounts
        }
        return prev
      })
    }
  }, [activeChatId])

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTableName.trim()) return
    
    try {
      await authFetch('/api/tables', {
        method: 'POST',
        data: { name: newTableName }
      })
      setNewTableName('')
      setIsCreating(false)
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-stone-500">Loading your table...</div>
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent overflow-hidden">
      
      {/* Action Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800 mb-3 px-1">
        <h2 className="text-sm font-bold font-sans text-stone-500 dark:text-stone-400 uppercase tracking-widest">Conversations</h2>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-800 p-1.5 rounded-md transition-colors"
          title="Create new Table"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 pb-4 space-y-6 scrollbar-hide">
        
        {/* Create Table Form */}
        <AnimatePresence>
          {isCreating && (
            <motion.form 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleCreateTable} 
              className="p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl shadow-sm mb-4 overflow-hidden"
            >
              <input 
                autoFocus
                type="text" 
                placeholder="Table Name..." 
                value={newTableName}
                onChange={e => setNewTableName(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-stone-400 dark:focus:border-stone-600 transition-colors mb-2"
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded-lg py-1.5 text-xs font-semibold">Create</button>
                <button type="button" onClick={() => setIsCreating(false)} className="flex-1 bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400 rounded-lg py-1.5 text-xs font-semibold">Cancel</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Friends Table Section */}
        {tables.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 mb-2 group/header">
              <h3 className="text-[10px] font-bold text-stone-500 dark:text-stone-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-indigo-500"></span>
                Friends Table
              </h3>
            </div>
            <ul className="space-y-1">
              <AnimatePresence mode="popLayout">
                {tables.map(table => (
                  <motion.li 
                    key={table._id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <button
                      onClick={() => onSelectTable(table._id, table.name, table.avatar)}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white dark:hover:bg-stone-900 transition-colors text-left group relative"
                    >
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0 text-indigo-700 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800 overflow-hidden">
                        {table.avatar ? (
                           <img src={table.avatar} alt={table.name} className="w-full h-full object-cover" />
                        ) : (
                           <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <p className="font-semibold text-stone-900 dark:text-stone-100 truncate">{table.name}</p>
                        <p className="text-xs text-stone-500 truncate">{table.members.length} member{table.members.length !== 1 ? 's' : ''}</p>
                      </div>
                      {unreadCounts[table._id] > 0 && (
                        <span className="absolute right-3 bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          {unreadCounts[table._id]}
                        </span>
                      )}
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        )}

        {/* Direct Messages */}
        <div>
          <h3 className="text-[10px] font-bold text-stone-500 dark:text-stone-500 uppercase tracking-[0.2em] mb-2 px-2 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-green-500"></span>
            Direct Messages
          </h3>
          {friends.length === 0 ? (
            <p className="text-xs text-stone-500 px-2 italic">Nobody here yet. Discover friends in Network.</p>
          ) : (
            <ul className="space-y-1">
              <AnimatePresence mode="popLayout">
                {friends.map(friend => (
                  <motion.li 
                    key={friend._id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <button
                      onClick={() => onSelectFriend(friend._id, friend.name, friend.avatar)}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white dark:hover:bg-stone-900 transition-colors text-left group relative"
                    >
                      <div 
                        className="relative shrink-0 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setViewProfileId(friend._id) }}
                        title="View profile"
                      >
                        <div className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center flex-shrink-0 text-stone-600 dark:text-stone-300 font-bold border border-stone-300 dark:border-stone-700 overflow-hidden hover:ring-2 hover:ring-indigo-400 transition-all">
                          {friend.avatar ? (
                            <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                          ) : (
                            friend.name[0]?.toUpperCase()
                          )}
                        </div>
                        {onlineUsers.has(friend._id) && (
                           <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-stone-50 dark:border-stone-950 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <p className="font-semibold text-stone-900 dark:text-stone-100 truncate">{friend.name}</p>
                        <p className="text-xs text-stone-500 truncate">@{friend.username}</p>
                      </div>
                      {unreadCounts[friend._id] > 0 && (
                        <span className="absolute right-3 bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          {unreadCounts[friend._id]}
                        </span>
                      )}
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

      </div>

      {viewProfileId && (
        <FriendProfileModal
          friendId={viewProfileId}
          onClose={() => setViewProfileId(null)}
        />
      )}
    </div>
  )
}

