import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthUser } from './authContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('filotem_token'))
  const [isLoading, setIsLoading] = useState(true)

  // Verify existing token on startup
  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { 'x-auth-token': token },
        })

        if (res.ok) {
          const userData = await res.json()
          setUser(userData)
        } else {
          // Token expired
          localStorage.removeItem('filotem_token')
          setToken(null)
        }
      } catch {
        // Backend unreachable — clear stale token
        console.warn('Auth verification failed — backend may be offline')
      } finally {
        setIsLoading(false)
      }
    }

    verify()
  }, [token])

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.msg || 'Login failed')

    localStorage.setItem('filotem_token', data.token)
    setToken(data.token)
    setUser(data.user)
  }, [])

  const register = useCallback(
    async (name: string, username: string, email: string, password: string) => {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, email, password }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.msg || 'Registration failed')

      localStorage.setItem('filotem_token', data.token)
      setToken(data.token)
      setUser(data.user)
    },
    [],
  )

  const logout = useCallback(() => {
    localStorage.removeItem('filotem_token')
    setToken(null)
    setUser(null)
  }, [])

  const refreshSession = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'x-auth-token': token },
      })
      if (res.ok) {
        setUser(await res.json())
      }
    } catch (err) {
      console.error(err)
    }
  }, [token])

  const value = useMemo(
    () => ({ user, token, isLoading, login, register, logout, refreshSession }),
    [user, token, isLoading, login, register, logout, refreshSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
