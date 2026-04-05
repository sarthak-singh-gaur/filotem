import React, { createContext, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './useAuth'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'
import { motion, AnimatePresence } from 'framer-motion'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

interface SocketContextType {
  socket: Socket | null
  unreadCounts: Record<string, number>
  setUnreadCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>
  onlineUsers: Set<string>
  requestNotificationPermission: () => Promise<void>
  toast: { msg: string; type: 'info' | 'success' } | null
  setToast: (toast: { msg: string; type: 'info' | 'success' } | null) => void
}

export const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ msg: string; type: 'info' | 'success' } | null>(null)
  const socketRef = useRef<Socket | null>(null)

  const requestNotificationPermission = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await LocalNotifications.requestPermissions()
        if (perm.display === 'granted') {
          setToast({ msg: 'Notifications Enabled!', type: 'success' })
        }
      } catch (err) {
        console.error('Permission Request Error:', err)
      }
    } else if ('Notification' in window) {
      const perm = await Notification.requestPermission()
      if (perm === 'granted') {
        setToast({ msg: 'Notifications Enabled!', type: 'success' })
      }
    }
  }

  // Auto-hide toast after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Initialize Socket
  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setSocket(null)
      }
      return
    }

    const newSocket = io(API_URL, {
      auth: { token }
    })

    socketRef.current = newSocket
    setSocket(newSocket)

    newSocket.on('connect', () => {
      newSocket.emit('register_user', user.id)
    })

    // Global Listeners
    newSocket.on('user_online', (userId: string) => {
      setOnlineUsers(prev => new Set([...prev, userId]))
    })

    newSocket.on('user_offline', (userId: string) => {
      setOnlineUsers(prev => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    })

    const playNotificationSound = () => {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
      audio.volume = 0.5
      audio.play().catch(e => console.log('Audio play failed:', e))
    }

    const showNotification = async (title: string, body: string) => {
      if (Capacitor.isNativePlatform()) {
        try {
          const perm = await LocalNotifications.checkPermissions()
          if (perm.display === 'granted') {
             await LocalNotifications.schedule({
                notifications: [
                  {
                    title,
                    body,
                    id: Date.now(),
                    schedule: { at: new Date(Date.now() + 100) },
                    sound: 'beep.wav'
                  }
                ]
             })
          }
        } catch (err) {
          console.error('Local Notification Error:', err)
        }
      } else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body })
      }
    }

    newSocket.on('receive_message', (msg: any) => {
      if (msg.sender === user.id) return

      if (user.allowNotifications) {
        playNotificationSound()
        showNotification("New Message", msg.text)
      }

      const mappedChatId = msg.chatType === 'table' ? msg.receiver : msg.sender
      
      setUnreadCounts(prev => ({
        ...prev,
        [mappedChatId]: (prev[mappedChatId] || 0) + 1
      }))
    })

    // LIVELINESS LISTENERS
    newSocket.on('friend_request', (data: any) => {
        showNotification("New Friend Request", `${data.from.name} sent you a request!`)
        setToast({ msg: `New friend request from ${data.from.name}`, type: 'info' })
    })

    newSocket.on('friend_accepted', (data: any) => {
        setToast({ msg: data.msg, type: 'success' })
    })

    newSocket.on('badge_request', (data: any) => {
        const typeStr = data.type === 'bestFriend' ? 'Star' : 'Heart'
        showNotification("Badge Request", `${data.from.name} wants to give you a ${typeStr} badge!`)
        setToast({ msg: `${data.from.name} sent a badge request!`, type: 'info' })
    })

    // Group related notifications
    newSocket.on('table_created', (table: any) => {
        setToast({ msg: `You were added to a new table: ${table.name}`, type: 'info' })
    })

    newSocket.on('table_deleted', () => {
        setToast({ msg: `A table was deleted.`, type: 'info' })
    })

    return () => {
      newSocket.disconnect()
      socketRef.current = null
      setSocket(null)
    }
  }, [token, user?.id, user?.allowNotifications])

  return (
    <SocketContext.Provider value={{ socket, unreadCounts, setUnreadCounts, onlineUsers, requestNotificationPermission, toast, setToast }}>
      {children}
      
      {/* GLOBAL TOAST OVERLAY */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            className={`fixed top-6 left-1/2 z-[9999] px-6 py-3 rounded-full shadow-2xl border text-sm font-bold flex items-center gap-3 cursor-pointer whitespace-nowrap overflow-hidden ${
              toast.type === 'success' 
                ? 'bg-green-500 text-white border-green-400' 
                : 'bg-stone-900 text-white border-stone-800 dark:bg-stone-50 dark:text-stone-900 shadow-[0_8px_30px_rgb(0,0,0,0.2)]'
            }`}
            onClick={() => setToast(null)}
          >
            <span className="text-lg">{toast.type === 'success' ? '✅' : '🔔'}</span>
            <span className="max-w-[250px] truncate">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </SocketContext.Provider>
  )
}

