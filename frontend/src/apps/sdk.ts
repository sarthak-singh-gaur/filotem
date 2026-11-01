import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useTheme } from '../context/useTheme'
import { useSocket } from '../context/useSocket'
import { getAppByPath, getAppById, type AppManifest } from './registry'

/**
 * Platform App SDK
 * Provides pluggable micro-apps access to common shell primitives.
 */

export function usePlatformUser() {
  const { user, refreshSession, logout } = useAuth()
  return { user, refreshSession, logout }
}

export function usePlatformTheme() {
  const { theme, toggleTheme } = useTheme()
  return {
    theme,
    toggleTheme,
    isDark: theme === 'dark'
  }
}

export function usePlatformSocket() {
  const { socket, onlineUsers, toast, setToast, unreadCounts } = useSocket()
  return { socket, onlineUsers, toast, setToast, unreadCounts }
}

export function usePlatformNavigation() {
  const navigate = useNavigate()
  const location = useLocation()

  const currentApp: AppManifest = getAppByPath(location.pathname) || (getAppById('friends-table') as AppManifest)

  const switchApp = (appId: string) => {
    const target = getAppById(appId)
    if (target) {
      navigate(target.route)
    }
  }

  return {
    navigate,
    currentPath: location.pathname,
    currentApp,
    switchApp
  }
}

