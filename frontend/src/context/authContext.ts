import { createContext } from 'react'

export interface AuthUser {
  id: string
  name: string
  username: string
  email: string
  bio: string
  status: string
  avatar?: string
  allowNotifications?: boolean
  publicOnlineStatus?: boolean
  bestFriendId?: string | null
  loverId?: string | null
}

export interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (name: string, username: string, email: string, password: string) => Promise<void>
  logout: () => void
  refreshSession: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
