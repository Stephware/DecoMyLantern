export type Host = { id: string; email: string }

export type Lantern = {
  id: string
  seasonYear: number
  designKey: string
  paletteKey: string
  patternKey: string
  acceptedFriends: number
  growthStage: string
  nextMilestone: number | null
  unlockAtUtc: string
  createdAtUtc: string
}

export type Design = {
  designKey: string
  name: string
  assetKey: string
  requiredFriends: number
}

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

function errorMessage(data: unknown, fallback: string): string {
  if (typeof data !== 'object' || data === null) return fallback
  const payload = data as { message?: string; title?: string; errors?: Record<string, string[]> }
  if (payload.message) return payload.message
  if (payload.errors) {
    const messages = Object.values(payload.errors).flat()
    if (messages.length) return messages.join(' ')
  }
  return payload.title ?? fallback
}

async function csrfToken(): Promise<string> {
  const response = await fetch('/api/auth/csrf', { credentials: 'same-origin' })
  if (!response.ok) throw new ApiError(response.status, 'Unable to initialize secure request. Try refreshing the page.')
  const data = await response.json() as { token: string }
  return data.token
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase()
  const modifying = !['GET', 'HEAD', 'OPTIONS'].includes(method)
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (modifying) headers.set('X-CSRF-TOKEN', await csrfToken())

  const response = await fetch(path, { ...options, headers, credentials: 'same-origin' })
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    throw new ApiError(response.status, errorMessage(payload, 'Something went wrong. Please try again.'))
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const getMe = () => api<Host>('/api/auth/me')
export const registerHost = (email: string, password: string) =>
  api<Host>('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) })
export const loginHost = (email: string, password: string) =>
  api<Host>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
export const logoutHost = () => api<void>('/api/auth/logout', { method: 'POST' })
export const getMyLantern = () => api<Lantern>('/api/my/lantern')
export const createMyLantern = () => api<Lantern>('/api/my/lantern', { method: 'POST' })
export const updateMyLantern = (designKey: string, patternKey: string) =>
  api<Lantern>('/api/my/lantern', { method: 'PUT', body: JSON.stringify({ designKey, patternKey }) })
export const getDesigns = () => api<Design[]>('/api/designs')
