import { useState } from 'react'
import { ChatRoom } from './Filotem/ChatRoom'
import { NetworkingTab } from './Filotem/NetworkingTab'
import { TableTab } from './Filotem/TableTab'
import { ProfileModal } from './Filotem/Modals/ProfileModal'
import { Logo } from '../components/Logo'
import { useAuth } from '../context/useAuth'

export default function FilotemApp() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'table' | 'network'>('table')
  const [activeChat, setActiveChat] = useState<{ id: string, name: string, type: 'friend' | 'table', avatar?: string } | null>(null)
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return true
  })

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark')
      setIsDarkMode(false)
    } else {
      document.documentElement.classList.add('dark')
      setIsDarkMode(true)
    }
  }

  const handleSelectFriend = (id: string, name: string, avatar?: string) => {
    setActiveChat({ id, name, type: 'friend', avatar })
  }

  const handleSelectTable = (id: string, name: string, avatar?: string) => {
    setActiveChat({ id, name, type: 'table', avatar })
  }

  const handleBackToTable = () => {
    setActiveChat(null)
  }

  return (
    <>
      <div className="flex h-screen w-full bg-white dark:bg-stone-950 overflow-hidden text-stone-900 dark:text-stone-100 transition-colors duration-200">
        
        {/* Sidebar Area */}
        <div className={`
          flex-col w-full md:w-80 h-full border-r border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/50 transition-all duration-300
          ${activeChat ? 'hidden md:flex' : 'flex'}
        `}>
          {/* Header Branding */}
          <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm z-10 transition-colors duration-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <Logo className="w-full h-full text-stone-900 dark:text-stone-100" />
              </div>
              <h1 className="font-bold text-lg font-sans tracking-tight shrink-0">Filotem</h1>
            </div>
            
            <button 
              onClick={toggleTheme}
              className="p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors outline-none"
              title="Toggle Theme"
            >
              {isDarkMode ? (
                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
              ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
              )}
            </button>
          </div>

          {/* Tab Navigation Menu */}
          <div className="flex px-4 pt-4 gap-2 pb-2">
            <button 
              onClick={() => { setActiveTab('table'); setActiveChat(null); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'table' 
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-md' 
                  : 'bg-stone-200 text-stone-600 hover:bg-stone-300 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700'
              }`}
            >
              My Table
            </button>
            <button 
              onClick={() => setActiveTab('network')}
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
          <div className="flex-1 overflow-hidden p-4 pt-2">
             {activeTab === 'table' && <TableTab onSelectFriend={handleSelectFriend} onSelectTable={handleSelectTable} activeChatId={activeChat?.id} />}
             {activeTab === 'network' && <NetworkingTab />}
          </div>

          {/* Bottom User Profile Section */}
          <div className="mt-auto border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center font-bold text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 overflow-hidden">
                 {user?.avatar ? (
                    <img src={user.avatar} className="w-full h-full object-cover" />
                 ) : (
                    user?.name?.[0]?.toUpperCase()
                 )}
               </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-stone-900 dark:text-stone-100 truncate text-sm leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
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
              <div className="flex-1 overflow-y-auto w-full h-full max-w-6xl mx-auto shadow-2xl rounded-t-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/40">
                 <ChatRoom 
                   friendId={activeChat.id} 
                   friendName={activeChat.name} 
                   chatType={activeChat.type}
                   avatar={activeChat.avatar}
                   onBack={handleBackToTable} 
                 />
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-stone-400">
              <div className="w-24 h-24 mb-6 rounded-full bg-stone-100 dark:bg-stone-900 flex items-center justify-center border border-stone-200 dark:border-stone-800 shadow-inner">
                 <svg className="text-stone-300 dark:text-stone-700" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/></svg>
              </div>
              <h3 className="text-xl font-medium text-stone-600 dark:text-stone-300 mb-2">Filotem Messages</h3>
              <p className="text-sm font-medium text-stone-500">Select a friend to start chatting</p>
            </div>
          )}
        </div>

      </div>
      {showProfileSettings && <ProfileModal onClose={() => setShowProfileSettings(false)} />}
    </>
  )
}
