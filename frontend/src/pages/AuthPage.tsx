import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/useAuth'
import { Logo } from '../components/Logo'

export function AuthPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'login') {
        await login(username, password)
      } else {
        await register(name, username, email, password)
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setMode(m => (m === 'login' ? 'register' : 'login'))
    setError('')
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-stone-50 px-4 dark:bg-stone-950">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-gradient-to-br from-blue-400/10 to-purple-500/10 blur-3xl dark:from-blue-500/5 dark:to-purple-600/5" />
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-gradient-to-tl from-amber-400/10 to-rose-400/10 blur-3xl dark:from-amber-500/5 dark:to-rose-500/5" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo / Brand */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center">
            <Logo className="w-full h-full text-stone-900 dark:text-stone-100 drop-shadow-md" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Filotem
          </h1>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
            {mode === 'login' ? 'Welcome back to the platform' : 'Create your Filotem account'}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-stone-200/80 bg-white/70 p-8 shadow-xl shadow-stone-200/30 backdrop-blur-xl dark:border-stone-800/80 dark:bg-stone-900/70 dark:shadow-stone-950/30">
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
              <InputField
                id="auth-name"
                label="Full Name"
                type="text"
                value={name}
                onChange={setName}
                placeholder="Sarthak Singh"
                autoComplete="name"
              />
            )}

            <InputField
              id="auth-username"
              label="Username"
              type="text"
              value={username}
              onChange={setUsername}
              placeholder="sarto_69"
              autoComplete="username"
            />

            {mode === 'register' && (
              <InputField
                id="auth-email"
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                autoComplete="email"
              />
            )}

            <InputField
              id="auth-password"
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-stone-900/20 transition-all hover:bg-stone-800 hover:shadow-xl active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100 dark:bg-stone-100 dark:text-stone-900 dark:shadow-stone-950/10 dark:hover:bg-stone-200"
            >
              {loading ? (
                <svg
                  className="h-5 w-5 animate-spin text-current"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : mode === 'login' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-stone-500 dark:text-stone-400">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={toggleMode}
              className="font-semibold text-stone-900 underline decoration-stone-400/50 decoration-1 underline-offset-2 transition-colors hover:text-stone-700 dark:text-stone-200 dark:decoration-stone-600/50 dark:hover:text-stone-300"
            >
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-stone-400 dark:text-stone-600">
          By continuing you agree to Filotem's Terms of Service
        </p>
      </div>
    </div>
  )
}

/* ─── Reusable Input ─── */
function InputField({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="block w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-2.5 text-sm text-stone-900 outline-none transition-all placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-200 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-stone-500 dark:focus:ring-stone-700"
      />
    </div>
  )
}
