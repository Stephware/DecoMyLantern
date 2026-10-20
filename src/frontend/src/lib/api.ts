export type Owner = { id: string }
export type OwnerIssue = { owner: Owner; recoveryCode: string }

export type CreatedInvitation = { id: string; token: string; expiresAtUtc: string }
export type PublicLight = { id: string; slotIndex: number }
export type InvitationPreview = {
  designKey: string
  patternKey: string
  acceptedFriends: number
  growthPoints: number
  growthStage: string
  alreadyContributed: boolean
  lights: PublicLight[]
}
export type GuestContributionResult = {
  contributionId: string
  slotIndex: number
  messageSaved: boolean
  parol: InvitationPreview
}

export type ContributionLight = { id: string; slotIndex: number; displayName: string }

export type Lantern = {
  id: string
  seasonYear: number
  designKey: string
  paletteKey: string
  patternKey: string
  acceptedFriends: number
  growthPoints: number
  maxReachedFriends: number
  growthStage: string
  unlockAtUtc: string
  createdAtUtc: string
  lights: ContributionLight[]
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

async function csrfToken(path: string): Promise<string> {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store' })
  if (!response.ok) throw new ApiError(response.status, 'Unable to initialize secure request. Refresh the page.')
  const data = await response.json() as { token: string }
  return data.token
}

async function api<T>(path: string, options: RequestInit = {}, csrfPath = '/api/owner/csrf'): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase()
  const modifying = !['GET', 'HEAD', 'OPTIONS'].includes(method)
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (modifying) headers.set('X-CSRF-TOKEN', await csrfToken(csrfPath))

  const response = await fetch(path, {
    ...options, headers, credentials: 'same-origin',
    cache: 'no-store',
  })
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    throw new ApiError(response.status, errorMessage(payload,
      response.status === 429 ? 'Too many attempts. Please wait and try again.' : 'Something went wrong. Please try again.'))
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const getOwner = () => api<Owner>('/api/owner/me')
export const createOwner = () =>
  api<OwnerIssue>('/api/owner/create', { method: 'POST' })
export const recoverOwner = (recoveryCode: string) =>
  api<{ owner: Owner }>('/api/owner/recover', { method: 'POST', body: JSON.stringify({ recoveryCode }) })
export const getLegacyOwner = () => api<{ available: boolean }>('/api/owner/legacy-available')
export const upgradeLegacyOwner = () =>
  api<OwnerIssue>('/api/owner/upgrade-legacy', { method: 'POST' }, '/api/owner/legacy-csrf')
export const signOutOwner = () => api<void>('/api/owner/sign-out', { method: 'POST' })
export const finishOwnerSetup = () => api<void>('/api/owner/finish-setup', { method: 'POST' })
export const cancelOwnerCreation = () => api<void>('/api/owner/cancel-creation', { method: 'POST' })

export const getMyLantern = () => api<Lantern>('/api/my/lantern')
export const createMyLantern = () => api<Lantern>('/api/my/lantern', { method: 'POST' })
export const updateMyLantern = (designKey: string, patternKey: string) =>
  api<Lantern>('/api/my/lantern', { method: 'PUT', body: JSON.stringify({ designKey, patternKey }) })
export const getDesigns = () => api<Design[]>('/api/designs')

export const createInvitation = () =>
  api<CreatedInvitation>('/api/my/lantern/invitations', { method: 'POST' })
export const previewInvitation = (token: string) =>
  api<InvitationPreview>('/api/invitations/preview',
    { method: 'POST', body: JSON.stringify({ token }) }, '/api/invitations/csrf')
export const contributeInvitation = (token: string, displayName: string, message: string) =>
  api<GuestContributionResult>('/api/invitations/contribute',
    { method: 'POST', body: JSON.stringify({ token, displayName, message }) }, '/api/invitations/csrf')
