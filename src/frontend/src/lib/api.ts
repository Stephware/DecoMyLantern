export type Owner = { id: string }
export type OwnerIssue = { owner: Owner; recoveryCode: string }
export type OwnerRecoveryKey = { available: boolean; recoveryCode: string | null; expiresAtUtc: string }

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
  isAdmin: boolean
  lights: ContributionLight[]
}

export type ChristmasLetter = {
  id: string
  displayName: string
  createdAtUtc: string
  isLocked: boolean
  body: string | null
}

export type ChristmasInbox = {
  unlocked: boolean
  unlockAtUtc: string
  messages: ChristmasLetter[]
}

export type Design = {
  designKey: string
  name: string
  assetKey: string
  requiredFriends: number
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
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

async function csrfToken(path: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', signal })
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
// Both use authenticated owner cookies and CSRF; the plaintext is never stored locally.
export const getOwnerRecoveryKey = () =>
  api<OwnerRecoveryKey>('/api/owner/recovery-key', { method: 'POST' })
export const replaceOwnerRecoveryKey = () =>
  api<OwnerRecoveryKey>('/api/owner/replace-recovery-key', { method: 'POST' })
export const signOutOwner = () => api<void>('/api/owner/sign-out', { method: 'POST' })
export const finishOwnerSetup = () => api<void>('/api/owner/finish-setup', { method: 'POST' })
export const cancelOwnerCreation = () => api<void>('/api/owner/cancel-creation', { method: 'POST' })

// Story exports are binary, so do not use the JSON-only api<T> helper.
export async function exportStoryMedia(kind: 'owner' | 'friend', format: 'mp4' | 'png', token?: string, signal?: AbortSignal): Promise<Blob> {
  const guest = kind === 'friend'
  if (guest && !token) throw new Error('Missing invitation for this Story.')
  const response = await fetch(guest ? '/api/invitations/story' : '/api/my/lantern/story', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
    headers: { 'Content-Type': 'application/json',
      'X-CSRF-TOKEN': await csrfToken(guest ? '/api/invitations/csrf' : '/api/owner/csrf', signal) },
    body: JSON.stringify(guest ? {format,token} : {format}),
  })
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    throw new ApiError(response.status, errorMessage(body,
      response.status === 429 ? 'Too many exports. Try again later.' : 'Story export is unavailable.'))
  }
  const expectedMime = format === 'png' ? 'image/png' : 'video/mp4'
  if (response.headers.get('content-type')?.split(';')[0]?.trim() !== expectedMime)
    throw new Error('The server returned an unexpected Story media format.')
  return response.blob()
}

export type AuthorizedStoryComposition = {
  kind:'owner'|'friend'; designKey:string; patternKey:string; friendCount:number;
  slots:number[]; highlightSlot:number|null; format:'mp4'
}
export type StoryJobStatus = {
  id:string; status:'queued'|'rendering'|'completed'|'failed'|'cancelled';
  progress:number; position:number; error:string|null
}

async function storyAction(kind:'owner'|'friend', action:string, token:string|undefined,
  id:string|undefined, signal?:AbortSignal):Promise<Response> {
  if (kind==='friend' && !token) throw new Error('Missing invitation for this Story.')
  const guest=kind==='friend'
  const route=guest?'/api/invitations/story':'/api/my/lantern/story'
  const response=await fetch(`${route}/${action}`,{
    method:'POST',credentials:'same-origin',cache:'no-store',signal,
    headers:{'Content-Type':'application/json',
      'X-CSRF-TOKEN':await csrfToken(guest?'/api/invitations/csrf':'/api/owner/csrf',signal)},
    body:JSON.stringify(guest?{token,id,format:'mp4'}:{id,format:'mp4'}),
  })
  if (!response.ok) {
    const body:unknown=await response.json().catch(()=>null)
    throw new ApiError(response.status,errorMessage(body,'Story export is unavailable.'))
  }
  return response
}

export async function fetchStoryComposition(kind:'owner'|'friend', token?:string,
  signal?:AbortSignal):Promise<AuthorizedStoryComposition> {
  const response=await storyAction(kind,'composition',token,undefined,signal)
  const data:AuthorizedStoryComposition=await response.json()
  if ((data.kind!==kind) || !Array.isArray(data.slots) ||
      !['classic','floral','festival','celestial','fiesta','sampaguita'].includes(data.designKey) ||
      !['default','rings','rays'].includes(data.patternKey) ||
      !Number.isSafeInteger(data.friendCount) || data.friendCount<0 || data.friendCount>10000 ||
      data.slots.length>500 || !data.slots.every(slot=>Number.isSafeInteger(slot)&&slot>=0&&slot<=100000) ||
      (data.highlightSlot!==null && !data.slots.includes(data.highlightSlot)))
    throw new Error('The server returned invalid Story composition data.')
  return data
}

export const startStoryJob=async(kind:'owner'|'friend',token?:string,signal?:AbortSignal):Promise<StoryJobStatus> =>
  (await storyAction(kind,'jobs/start',token,undefined,signal)).json()
export const storyJobStatus=async(kind:'owner'|'friend',id:string,token?:string,signal?:AbortSignal):Promise<StoryJobStatus> =>
  (await storyAction(kind,'jobs/status',token,id,signal)).json()
export async function storyJobFile(kind:'owner'|'friend',id:string,token?:string,signal?:AbortSignal):Promise<Blob> {
  const response=await storyAction(kind,'jobs/file',token,id,signal)
  if (response.headers.get('content-type')?.split(';')[0]?.trim()!=='video/mp4')
    throw new Error('The server returned an unexpected Story video format.')
  return response.blob()
}
export const cancelStoryJob=async(kind:'owner'|'friend',id:string,token?:string):Promise<void> => {
  await storyAction(kind,'jobs/cancel',token,id)
}

/**
 * Phase 3: fetch a flattened, already-fitted image of the saved parol.
 * The backend resolves authoritative design, count and slots; the browser
 * sends neither private names nor synthetic growth states.
 */
export async function fetchParolSnapshot(
  kind: 'owner' | 'guest',
  token?: string,
  signal?: AbortSignal,
  format: 'webp' | 'png' = 'webp',
): Promise<Blob> {
  if (kind === 'guest' && !token) throw new Error('Missing invitation token.')
  const guest = kind === 'guest'
  const csrfPath = guest ? '/api/invitations/csrf' : '/api/owner/csrf'
  const path = guest ? '/api/invitations/image' : '/api/my/lantern/image'
  const csrf = await csrfToken(csrfPath, signal)
  const response = await fetch(path, {
    method: 'POST', credentials: 'same-origin', cache: 'no-store', signal,
    headers: {'Content-Type':'application/json', 'X-CSRF-TOKEN':csrf},
    body: JSON.stringify(guest ? {token, format} : {format}),
  })
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    throw new ApiError(response.status, errorMessage(body,
      response.status === 503 ? 'The parol image renderer is busy. Please retry.' :
      response.status === 429 ? 'Too many image requests. Please try later.' :
      'Unable to load your parol image.'))
  }
  const expectedMime = format === 'png' ? 'image/png' : 'image/webp'
  if (response.headers.get('content-type')?.split(';')[0]?.trim() !== expectedMime)
    throw new Error('The server returned an unexpected parol image format.')
  return response.blob()
}

/** Share the actual saved parol art, not the separate vertical Story poster. */
export function exportParolImage(kind: 'owner' | 'friend', token?: string, signal?: AbortSignal): Promise<Blob> {
  return fetchParolSnapshot(kind === 'friend' ? 'guest' : 'owner', token, signal, 'png')
}

export const getMyLantern = () => api<Lantern>('/api/my/lantern')
export const getLanternMessages = (lanternId: string) =>
  api<ChristmasInbox>(`/api/my/lanterns/${encodeURIComponent(lanternId)}/messages`)
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
