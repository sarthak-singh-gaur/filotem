const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

interface FetchOptions extends RequestInit {
  data?: unknown
}

export async function authFetch(endpoint: string, options: FetchOptions = {}) {
  const token = localStorage.getItem('filotem_token')
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['x-auth-token'] = token
  }

  const config: RequestInit = {
    ...options,
    headers,
  }

  if (options.data) {
    config.body = JSON.stringify(options.data)
  }

  const response = await fetch(`${API_URL}${endpoint}`, config)
  
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody.msg || errorBody.error || `Error ${response.status}: ${response.statusText}`)
  }

  return response.json()
}
