import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { authFetch } from '../../utils/apiClient'
import { useAuth } from '../../context/useAuth'
import { TableSettingsModal } from './Modals/TableSettingsModal.tsx'
import { FriendProfileModal } from './Modals/FriendProfileModal.tsx'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

interface MessageDTO {
  _id: string
  tempId?: string
  text: string
  sender: { _id: string, name: string } | string
  receiver: string
  chatType?: 'friend' | 'table'
  readBy?: string[]
  createdAt: string
  status?: 'pending' | 'sent' | 'read'
}

export function ChatRoom({ 
  friendId, 
  friendName, 
  chatType = 'friend',
  avatar,
  onBack 
}: { 
  friendId: string, 
  friendName: string, 
  chatType?: 'friend' | 'table',
  avatar?: string,
  onBack: () => void 
}) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<MessageDTO[]>([])
  const [inputText, setInputText] = useState('')
  const [showTableSettings, setShowTableSettings] = useState(false)
  const [showFriendOptions, setShowFriendOptions] = useState(false)
  const [showFriendProfile, setShowFriendProfile] = useState(false)
  
  const [currentName, setCurrentName] = useState(friendName)
  const [currentAvatar, setCurrentAvatar] = useState(avatar)

  useEffect(() => {
    setCurrentName(friendName)
    setCurrentAvatar(avatar)
  }, [friendName, avatar])

  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const optionsMenuRef = useRef<HTMLDivElement>(null)
  
  // Close friend options on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
        setShowFriendOptions(false)
      }
    }
    if (showFriendOptions) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFriendOptions])
  
  // Swipe Logic
  const touchStart = useRef<number | null>(null)
  const touchEnd = useRef<number | null>(null)
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    touchEnd.current = null
    touchStart.current = e.targetTouches[0].clientX
  }

  const onTouchMove = (e: React.TouchEvent) => {
    touchEnd.current = e.targetTouches[0].clientX
  }

  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return
    const distance = touchEnd.current - touchStart.current
    const isRightSwipe = distance > minSwipeDistance
    if (isRightSwipe) {
      onBack()
    }
  }

  // Auto-scroll Down
  const scrollToBottom = () => {
    // We rely on CSS 'scroll-behavior: smooth' in .butter-scroll for buttery motion
    messagesEndRef.current?.scrollIntoView()
  }

  // Mark as Read
  const markAsRead = async () => {
    try {
      await authFetch('/api/messages/read', {
        method: 'PUT',
        data: { chatId: friendId, chatType }
      })
      // Notify sender via socket
      socketRef.current?.emit('messages_read', {
        senderId: user?.id,
        receiverId: friendId,
        chatType
      })
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Fetch History
  const fetchMessages = async () => {
    try {
      const endpoint = chatType === 'table' ? `/api/messages/table/${friendId}` : `/api/messages/${friendId}`
      const res = await authFetch(endpoint)
      setMessages(res)
      markAsRead()
    } catch (err) {
      console.error(err)
    }
  }

  const handleUnfriend = async () => {
    if (!window.confirm('Are you sure you want to unfriend this user?')) return
    try {
      await authFetch(`/api/friends/${friendId}`, { method: 'DELETE' })
      alert('Unfriended successfully')
      onBack()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleBlock = async () => {
    if (!window.confirm('Are you sure you want to block this user? They will be removed from your friends list.')) return
    try {
      await authFetch(`/api/friends/${friendId}/block`, { method: 'PUT' })
      alert('User blocked successfully')
      onBack()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleRequestBadge = async (type: 'bestFriend' | 'lover') => {
    try {
      await authFetch('/api/badges/request', {
        method: 'POST',
        data: { toUserId: friendId, type }
      })
      alert(`Badge request sent! Waiting for ${friendName} to accept.`)
      setShowFriendOptions(false)
    } catch (err: any) {
      alert(err.message)
    }
  }

  useEffect(() => {
    fetchMessages()

    const newSocket = io(API_URL, {
      auth: { token: localStorage.getItem('filotem_token') }
    })

    socketRef.current = newSocket

    // Authenticate socket routing 
    newSocket.on('connect', () => {
      newSocket.emit('register_user', user?.id)
      if (chatType === 'table') {
        newSocket.emit('join_table', friendId)
      }
    })

    newSocket.on('receive_message', (msg: MessageDTO) => {
      // Validate room context
      if (msg.chatType !== chatType) return
      
      const isInCurrentChat = chatType === 'table' 
        ? msg.receiver === friendId 
        : (msg.sender === friendId || (typeof msg.sender === 'object' && msg.sender._id === friendId))

      if (!isInCurrentChat) return

      setMessages(prev => [...prev, msg])
      markAsRead()
      scrollToBottom()
    })

    newSocket.on('message_sent', (msg: MessageDTO) => {
      // Validate room context
      if (msg.chatType !== chatType || msg.receiver !== friendId) return

      setMessages(prev => {
        // Replace optimistic message
        const exists = prev.findIndex(m => m.tempId === msg.tempId)
        if (exists !== -1) {
          const updated = [...prev]
          updated[exists] = { ...msg, status: 'sent' }
          return updated
        }
        return [...prev, { ...msg, status: 'sent' }]
      })
      scrollToBottom()
    })

    newSocket.on('messages_read_receipt', (data: any) => {
      // If table receipt, only care if it's the right table
      if (chatType === 'table' && data.tableId !== friendId) return
      // If DM receipt, only care if it's the right friend
      if (chatType === 'friend' && data.friendId !== friendId) return
      
      setMessages(prev => prev.map(m => {
        const senderId = typeof m.sender === 'object' ? m.sender._id : m.sender
        if (senderId === user?.id) {
          return { ...m, status: 'read' }
        }
        return m
      }))
    })

    newSocket.on('table_updated', (table: any) => {
      if (chatType === 'table' && table._id === friendId) {
        setCurrentName(table.name)
        setCurrentAvatar(table.avatar)
      }
    })

    return () => {
      if (chatType === 'table') {
        newSocket.emit('leave_table', friendId)
      }
      newSocket.off('receive_message')
      newSocket.off('message_sent')
      newSocket.off('messages_read_receipt')
      newSocket.off('table_updated')
      newSocket.disconnect()
    }
  }, [friendId, chatType, user?.id])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return

    const tempId = Date.now().toString()
    const optimisticMsg: MessageDTO = {
      _id: tempId,
      tempId,
      text: inputText,
      sender: user?.id || '',
      receiver: friendId,
      chatType,
      createdAt: new Date().toISOString(),
      status: 'pending'
    }

    setMessages(prev => [...prev, optimisticMsg])
    setInputText('')

    socketRef.current?.emit('send_message', {
      tempId,
      senderId: user?.id,
      receiverId: friendId,
      chatType,
      text: inputText
    })
  }

  const renderTicks = (status?: string) => {
    if (status === 'pending') return <span className="text-red-500 ml-1 font-bold">●</span>
    if (status === 'sent') return (
      <svg className="ml-1 text-stone-400" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    )
    if (status === 'read') return (
      <div className="flex ml-1 -space-x-1.5">
        <svg className="text-blue-500" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        <svg className="text-blue-500" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
    )
    return null
  }

  return (
    <div 
      className="flex flex-col h-full bg-[#EAE6DF] dark:bg-stone-950 transition-all duration-300 relative select-none md:select-auto"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-stone-300 dark:border-stone-800 bg-[#EAE6DF]/90 dark:bg-stone-950/90 backdrop-blur-md sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-2 md:gap-3">
          <button 
            onClick={onBack}
            className="md:hidden p-2 -ml-1 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-full transition-colors active:scale-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div 
            className={`flex items-center gap-2 md:gap-3 min-w-0 ${chatType === 'friend' ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
            onClick={() => chatType === 'friend' && setShowFriendProfile(true)}
          >
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-500 dark:text-stone-400 font-bold overflow-hidden border border-stone-300 dark:border-stone-700 shadow-sm shrink-0">
             {currentAvatar ? (
                <img src={currentAvatar} alt={currentName} className="w-full h-full object-cover" />
             ) : chatType === 'table' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
             ) : (
                currentName[0]?.toUpperCase()
             )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-stone-900 dark:text-stone-100 leading-tight text-sm md:text-base truncate">{currentName}</h2>
              {chatType === 'friend' && user?.bestFriendId === friendId && (
                <span title="Best Friend" className="text-amber-500 text-xs md:text-sm drop-shadow-sm">⭐</span>
              )}
              {chatType === 'friend' && user?.loverId === friendId && (
                <span title="Lover" className="text-rose-500 text-xs md:text-sm drop-shadow-sm">❤️</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${chatType === 'table' ? 'bg-indigo-500' : 'bg-green-500'}`}></span>
              <span className="text-[10px] md:text-xs text-stone-500 font-medium">
                {chatType === 'table' ? 'Friends Table' : 'Online'}
              </span>
            </div>
          </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {chatType === 'table' ? (
            <button 
              onClick={() => setShowTableSettings(true)}
              title="Table Settings"
              className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-xl transition-colors outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          ) : (
            <div className="relative" ref={optionsMenuRef}>
              <button 
                onClick={() => setShowFriendOptions(!showFriendOptions)}
                className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-xl transition-colors outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
              </button>
              
              {showFriendOptions && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-lg overflow-hidden py-1 z-30">
                  <button 
                    onClick={handleUnfriend}
                    className="w-full text-left px-4 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  >
                    Unfriend
                  </button>
                  <button 
                    onClick={() => handleRequestBadge('bestFriend')}
                    className="w-full text-left px-4 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center justify-between"
                  >
                    {user?.bestFriendId === friendId ? '⭐ Best Friend' : 'Request Star Badge'}
                    <span className="text-amber-500">⭐</span>
                  </button>
                  <button 
                    onClick={() => handleRequestBadge('lover')}
                    className="w-full text-left px-4 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center justify-between"
                  >
                    {user?.loverId === friendId ? '❤️ Lover' : 'Request Heart Badge'}
                    <span className="text-rose-500">❤️</span>
                  </button>
                  <button 
                    onClick={handleBlock}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    Block User
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 butter-scroll">
        {messages.map((msg) => {
          const senderId = typeof msg.sender === 'object' ? (msg.sender?._id || msg.sender) : msg.sender
          const isMine = senderId === user?.id
          const status = msg.status || (msg.readBy?.includes(friendId) ? 'read' : 'sent')
          
          return (
            <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-3.5 py-2 shadow-[0_1px_1.5px_rgba(0,0,0,0.12)] relative ${
                  isMine 
                    ? 'bg-[#d9fdd3] text-slate-800 dark:bg-[#005c4b] dark:text-stone-100 rounded-tr-sm' 
                    : 'bg-white text-slate-800 dark:bg-stone-800 dark:text-stone-100 rounded-tl-sm'
                }`}
              >
                <p className="text-[14.5px] md:text-[15px] leading-relaxed pr-1 whitespace-pre-wrap break-words">{msg.text}</p>
                <div className={`flex items-center justify-end gap-1 mt-0.5 ${isMine ? 'opacity-60' : 'opacity-40'}`}>
                  <span className="text-[9px] md:text-[10px] font-medium font-sans">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isMine && renderTicks(status)}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-2 md:p-3 pb-4 md:pb-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/50">
        <div className="flex items-center gap-2 relative max-w-5xl mx-auto">
          <input 
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Message..."
            className="flex-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-full px-4 py-2.5 md:py-3 outline-none focus:border-stone-400 dark:focus:border-stone-600 transition-colors text-sm md:text-base"
          />
          <button 
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-full hover:scale-105 active:scale-90 transition-all disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </div>
        {showTableSettings && chatType === 'table' && (
          <TableSettingsModal 
            tableId={friendId} 
            tableName={currentName} 
            onClose={() => setShowTableSettings(false)} 
            onDelete={() => onBack()}
          />
        )}
        {showFriendProfile && chatType === 'friend' && (
          <FriendProfileModal
            friendId={friendId}
            onClose={() => setShowFriendProfile(false)}
          />
        )}
      </form>
    </div>
  )
}
