
import { useState } from 'react'
import { AuthProvider } from './context/AuthProvider'
import { ThemeProvider } from './context/ThemeProvider'
import { useAuth } from './context/useAuth'
import { AuthPage } from './pages/AuthPage'
import { CoverPage } from './pages/CoverPage'
import FilotemApp from './apps/FilotemApp'

function AuthGate() {
  const { user, isLoading } = useAuth()
  const [showCover, setShowCover] = useState(true)

  if (showCover) {
    return <CoverPage onLaunch={() => setShowCover(false)} />
  }

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-stone-50 dark:bg-stone-950">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-8 w-8 animate-spin text-stone-400 dark:text-stone-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm font-medium text-stone-500 dark:text-stone-400">Loading session…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  return <FilotemApp />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ThemeProvider>
  )
}
