import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation, useMatch } from 'react-router-dom'
import { ChatRoom } from './Filotem/ChatRoom'
import { NetworkingTab } from './Filotem/NetworkingTab'
import { TableTab } from './Filotem/TableTab'
import { ProfileModal } from './Filotem/Modals/ProfileModal'
import { NotesApp } from './Notes/NotesApp'
import { AppLauncherModal } from '../components/AppLauncherModal'
import { Logo } from '../components/Logo'
import { useAuth } from '../context/useAuth'
import { useSocket } from '../context/useSocket'
import { useTheme } from '../context/useTheme'
import { useInitData } from '../hooks/useInitData'
import { setNavBackHandler } from '../utils/backButton'

export default function FilotemApp() {
  const { user, logout } = useAuth()
  const { socket, setUnreadCounts } = useSocket()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [showAppLauncher, setShowAppLauncher] = useState(false)

  // Server-state cached via TanStack Query
  const {
    friends,
    tables,
    requests,
    badgeRequests,
    unreadCounts,
    isLoading: isInitialLoading,
    invalidate
  } = useInitData()

  // Route-driven state
  const isNotesApp = location.pathname.startsWith('/app/notes')
  const isNetworkTab = location.pathname.startsWith('/app/network')
  const activeTab: 'table' | 'network' = isNetworkTab ? 'network' : 'table'

  const chatMatch = useMatch('/app/chat/:chatType/:chatId')
  const activeChatType = chatMatch?.params.chatType as 'friend' | 'table' | undefined
  const activeChatId = chatMatch?.params.chatId

  const activeFriend = activeChatType === 'friend' ? friends.find(f => f._id === activeChatId) : null
  const activeTable = activeChatType === 'table' ? tables.find(t => t._id === activeChatId) : null

  const activeChat = activeChatId ? {
    id: activeChatId,
    name: activeFriend?.name || activeTable?.name || 'Chat',
    type: activeChatType || 'friend',
    avatar: activeFriend?.avatar || activeTable?.avatar
  } : null

  // Sync unread counts with SocketContext
  useEffect(() => {
    if (unreadCounts && Object.keys(unreadCounts).length > 0) {
      setUnreadCounts(unreadCounts)
    }
  }, [unreadCounts, setUnreadCounts])

  // Real-time invalidation via socket events
  useEffect(() => {
    if (!socket) return
    const handleRefresh = () => invalidate()

    socket.on('table_created', handleRefresh)
    socket.on('table_deleted', handleRefresh)
    socket.on('friend_request', handleRefresh)
    socket.on('friend_accepted', handleRefresh)
    socket.on('friend_removed', handleRefresh)
    socket.on('badge_request', handleRefresh)

    return () => {
      socket.off('table_created', handleRefresh)
      socket.off('table_deleted', handleRefresh)
      socket.off('friend_request', handleRefresh)
      socket.off('friend_accepted', handleRefresh)
      socket.off('friend_removed', handleRefresh)
      socket.off('badge_request', handleRefresh)
    }
  }, [socket, invalidate])

  // Android hardware back button handler
  useEffect(() => {
    setNavBackHandler(() => {
      if (showAppLauncher) {
        setShowAppLauncher(false)
        return true
      }
      if (isNotesApp) {
        navigate('/app')
        return true
      }
      if (activeChat) {
        navigate('/app')
        return true
      }
      if (isNetworkTab) {
        navigate('/app')
        return true
      }
      return false
    })

    return () => {
      setNavBackHandler(null)
    }
  }, [showAppLauncher, isNotesApp, activeChat, isNetworkTab, navigate])

  const handleSelectFriend = (id: string) => {
    navigate(`/app/chat/friend/${id}`)
  }

  const handleSelectTable = (id: string) => {
    navigate(`/app/chat/table/${id}`)
  }

  const handleBackToTable = () => {
    navigate('/app')
  }

  const handleTableDeleted = () => {
    invalidate()
    navigate('/app')
  }

  if (isInitialLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-white dark:bg-stone-950 transition-colors duration-500">
        <div className="w-16 h-16 mb-4">
          <Logo className="w-full h-full text-stone-900 dark:text-stone-100 animate-pulse" />
        </div>
        <p className="text-sm font-bold tracking-[0.2em] text-stone-400 uppercase animate-pulse">Filotem is starting</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex h-screen w-full bg-white dark:bg-stone-950 overflow-hidden text-stone-900 dark:text-stone-100 transition-colors duration-200">
        
        {/* If user is inside a dedicated standalone micro-app like Notes */}
        {isNotesApp ? (
          <div className="flex-1 h-full flex flex-col overflow-hidden">
            {/* Minimal App Header */}
            <div className="flex items-center justify-between p-3 px-4 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAppLauncher(true)}
                  className="p-1.5 -ml-1 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-all"
                  title="Open App Launcher"
                >
                  <div className="grid grid-cols-3 gap-0.5 w-5 h-5 p-0.5">
                    <span className="w-1 h-1 bg-current rounded-sm"></span>
                    <span className="w-1 h-1 bg-current rounded-sm"></span>
                    <span className="w-1 h-1 bg-current rounded-sm"></span>
                    <span className="w-1 h-1 bg-current rounded-sm"></span>
                    <span className="w-1 h-1 bg-current rounded-sm"></span>
                    <span className="w-1 h-1 bg-current rounded-sm"></span>
                    <span className="w-1 h-1 bg-current rounded-sm"></span>
                    <span className="w-1 h-1 bg-current rounded-sm"></span>
                    <span className="w-1 h-1 bg-current rounded-sm"></span>
                  </div>
                </button>
                <span className="text-lg">📝</span>
                <h1 className="font-bold text-base font-sans tracking-tight">Filotem Notes</h1>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={toggleTheme}
                  className="p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors outline-none"
                  title="Toggle Theme"
                >
                  {theme === 'dark' ? (
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                  ) : (
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                  )}
                </button>
                <button
                  onClick={() => navigate('/app')}
                  className="px-3 py-1.5 text-xs font-bold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded-xl hover:scale-105 active:scale-95 transition-all"
                >
                  Friends Table
                </button>
              </div>
            </div>

            {/* Notes Body */}
            <div className="flex-1 overflow-hidden">
              <NotesApp />
            </div>
          </div>
        ) : (
          /* Default Flagship App: Friends Table */
          <>
            {/* Sidebar Area */}
            <div className={`
              flex-col w-full md:w-80 h-full border-r border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/50 transition-all duration-300
              ${activeChat ? 'hidden md:flex' : 'flex'}
            `}>
              {/* Header Branding with App Launcher */}
              <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm z-10 transition-colors duration-200">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setShowAppLauncher(true)}
                    className="p-1.5 -ml-1 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-all"
                    title="Open App Launcher"
                  >
                    <div className="grid grid-cols-3 gap-0.5 w-5 h-5 p-0.5">
                      <span className="w-1 h-1 bg-current rounded-sm"></span>
                      <span className="w-1 h-1 bg-current rounded-sm"></span>
                      <span className="w-1 h-1 bg-current rounded-sm"></span>
                      <span className="w-1 h-1 bg-current rounded-sm"></span>
                      <span className="w-1 h-1 bg-current rounded-sm"></span>
                      <span className="w-1 h-1 bg-current rounded-sm"></span>
                      <span className="w-1 h-1 bg-current rounded-sm"></span>
                      <span className="w-1 h-1 bg-current rounded-sm"></span>
                      <span className="w-1 h-1 bg-current rounded-sm"></span>
                    </div>
                  </button>
                  <div className="w-7 h-7 flex items-center justify-center">
                    <Logo className="w-full h-full text-stone-900 dark:text-stone-100" />
                  </div>
                  <h1 className="font-bold text-lg font-sans tracking-tight shrink-0">Filotem</h1>
                </div>
                
                <button 
                  onClick={toggleTheme}
                  className="p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors outline-none"
                  title="Toggle Theme"
                >
                  {theme === 'dark' ? (
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                  ) : (
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                  )}
                </button>
              </div>

              {/* Tab Navigation Menu */}
              <div className="flex px-4 pt-4 gap-2 pb-2">
                <button 
                  onClick={() => navigate('/app')}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    activeTab === 'table' 
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-md' 
                      : 'bg-stone-200 text-stone-600 hover:bg-stone-300 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700'
                  }`}
                >
                  My Table
                </button>
                <button 
                  onClick={() => navigate('/app/network')}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    activeTab === 'network' 
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-md' 
                      : 'bg-stone-200 text-stone-600 hover:bg-stone-300 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700'
                  }`}
                >
                  Network
                </button>
              </div>

              {/* Dynamic Content List (Friends / Search) */}
              <div className="flex-1 overflow-hidden p-0 pt-0 flex flex-col relative w-full h-full">
                 <AnimatePresence mode="wait">
                   {activeTab === 'table' ? (
                     <motion.div 
                       key="table"
                       initial={{ x: -10, opacity: 0 }}
                       animate={{ x: 0, opacity: 1 }}
                       exit={{ x: 10, opacity: 0 }}
                       transition={{ duration: 0.15, ease: "easeOut" }}
                       className="flex-1 h-full w-full px-4 overflow-hidden flex flex-col"
                     >
                       <TableTab 
                         onSelectFriend={handleSelectFriend} 
                         onSelectTable={handleSelectTable} 
                         activeChatId={activeChat?.id} 
                         tables={tables}
                         friends={friends}
                       />
                     </motion.div>
                   ) : (
                     <motion.div 
                       key="network"
                       initial={{ x: 10, opacity: 0 }}
                       animate={{ x: 0, opacity: 1 }}
                       exit={{ x: -10, opacity: 0 }}
                       transition={{ duration: 0.15, ease: "easeOut" }}
                       className="flex-1 h-full w-full px-4 overflow-hidden flex flex-col"
                     >
                       <NetworkingTab 
                         requests={requests}
                         badgeRequests={badgeRequests}
                         onRefresh={invalidate}
                       />
                     </motion.div>
                   )}
                 </AnimatePresence>
              </div>

              {/* Bottom User Profile Section */}
              <div className="mt-auto border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center font-bold text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 overflow-hidden">
                     {user?.avatar ? (
                        <img src={user.avatar} className="w-full h-full object-cover" alt="User avatar" />
                     ) : (
                        user?.name?.[0]?.toUpperCase()
                     )}
                   </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-stone-900 dark:text-stone-100 truncate text-sm leading-tight">
                        {user?.name}
                      </p>
                      <p className="text-[11px] text-stone-500 truncate leading-tight mt-0.5">@{user?.username}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setShowProfileSettings(true)}
                      className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-white dark:hover:bg-stone-800 rounded-xl transition-all font-semibold outline-none group"
                      title="Profile Settings"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button 
                      onClick={logout}
                      title="Log Out"
                      className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                    </button>
                  </div>
                </div>
              </div>

            {/* Main Content Area (Chat Room) */}
            <div className={`
              flex-1 h-full bg-stone-50/30 dark:bg-stone-950/50 transition-all duration-300
              ${!activeChat ? 'hidden md:flex' : 'flex'}
            `}>
              {activeChat ? (
                <div className="w-full h-full p-0 md:p-4">
                  <div className="flex-1 w-full h-full max-w-6xl mx-auto shadow-2xl rounded-t-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/40">
                     <ChatRoom 
                       friendId={activeChat.id} 
                       friendName={activeChat.name} 
                       chatType={activeChat.type}
                       avatar={activeChat.avatar}
                       onBack={handleBackToTable} 
                       onDeleteTable={handleTableDeleted}
                     />
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-stone-400">
                  <div className="w-24 h-24 mb-6 rounded-full bg-stone-100 dark:bg-stone-900 flex items-center justify-center border border-stone-200 dark:border-stone-800 shadow-inner">
                     <svg className="text-stone-300 dark:text-stone-700" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/></svg>
                  </div>
                  <h3 className="text-xl font-medium text-stone-600 dark:text-stone-300 mb-2">Filotem Messages</h3>
                  <p className="text-sm font-medium text-stone-500">Select a friend or table to start chatting</p>
                </div>
              )}
            </div>
          </>
        )}

      </div>

      {/* Modals */}
      {showProfileSettings && <ProfileModal onClose={() => setShowProfileSettings(false)} />}
      {showAppLauncher && (
        <AppLauncherModal 
          activeAppId={isNotesApp ? 'notes' : 'friends-table'} 
          onClose={() => setShowAppLauncher(false)} 
        />
      )}
    </>
  )
}
