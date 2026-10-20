const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16}$/

export function invitationTokenFromHash(hash: string): string | null {
  if (!hash.startsWith('#/i/') && !hash.startsWith('#/invite/')) return null
  // Keep invalid invitation tokens visible to the guest page, which shows
  // a friendly error instead of silently showing the owner dashboard.
  return hash.startsWith('#/i/') ? hash.slice('#/i/'.length) : hash.slice('#/invite/'.length)
}

export function isValidInvitationToken(token: string): boolean {
  return TOKEN_PATTERN.test(token)
}

export function invitationUrl(origin: string, token: string): string {
  if (!isValidInvitationToken(token)) throw new Error('Invalid invitation token.')
  // A fragment never travels in the HTTP request target, API access logs,
  // or Referrer header. The guest sends it only in an explicit POST body.
  return `${origin}/#/i/${token}`
}
